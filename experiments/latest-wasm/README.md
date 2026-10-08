# Latest stable Ruby/Rails Wasm foundation experiment

Status: self-contained Node Wasm proof PASSED; browser CI and physical iPhone gate pending. See [TEST_REPORT.md](TEST_REPORT.md). This is not an iPhone fix or a production runtime.

## Targets verified 2026-10-08

- Ruby stable: **4.0.7**, released 2026-09-15. Normal maintenance.
- Rails stable: **8.1.4**, released 2026-09-24. Rails 8.1 requires Ruby >= 3.2.
- ruby.wasm toolkit: **2.10.1**, commit `cbb1e8440159c55b9c56e5359eb8e12d5a1e742d`.
- Critical distinction: official `@ruby/4.0-wasm-wasi@2.10.1` embeds **Ruby 4.0.0**, not 4.0.7. Tested RUBY_DESCRIPTION confirms this.
- Existing public runtime remains Ruby 3.3.3 / Rails 8.0.1. Its production code is untouched by this experiment.

## Baseline observations (Node on Linux, not Safari)

Official Ruby 4.0.0 + stdlib artifact: 32,555,374 bytes; SHA256 `9fe3c749730a16da9b0d1a973bb77bec164f8d958efcb7f5b81e4275ea8c5439`.
Initial Wasm linear memory: 37,355,520 bytes. After Ruby boot: 335,282,176 bytes. Process RSS approximately 484 MB. Compile 141 ms; boot 1.33 s in one measurement. These are observations, not universal performance guarantees.

Reducing Ruby GC initial slots changed boot memory by only 64 KiB. Ruby 4.0's shape cache source reserves 2^19 * 32 nodes * 16 bytes = 256 MiB on wasm32 under HAVE_MMAP. WASI emulated mmap may turn a cheap native virtual-memory reservation into linear-memory growth. The custom build will test Ruby's existing no-mmap fallback; causality is not yet established by an A/B build.

## Required gates

1. Checksum-verified Ruby 4.0.7 source, toolkit version and all gems pinned
2. Real runtime reports Ruby 4.0.7 and Rails 8.1.4, wasm32 platform
3. Rails routes produce actual ERB and JSON, modified data changes output, hostile input is escaped
4. Memory, function/code size, compile and boot measurements in an unmodified browser
5. Physical iPhone cold start, scrolling, tab switching, close/back, reload and repeated use; Linux WebKit cannot satisfy this gate
6. Root review before any production replacement

No PG, mail, jobs, maps, static HTML fallback, custom browser flags or production deployment belong to this minimal experiment. Asyncify stays enabled: Ruby exception/fiber/stack behavior requires the upstream transformation. No carry-forward of the old Erubi source patch without reproducing its need.

## Primary sources

- https://www.ruby-lang.org/en/news/2026/09/15/ruby-4-0-7-released/
- https://www.ruby-lang.org/en/downloads/branches/
- https://rubyonrails.org/category/releases
- https://guides.rubyonrails.org/maintenance_policy.html
- https://github.com/ruby/ruby.wasm/releases/tag/2.10.1
- https://github.com/ruby/ruby.wasm/blob/2.10.1/lib/ruby_wasm/cli.rb
- https://github.com/ruby/ruby/blob/v4_0_7/shape.c
- https://github.com/ruby/ruby/blob/v4_0_7/shape.h

## Explicit compatibility boundaries

Native control and the self-contained Wasm proof pass Ruby 4.0.7 / Rails 8.1.4 routing, JSON, data changes, and hostile-input / UTF-8 ERB escaping.

The initial minimal Wasm experiment excludes Nokogiri/HTML parsing. `compat/rails-html-sanitizer.rb` deliberately raises for all HTML/CSS sanitization calls. It must never be replaced with a no-op sanitizer that returns raw input. JSON reports `html_sanitization: false`; real ERB's ordinary escaping remains enabled and tested. Sockets/DNS are explicitly unsupported, while Ruby's real IPAddr parser is retained. These boundaries do not amount to complete Rails platform support.

The toolkit's bundled OpenSSL is 3.2.0. This is an inherited dependency caveat, not a claim of a fully current or security-audited stack. No network/TLS, login, user secrets or production workloads are part of the proof.

## Rebuild and test

On Linux x86_64 with Ruby 4.0.7, Bundler 4.0.20, Node 24.19.0, a C compiler, make, curl, tar and unzip:

```sh
scripts/rebuild.sh
npx playwright install --with-deps chromium webkit
npm run serve
# In another terminal:
npm run test:browser
```

CI runs the same recipe and uploads a diagnostic bundle without publishing Pages. Do not merge/promote until the browser and physical-device gates are satisfied.
