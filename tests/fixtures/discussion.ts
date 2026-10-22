import { mkdirSync, mkdtempSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { DiscussionService } from '../../electron/main/discussion/service'
import type { SupervisedChild } from '../../electron/main/supervisor/child'
import type { WireMessage } from '../../contracts/wire-schema'
import type { DatabaseOptions } from '../../electron/main/storage/database'

export async function discussionFixture(
  options: {
    database?: DatabaseOptions
    hold?: Promise<void>
    answer?: string
    failure?: boolean
    foreignCorrelation?: boolean
    proposal?: boolean
    summarySources?: string[]
    decisionCandidate?: boolean
  } = {}
) {
  mkdirSync('.test-profiles', { recursive: true })
  const directory = mkdtempSync(resolve('.test-profiles', 'p5-')),
    workspace = join(directory, 'empty-project')
  mkdirSync(workspace)
  let available = true,
    calls = 0
  const inputs: Record<string, unknown>[] = [],
    hints: unknown[] = []
  const peer = {
    sessionId: 'fixture_discussion',
    request: async (
      _action: string,
      input: Record<string, unknown>,
      issued: (id: string) => void
    ) => {
      calls++
      inputs.push(input)
      const id = `fixture_wire_${calls}`
      issued(id)
      if (options.hold) await options.hold
      if (options.failure) throw new Error('Synthetic ambiguous bridge failure')
      return {
        version: 1,
        type: 'response',
        message_id: `fixture_response_${calls}`,
        correlation_id: options.foreignCorrelation ? 'foreign_request' : id,
        payload: {
          status: 'completed',
          reason: null,
          result: {
            answer: options.answer ?? 'Synthetic discussion fixture',
            task_proposal: options.proposal
              ? { goal: 'Synthetic proposed goal', reason: 'Advisory only' }
              : null,
            summary_candidates: options.summarySources
              ? [
                  {
                    text: 'Derived synthetic summary',
                    source_message_ids: options.summarySources.map((id) =>
                      id === 'current' ? (input.user_message_id as string) : id
                    )
                  }
                ]
              : [],
            decision_candidates: options.decisionCandidate
              ? [{ text: 'Unapproved model choice', source_message_ids: [] }]
              : []
          }
        }
      } as WireMessage
    }
  } as unknown as SupervisedChild
  const service = new DiscussionService({
    path: join(directory, 'state.sqlite3'),
    enabled: true,
    ensure: async () => peer,
    available: () => available,
    choose: async () => workspace,
    notify: (_kind, _id, update) => hints.push(update),
    database: options.database
  })
  const project = await service.dispatch('projects.choose', null)
  if (!project.ok) throw new Error('Project fixture selection failed')
  const input = (mutation = 'send', text = 'Synthetic first turn') => ({
    draftId: 'draft',
    text,
    modelId: 'deepseek-flash',
    clientMutationId: mutation
  })
  return {
    service,
    directory,
    workspace,
    inputs,
    hints,
    peer,
    input,
    get calls() {
      return calls
    },
    setAvailable: (value: boolean) => {
      available = value
    }
  }
}
