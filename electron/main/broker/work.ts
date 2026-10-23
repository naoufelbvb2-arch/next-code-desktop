import { WindowsTree, type Identity, type HandleProof } from './windows-files'
import { deny, digest, screen, excerpt, selector, sensitivePath, POLICY } from './policy'

export interface Job {
  action: 'register' | 'discover' | 'read'
  root: string
  workspaceKey?: string
  path: string
  depth?: number
  start?: number
  end?: number
  maxChars?: number
  expectedMtime?: string | null
  knownFiles?: { path: string; identity: string; revision: string }[]
}
export interface Entry {
  path: string
  kind: 'file' | 'directory'
  size_bytes: number | null
  identity: string
  revision: string
}
export interface WorkResult {
  proofs?: HandleProof[]
  key: string
  root: string
  generation: string
  scannedBytes: number
  entries?: Entry[]
  excluded?: number
  partial?: boolean
  excerpt?: ReturnType<typeof excerpt> & { path: string; observed_mtime_ns: string }
  identity?: Identity
}
export function prepare(
  job: Job,
  deadline: number,
  aborted: () => boolean,
  onBytes: (count: number) => void
) {
  let tree: WindowsTree | undefined,
    scannedBytes = 0
  try {
    selector(job.path, job.action !== 'read')
    tree = new WindowsTree(job.root, job.workspaceKey, deadline, aborted)
    const result: WorkResult = {
      key: tree.key,
      root: tree.root.canonical,
      generation: POLICY,
      scannedBytes: 0
    }
    if (job.action === 'read') {
      const capture = tree.capture(
        job.path,
        job.expectedMtime ?? null,
        (n) => {
          scannedBytes += n
          onBytes(n)
        },
        (identity) => {
          const path = identity.canonical
            .slice(tree!.root.canonical.length + 1)
            .replace(/\\/g, '/')
            .toLowerCase()
          for (const known of job.knownFiles ?? []) {
            if (
              (known.path === path &&
                (known.identity !== identity.id || known.revision !== identity.revision)) ||
              (known.identity === identity.id && known.path !== path)
            )
              deny('STALE_SOURCE')
          }
        }
      )
      try {
        const text = screen(capture.bytes)
        result.excerpt = {
          path: job.path,
          ...excerpt(text, job.start!, job.end!, job.maxChars ?? 16384),
          observed_mtime_ns: capture.identity.mtimeNs
        }
        tree.verify(capture.handle, capture.identity)
        result.identity = capture.identity
      } finally {
        capture.bytes.fill(0)
      }
    } else if (job.action === 'discover') {
      if (!Number.isInteger(job.depth) || job.depth! < 1 || job.depth! > 3) deny('RESOURCE_LIMIT')
      let visited = 0,
        excluded = 0,
        partial = false
      const entries: Entry[] = [],
        marks: string[] = []
      const walk = (path: string, depth: number) => {
        tree!.check()
        const listing = tree!.entries(path)
        marks.push(
          JSON.stringify(['directory', path, listing.identity.id, listing.identity.revision])
        )
        const names = listing.entries.sort((a, b) =>
          a.name.toLowerCase() < b.name.toLowerCase()
            ? -1
            : a.name.toLowerCase() > b.name.toLowerCase()
              ? 1
              : a.name < b.name
                ? -1
                : a.name > b.name
                  ? 1
                  : 0
        )
        const seen = new Set<string>()
        for (const entry of names) {
          if (++visited > 4096) deny('RESOURCE_LIMIT')
          const relative = path === '.' ? entry.name : `${path}/${entry.name}`
          const folded = entry.name.toLowerCase()
          if (seen.has(folded)) deny('STALE_SOURCE')
          seen.add(folded)
          // Full descriptor remains transient and is never returned for excluded
          // items. Its aggregate digest only lives in a scoped in-memory cursor.
          marks.push(
            JSON.stringify([
              path,
              entry.name,
              entry.id,
              entry.size,
              entry.mtime,
              entry.attrs,
              entry.tag
            ])
          )
          try {
            selector(relative)
          } catch {
            excluded++
            continue
          }
          if (
            sensitivePath(relative, true) ||
            entry.tag ||
            entry.attrs & (0x400 | 0x40 | 0x1000 | 0x4000)
          ) {
            excluded++
            continue
          }
          const directory = !!(entry.attrs & 16),
            actual = tree!.target(relative, directory)
          if (actual.info.id.slice(16) !== entry.id) deny('STALE_SOURCE')
          if (entries.length >= 1000) deny('RESOURCE_LIMIT')
          const size = BigInt(actual.info.size)
          entries.push({
            path: relative,
            kind: directory ? 'directory' : 'file',
            size_bytes: directory || size > BigInt(Number.MAX_SAFE_INTEGER) ? null : Number(size),
            identity: actual.info.id,
            revision: actual.info.revision
          })
          if (directory) {
            if (depth < job.depth!) walk(relative, depth + 1)
            else partial = true
          }
        }
        const again = tree!.entries(path)
        const fingerprint = (items: typeof names) =>
          digest(
            JSON.stringify(
              items.slice().sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
            )
          )
        if (fingerprint(again.entries) !== fingerprint(listing.entries)) deny('STALE_SOURCE')
      }
      walk(job.path, 1)
      result.entries = entries
      result.excluded = excluded
      result.partial = partial || excluded > 0
      result.generation = digest(
        JSON.stringify([POLICY, tree.key, job.path, job.depth, marks, entries])
      )
    }
    result.scannedBytes = scannedBytes
    result.proofs = tree.proofs(job.action === 'discover')
    return { result, close: () => tree!.close() }
  } catch (error) {
    tree?.close()
    throw error
  }
}
