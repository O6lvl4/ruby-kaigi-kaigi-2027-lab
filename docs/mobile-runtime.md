# Mobile runtime status and recovery

This page still executes genuine Ruby/Rails in a browser worker. Linux Chromium and WebKit checks are not physical iPhone Safari validation. A reported iPhone Safari termination remains unconfirmed on a device; the hardening below must not be described as a proven iPhone fix.

## Runtime switch (2026-10-09)

The guide, and since release `rails-runtime-r2` also the lab, run on the Ruby 4.0.7 / Rails 8.1.4 runtime built in `wasm/` (43,452,267 bytes with Active Record) instead of the 65,019,499-byte Ruby 3.3.3 module. In the Node proof the new build used about 94 MiB of linear memory after booting Rails, largely because Ruby's shape cache is no longer reserved through emulated mmap. That is a measurement on Linux, not iPhone Safari validation; the device gate below still applies.

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


## Release artifact and isolated check (2026-10-08)

The subsequent physical iPhone Safari retest still failed. The earlier hardening is not a resolution.

The release artifact now removes only nine `.debug_*` DWARF custom sections from the same checksum-pinned upstream module. Input SHA256 remains `de9cc366e32e24a13b58b7bf1409744fd50159d6554f8575fc325a5a4b3605d4`; release SHA256 is `28acbb22c853454d6b392dd4838f85051eff9d37ad0870c44ac75c17288d9e56`. Size falls from82,698,936 to65,019,499bytes (21.4%). Setup verifies that every non-custom section is byte-identical. Function names, producers and target features remain. No optimizer or runtime-version change is involved.

In one same-machine Node comparison, compile-stage RSS fell201→167MiB and first-render RSS270→250MiB. Linear memory remained about131MiB. This is a measurable reduction in input and process memory, not a proven Safari fix.

`runtime-check.html` is a lightweight landing page with no automatic Wasm or map load. It reads one localStorage record containing only build, stage, state, timestamp and source. Unlike the same-tab session recovery, this record can be read after reopening a new tab in the same browser/origin; browser data clearing/private-session termination can still erase it. Nothing is uploaded automatically.

Its explicit check runs one worker through Ruby alone, then genuine Rails initialization, then one actual ERB page response (`GET /event`). It does not load Leaflet tiles, PGlite or DuckDB, and terminates the worker after the check. Passing this check while the full guide fails would narrow the investigation; neither outcome independently identifies an OS memory kill. The main guide also records its latest stage locally, including successful initialization. A successful stage does not prove the browser remained alive afterward.

A truly smaller custom Rails bundle is feasible upstream, but would require rebuilding and validating dependency packaging. No dependency swap or unverified newer runtime has been introduced here.

## Read-only worker lifetime and persistent schematic

A later report described an immediate failure around tab switching/scrolling. That does not establish cumulative request growth or a map fault. The following bounds are deliberate improvements, not a claim of reproduced iPhone resolution.

The reading homepage now executes genuine browser Rails once to generate the HTML, runtime JSON and all three scenario responses. It then terminates the Ruby worker before map interaction; only five bounded Rails response objects remain. Repeated scenario changes do not restart Ruby or enqueue Ruby requests. The writing lab still has its own live Rails/PGlite worker.

The default map is an original Rails ERB SVG schematic with all seven verified places at fixed authored positions. Every scenario returns all seven real-coordinate features plus selected IDs; switching scenarios only changes camera/emphasis. Coordinates stay available for the optional real map. The diagram is explicitly not to scale, and its paths are not road navigation. The real map loads Leaflet/GSI only when requested, retains all markers across scenario switches, and removes the map and listeners when left.

Regression checks cover the cold page, immediate scenario switching and scrolling, fixed SVG nodes/anchors, stable real-map marker nodes, repeated map-mode disposal, zero retained read-only workers, five total Rails requests, a three-scenario cache and a20-second post-interaction observation. These are Linux Chromium/WebKit checks, not physical Safari evidence.
