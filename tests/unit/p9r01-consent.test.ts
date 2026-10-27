// @vitest-environment node
import { test, expect } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { brokerFixture } from '../fixtures/broker'

test('R01-C02 existing Main consent never authorizes a harness provider/model/destination change; original issued route stays bound', async () => {
  const f = await brokerFixture()
  try {
    await f.grant()
    const broker = f.service.broker!
    type Binding = Parameters<typeof broker.bind>[0]
    const parent = (broker as unknown as { parents: Map<string, Binding> }).parents.get(
      f.parentWire
    )!
    for (const [key, changed] of [
      ['provider', { provider: 'r01_captured_provider_b' }],
      ['model', { model: 'r01_captured_model_b' }],
      ['destination', { destination: 'https://captured-b.invalid/chat/completions' }]
    ] as const) {
      const wire = 'r01_other_' + key
      broker.bind({ ...parent, wire, ...changed })
      expect(await f.call('project.read', {}, wire)).toMatchObject({
        result: null,
        code: 'NOT_AUTHORIZED'
      })
    }
    expect(
      await f.service.dispatch('models.setDiscussionPreference', {
        modelId: 'r01_captured_model_b',
        clientMutationId: 'r01_change_preference'
      })
    ).toMatchObject({ ok: false })
    expect(await f.call('project.read')).toMatchObject({
      code: null,
      result: { content: 'Atlas\n' }
    })
    expect(
      f.writes.filter((w) => w.result && typeof w.result === 'object' && 'content' in w.result)
    ).toHaveLength(1)
  } finally {
    await f.close()
  }
})

test('R01-C03 a second actually registered project and UI selection cannot retarget an issued source parent or inherit its grant', async () => {
  const f = await brokerFixture(),
    other = await brokerFixture()
  try {
    writeFileSync(join(other.workspace, 'notes.custom'), 'R01 project B only canary\n')
    await f.grant()
    const old = f.service.store.projects()[0].projectId
    expect(await f.choose(other.workspace)).toMatchObject({ ok: true })
    const project = f.service.store.projects().find((p) => p.projectId !== old)!
    const broker = f.service.broker!
    type Binding = Parameters<typeof broker.bind>[0]
    const parent = (broker as unknown as { parents: Map<string, Binding> }).parents.get(
      f.parentWire
    )!
    const binding = f.service.store.projectBinding(project.projectId)
    const wire = 'r01_foreign_project'
    broker.bind({ ...parent, wire, scope: binding.scope, root: binding.root })
    const denied = await f.call('project.read', {}, wire)
    writeFileSync(
      '.cache/p9r01-foreign-project-denial-final.json',
      JSON.stringify(denied, null, 2) + '\n'
    )
    expect(denied).toMatchObject({
      result: null,
      code: 'NOT_AUTHORIZED'
    })
    expect(await f.call('project.read')).toMatchObject({
      code: null,
      result: { content: 'Atlas\n' }
    })
    expect(JSON.stringify(f.writes)).not.toContain('project B only canary')
  } finally {
    await f.close()
    await other.close()
  }
})
