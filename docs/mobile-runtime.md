# Mobile runtime status and recovery

This page still executes genuine Ruby/Rails in a browser worker. Linux Chromium and WebKit checks are not physical iPhone Safari validation. A reported iPhone Safari termination remains unconfirmed on a device; the hardening below must not be described as a proven iPhone fix.

## Bounded changes (2026-10-08)

- Reading mode no longer requires ActiveRecord, its railtie, or the PGlite adapter. The separate writing lab retains all of them.
- A failed boot terminates the worker. Retrying disposes the previous Leaflet map and its window listeners. There is one active boot at a time.
- Rapid scenario selections retain only the newest pending request rather than queueing every obsolete selection. Every displayed result still comes from Rails.
- Boot checkpoints contain only build, stage, state, and timestamp in this tab's `sessionStorage`. Nothing is sent to a telemetry service. Copied diagnostics also contain the browser user-agent for troubleshooting.
- If a new page load finds an unfinished boot, it displays the last stage and waits for an explicit retry instead of automatically repeating the expensive startup. An interrupted load can also mean a manual reload or closed tab; the UI does not call it a confirmed crash.
- The ~80 MB module, pinned Ruby/Rails versions, streaming compiler, and design are unchanged.

## Measurements, not an iPhone diagnosis

Node 24 on Linux, same module, one VM. Measured `process.memoryUsage()` and exported Wasm memory at stages. RSS is process-wide and fluctuates; it is not Safari's process memory. Wasm linear memory cannot be shrunk by Ruby GC.

| Checkpoint | Previous linear memory | Reading-only hardening |
| --- | ---: | ---: |
| Ruby initialized | 102.44 MiB | 102.44 MiB |
| Rails initialized | 133.75 MiB | 127.13 MiB |
| Summary + scenario regression checks | 142.25 MiB | 130.69 MiB |
| After 120 scenario requests | 168.13 MiB | 155.81 MiB |

First-render RSS was approximately 270 MiB in both measurements; reducing linear memory is not proof of a lower Safari peak. The artifact is 82,698,936 bytes, with 17,455 defined functions, 11,326,094 bytes in the code section, and 53,125,217 bytes in the data section. File size alone does not identify a compiler-memory failure.

## Verification

Node checks verify real Rails rendering with ActiveRecord absent in reading mode, while the full lab integration remains covered. Browser checks cover interrupted-boot stage recovery, one explicit retry, normal subsequent refresh, rapid scenario changes, real Rails responses, tile failures and existing persistence tests. Physical iPhone Safari retesting is still required.

Related primary reports describe different possible failure classes, not a diagnosis of this page:
- [ruby.wasm Safari stack overflow #532](https://github.com/ruby/ruby.wasm/issues/532)
- [WebKit iOS 18.4 compilation-memory report](https://bugs.webkit.org/show_bug.cgi?id=291677)
- [WebKit optimizing-compiler memory report](https://bugs.webkit.org/show_bug.cgi?id=304810)
