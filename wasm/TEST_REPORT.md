# Latest Ruby / Rails Wasm proof — 2026-10-08

## Verified locally

A newly compiled, self-contained WebAssembly binary runs **Ruby 4.0.7 and Rails 8.1.4** on `wasm32-wasi`. No server Rails, static HTML fallback, old runtime blob, or version-label substitution is used.

- Genuine Rails application initialization and route dispatch
- Dynamic JSON route returns actual Ruby/Rails/platform versions
- Genuine ERB template changes when Ruby request data changes
- Script-like input, quotes, ampersands, Japanese and emoji are escaped correctly
- Unsupported HTML/CSS sanitization fails closed
- Node test uses only the packed module; no debug prelude or local WASI filesystem mount
- Asyncify exports and Wasm validation checked after the optimizer
- Existing public main is untouched

## Measurements

One self-contained Node run (Linux cloud, not iPhone):

- Artifact: **40,640,442 bytes**
- SHA256: `20ce98f8a2db894bac7009d254818cc9379bad5b04805d3f0078bb3fde893c99`
- Defined functions: **16,807**
- Code section: **12,166,697 bytes**
- Data section: **28,433,080 bytes**
- Initial linear memory: **45,481,984 bytes**
- After Rails and proof: **98,435,072 bytes (93.9 MiB)**
- Process RSS: **248,512,512 bytes (237.0 MiB)**; observed max RSS 270,208 KiB
- Compile 58 ms; Ruby boot 207 ms; Rails plus tests 3.56 s in one run

A second run under cloud contention was materially slower (compile 4.11 s, Ruby boot 8.46 s, Rails/tests 7.33 s). Do not advertise either timing as an iPhone startup promise. Both passed with the same artifact and linear-memory result.

The existing runtime was reported as 65,019,499 bytes, 17,455 functions and 11,326,094 code bytes. This experimental artifact is smaller and has fewer functions, but its code section is larger. These measures do not establish Safari crash resolution.

## Foundation finding

The official `@ruby/4.0-wasm-wasi@2.10.1` package embeds Ruby **4.0.0**, not current 4.0.7. Its Node Ruby-only boot used 335,282,176 bytes of linear memory. The custom Ruby 4.0.7 core with BigDecimal used 66,912,256 bytes. The roughly 256 MiB difference matches Ruby's shape ancestor cache reservation on wasm32. This build uses the source's existing `ac_cv_func_mmap=no` fallback; it does not remove Asyncify or Ruby exception support.

The upstream `-O3 -g` optimizer process was killed and its shell recipe masked the failure, leaving a zero-byte module. VFS validation caught it. The build now strips only DWARF before optimization, retains Asyncify, uses `-O1` and two optimizer threads, writes to a separate output, and checks size/exports/validation before replacement. The successful incremental native-extension/link stage took 286 s. A clean CI build has its own 45-minute budget and must independently pass.

## Pending / limitations

- Browser tests have **not passed locally**: shell Chromium IPC sockets were blocked, including the supported escalation; cloud Chrome could not reach the shell's localhost server; downloaded Playwright Chrome archive was empty/truncated
- Chromium/WebKit tests are delegated to the isolated draft-PR CI; results must be checked for the exact commit
- No physical iPhone test yet. Cold start, scroll, tab switching, repeated runs, reload, cancellation and Back/Forward remain a release gate
- HTML parsing/sanitization, sockets/DNS, DB, background jobs, mail and maps are outside the application proof
- Ruby stdlib uses the toolkit's full extension profile; further pruning is a separate measured optimization
- OpenSSL 3.2.0 is inherited from ruby_wasm 2.10.1, and 3.2 is out of support. The proof exposes no TLS/network/authentication. This is **not** a security-complete production stack

The source recipe pins Ruby, Rails, JS/BigDecimal, npm dependencies, build downloads and GitHub Actions. Absolute build paths may affect generated files; the recipe does not claim byte-identical binaries across different hosts. Each build records and tests its own artifact hash.
