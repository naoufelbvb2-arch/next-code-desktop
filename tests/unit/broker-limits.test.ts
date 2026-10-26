// @vitest-environment node
import { test, expect } from 'vitest'
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { brokerFixture, workerFixture } from '../fixtures/broker'
import { BrokerPool } from '../../electron/main/broker/pool'
import { DatabaseCore } from '../../electron/main/storage/database'

const pause = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms))
const hasContent = (value: unknown) => !!value && typeof value === 'object' && 'content' in value
function gate() {
  let release!: () => void
  return {
    wait: new Promise<void>((r) => {
      release = r
    }),
    release: () => release()
  }
}

test('P6-L01 failed source pipe never increments a durable read or sends a second response', async () => {
  const f = await brokerFixture({ failWrite: hasContent })
  try {
    await f.grant()
    f.call('project.read') // Deliberately unresolved: no actual pipe response.
    await pause(750)
    expect(f.writes.filter((w) => hasContent(w.result))).toHaveLength(0)
    expect((await f.read()).inspectionStatus?.actuallyReadCount ?? 0).toBe(0)
  } finally {
    await f.close()
  }
})

test('P6-L02 revoke wins before the authenticated write scheduling; prepared content is never released', async () => {
  const prepared = gate(),
    proceed = gate()
  const f = await brokerFixture({
    beforeWrite: async (result) => {
      if (hasContent(result)) {
        prepared.release()
        await proceed.wait
      }
    }
  })
  try {
    await f.grant()
    const reading = f.call('project.read')
    await prepared.wait
    const project = f.service.store.projects()[0]
    const grants = await f.service.dispatch('disclosures.list', { projectId: project.projectId })
    if (!grants.ok) throw new Error('No grant')
    const consentId = (grants.data as { consentId: string }[])[0].consentId
    expect(
      await f.service.dispatch('disclosures.revoke', {
        consentId,
        clientMutationId: 'revoke_before_write'
      })
    ).toMatchObject({ ok: true })
    proceed.release()
    expect(await reading).toMatchObject({ code: 'NOT_AUTHORIZED', result: null })
    expect((await f.read()).inspectionStatus).toMatchObject({
      actuallyReadCount: 0,
      state: 'partial'
    })
  } finally {
    proceed.release()
    await f.close()
  }
})

test('P6-L03 30 discover calls and 1000 returned entries are independent parent ceilings', async () => {
  const f = await brokerFixture()
  try {
    for (let n = 0; n < 30; n++)
      expect(await f.call('project.discover', { limit: 1 })).toMatchObject({ code: null })
    expect(await f.call('project.discover', { limit: 1 })).toMatchObject({ code: 'RESOURCE_LIMIT' })
    // Repeated inventory is evidence-deduplicated, but still consumes requests.
    expect((await f.read()).inspectionStatus?.discoveredCount).toBe(1)
  } finally {
    await f.close()
  }
  const many = await brokerFixture()
  try {
    for (let n = 0; n < 98; n++) writeFileSync(join(many.workspace, `item-${n}.txt`), 'safe\n')
    for (let n = 0; n < 10; n++)
      expect(await many.call('project.discover')).toMatchObject({ code: null })
    expect(await many.call('project.discover')).toMatchObject({ code: 'RESOURCE_LIMIT' })
    expect((await many.read()).inspectionStatus?.discoveredCount).toBe(100)
  } finally {
    await many.close()
  }
}, 60000)

test('P6-L04 24 distinct files and 40 reads cannot be bypassed by repeating a subject', async () => {
  const f = await brokerFixture()
  try {
    await f.grant()
    for (let n = 0; n < 25; n++) writeFileSync(join(f.workspace, `read-${n}.txt`), 'safe\n')
    for (let n = 0; n < 24; n++)
      expect(await f.call('project.read', { path: `read-${n}.txt` })).toMatchObject({ code: null })
    expect(await f.call('project.read', { path: 'read-24.txt' })).toMatchObject({
      code: 'RESOURCE_LIMIT'
    })
    for (let n = 0; n < 14; n++)
      expect(await f.call('project.read', { path: 'read-0.txt' })).toMatchObject({ code: null })
    expect(await f.call('project.read', { path: 'read-0.txt' })).toMatchObject({
      code: 'RESOURCE_LIMIT'
    })
    await pause()
    expect((await f.read()).inspectionStatus?.actuallyReadCount).toBe(24)
  } finally {
    await f.close()
  }
}, 60000)

test('P6-L05 actual UTF8 released-byte and complete-file scan budgets never overflow', async () => {
  const f = await brokerFixture()
  try {
    await f.grant()
    writeFileSync(join(f.workspace, 'wide.txt'), '\u{1f680}'.repeat(16383) + '\n')
    for (let n = 0; n < 4; n++)
      expect(await f.call('project.read', { path: 'wide.txt' })).toMatchObject({ code: null })
    expect(await f.call('project.read', { path: 'wide.txt' })).toMatchObject({
      code: 'RESOURCE_LIMIT'
    })
  } finally {
    await f.close()
  }
  const large = await brokerFixture()
  try {
    await large.grant()
    writeFileSync(join(large.workspace, 'large.txt'), 'ok\n' + ' '.repeat(8388608 - 3))
    for (let n = 0; n < 8; n++)
      expect(await large.call('project.read', { path: 'large.txt' })).toMatchObject({ code: null })
    expect(await large.call('project.read', { path: 'large.txt' })).toMatchObject({
      code: 'RESOURCE_LIMIT'
    })
    writeFileSync(join(large.workspace, 'oversize.txt'), ' '.repeat(8388609))
    const project = large.service.store.projects()[0]
    expect(
      await large.service.dispatch('projects.previewFile', {
        projectId: project.projectId,
        relativePath: 'oversize.txt',
        range: { startLine: 1, endLine: 1 }
      })
    ).toMatchObject({ ok: false, error: { code: 'RESOURCE_LIMIT' } })
  } finally {
    await large.close()
  }
}, 60000)

test.each(['missing', 'rotated'])(
  'P6-L06 actual WAL backup/restore with %s HMAC starts a new partial inspection and never reuses subject identity',
  async (mode) => {
    const f = await brokerFixture()
    await f.grant()
    await f.call('project.read')
    await pause()
    const oldCursor = await f.call('project.discover', { limit: 1 })
    const backup = join(f.directory, 'backup.sqlite3'),
      restored = join(f.directory, 'restored.sqlite3')
    await f.service.store.backupTo(backup)
    await f.close()
    const keyPath = join(f.directory, 'broker-hmac.key'),
      oldKey = readFileSync(keyPath)
    if (mode === 'missing') unlinkSync(keyPath)
    else writeFileSync(keyPath, Buffer.alloc(32, 0x5a))
    await DatabaseCore.restoreTo(backup, restored)
    const next = await brokerFixture({
      reuseDirectory: f.directory,
      databaseName: 'restored.sqlite3'
    })
    try {
      expect(readFileSync(keyPath).equals(oldKey)).toBe(false)
      expect(
        await next.call('project.discover', {
          limit: 1,
          cursor: (oldCursor.result as { next_cursor: string }).next_cursor
        })
      ).toMatchObject({ code: 'STALE_SOURCE' })
      expect(await next.call('project.read')).toMatchObject({ code: null })
      await pause()
      const db = new DatabaseSync(restored, { readOnly: true })
      try {
        const observations = db
          .prepare(
            "SELECT inspection_id,subject_key FROM inspection_observations WHERE observation_kind='read_file'"
          )
          .all()
        expect(observations).toHaveLength(2)
        expect(new Set(observations.map((r) => r.inspection_id)).size).toBe(2)
        expect(new Set(observations.map((r) => r.subject_key)).size).toBe(2)
        expect(
          db
            .prepare('SELECT state FROM project_inspections')
            .all()
            .every((r) => r.state === 'partial' || r.state === 'reading')
        ).toBe(true)
        expect(JSON.stringify(observations)).not.toContain('Atlas')
      } finally {
        db.close()
      }
    } finally {
      await next.close()
    }
  },
  30000
)

test('P6-L07 real native workers enforce two active, sixteen global queued, four per parent, fair UI access and cancellation', async () => {
  const f = await brokerFixture(),
    pool = new BrokerPool(await workerFixture()),
    hold = gate(),
    entered = gate()
  const jobs: Promise<unknown>[] = [],
    job = { action: 'register' as const, root: f.workspace, path: '.' }
  let active = 0,
    maximum = 0,
    ticks = 0
  const timer = setInterval(() => ticks++, 5)
  const execute = async () => {
    active++
    maximum = Math.max(maximum, active)
    if (active === 2) entered.release()
    await hold.wait
    active--
  }
  const add = (parent: string) => {
    const p = pool.run(parent, job, execute).catch((error) => error.code)
    jobs.push(p)
    return p
  }
  try {
    add('a')
    add('b')
    await entered.wait
    for (const parent of ['a', 'b', 'ui:1', 'c']) for (let n = 0; n < 4; n++) add(parent)
    expect(pool.counts).toEqual({ active: 2, queued: 16 })
    expect(await add('d')).toBe('RESOURCE_LIMIT')
    pool.abort('c')
    expect(pool.counts.queued).toBe(12)
    expect(await add('a')).toBe('RESOURCE_LIMIT')
    await pause(40)
    expect(ticks).toBeGreaterThan(2)
    hold.release()
    await Promise.all(jobs)
    expect(maximum).toBe(2)
  } finally {
    clearInterval(timer)
    hold.release()
    pool.close()
    await f.close()
  }
}, 30000)

test('P6-L08 real wall-clock queued work expires within the 30 second operation ceiling without starving Main', async () => {
  const f = await brokerFixture(),
    pool = new BrokerPool(await workerFixture()),
    hold = gate(),
    entered = gate()
  const job = { action: 'register' as const, root: f.workspace, path: '.' }
  const first = pool
    .run('parent', job, async () => {
      entered.release()
      await hold.wait
    })
    .catch((error) => error.code)
  await entered.wait
  const start = performance.now()
  let ticks = 0
  const timer = setInterval(() => ticks++, 50)
  try {
    const queued = pool
      .run('parent', job, () => {
        throw new Error('Expired job executed')
      })
      .catch((error) => error.code)
    expect(await queued).toBe('RESOURCE_LIMIT')
    expect(performance.now() - start).toBeGreaterThanOrEqual(29500)
    expect(performance.now() - start).toBeLessThan(35000)
    expect(ticks).toBeGreaterThan(100)
  } finally {
    clearInterval(timer)
    hold.release()
    await first
    pool.close()
    await f.close()
  }
}, 45000)

test('P8-B01 timed-out native worker does not release its parent or global capacity before the Main handler drains', async () => {
  const f = await brokerFixture(),
    pool = new BrokerPool(await workerFixture()),
    hold = gate(),
    entered = gate()
  let nextExecuted = false
  const job = { action: 'register' as const, root: f.workspace, path: '.' }
  const first = pool
    .run(
      'parent',
      job,
      async () => {
        entered.release()
        await hold.wait
      },
      undefined,
      1500
    )
    .catch((error) => error.code)
  try {
    await entered.wait
    const next = pool.run(
      'parent',
      job,
      () => {
        nextExecuted = true
        return 'next'
      },
      undefined,
      5000
    )
    expect(await first).toBe('RESOURCE_LIMIT')
    await pause(100) // Observe the forbidden overlap after native release, not an exit certificate.
    expect(nextExecuted).toBe(false)
    expect(pool.counts).toEqual({ active: 1, queued: 1 })
    hold.release()
    expect(await next).toBe('next')
  } finally {
    hold.release()
    await first
    pool.close()
    await f.close()
  }
}, 15000)

test('P6-L09 actual 90 second parent window expires independently of the 30 second per-operation deadline', async () => {
  const f = await brokerFixture()
  try {
    await f.grant()
    await pause(90050)
    expect(await f.call('project.read')).toMatchObject({ code: 'RESOURCE_LIMIT' })
    expect((await f.read()).inspectionStatus?.actuallyReadCount ?? 0).toBe(0)
  } finally {
    await f.close()
  }
}, 110000)
