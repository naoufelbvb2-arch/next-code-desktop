import { DatabaseSync, backup, type SQLInputValue } from 'node:sqlite'
import { closeSync, existsSync, mkdirSync, openSync } from 'node:fs'
import { dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { DDL, MIGRATION, TABLES } from './schema'
import type { UiErrorCode } from '../../../contracts/ipc-dtos'

export class StoreError extends Error {
  constructor(readonly code: UiErrorCode) {
    super(code)
    this.name = 'StoreError'
  }
}
export const refuse = (code: UiErrorCode): never => {
  throw new StoreError(code)
}
export const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex')
export type Row = Record<string, any>
export interface DatabaseOptions {
  now?: () => number
  fault?: (operation: string) => void
}
const signature = (db: DatabaseSync) =>
  JSON.stringify(
    db
      .prepare(
        "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name"
      )
      .all()
  )
let expectedSignature: string | undefined
function expected() {
  if (expectedSignature) return expectedSignature
  const db = new DatabaseSync(':memory:')
  try {
    db.exec('PRAGMA foreign_keys=ON')
    db.exec(DDL)
    return (expectedSignature = signature(db))
  } finally {
    db.close()
  }
}
export function verifyDatabase(db: DatabaseSync): void {
  try {
    if (db.prepare('PRAGMA integrity_check').get()?.integrity_check !== 'ok')
      refuse('DATABASE_UNAVAILABLE')
    const migrations = db
      .prepare('SELECT version,checksum FROM schema_migrations ORDER BY version')
      .all()
    if (
      migrations.length !== 1 ||
      migrations[0].version !== MIGRATION.version ||
      migrations[0].checksum !== MIGRATION.checksum ||
      signature(db) !== expected()
    )
      refuse('DATABASE_UNAVAILABLE')
    if (db.prepare('PRAGMA foreign_key_check').all().length) refuse('DATABASE_UNAVAILABLE')
    const names = db
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all()
      .map((r) => r.name)
    if (JSON.stringify(names) !== JSON.stringify(Object.keys(TABLES).sort()))
      refuse('DATABASE_UNAVAILABLE')
  } catch {
    refuse('DATABASE_UNAVAILABLE')
  }
}
function inspect(path: string): void {
  let db: DatabaseSync | undefined
  try {
    db = new DatabaseSync(path, { readOnly: true })
    db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000')
    verifyDatabase(db)
  } catch {
    refuse('DATABASE_UNAVAILABLE')
  } finally {
    db?.close()
  }
}

export class DatabaseCore {
  protected readonly db: DatabaseSync
  protected readonly now: () => number
  private readonly fault?: DatabaseOptions['fault']
  private inTransaction = false
  constructor(
    readonly path: string,
    options: DatabaseOptions = {}
  ) {
    this.now = options.now ?? Date.now
    this.fault = options.fault
    const existing = existsSync(path)
    if (existing)
      inspect(path) // Never reset/recreate an existing invalid file.
    else mkdirSync(dirname(path), { recursive: true })
    let opened: DatabaseSync | undefined
    try {
      opened = new DatabaseSync(path)
      this.db = opened
      opened.exec(
        'PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA trusted_schema=OFF'
      )
      if (!existing)
        this.transaction('migration', () => {
          opened!.exec(DDL)
          opened!
            .prepare('INSERT INTO schema_migrations(version,checksum,applied_at) VALUES(?,?,?)')
            .run(MIGRATION.version, MIGRATION.checksum, this.timestamp())
          opened!.prepare('INSERT INTO active_coding_slot(slot_id,task_id) VALUES(1,NULL)').run()
        })
      verifyDatabase(opened)
    } catch (error) {
      opened?.close()
      throw error instanceof StoreError ? error : new StoreError('DATABASE_UNAVAILABLE')
    }
  }
  protected timestamp(): string {
    return new Date(this.now()).toISOString()
  }
  protected all(sql: string, ...args: SQLInputValue[]): Row[] {
    return this.db.prepare(sql).all(...args)
  }
  protected get(sql: string, ...args: SQLInputValue[]): Row | undefined {
    return this.db.prepare(sql).get(...args)
  }
  protected run(sql: string, ...args: SQLInputValue[]) {
    return this.db.prepare(sql).run(...args)
  }
  protected transaction<T>(operation: string, work: () => T): T {
    if (this.inTransaction) refuse('INTERNAL_ERROR')
    try {
      this.db.exec('BEGIN IMMEDIATE')
      this.inTransaction = true
      const value = work()
      if (value instanceof Promise) refuse('INTERNAL_ERROR')
      this.fault?.(operation)
      this.db.exec('COMMIT')
      return value
    } catch (error) {
      if (this.inTransaction) {
        try {
          this.db.exec('ROLLBACK')
        } catch {
          /* Preserve the original failure. */
        }
      }
      throw error instanceof StoreError ? error : new StoreError('DATABASE_UNAVAILABLE')
    } finally {
      this.inTransaction = false
    }
  }
  protected snapshot<T>(work: () => T): T {
    if (this.inTransaction) return work()
    this.db.exec('BEGIN')
    try {
      const result = work()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      try {
        this.db.exec('ROLLBACK')
      } catch {}
      throw error
    }
  }
  async backupTo(target: string): Promise<void> {
    if (this.inTransaction || existsSync(target)) refuse('BAD_INPUT')
    // Reserve a new target exclusively; never overwrite an existing backup.
    mkdirSync(dirname(target), { recursive: true })
    closeSync(openSync(target, 'wx'))
    try {
      await backup(this.db, target)
      inspect(target)
    } catch {
      refuse('DATABASE_UNAVAILABLE')
    } // Failed evidence remains; no deletion.
  }
  static async restoreTo(source: string, newTarget: string): Promise<void> {
    inspect(source)
    if (existsSync(newTarget)) refuse('BAD_INPUT')
    mkdirSync(dirname(newTarget), { recursive: true })
    closeSync(openSync(newTarget, 'wx'))
    const db = new DatabaseSync(source, { readOnly: true })
    try {
      db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000')
      await backup(db, newTarget)
      inspect(newTarget)
    } catch {
      refuse('DATABASE_UNAVAILABLE')
    } finally {
      db.close()
    }
  }
  close(): void {
    this.db.close()
  }
}
