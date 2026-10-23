// @vitest-environment node
import { test, expect } from 'vitest'
import { brokerFixture } from '../fixtures/broker'
import { DatabaseSync } from 'node:sqlite'
import { join } from 'node:path'
import { writeFileSync, mkdirSync, renameSync, utimesSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

test('P6-B01 real Windows worker discover, T6 grant and exact local handoff before one durable read count', async () => {
  const f = await brokerFixture()
  try {
    const page = await f.call('project.discover')
    expect(page).toMatchObject({
      code: null,
      result: {
        entries: [{ path: 'notes.custom' }, { path: 'settings.json' }],
        excluded_count: 1,
        complete: false
      }
    })
    expect((await f.read()).inspectionStatus).toMatchObject({
      discoveredCount: 2,
      actuallyReadCount: 0,
      excludedCount: 1
    })
    expect(await f.call('project.read')).toMatchObject({ code: 'NOT_AUTHORIZED' })
    await f.grant()
    const result = await f.call('project.read')
    expect(result).toMatchObject({
      code: null,
      result: { content: 'Atlas\n', start_line: 1, end_line: 1 }
    })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect((await f.read()).inspectionStatus).toMatchObject({ actuallyReadCount: 1 })
    await f.call('project.read', { start_line: 2, end_line: 2 })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect((await f.read()).inspectionStatus).toMatchObject({ actuallyReadCount: 1 })
  } finally {
    await f.close()
  }
})
test('P6-B02 local preview uses identical safety policy and never adds Discussion observations', async () => {
  const f = await brokerFixture()
  try {
    const project = f.service.store.projects()[0]
    expect(
      await f.service.dispatch('projects.previewFile', {
        projectId: project.projectId,
        relativePath: 'notes.custom',
        range: { startLine: 1, endLine: 2 }
      })
    ).toMatchObject({ ok: true, data: { text: 'Atlas\nsecond safe line\n' } })
    expect(
      await f.service.dispatch('projects.previewFile', {
        projectId: project.projectId,
        relativePath: '.env.local',
        range: { startLine: 1, endLine: 1 }
      })
    ).toMatchObject({ ok: false, error: { code: 'SENSITIVE_CONTENT' } })
    expect((await f.read()).inspectionStatus).toBeNull()
  } finally {
    await f.close()
  }
})
test('P6-B03 opaque cursor is scope-bound, mutation invalidates it, and no hidden name is returned', async () => {
  const f = await brokerFixture()
  try {
    const first = await f.call('project.discover', { limit: 1 })
    const result = first.result as { next_cursor: string; entries: unknown[] }
    expect(result.next_cursor).toMatch(/^[A-Za-z\d_-]{32}$/)
    expect(
      await f.call('project.discover', { limit: 1, cursor: result.next_cursor + 'x' })
    ).toMatchObject({ code: 'STALE_SOURCE' })
    writeFileSync(join(f.workspace, 'new.txt'), 'new safe file\n')
    expect(
      await f.call('project.discover', { limit: 1, cursor: result.next_cursor })
    ).toMatchObject({ code: 'STALE_SOURCE' })
    expect(JSON.stringify(first)).not.toContain('.env')
  } finally {
    await f.close()
  }
})
test('P6-B04 foreign and ended parent cannot acquire filesystem authority', async () => {
  const f = await brokerFixture()
  try {
    expect(await f.call('project.discover', {}, 'foreign_parent')).toMatchObject({
      code: 'NOT_AUTHORIZED'
    })
    f.service.broker!.end(f.parentWire)
    expect(await f.call('project.read')).toMatchObject({ code: 'NOT_AUTHORIZED' })
  } finally {
    await f.close()
  }
})
test('P6-B05 sensitive content outside requested line and across capture block is denied', async () => {
  const f = await brokerFixture()
  try {
    await f.grant()
    writeFileSync(
      join(f.workspace, 'notes.custom'),
      'Atlas\n' + ' '.repeat(65525) + 'api_key="synthetic-credential-value"\n'
    )
    expect(await f.call('project.read')).toMatchObject({ code: 'SENSITIVE_CONTENT' })
    expect((await f.read()).inspectionStatus?.actuallyReadCount ?? 0).toBe(0)
  } finally {
    await f.close()
  }
})
test('P6-B06 evidence COMMIT failure after successful source handoff never invents a count or sends a second response', async () => {
  let fail = false
  const f = await brokerFixture({
    afterWrite: () => {
      fail = true
    },
    fault: (name) => {
      if (fail && name === 'inspection.observation')
        throw new Error('Synthetic evidence COMMIT failure')
    }
  })
  try {
    await f.grant()
    fail = false
    const before = f.writes.length
    expect(await f.call('project.read')).toMatchObject({ code: null })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(f.writes.length - before).toBe(1)
    expect((await f.read()).inspectionStatus).toMatchObject({
      actuallyReadCount: 0,
      state: 'partial'
    })
    expect(
      f.service.broker!.allows(f.peer.sessionId, { discussion_request_id: f.parentWire })
    ).toBe(false)
  } finally {
    await f.close()
  }
})
test('P6-B07 HMAC rotation ends the old inspection without mixing keys or releasing another source', async () => {
  const f = await brokerFixture()
  try {
    await f.call('project.discover')
    writeFileSync(join(f.directory, 'broker-hmac.key'), randomBytes(32))
    expect(await f.call('project.discover')).toMatchObject({ code: 'NOT_AUTHORIZED' })
    expect((await f.read()).inspectionStatus).toMatchObject({
      state: 'partial',
      discoveredCount: 2,
      actuallyReadCount: 0
    })
    const db = new DatabaseSync(join(f.directory, 'state.sqlite3'), { readOnly: true })
    expect(db.prepare('SELECT count(*) n FROM task_events').get()!.n).toBe(0)
    db.close()
  } finally {
    await f.close()
  }
})

test('P6-B08 UI workspace switch never retargets the immutable active parent', async () => {
  const f = await brokerFixture()
  try {
    await f.grant()
    const second = join(f.directory, 'Second')
    mkdirSync(second)
    writeFileSync(join(second, 'notes.custom'), 'Second workspace canary\n')
    expect(await f.choose(second)).toMatchObject({ ok: true })
    expect(await f.call('project.read')).toMatchObject({
      code: null,
      result: { content: 'Atlas\n' }
    })
  } finally {
    await f.close()
  }
})

test('P6-B09 coding role, nonREADY connection and foreign session are denied before worker admission', async () => {
  const f = await brokerFixture()
  try {
    const peer = f.peer as unknown as {
      identity: { role: string }
      sessionId: string
      connection: { state: { ready: boolean } }
    }
    await expect.poll(() => f.pool.counts.active).toBe(0)
    peer.identity.role = 'coding_task'
    expect(await f.call('project.discover')).toMatchObject({ code: 'NOT_AUTHORIZED' })
    peer.identity.role = 'discussion'
    peer.connection.state.ready = false
    expect(await f.call('project.read')).toMatchObject({ code: 'NOT_AUTHORIZED' })
    peer.connection.state.ready = true
    peer.sessionId = 'foreign_session'
    expect(await f.call('project.discover')).toMatchObject({ code: 'NOT_AUTHORIZED' })
    peer.sessionId = 'p6_fixture_session'
    expect(f.pool.counts).toEqual({ active: 0, queued: 0 })
  } finally {
    await f.close()
  }
})

test('P6-B10 replaced root is marked unavailable with historic identity preserved and requires explicit folder registration', async () => {
  const f = await brokerFixture()
  try {
    const project = f.service.store.projects()[0],
      binding = f.service.store.projectBinding(project.projectId)
    renameSync(f.workspace, join(f.directory, 'Original'))
    mkdirSync(f.workspace)
    writeFileSync(join(f.workspace, 'notes.custom'), 'Replacement\n')
    expect(
      await f.service.dispatch('projects.listFiles', {
        projectId: project.projectId,
        relativeDir: '.'
      })
    ).toMatchObject({ ok: false, error: { code: 'WORKSPACE_UNAVAILABLE' } })
    expect(
      f.service.store.projects().find((p) => p.projectId === project.projectId)?.available
    ).toBe(false)
    expect(f.service.store.projectBinding(project.projectId)).toEqual(binding)
    const chosen = await f.choose(f.workspace)
    expect(chosen).toMatchObject({ ok: true })
    if (chosen.ok)
      expect((chosen.data as { projectId: string }).projectId).not.toBe(project.projectId)
  } finally {
    await f.close()
  }
})

test('P6-B11 moved root becomes unavailable rather than silently adopting another directory or repairing its identity', async () => {
  const f = await brokerFixture()
  try {
    await expect.poll(() => f.pool.counts.active).toBe(0)
    const project = f.service.store.projects()[0],
      binding = f.service.store.projectBinding(project.projectId)
    renameSync(f.workspace, join(f.directory, 'Moved'))
    expect(
      await f.service.dispatch('projects.listFiles', {
        projectId: project.projectId,
        relativeDir: '.'
      })
    ).toMatchObject({ ok: false, error: { code: 'WORKSPACE_UNAVAILABLE' } })
    expect(
      f.service.store.projects().find((p) => p.projectId === project.projectId)?.available
    ).toBe(false)
    expect(f.service.store.projectBinding(project.projectId)).toEqual(binding)
  } finally {
    await f.close()
  }
})

test('P6-B12 S5 repeats same-handle native freshness at the actual write hook after preparation; attribute-only timestamp change is denied', async () => {
  let workspace = ''
  const f = await brokerFixture({
    beforeWrite: async (result) => {
      if (result && typeof result === 'object' && 'content' in result)
        utimesSync(join(workspace, 'notes.custom'), new Date(), new Date(1000000000000))
    }
  })
  workspace = f.workspace
  try {
    await f.grant()
    expect(await f.call('project.read')).toMatchObject({ code: 'STALE_SOURCE', result: null })
    expect((await f.read()).inspectionStatus?.actuallyReadCount ?? 0).toBe(0)
  } finally {
    await f.close()
  }
})

test('P6-B13 cursors cannot cross UI project or Discussion authority; changed source cannot reuse a prior read observation', async () => {
  const f = await brokerFixture()
  try {
    const project = f.service.store.projects()[0]
    const page = await f.service.dispatch('projects.listFiles', {
      projectId: project.projectId,
      relativeDir: '.',
      limit: 1
    })
    if (!page.ok) throw new Error('No local page')
    const cursor = (page.data as { nextCursor: string }).nextCursor
    expect(await f.call('project.discover', { cursor, limit: 1 })).toMatchObject({
      code: 'STALE_SOURCE'
    })
    await f.grant()
    expect(await f.call('project.read')).toMatchObject({ code: null })
    await expect.poll(() => f.pool.counts.active).toBe(0)
    writeFileSync(join(f.workspace, 'notes.custom'), 'New same source revision\n')
    expect(await f.call('project.read')).toMatchObject({ code: 'STALE_SOURCE' })
    expect((await f.read()).inspectionStatus).toMatchObject({
      actuallyReadCount: 1,
      state: 'partial'
    })
    const second = join(f.directory, 'Second')
    mkdirSync(second)
    writeFileSync(join(second, 'file.txt'), 'safe\n')
    const selected = await f.choose(second)
    if (!selected.ok) throw new Error('No second project')
    expect(
      await f.service.dispatch('projects.listFiles', {
        projectId: (selected.data as { projectId: string }).projectId,
        relativeDir: '.',
        cursor,
        limit: 1
      })
    ).toMatchObject({ ok: false, error: { code: 'SOURCE_STALE' } })
  } finally {
    await f.close()
  }
})
