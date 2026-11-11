// Explicit synthetic pressure, separate test SQLite; not Engine or T4 evidence.
import { workerData, parentPort } from 'node:worker_threads'
import { DatabaseSync } from 'node:sqlite'
import { createHash } from 'node:crypto'
import { canonicalJson, validateWire } from '../../contracts/jsonl'
const { path, taskId, seed, batches, batchSize, intervalMs } = workerData
const db = new DatabaseSync(path)
db.exec('PRAGMA busy_timeout=5000')
const insert = db.prepare('INSERT INTO task_events VALUES(?,?,?,?,?,?,?,?)')
const update = db.prepare(
  "UPDATE task_event_streams SET complete_through=?,max_seen=?,integrity_status='complete' WHERE task_id=?"
)
let sequence = 0
function batch(count: number) {
  const from = sequence + 1
  db.exec('BEGIN IMMEDIATE')
  try {
    for (let n = 0; n < count; n++) {
      sequence++
      const name = sequence === 1 ? 'task.started' : 'task.progress'
      const frame = validateWire({
        version: 1,
        type: 'event',
        message_id: 'r02_pressure_' + sequence,
        correlation_id: null,
        payload: {
          name,
          data: {
            task_id: taskId,
            event_id: 'r02_synthetic_' + sequence,
            sequence,
            source: 'agent_os',
            phase: 'EXECUTING',
            ...(sequence === 1
              ? {}
              : { detail: 'SYNTHETIC SQLite pressure only - not Engine evidence' })
          }
        }
      })
      insert.run(
        taskId,
        sequence,
        'r02_synthetic_' + sequence,
        'r02_synthetic_session',
        name,
        canonicalJson(frame),
        createHash('sha256').update(canonicalJson(frame.payload)).digest('hex'),
        new Date().toISOString()
      )
    }
    update.run(sequence, sequence, taskId)
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
  return from
}
batch(seed)
parentPort!.postMessage({ committed: sequence, batches: 0 })
const start = performance.now()
for (let n = 1; n <= batches; n++) {
  await new Promise((r) => setTimeout(r, intervalMs))
  const from = batch(batchSize)
  parentPort!.postMessage({
    from,
    committed: sequence,
    batches: n,
    elapsedMs: performance.now() - start
  })
}
parentPort!.postMessage({
  complete: true,
  committed: sequence,
  batches,
  elapsedMs: performance.now() - start
})
db.close()
