import { StoreError } from '../storage/database'

// Audited engine 834d0ca: structured outcome exists; engine-owned start and
// cooperative cancellation do not. No config/environment/Renderer override.
export const CODING_BLOCKED_MESSAGE =
  'Real coding is unavailable: engine lifecycle and cooperative cancellation integration require separate approval. No task was admitted or started.'
export class CodingUnavailable extends StoreError {
  constructor() {
    super('RUNTIME_NOT_READY')
  }
}
export function requireCodingEngine(): never {
  throw new CodingUnavailable()
}
