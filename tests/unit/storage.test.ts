// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { DurableStore, subjectKey } from '../../electron/main/storage/store'
import { DatabaseCore } from '../../electron/main/storage/database'
import { MIGRATION, TABLES } from '../../electron/main/storage/schema'
import { sha256 } from '../../electron/main/storage/database'
import { canonicalJson } from '../../contracts/jsonl'
import { validateResult } from '../../electron/main/ipc-boundary'
import {
  databasePath,
  fixture,
  fixturePolicy,
  proof,
  sendInput,
  taskFixture,
  inspect,
  session,
  event
} from '../fixtures/storage'

const opened: DurableStore[] = []
const use = <T extends { store: DurableStore }>(f: T) => {
  opened.push(f.store)
  return f
}
afterEach(() => {
  for (const db of opened.splice(0)) {
    try {
      db.close()
    } catch {}
  }
})
const code = (fn: () => unknown, error: string) => expect(fn).toThrow(error)
const count = (db: DurableStore, table: string) =>
  inspect(db).prepare(`SELECT count(*) AS n FROM ${table}`).get()!.n

describe('P3 schema, migration and actual WAL backup/restore', () => {
  it('matches all 22 frozen table names and exact column sets, not merely a local schema mirror', () => {
    const { store } = use(fixture())
    const db = inspect(store)
    const source = readFileSync(
      'docs/engineering/01-normative/NCD-03-IIS-04-SQLITE-DURABLE-STATE-SPECIFICATION.md',
      'utf8'
    )
    const block = source
      .split('## 4. Frozen normalized v1 table inventory')[1]
      .split('**SQLite ordinal identity rule')[0]
    const lines = block.split('\n').filter((l) => /^\| `/.test(l))
    expect(lines).toHaveLength(22)
    const names = db
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all()
      .map((r) => r.name)
    const frozenNames: string[] = []
    for (const line of lines) {
      const cells = line.split('|')
      const name = cells[1].match(/`([^`]+)`/)![1]
      frozenNames.push(name)
      const columns = [...cells[2].matchAll(/`([^`]+)`/g)].map((m) => m[1].split(' ')[0])
      expect(
        db
          .prepare(`PRAGMA table_info(${name})`)
          .all()
          .map((r) => r.name),
        name
      ).toEqual(columns)
    }
    expect(names).toEqual(frozenNames.sort())
    expect(names).toEqual(Object.keys(TABLES).sort())
    expect(db.prepare('PRAGMA foreign_keys').get()!.foreign_keys).toBe(1)
    expect(db.prepare('PRAGMA journal_mode').get()!.journal_mode).toBe('wal')
    expect(db.prepare('PRAGMA synchronous').get()!.synchronous).toBe(2)
    expect(db.prepare('PRAGMA busy_timeout').get()!.timeout).toBe(5000)
    expect(db.prepare('SELECT version,checksum FROM schema_migrations').get()).toEqual({
      version: 1,
      checksum: MIGRATION.checksum
    })
    expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([])
  })
  it('preserves monotonic message ordinals after deleting the maximum unreferenced row and restarting', () => {
    const f = use(fixture()),
      m = f.store.sendMessage(f.scope, sendInput()),
      db = inspect(f.store)
    db.prepare(
      "INSERT INTO messages(message_id,conversation_id,role,content,created_at,delivery_state,selected_model_id) VALUES('temporary',?,'assistant','fixture',?,'persisted',NULL)"
    ).run(m.conversationId, '2026-10-21T12:00:00.000Z')
    const n = db.prepare("SELECT message_ordinal FROM messages WHERE message_id='temporary'").get()!
      .message_ordinal as number
    db.prepare("DELETE FROM messages WHERE message_id='temporary'").run()
    f.store.close()
    const restored = new DurableStore(f.path, { policy: fixturePolicy })
    opened.push(restored)
    const next = restored.sendMessage(f.scope, {
      ...sendInput('next'),
      conversationId: m.conversationId
    })
    expect(
      inspect(restored)
        .prepare('SELECT message_ordinal FROM messages WHERE message_id=?')
        .get(next.messageId)!.message_ordinal as number
    ).toBeGreaterThan(n)
    for (const table of ['messages', 'tasks'])
      expect(
        inspect(restored).prepare('SELECT sql FROM sqlite_schema WHERE name=?').get(table)!.sql
      ).toContain('INTEGER PRIMARY KEY AUTOINCREMENT')
  })
  it('enforces FK/closed roles, immutable messages/receipts, scope and partial unique indexes', () => {
    const f = use(fixture())
    f.store.sendMessage(f.scope, sendInput())
    const db = inspect(f.store)
    expect(() => db.prepare("UPDATE messages SET content='altered'").run()).toThrow('immutable')
    expect(() =>
      db.prepare("UPDATE mutation_receipts SET result_snapshot_json='{}'").run()
    ).toThrow('immutable')
    expect(() =>
      db
        .prepare("INSERT INTO conversations VALUES('foreign','missing','title','now','now',0)")
        .run()
    ).toThrow()
    expect(() =>
      db.prepare("INSERT INTO memory_summaries VALUES('s','missing','text','now','approved')").run()
    ).toThrow()
    expect(
      db.prepare("SELECT sql FROM sqlite_schema WHERE name='observation_subject'").get()!.sql
    ).toContain('WHERE subject_key IS NOT NULL')
  })
  for (const kind of ['newer', 'checksum', 'DDL drift', 'corruption'])
    it(`fails closed on ${kind} without resetting the file`, () => {
      const path = databasePath()
      const s = new DurableStore(path)
      s.close()
      if (kind === 'corruption')
        writeFileSync(path, Buffer.from('Synthetic invalid database; disposable only'))
      else {
        const db = new DatabaseSync(path)
        if (kind === 'newer')
          db.prepare(
            "INSERT INTO schema_migrations VALUES(2,'future','2026-10-21T12:00:00Z')"
          ).run()
        if (kind === 'checksum') {
          db.exec('DROP TRIGGER immutable_schema_migrations')
          db.exec("UPDATE schema_migrations SET checksum='wrong'")
        }
        if (kind === 'DDL drift') db.exec('CREATE TABLE unauthorized(value TEXT)')
        db.close()
      }
      const before = readFileSync(path)
      code(() => new DurableStore(path), 'DATABASE_UNAVAILABLE')
      expect(readFileSync(path)).toEqual(before)
    })
  it('rolls failed fresh migration back and refuses silent recreation on next open', () => {
    const path = databasePath()
    code(
      () =>
        new DurableStore(path, {
          fault: (op) => {
            if (op === 'migration') throw new Error('injected')
          }
        }),
      'DATABASE_UNAVAILABLE'
    )
    expect(existsSync(path)).toBe(true)
    code(() => new DurableStore(path), 'DATABASE_UNAVAILABLE')
  })
  it('native online backup includes uncheckpointed WAL data and restore verifies schema and contents', async () => {
    const f = use(fixture())
    inspect(f.store).exec('PRAGMA wal_autocheckpoint=0')
    const accepted = f.store.sendMessage(f.scope, sendInput())
    expect(existsSync(f.path + '-wal')).toBe(true)
    const copy = join(dirname(f.path), 'snapshot.sqlite3'),
      restoredPath = join(dirname(f.path), 'restored.sqlite3')
    await f.store.backupTo(copy)
    await DatabaseCore.restoreTo(copy, restoredPath)
    const restored = new DurableStore(restoredPath, { policy: fixturePolicy })
    opened.push(restored)
    expect(restored.sendMessage(f.scope, sendInput())).toEqual(accepted)
    expect(restored.readConversation(f.scope, accepted.conversationId).messages).toHaveLength(1)
    await expect(f.store.backupTo(copy)).rejects.toThrow('BAD_INPUT')
    await expect(DatabaseCore.restoreTo(copy, restoredPath)).rejects.toThrow('BAD_INPUT')
  })
})

describe('P3 T1 original receipts, faults and P2 readiness', () => {
  it('a structurally valid but invalid closed DB preference does not become defaults or caller success', () => {
    const f = use(fixture())
    inspect(f.store)
      .prepare("INSERT INTO ui_preferences VALUES('display',1,?,?)")
      .run(JSON.stringify({ unrecognized: 'fixture' }), '2026-10-21T12:00:00.000Z')
    code(() => f.store.preferences(), 'DATABASE_UNAVAILABLE')
    code(() => f.store.updatePreferences({ savedDockWidth: 400 }), 'DATABASE_UNAVAILABLE')
    expect(inspect(f.store).prepare('SELECT safe_json FROM ui_preferences').get()!.safe_json).toBe(
      JSON.stringify({ unrecognized: 'fixture' })
    )
  })
  it('original receipt replay does not depend on later model/runtime availability', () => {
    const f = use(fixture())
    const original = f.store.sendMessage(f.scope, sendInput())
    f.store.close()
    const store = new DurableStore(f.path)
    opened.push(store)
    expect(store.sendMessage(f.scope, sendInput())).toEqual(original)
    code(() => store.sendMessage(f.scope, sendInput('new')), 'WORKSPACE_UNAVAILABLE')
  })
  it('duplicate first sends and restart return one original acceptance; window identity is absent', () => {
    const f = use(fixture())
    const a = f.store.sendMessage(f.scope, sendInput())
    f.advance(60000)
    expect(f.store.sendMessage(f.scope, sendInput())).toEqual(a)
    expect(count(f.store, 'conversations')).toBe(1)
    expect(count(f.store, 'messages')).toBe(1)
    f.store.close()
    const s = new DurableStore(f.path, { policy: fixturePolicy })
    opened.push(s)
    expect(s.sendMessage(f.scope, sendInput())).toEqual(a)
  })
  it('changed text/model/project/mutation operation cannot reuse a receipt', () => {
    const f = use(fixture())
    f.store.sendMessage(f.scope, sendInput())
    for (const delta of [{ text: 'altered' }, { modelId: 'other' }, { draftId: 'other' }])
      code(() => f.store.sendMessage(f.scope, { ...sendInput(), ...delta }), 'BAD_INPUT')
    const other = f.store.registerProject(
      { workspaceKey: 'other', canonicalRoot: 'C:/synthetic/other', displayName: 'Other' },
      proof
    )
    code(
      () => f.store.sendMessage({ projectId: other, workspaceKey: 'other' }, sendInput()),
      'NOT_AUTHORIZED'
    )
    code(
      () =>
        f.store.saveDock(f.scope, {
          conversationId: f.store.readConversation(
            f.scope,
            inspect(f.store).prepare('SELECT conversation_id FROM conversations').get()!
              .conversation_id as string
          ).conversation.conversationId,
          dockState: {
            visible: false,
            primaryTab: 'Files',
            terminalSubtab: 'Agent Logs',
            explicitlyHidden: true
          },
          clientMutationId: 'mutation_fixture'
        }),
      'BAD_INPUT'
    )
    expect(count(f.store, 'messages')).toBe(1)
  })
  it('commit-fault rollback returns no acceptance, creates no conversation and sends no hint', () => {
    let hints = 0
    const f = use(
      fixture({
        notify: () => {
          hints++
        },
        fault: (op) => {
          if (op === 'T1') throw new Error('injected COMMIT failure')
        }
      })
    )
    code(() => f.store.sendMessage(f.scope, sendInput()), 'DATABASE_UNAVAILABLE')
    for (const name of ['conversations', 'messages', 'discussion_turns', 'mutation_receipts'])
      expect(count(f.store, name)).toBe(0)
    expect(hints).toBe(0)
  })
  it('model validation and canonical workspace verification are required; default policy grants no authority', () => {
    const f = use(fixture())
    code(
      () => f.store.sendMessage(f.scope, { ...sendInput(), modelId: 'unsupported' }),
      'MODEL_UNAVAILABLE'
    )
    f.store.close()
    const denied = new DurableStore(f.path)
    opened.push(denied)
    code(() => denied.sendMessage(f.scope, sendInput()), 'WORKSPACE_UNAVAILABLE')
    code(() => denied.createProposal(f.scope, 'unknown', 'goal', proof), 'NOT_AUTHORIZED')
  })
  it('real SQLITE_FULL rolls back first-send with no receipt or notification', () => {
    const f = use(fixture())
    const db = inspect(f.store)
    const pages = db.prepare('PRAGMA page_count').get()!.page_count as number
    db.exec(`PRAGMA max_page_count=${pages}`)
    code(
      () => f.store.sendMessage(f.scope, sendInput('full', 'x'.repeat(16384))),
      'DATABASE_UNAVAILABLE'
    )
    expect(count(f.store, 'conversations')).toBe(0)
    expect(count(f.store, 'mutation_receipts')).toBe(0)
  })
})

describe('P3 T2/T3 capacity, canonical identity, cancellation and recovery', () => {
  it('valid foreign-project proposals/conversations cannot authorize admission or a writer', () => {
    const f = use(fixture())
    const projectId = f.store.registerProject(
      {
        workspaceKey: 'foreign_workspace',
        canonicalRoot: 'C:/synthetic/foreign',
        displayName: 'Other fixture'
      },
      proof
    )
    const foreign = { projectId, workspaceKey: 'foreign_workspace' },
      message = f.store.sendMessage(foreign, sendInput('foreign_send'))
    const proposalId = f.store.createProposal(
      foreign,
      message.conversationId,
      'Foreign goal',
      proof
    )
    code(
      () => f.store.admit(f.scope, { proposalId, clientMutationId: 'foreign_run' }, proof),
      'NOT_AUTHORIZED'
    )
    code(() => f.store.readConversation(f.scope, message.conversationId), 'NOT_AUTHORIZED')
    expect(count(f.store, 'tasks')).toBe(0)
  })
  it('physical task admission ordinals remain monotonic after retiring the maximum fixture row', () => {
    const f = use(taskFixture()),
      db = inspect(f.store)
    const create = (key: string) =>
      f.store.admit(
        f.scope,
        {
          proposalId: f.store.createProposal(
            f.scope,
            f.message.conversationId,
            'Fixture ' + key,
            proof
          ),
          clientMutationId: key
        },
        proof
      )
    const last = create('retired'),
      row = db.prepare('SELECT * FROM tasks WHERE task_id=?').get(last.taskId)!
    // Deliberate isolated-row deletion tests SQLite AUTOINCREMENT semantics;
    // no production archival/deletion API exists or is authorized by this test.
    db.exec('BEGIN IMMEDIATE; PRAGMA defer_foreign_keys=ON')
    try {
      db.prepare('DELETE FROM task_event_streams WHERE task_id=?').run(last.taskId)
      db.prepare('DELETE FROM tasks WHERE task_id=?').run(last.taskId)
      db.prepare('DELETE FROM task_proposals WHERE proposal_id=?').run(row.proposal_id!)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    f.store.close()
    const s = new DurableStore(f.path, {
      policy: fixturePolicy,
      now: () => Date.parse('2026-10-21T12:00:00Z')
    })
    opened.push(s)
    const next = s.admit(
      f.scope,
      {
        proposalId: s.createProposal(f.scope, f.message.conversationId, 'Next fixture', proof),
        clientMutationId: 'next'
      },
      proof
    )
    expect(
      inspect(s).prepare('SELECT admission_order FROM tasks WHERE task_id=?').get(next.taskId)!
        .admission_order as number
    ).toBeGreaterThan(row.admission_order as number)
  })
  it('consumes once and replays the original admission snapshot after state changes and restart', () => {
    const f = use(taskFixture())
    const input = { proposalId: f.task.taskId, clientMutationId: 'wrong' }
    code(() => f.store.admit(f.scope, input, proof), 'NOT_AUTHORIZED')
    const pid = inspect(f.store)
      .prepare('SELECT proposal_id FROM tasks WHERE task_id=?')
      .get(f.task.taskId)!.proposal_id as string
    expect(() =>
      inspect(f.store)
        .prepare(
          "UPDATE task_proposals SET state='available',consumed_task_id=NULL WHERE proposal_id=?"
        )
        .run(pid)
    ).toThrow('proposal already final')
    f.store.cancel(f.scope, f.task.taskId, proof)
    expect(
      f.store.admit(f.scope, { proposalId: pid, clientMutationId: 'run_fixture' }, proof)
    ).toEqual(f.task)
    code(
      () => f.store.admit(f.scope, { proposalId: pid, clientMutationId: 'another' }, proof),
      'PROPOSAL_ALREADY_USED'
    )
    f.store.close()
    const s = new DurableStore(f.path, { policy: fixturePolicy })
    opened.push(s)
    s.recoverAfterRestart()
    expect(s.admit(f.scope, { proposalId: pid, clientMutationId: 'run_fixture' }, proof)).toEqual(
      f.task
    )
    expect(s.readTask(f.scope, f.task.taskId).state).toBe('needs_reconciliation')
  })
  it('enforces 1+20, leaves the 21st queued proposal available and gives queued tasks no writer lease', () => {
    const f = use(taskFixture())
    let extra = ''
    for (let n = 0; n < 21; n++) {
      const p = f.store.createProposal(f.scope, f.message.conversationId, 'Synthetic ' + n, proof)
      if (n === 20) {
        extra = p
        code(
          () => f.store.admit(f.scope, { proposalId: p, clientMutationId: 'q_' + n }, proof),
          'TASK_BUSY'
        )
      } else
        expect(
          f.store.admit(f.scope, { proposalId: p, clientMutationId: 'q_' + n }, proof).state
        ).toBe('queued')
    }
    expect(count(f.store, 'tasks')).toBe(21)
    expect(count(f.store, 'workspace_writer_leases')).toBe(1)
    expect(
      inspect(f.store).prepare('SELECT state FROM task_proposals WHERE proposal_id=?').get(extra)!
        .state
    ).toBe('available')
  })
  it('proposal expiry and rollback never consume an approval', () => {
    const f = use(fixture())
    const m = f.store.sendMessage(f.scope, sendInput())
    const p = f.store.createProposal(f.scope, m.conversationId, 'goal', proof)
    f.advance(900000)
    code(
      () => f.store.admit(f.scope, { proposalId: p, clientMutationId: 'expired' }, proof),
      'PROPOSAL_EXPIRED'
    )
    expect(count(f.store, 'tasks')).toBe(0)
    const g = use(
      fixture({
        fault: (op) => {
          if (op === 'T2') throw new Error('fault')
        }
      })
    )
    const message = g.store.sendMessage(g.scope, sendInput())
    const pid = g.store.createProposal(g.scope, message.conversationId, 'goal', proof)
    code(
      () => g.store.admit(g.scope, { proposalId: pid, clientMutationId: 'fault' }, proof),
      'DATABASE_UNAVAILABLE'
    )
    expect(
      inspect(g.store).prepare('SELECT state FROM task_proposals WHERE proposal_id=?').get(pid)!
        .state
    ).toBe('available')
    expect(
      inspect(g.store).prepare('SELECT task_id FROM active_coding_slot').get()!.task_id
    ).toBeNull()
  })
  it('canonical aliases use one project/lane; blocked writer survives restart and timeout', () => {
    const f = use(taskFixture())
    expect(
      f.store.registerProject(
        {
          workspaceKey: f.scope.workspaceKey,
          canonicalRoot: 'C:/SYNTHETIC/WORKSPACE',
          displayName: 'Alias'
        },
        proof
      )
    ).toBe(f.scope.projectId)
    f.store.recoverAfterRestart()
    f.advance(999999999)
    expect(
      inspect(f.store).prepare('SELECT lease_state FROM workspace_writer_leases').get()!.lease_state
    ).toBe('blocked')
    expect(f.store.schedule(proof)).toBeNull()
    code(
      () =>
        f.store.reconcile(f.scope, f.task.taskId, {
          ...proof,
          taskId: f.task.taskId,
          workspaceKey: f.scope.workspaceKey,
          childStopped: true,
          descendantsStopped: false,
          workspaceSafe: true,
          reason: 'interrupted'
        }),
      'BAD_INPUT'
    )
    expect(count(f.store, 'workspace_writer_leases')).toBe(1)
  })
  it('FIFO reservation skips cancelled work; cleanup atomically releases lease and slot only with verified evidence', () => {
    const f = use(taskFixture())
    const queued = []
    for (let n = 0; n < 3; n++) {
      const p = f.store.createProposal(f.scope, f.message.conversationId, 'goal' + n, proof)
      queued.push(f.store.admit(f.scope, { proposalId: p, clientMutationId: 'queue_' + n }, proof))
    }
    expect(f.store.cancel(f.scope, queued[0].taskId, proof).state).toBe('requested')
    expect(f.store.cancel(f.scope, queued[0].taskId, proof).state).toBe('not_running')
    expect(count(f.store, 'task_events')).toBe(0)
    f.store.reconcile(f.scope, f.task.taskId, {
      ...proof,
      taskId: f.task.taskId,
      workspaceKey: f.scope.workspaceKey,
      childStopped: true,
      descendantsStopped: true,
      workspaceSafe: true,
      reason: 'interrupted'
    })
    expect(count(f.store, 'workspace_writer_leases')).toBe(0)
    expect(f.store.schedule(proof)).toBe(queued[1].taskId)
    expect(f.store.cancel(f.scope, queued[1].taskId, proof).state).toBe('requested')
    expect(f.store.cancel(f.scope, queued[1].taskId, proof).state).toBe('already_requested')
    expect(count(f.store, 'workspace_writer_leases')).toBe(1)
  })
})

describe('P3 T4 exact committed events and persistent uncertainty', () => {
  it('canonical event bytes and digest match an independently generated Python golden fixture', () => {
    const vector = JSON.parse(readFileSync('tests/fixtures/event-canonical.json', 'utf8'))
    expect(canonicalJson(vector.payload)).toBe(vector.canonical_utf8)
    expect(sha256(canonicalJson(vector.payload))).toBe(vector.sha256)
  })
  it('commits before notification, deduplicates reordered payload keys and replays committed evidence', () => {
    const f = use(taskFixture())
    const notifications: unknown[] = []
    f.store.close()
    const store = new DurableStore(f.path, {
      policy: fixturePolicy,
      notify: (_k, _id, update) => {
        const read = new DatabaseSync(f.path, { readOnly: true })
        try {
          expect(read.prepare('SELECT count(*) AS n FROM task_events').get()!.n).toBe(1)
          notifications.push(update)
        } finally {
          read.close()
        }
      }
    })
    opened.push(store)
    const started = event(f.task.taskId, 'task.started', 1, { phase: 'INITIALIZING' })
    expect(store.commitEvent(f.scope, started, session(f.task.taskId)).inserted).toBe(true)
    const again = structuredClone(started)
    again.message_id = 'another_outer'
    again.payload.data = Object.fromEntries(
      Object.entries(again.payload.data).reverse()
    ) as typeof again.payload.data
    expect(store.commitEvent(f.scope, again, session(f.task.taskId)).inserted).toBe(false)
    expect(notifications).toHaveLength(2)
    expect(count(store, 'task_events')).toBe(1)
    const replay = store.readEvents(f.scope, { taskId: f.task.taskId, afterSequence: 0, limit: 40 })
    expect(replay.events).toEqual([started])
    expect(replay.completeThrough).toBe(1)
    expect(replay.nextSequence).toBe(1)
    expect(
      inspect(store).prepare('SELECT payload_sha256 FROM task_events').get()!.payload_sha256
    ).toBe(sha256(canonicalJson(started.payload)))
  })
  it('preserves sparse sequence gaps; filling them does not downgrade sticky conflict across restart', () => {
    const f = use(taskFixture()),
      sid = session(f.task.taskId)
    f.store.commitEvent(
      f.scope,
      event(f.task.taskId, 'task.started', 1, { phase: 'INITIALIZING' }),
      sid
    )
    f.store.commitEvent(
      f.scope,
      event(f.task.taskId, 'task.progress', 3, { phase: 'EXECUTING', detail: 'fixture' }),
      sid
    )
    expect(
      f.store.readEvents(f.scope, { taskId: f.task.taskId, afterSequence: 0, limit: 40 })
    ).toMatchObject({ completeThrough: 1, hasGap: true, stateIsCertain: false })
    code(
      () =>
        f.store.commitEvent(
          f.scope,
          event(
            f.task.taskId,
            'task.progress',
            3,
            { phase: 'EXECUTING', detail: 'conflict' },
            'other_outer'
          ),
          sid
        ),
      'TASK_UNKNOWN'
    )
    f.store.commitEvent(
      f.scope,
      event(f.task.taskId, 'task.progress', 2, { phase: 'PLANNING', detail: 'fixture' }),
      sid
    )
    const replay = f.store.readEvents(f.scope, {
      taskId: f.task.taskId,
      afterSequence: 0,
      limit: 40
    })
    expect(replay).toMatchObject({ completeThrough: 3, hasGap: false, stateIsCertain: false })
    expect(
      inspect(f.store).prepare('SELECT integrity_status FROM task_event_streams').get()!
        .integrity_status
    ).toBe('conflict')
    f.store.close()
    const restored = new DurableStore(f.path, { policy: fixturePolicy })
    opened.push(restored)
    restored.recoverAfterRestart()
    expect(
      inspect(restored).prepare('SELECT integrity_status FROM task_event_streams').get()!
        .integrity_status
    ).toBe('conflict')
  })
  it('detects reused event ID at another sequence, rejects foreign sessions/role/schema and defaults deny', () => {
    const f = use(taskFixture())
    const start = event(f.task.taskId, 'task.started', 1, { phase: 'INITIALIZING' })
    f.store.commitEvent(f.scope, start, session(f.task.taskId))
    code(
      () =>
        f.store.commitEvent(
          f.scope,
          event(f.task.taskId, 'task.progress', 2, { phase: 'PLANNING', detail: 'fixture' }),
          session(f.task.taskId, 'workspace_fixture', 'foreign_session')
        ),
      'NOT_AUTHORIZED'
    )
    code(
      () => f.store.commitEvent(f.scope, start, { ...session(f.task.taskId), role: 'discussion' }),
      'BAD_INPUT'
    )
    code(
      () => f.store.commitEvent(f.scope, { ...start, type: 'error' }, session(f.task.taskId)),
      'BAD_INPUT'
    )
    const conflict = event(f.task.taskId, 'task.progress', 2, {
      phase: 'PLANNING',
      detail: 'fixture',
      event_id: 'event_1'
    })
    code(() => f.store.commitEvent(f.scope, conflict, session(f.task.taskId)), 'TASK_UNKNOWN')
    expect(count(f.store, 'task_events')).toBe(1)
  })
  it('terminal outcome is separate from cleanup; late cancel does not erase it, no second terminal is accepted', () => {
    const f = use(taskFixture()),
      sid = session(f.task.taskId)
    f.store.commitEvent(
      f.scope,
      event(f.task.taskId, 'task.started', 1, { phase: 'INITIALIZING' }),
      sid
    )
    const outcome = {
      task_id: f.task.taskId,
      success: true,
      final_phase: 'COMPLETED',
      summary: 'Synthetic only',
      total_ticks: 1,
      rollbacks_triggered: 0,
      final_checkpoint_hash: null
    }
    f.store.commitEvent(f.scope, event(f.task.taskId, 'task.completed', 2, { outcome }), sid)
    expect(f.store.readTask(f.scope, f.task.taskId)).toMatchObject({
      state: 'needs_reconciliation',
      outcome
    })
    expect(f.store.cancel(f.scope, f.task.taskId, proof).state).toBe('not_running')
    expect(count(f.store, 'workspace_writer_leases')).toBe(1)
    f.store.reconcile(f.scope, f.task.taskId, {
      ...proof,
      taskId: f.task.taskId,
      workspaceKey: f.scope.workspaceKey,
      childStopped: true,
      descendantsStopped: true,
      workspaceSafe: true,
      reason: 'completed'
    })
    expect(f.store.readTask(f.scope, f.task.taskId).state).toBe('completed')
    expect(count(f.store, 'workspace_writer_leases')).toBe(0)
    code(
      () =>
        f.store.commitEvent(
          f.scope,
          event(f.task.taskId, 'task.failed', 3, {
            outcome: { ...outcome, success: false, final_phase: 'FAILED' }
          }),
          sid
        ),
      'NOT_AUTHORIZED'
    )
  })
  it('T4 commit failure emits no notification and leaves no event/stream advancement', () => {
    const f = use(taskFixture())
    f.store.close()
    let hints = 0
    const store = new DurableStore(f.path, {
      policy: fixturePolicy,
      fault: (op) => {
        if (op === 'T4') throw new Error('COMMIT fault')
      },
      notify: () => {
        hints++
      }
    })
    opened.push(store)
    code(
      () =>
        store.commitEvent(
          f.scope,
          event(f.task.taskId, 'task.started', 1, { phase: 'INITIALIZING' }),
          session(f.task.taskId)
        ),
      'DATABASE_UNAVAILABLE'
    )
    expect(hints).toBe(0)
    expect(count(store, 'task_events')).toBe(0)
    expect(inspect(store).prepare('SELECT max_seen FROM task_event_streams').get()!.max_seen).toBe(
      0
    )
  })
})

describe('P3 T5 per-attempt lineage, summaries, decisions and C01 projections', () => {
  it('persists real-attempt structures and safe answer atomically without invoking a provider', () => {
    const f = use(fixture())
    const m = f.store.sendMessage(f.scope, sendInput()),
      sid = 'discussion_session'
    const aid = f.store.issueAttempt(
      f.scope,
      m.messageId,
      { providerKey: 'provider_fixture', processSessionRef: sid, retryOf: null },
      proof
    )
    code(
      () =>
        f.store.finishAttempt(
          f.scope,
          aid,
          'foreign',
          {
            ok: true,
            result: {
              answer: 'fixture',
              task_proposal: null,
              summary_candidates: [],
              decision_candidates: []
            }
          },
          proof
        ),
      'NOT_AUTHORIZED'
    )
    f.store.finishAttempt(
      f.scope,
      aid,
      sid,
      {
        ok: true,
        result: {
          answer: 'Fixture answer',
          task_proposal: null,
          summary_candidates: [{ text: 'Derived summary', source_message_ids: [m.messageId] }],
          decision_candidates: [{ text: 'Suggestion only', source_message_ids: [m.messageId] }]
        }
      },
      proof
    )
    const page = f.store.readConversation(f.scope, m.conversationId)
    expect(page.messages.map((x) => x.role)).toEqual(['user', 'assistant'])
    expect(page.discussionTurns[0]).toMatchObject({
      status: 'answered',
      lastErrorCode: null,
      lastAttempt: { attemptId: aid, status: 'completed', isRetry: false }
    })
    expect(count(f.store, 'approved_decisions')).toBe(0)
    expect(count(f.store, 'memory_summaries')).toBe(1)
    expect(f.store.context(f.scope, m.conversationId).decisions).toEqual([])
    expect(count(f.store, 'messages')).toBe(2)
  })
  it('rejects foreign/missing/empty source sets and ambiguous or assistant-role approval', () => {
    const f = use(fixture())
    const m = f.store.sendMessage(f.scope, sendInput()),
      other = f.store.sendMessage(f.scope, sendInput('other'))
    for (const sources of [[], ['missing'], [other.messageId]])
      code(
        () => f.store.addSummary(f.scope, m.conversationId, 'summary', sources, proof),
        sources.length ? 'NOT_AUTHORIZED' : 'BAD_INPUT'
      )
    code(
      () => f.store.approveDecision(f.scope, m.conversationId, 'Use tests', m.messageId, proof),
      'NOT_AUTHORIZED'
    )
    const approval = f.store.sendMessage(f.scope, {
      ...sendInput('approval', 'I approve: Use tests'),
      conversationId: m.conversationId
    })
    f.store.approveDecision(f.scope, m.conversationId, 'Use tests', approval.messageId, proof)
    code(
      () =>
        f.store.approveDecision(
          f.scope,
          m.conversationId,
          'Use a different design',
          approval.messageId,
          proof
        ),
      'NOT_AUTHORIZED'
    )
    expect(f.store.context(f.scope, m.conversationId).decisions).toHaveLength(1)
    expect(count(f.store, 'messages')).toBe(3)
  })
  it('crash recovery marks issued attempt unknown and never silently reissues; retry lineage remains same-turn', () => {
    const f = use(fixture())
    const m = f.store.sendMessage(f.scope, sendInput())
    const aid = f.store.issueAttempt(
      f.scope,
      m.messageId,
      { providerKey: 'provider_fixture', processSessionRef: 'session_one', retryOf: null },
      proof
    )
    f.store.recoverAfterRestart()
    expect(f.store.readConversation(f.scope, m.conversationId).discussionTurns[0]).toMatchObject({
      status: 'unknown',
      lastAttempt: { attemptId: aid, status: 'unknown' }
    })
    expect(count(f.store, 'discussion_attempts')).toBe(1)
    const retry = f.store.issueAttempt(
      f.scope,
      m.messageId,
      { providerKey: 'provider_fixture', processSessionRef: 'session_two', retryOf: aid },
      proof
    )
    expect(
      f.store.readConversation(f.scope, m.conversationId).discussionTurns[0].lastAttempt
    ).toMatchObject({ attemptId: retry, isRetry: true })
    code(
      () =>
        f.store.issueAttempt(
          f.scope,
          m.messageId,
          { providerKey: 'provider_fixture', processSessionRef: 'session_three', retryOf: aid },
          proof
        ),
      'DATABASE_UNAVAILABLE'
    )
    const other = f.store.sendMessage(f.scope, sendInput('foreign_turn'))
    code(
      () =>
        f.store.issueAttempt(
          f.scope,
          other.messageId,
          { providerKey: 'provider_fixture', processSessionRef: 'session_three', retryOf: aid },
          proof
        ),
      'BAD_INPUT'
    )
  })
  it('model/provider mismatch and failed result never erase a durable user message', () => {
    const f = use(fixture())
    const m = f.store.sendMessage(f.scope, sendInput())
    code(
      () =>
        f.store.issueAttempt(
          f.scope,
          m.messageId,
          { providerKey: 'wrong_provider', processSessionRef: 'session', retryOf: null },
          proof
        ),
      'MODEL_UNAVAILABLE'
    )
    const aid = f.store.issueAttempt(
      f.scope,
      m.messageId,
      { providerKey: 'provider_fixture', processSessionRef: 'session', retryOf: null },
      proof
    )
    f.store.finishAttempt(
      f.scope,
      aid,
      'session',
      { ok: false, code: 'PROVIDER_FAILED', ambiguous: true },
      proof
    )
    const page = f.store.readConversation(f.scope, m.conversationId)
    expect(page.messages).toHaveLength(1)
    expect(page.discussionTurns[0]).toMatchObject({
      status: 'unknown',
      lastErrorCode: 'PROVIDER_FAILED'
    })
  })
  it('C01 proposal cap, TTL, scope and turn projections survive restart, with no fabricated attempts', () => {
    const f = use(fixture())
    const m = f.store.sendMessage(f.scope, sendInput())
    for (let n = 0; n < 41; n++)
      f.store.createProposal(f.scope, m.conversationId, 'Goal ' + n, proof)
    let page = f.store.readConversation(f.scope, m.conversationId)
    expect(page.availableProposals).toHaveLength(40)
    expect(page.availableProposalsTruncated).toBe(true)
    expect(page.discussionTurns[0].lastAttempt).toBeNull()
    f.store.close()
    const s = new DurableStore(f.path, {
      policy: fixturePolicy,
      now: () => Date.parse('2026-10-21T12:01:00Z')
    })
    opened.push(s)
    page = s.readConversation(f.scope, m.conversationId)
    expect(page.availableProposals).toHaveLength(40)
    expect(page.discussionTurns).toHaveLength(1)
    const expired = new DurableStore(f.path, {
      policy: fixturePolicy,
      now: () => Date.parse('2026-10-21T12:15:00Z')
    })
    opened.push(expired)
    expect(expired.readConversation(f.scope, m.conversationId).availableProposals).toHaveLength(0)
  })
})

describe('P3 T6 consent, inspections, scoped paging and presentation', () => {
  it('persisted model preference never supplies a fallback for a different message model', () => {
    const f = use(fixture())
    expect(f.store.setDiscussionPreference('model_fixture', proof)).toEqual({
      modelId: 'model_fixture'
    })
    expect(f.store.bootstrap().discussionModelId).toBe('model_fixture')
    code(
      () => f.store.sendMessage(f.scope, { ...sendInput(), modelId: 'other' }),
      'MODEL_UNAVAILABLE'
    )
    f.store.close()
    const restored = new DurableStore(f.path)
    opened.push(restored)
    expect(restored.discussionPreference()).toBe('model_fixture')
  })
  it('a legal maximum-size DB message/proposal page remains within the explicit bounded IPC response budget', () => {
    const f = use(fixture()),
      m = f.store.sendMessage(f.scope, sendInput()),
      db = inspect(f.store)
    const put = db.prepare(
      "INSERT INTO messages(message_id,conversation_id,role,content,created_at,delivery_state,selected_model_id) VALUES(?,?,'assistant',?,?,'persisted',NULL)"
    )
    db.exec('BEGIN IMMEDIATE')
    try {
      for (let n = 0; n < 100; n++)
        put.run('large_' + n, m.conversationId, '😀'.repeat(32768), '2026-10-21T12:00:00.000Z')
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
    for (let n = 0; n < 40; n++)
      f.store.createProposal(f.scope, m.conversationId, '😀'.repeat(16384), proof)
    const page = f.store.readConversation(f.scope, m.conversationId, undefined, 100)
    expect(page.messages).toHaveLength(100)
    expect(page.availableProposals).toHaveLength(40)
    expect(validateResult('conversations.read', { ok: true, data: page }).ok).toBe(true)
  }, 15000)
  const binding = { providerKey: 'provider_fixture', disclosureClass: 'ordinary_text' }
  const challenge = (f: ReturnType<typeof fixture>) =>
    f.store.createChallenge(
      f.scope,
      { ...binding, scopeDescription: 'Synthetic disclosure scope' },
      proof
    )
  it('grants exact scope, replays original consent snapshot after revoke, and blocks future source release', () => {
    const f = use(fixture()),
      cid = challenge(f),
      input = {
        challengeId: cid,
        decision: 'approve' as const,
        clientMutationId: 'consent_fixture'
      }
    const grant = f.store.respondDisclosure(f.scope, input, binding, proof)
    expect(f.store.hasConsent(f.scope, binding.providerKey, binding.disclosureClass)).toBe(true)
    expect(f.store.hasConsent(f.scope, 'other_provider', binding.disclosureClass)).toBe(false)
    expect(f.store.hasConsent(f.scope, binding.providerKey, 'other_class')).toBe(false)
    const revoke = { consentId: grant.consentId!, clientMutationId: 'revoke_fixture' }
    const result = f.store.revokeDisclosure(f.scope, revoke, proof)
    expect(f.store.revokeDisclosure(f.scope, revoke, proof)).toEqual(result)
    expect(f.store.respondDisclosure(f.scope, input, binding, proof)).toEqual(grant)
    expect(f.store.hasConsent(f.scope, binding.providerKey, binding.disclosureClass)).toBe(false)
    expect(() =>
      inspect(f.store).exec("UPDATE disclosure_consents SET status='granted',revoked_at=NULL")
    ).toThrow('revocation is final')
  })
  it('denies forged, expired, wrong-provider/class/project challenges and leaves no synthetic grant', () => {
    const f = use(fixture()),
      cid = challenge(f),
      input = { challengeId: cid, decision: 'approve' as const, clientMutationId: 'grant' }
    code(
      () =>
        f.store.respondDisclosure(f.scope, input, { ...binding, providerKey: 'foreign' }, proof),
      'NOT_AUTHORIZED'
    )
    code(
      () =>
        f.store.respondDisclosure(
          f.scope,
          input,
          { ...binding, disclosureClass: 'foreign' },
          proof
        ),
      'NOT_AUTHORIZED'
    )
    code(
      () => f.store.respondDisclosure(f.scope, { ...input, challengeId: 'forged' }, binding, proof),
      'NOT_AUTHORIZED'
    )
    f.advance(900000)
    code(() => f.store.respondDisclosure(f.scope, input, binding, proof), 'NOT_AUTHORIZED')
    expect(count(f.store, 'disclosure_consents')).toBe(0)
  })
  it('explicit deny creates no grant; failed T6 commit does not consume the challenge', () => {
    const f = use(fixture())
    const cid = challenge(f)
    expect(
      f.store.respondDisclosure(
        f.scope,
        { challengeId: cid, decision: 'deny', clientMutationId: 'denied' },
        binding,
        proof
      ).status
    ).toBe('denied')
    expect(count(f.store, 'disclosure_consents')).toBe(0)
    const g = use(
      fixture({
        fault: (op) => {
          if (op === 'T6.respond') throw new Error('commit')
        }
      })
    )
    const id = challenge(g)
    code(
      () =>
        g.store.respondDisclosure(
          g.scope,
          { challengeId: id, decision: 'approve', clientMutationId: 'failed' },
          binding,
          proof
        ),
      'DATABASE_UNAVAILABLE'
    )
    expect(inspect(g.store).prepare('SELECT state FROM disclosure_challenges').get()!.state).toBe(
      'pending'
    )
  })
  it('counts committed unique subject/page evidence, rejects conflicts and stores hashes instead of sensitive paths', () => {
    const f = use(fixture())
    const m = f.store.sendMessage(f.scope, sendInput()),
      id = f.store.createInspection(f.scope, m.conversationId, proof)
    const subject = subjectKey(
      Buffer.from('synthetic fixture key'),
      f.scope.workspaceKey,
      'src/synthetic.ts'
    )
    const observation = {
      observationKey: sha256('read1'),
      kind: 'read_file',
      subjectKey: subject,
      evidenceDigest: sha256('evidence'),
      countDelta: 1,
      discoveryCountKnown: false,
      state: 'partial',
      coverageNote: 'One verified fixture excerpt; wider coverage unknown.'
    }
    expect(f.store.observeInspection(f.scope, id, observation, proof)).toBe(true)
    expect(
      f.store.observeInspection(
        f.scope,
        id,
        { ...observation, observationKey: sha256('read2') },
        proof
      )
    ).toBe(false)
    code(
      () =>
        f.store.observeInspection(
          f.scope,
          id,
          { ...observation, evidenceDigest: sha256('conflict') },
          proof
        ),
      'BAD_INPUT'
    )
    const page = f.store.readConversation(f.scope, m.conversationId)
    expect(page.inspectionStatus).toMatchObject({
      actuallyReadCount: 1,
      excludedCount: 0,
      state: 'partial'
    })
    expect(page.inspectionStatus).not.toHaveProperty('discoveredCount')
    expect(
      canonicalJson(inspect(f.store).prepare('SELECT * FROM inspection_observations').all())
    ).not.toContain('src/synthetic.ts')
    expect(count(f.store, 'inspection_observations')).toBe(1)
  })
  it('scopes Dock receipts and persists safe preferences without affecting tasks, with stable original snapshots', () => {
    const f = use(fixture())
    const a = f.store.sendMessage(f.scope, sendInput()),
      b = f.store.sendMessage(f.scope, sendInput('second'))
    const input = {
      conversationId: a.conversationId,
      dockState: {
        visible: false,
        primaryTab: 'Files' as const,
        terminalSubtab: 'Agent Logs' as const,
        explicitlyHidden: true
      },
      clientMutationId: 'dock_first'
    }
    const original = f.store.saveDock(f.scope, input)
    f.store.saveDock(f.scope, {
      ...input,
      clientMutationId: 'dock_second',
      dockState: { ...input.dockState, visible: true }
    })
    expect(f.store.saveDock(f.scope, input)).toEqual(original)
    expect(f.store.readDock(f.scope, b.conversationId)).toBeNull()
    f.store.updatePreferences({ savedDockWidth: 400, reducedMotion: true })
    code(() => f.store.updatePreferences({ providerSecret: 'synthetic' } as any), 'BAD_INPUT')
    f.store.close()
    const s = new DurableStore(f.path, { policy: fixturePolicy })
    opened.push(s)
    expect(s.preferences()).toMatchObject({ savedDockWidth: 400, reducedMotion: true })
    expect(s.readDock(f.scope, a.conversationId)?.visible).toBe(true)
    expect(count(s, 'tasks')).toBe(0)
  })
  it('default 40/max 100 pagination uses ordinal cursors, rejects tampering/query scope and stale process cursors', () => {
    const f = use(fixture())
    const m = f.store.sendMessage(f.scope, sendInput())
    for (let n = 0; n < 42; n++)
      f.store.sendMessage(f.scope, { ...sendInput('page_' + n), conversationId: m.conversationId })
    const first = f.store.readConversation(f.scope, m.conversationId)
    expect(first.messages).toHaveLength(40)
    expect(first.nextCursor).not.toBeNull()
    const second = f.store.readConversation(f.scope, m.conversationId, first.nextCursor!)
    expect(second.messages).toHaveLength(3)
    expect(second.nextCursor).toBeNull()
    code(
      () => f.store.readConversation(f.scope, m.conversationId, first.nextCursor! + 'x'),
      'BAD_INPUT'
    )
    code(() => f.store.listTasks(f.scope, undefined, first.nextCursor!), 'BAD_INPUT')
    code(() => f.store.readConversation(f.scope, m.conversationId, undefined, 101), 'BAD_INPUT')
    f.store.close()
    const s = new DurableStore(f.path, { policy: fixturePolicy })
    opened.push(s)
    code(() => s.readConversation(f.scope, m.conversationId, first.nextCursor!), 'BAD_INPUT')
  })
})
