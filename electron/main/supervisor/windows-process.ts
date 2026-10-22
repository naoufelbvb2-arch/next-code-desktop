import koffi from 'koffi'
import { EventEmitter } from 'node:events'
import { Readable, Writable } from 'node:stream'

// Windows only. No PID lookup, shell, taskkill, or inheritable Job handle.
// CreateProcess returns the actual handles; assignment precedes ResumeThread.
const pointer = 'void *'
let api: ReturnType<typeof load> | undefined
function load() {
  if (process.platform !== 'win32' || process.arch !== 'x64')
    throw new Error('WINDOWS_CONTAINMENT_UNAVAILABLE')
  const lib = koffi.load('kernel32.dll')
  const SA = koffi.struct({ length: 'uint32', descriptor: pointer, inherit: 'int32' })
  const SI = koffi.struct({
    cb: 'uint32',
    reserved: pointer,
    desktop: pointer,
    title: pointer,
    x: 'uint32',
    y: 'uint32',
    width: 'uint32',
    height: 'uint32',
    charsX: 'uint32',
    charsY: 'uint32',
    fill: 'uint32',
    flags: 'uint32',
    show: 'uint16',
    reservedBytes: 'uint16',
    reservedData: pointer,
    stdin: pointer,
    stdout: pointer,
    stderr: pointer,
    attributes: pointer
  })
  const PI = koffi.struct({ process: pointer, thread: pointer, pid: 'uint32', tid: 'uint32' })
  return {
    sa: SA,
    si: SI,
    pipe: lib.func(
      'int32 __stdcall CreatePipe(_Out_ void **r, _Out_ void **w, void *sa, uint32 size)'
    ),
    inherit: lib.func('int32 __stdcall SetHandleInformation(void *h, uint32 mask, uint32 flags)'),
    job: lib.func('void * __stdcall CreateJobObjectW(void *sa, void *name)'),
    setJob: lib.func(
      'int32 __stdcall SetInformationJobObject(void *h, int32 cls, void *data, uint32 size)'
    ),
    queryJob: lib.func(
      'int32 __stdcall QueryInformationJobObject(void *h, int32 cls, _Out_ void *data, uint32 size, void *returned)'
    ),
    assign: lib.func('int32 __stdcall AssignProcessToJobObject(void *job, void *process)'),
    terminateJob: lib.func('int32 __stdcall TerminateJobObject(void *job, uint32 code)'),
    terminate: lib.func('int32 __stdcall TerminateProcess(void *process, uint32 code)'),
    close: lib.func('int32 __stdcall CloseHandle(void *h)'),
    resume: lib.func('uint32 __stdcall ResumeThread(void *thread)'),
    wait: lib.func('uint32 __stdcall WaitForSingleObject(void *h, uint32 milliseconds)'),
    exitCode: lib.func('int32 __stdcall GetExitCodeProcess(void *h, _Out_ uint32 *code)'),
    times: lib.func(
      'int32 __stdcall GetProcessTimes(void *h, _Out_ void *created, _Out_ void *exited, _Out_ void *kernel, _Out_ void *user)'
    ),
    initAttributes: lib.func(
      'int32 __stdcall InitializeProcThreadAttributeList(void *list, uint32 count, uint32 flags, _Inout_ size_t *size)'
    ),
    updateAttribute: lib.func(
      'int32 __stdcall UpdateProcThreadAttribute(void *list, uint32 flags, size_t attribute, void *value, size_t size, void *previous, void *returned)'
    ),
    deleteAttributes: lib.func('void __stdcall DeleteProcThreadAttributeList(void *list)'),
    create: lib.func('CreateProcessW', 'int32', [
      'str16',
      pointer,
      pointer,
      pointer,
      'int32',
      'uint32',
      pointer,
      'str16',
      koffi.pointer(SI),
      koffi.out(koffi.pointer(PI))
    ]),
    read: lib.func(
      'int32 __stdcall ReadFile(void *h, _Out_ void *buffer, uint32 size, _Out_ uint32 *read, void *overlapped)'
    ),
    write: lib.func(
      'int32 __stdcall WriteFile(void *h, void *buffer, uint32 size, _Out_ uint32 *written, void *overlapped)'
    )
  }
}
function native() {
  return (api ??= load())
}
function check(value: unknown): void {
  if (!value) throw new Error('WINDOWS_PROCESS_FAILED')
}
export function quoteWindowsArg(value: string): string {
  if (value.includes('\0')) throw new Error('INVALID_ARGUMENT')
  return '"' + value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, '$1$1') + '"'
}

export interface LaunchSpec {
  executable: string
  args: string[]
  cwd: string
  env: Record<string, string>
}
export class WindowsLaunchError extends Error {
  constructor(readonly cleanupVerified: boolean) {
    super('WINDOWS_CONTAINMENT_UNAVAILABLE')
  }
}
export class WindowsProcess extends EventEmitter {
  readonly stdout: Readable
  readonly stderr: Readable
  readonly stdin: Writable
  readonly pid: number
  readonly creationIdentity: string
  private jobHandle: unknown
  private processHandle: unknown
  private poller?: ReturnType<typeof setInterval>
  private exited = false
  private closed = false
  private pipeHandles = new Set<unknown>()
  constructor(spec: LaunchSpec) {
    super()
    const n = native(),
      handles: unknown[] = []
    let child: { process?: unknown; thread?: unknown; pid?: number } = {}
    let attributes: Buffer | undefined
    let attributesInitialized = false
    const close = (h: unknown) => {
      if (h) n.close(h)
    }
    const pipe = () => {
      const r: unknown[] = [null],
        w: unknown[] = [null]
      const sa = { length: koffi.sizeof(n.sa), descriptor: null, inherit: 1 }
      check(n.pipe(r, w, koffi.as(sa, koffi.pointer(n.sa)), 65536))
      handles.push(r[0], w[0])
      return [r[0], w[0]]
    }
    try {
      this.jobHandle = n.job(null, null)
      check(this.jobHandle)
      // JOBOBJECT_EXTENDED_LIMIT_INFORMATION (x64), LimitFlags offset 16.
      // BREAKAWAY_OK and SILENT_BREAKAWAY_OK deliberately absent.
      const limits = Buffer.alloc(144)
      limits.writeUInt32LE(0x2000, 16)
      check(n.setJob(this.jobHandle, 9, limits, limits.length))
      const [inputR, inputW] = pipe(),
        [outputR, outputW] = pipe(),
        [errorR, errorW] = pipe()
      for (const h of [inputW, outputR, errorR]) check(n.inherit(h, 1, 0))
      const size = [0]
      n.initAttributes(null, 1, 0, size)
      if (!size[0] || size[0] > 65536) throw new Error('WINDOWS_PROCESS_FAILED')
      attributes = Buffer.alloc(size[0])
      check(n.initAttributes(attributes, 1, 0, size))
      attributesInitialized = true
      const inherited = Buffer.alloc(24)
      ;[inputR, outputW, errorW].forEach((h, i) =>
        inherited.writeBigUInt64LE(koffi.address(h), i * 8)
      )
      check(n.updateAttribute(attributes, 0, 0x20002, inherited, inherited.length, null, null))
      const si = {
        cb: koffi.sizeof(n.si),
        flags: 0x100,
        stdin: inputR,
        stdout: outputW,
        stderr: errorW,
        attributes
      }
      const command = Buffer.from(
        [spec.executable, ...spec.args].map(quoteWindowsArg).join(' ') + '\0',
        'utf16le'
      )
      const environment = Buffer.from(
        Object.entries(spec.env)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}=${v}`)
          .join('\0') + '\0\0',
        'utf16le'
      )
      check(
        n.create(
          spec.executable,
          command,
          null,
          null,
          1,
          0x08080404,
          environment,
          spec.cwd,
          si,
          child
        )
      )
      check(n.assign(this.jobHandle, child.process))
      const created = Buffer.alloc(8)
      check(n.times(child.process, created, Buffer.alloc(8), Buffer.alloc(8), Buffer.alloc(8)))
      this.creationIdentity = created.readBigUInt64LE().toString()
      this.pid = child.pid!
      this.processHandle = child.process
      for (const h of [inputR, outputW, errorW]) {
        close(h)
        handles.splice(handles.indexOf(h), 1)
      }
      this.pipeHandles = new Set([inputW, outputR, errorR])
      const reader = (h: unknown) => {
        let reading = false
        const stream = new Readable({
          highWaterMark: 65536,
          read: () => {
            if (reading || this.closed) return
            reading = true
            const buffer = Buffer.alloc(65536),
              count = [0]
            n.read.async(
              h,
              buffer,
              buffer.length,
              count,
              null,
              (error: Error | null, ok: number) => {
                reading = false
                if (this.closed) return
                if (error || !ok || !count[0]) {
                  this.pipeHandles.delete(h)
                  close(h)
                  stream.push(null)
                  return
                }
                stream.push(buffer.subarray(0, count[0]))
              }
            )
          }
        })
        return stream
      }
      this.stdout = reader(outputR)
      this.stderr = reader(errorR)
      this.stdin = new Writable({
        highWaterMark: 65536,
        write: (data: Buffer, _encoding, done) => {
          const count = [0]
          n.write.async(
            inputW,
            data,
            data.length,
            count,
            null,
            (error: Error | null, ok: number) => {
              done(error || !ok || count[0] !== data.length ? new Error('PIPE_WRITE_FAILED') : null)
            }
          )
        },
        final: (done) => {
          this.pipeHandles.delete(inputW)
          close(inputW)
          done()
        }
      })
      check(n.resume(child.thread) !== 0xffffffff)
      close(child.thread)
      child.thread = undefined
      handles.length = 0
      this.poller = setInterval(() => {
        if (!this.exited && n.wait(this.processHandle, 0) === 0) {
          this.exited = true
          const code = [0]
          n.exitCode(this.processHandle, code)
          this.emit('exit', code[0])
        }
      }, 25)
    } catch {
      let cleanupVerified = !child.process
      if (child.process) {
        // Retain uncertainty if even a suspended launch cannot be verified
        // stopped. Never equate constructor failure with an absent OS process.
        cleanupVerified = !!n.terminate(child.process, 1) && n.wait(child.process, 1000) === 0
        close(child.process)
      }
      close(child.thread)
      if (this.jobHandle) close(this.jobHandle)
      for (const h of handles) close(h)
      throw new WindowsLaunchError(cleanupVerified)
    } finally {
      if (attributesInitialized) n.deleteAttributes(attributes)
    }
  }
  activeProcesses(): number | null {
    if (this.closed) return null
    // JOBOBJECT_BASIC_ACCOUNTING_INFORMATION: ActiveProcesses at byte 40.
    const info = Buffer.alloc(48)
    if (!native().queryJob(this.jobHandle, 1, info, info.length, null)) return null
    return info.readUInt32LE(40)
  }
  terminate(): boolean {
    return !this.closed && !!native().terminateJob(this.jobHandle, 1)
  }
  get childExited() {
    return this.exited
  }
  async stop(deadlineMs = 5000): Promise<boolean> {
    if (this.closed) return false
    if (this.activeProcesses() !== 0) this.terminate()
    const until = performance.now() + deadlineMs
    while (performance.now() < until && this.activeProcesses() !== 0)
      await new Promise((r) => setTimeout(r, 25))
    return this.activeProcesses() === 0
  }
  dispose(): void {
    if (this.closed) return
    this.closed = true
    clearInterval(this.poller)
    const n = native()
    // Closing last Job handle also kills owned descendants on abrupt Main exit.
    n.close(this.jobHandle)
    for (const h of this.pipeHandles) n.close(h)
    this.pipeHandles.clear()
    n.close(this.processHandle)
  }
}
