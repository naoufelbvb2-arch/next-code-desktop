import type { WireMessage } from '../../../contracts/wire-schema'
import { screen, selector, sensitivePath } from '../broker/policy'

// Validate display metadata before insertion/publication; never silently rewrite
// event identities/digests or let diagnostic/source bodies become UI telemetry.
export function eventDisplaySafe(frame: WireMessage): boolean {
  if (frame.type !== 'event') return false
  try {
    const data = frame.payload.data
    if ('path' in data) {
      selector(data.path)
      if (sensitivePath(data.path)) return false
    }
    const content = JSON.stringify(data)
    screen(Buffer.from(content, 'utf8'))
    if (/[A-Za-z]:[\\/]|\\\\|(?:^|[\s"'])\/(?:home|Users|tmp|etc|var)\//.test(content)) return false
    return true
  } catch {
    return false
  }
}
