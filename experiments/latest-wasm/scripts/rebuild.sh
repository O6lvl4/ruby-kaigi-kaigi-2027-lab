#!/usr/bin/env bash
# Linux x86_64 reproducible-source build. No production deployment.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=${FOUNDATION_BUILD_ROOT:-"$ROOT/.build"}
mkdir -p "$WORK/downloads" "$WORK/core" "$WORK/rails" "$WORK/evidence" "$WORK/home"
export HOME="$WORK/home" XDG_CACHE_HOME="$WORK/home/.cache" BUNDLE_USER_HOME="$WORK/home/.bundle"
export GEM_HOME="$WORK/tool-gems"
export GEM_PATH="$GEM_HOME:$(ruby -rrubygems -e 'print Gem.default_dir')"
export PATH="$GEM_HOME/bin:$PATH"
ruby -e 'abort "Use host Ruby 4.0.7 for this verified build recipe" unless RUBY_VERSION == "4.0.7"'
test "$(uname -m)" = x86_64 || { echo 'This recipe currently verifies Linux x86_64 only'; exit 1; }
fetch() { local url=$1 path=$2 sha=$3; test -f "$path" || curl -fL --retry 2 "$url" -o "$path"; echo "$sha  $path" | sha256sum -c -; }
fetch https://cache.ruby-lang.org/pub/ruby/4.0/ruby-4.0.7.tar.gz "$WORK/downloads/ruby-4.0.7.tar.gz" 911ace20f90d068ca0e4dda6d0e4f0f81e52e52f2dd4f4004c721e253412e82d
fetch https://rubygems.org/downloads/ruby_wasm-2.10.1-x86_64-linux.gem "$WORK/downloads/ruby_wasm-2.10.1-x86_64-linux.gem" 728e29dc688246572b56dcef1c7b131431d07865320c9b8434dd1ccdfd63db2b
if ! test -d "$WORK/ruby-4.0.7"; then tar -xzf "$WORK/downloads/ruby-4.0.7.tar.gz" -C "$WORK"; fi
gem install --local "$WORK/downloads/ruby_wasm-2.10.1-x86_64-linux.gem" --ignore-dependencies --no-document
cp "$ROOT/Gemfile.core" "$WORK/core/Gemfile"
cp "$ROOT/Gemfile.core.lock" "$WORK/core/Gemfile.lock"
cp "$ROOT/Gemfile" "$WORK/rails/Gemfile"
cp "$ROOT/Gemfile.lock" "$WORK/rails/Gemfile.lock"
export BUNDLE_PATH="$WORK/gems" BUNDLE_FROZEN=true
export BUNDLE_GEMFILE="$WORK/core/Gemfile"
bundle install --jobs 2 --retry 2
export RUBY_WASM_ROOT="$WORK/core-build" WASM_NO_MMAP=1 BUILD_JOBS=2
export WASM_OPT="$RUBY_WASM_ROOT/build/toolchain/binaryen/bin/wasm-opt"
export FOUNDATION_POSTLINK="$ROOT/scripts/postlink.sh"
ruby -rruby_wasm -rruby_wasm/cli -rbundler/setup "$ROOT/scripts/build-core.rb" build --ruby-version "$WORK/ruby-4.0.7" --build-profile full --dest-dir "$WORK/core-fs" -o "$WORK/core.wasm" 2>&1 | tee "$WORK/evidence/core-build.log"
export BUNDLE_GEMFILE="$WORK/rails/Gemfile"
bundle install --jobs 2 --retry 2
bundle exec ruby "$ROOT/scripts/stage-gems.rb" "$WORK/gems-to-pack"
unset BUNDLE_GEMFILE BUNDLE_FROZEN BUNDLE_PATH
ruby "$ROOT/scripts/pack-runtime.rb" "$WORK/core.wasm" "$WORK/gems-to-pack" "$ROOT/app" "$ROOT/compat" "$ROOT/scripts/proof.rb" "$WORK/foundation.wasm"
(cd "$ROOT" && npm ci --ignore-scripts --no-audit --no-fund)
node "$ROOT/scripts/strip-and-manifest.mjs" "$WORK/foundation.wasm" "$ROOT/browser/foundation.wasm"
cp "$ROOT/node_modules/@ruby/wasm-wasi/dist/browser.umd.js" "$ROOT/browser/ruby-browser.umd.js"
node "$ROOT/scripts/probe-rails.mjs" "$ROOT/browser/foundation.wasm" | tee "$WORK/evidence/rails-proof.jsonl"
node "$ROOT/scripts/inspect-wasm.mjs" "$ROOT/browser/foundation.wasm" | tee "$WORK/evidence/module.json"
echo 'Build and Node proof finished. Physical iPhone validation is still required.'
