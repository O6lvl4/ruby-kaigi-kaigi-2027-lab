# Ruby/Wasm ランタイム

ガイドも技術デモも、同じ **Ruby 4.0.7 / Rails 8.1.4** のランタイム（`public/rails-runtime.wasm`）で動きます。`npm run setup:runtime`（`scripts/fetch-runtime.mjs`）が SHA-256 を検証してから `public/` に置きます。ハッシュが一致しないものは実行しません。

## 中身と作り方

- Wasm を実行するのはブラウザ（V8・JavaScriptCore）です。このリポジトリが持っているのは、その上で動く「Rails 入りの Ruby」のビルド手順です
- `wasm/` のレシピで、チェックサム固定の Ruby 4.0.7 公式ソースを ruby.wasm 2.10.1（公式ツール）でコンパイルし、Rails 8.1.4 の gem（railties・actionpack・actionview・activerecord・activemodel ほか）を同梱しています
- アプリ本体は Wasm に入れず、起動時にメモリ上の `/demo` としてマウントします。アプリを変えてもランタイムの再ビルドは不要です
- HTML サニタイズ（Nokogiri）とソケットは含みません。サニタイズ呼び出しは例外で止まり、生の入力を返しません。ERB の通常のエスケープは有効です
- WebAssembly にはスレッドがないため、Active Record の接続は1本、接続プールの掃除スレッドは無効です（`config/database.yml`）

## 配布物

- 配布元: https://github.com/O6lvl4/ruby-kaigi-kaigi-2027-lab/releases/tag/rails-runtime-r2
- SHA-256: b28170cc9fd57c515154116c4507cb6a31451f90e534f3ec994b9df0e85aa164（43,452,267 bytes）
- JS bridge: @ruby/wasm-wasi 2.10.1 / @bjorn3/browser_wasi_shim 0.4.2
- 技術デモ: PGlite 0.2.17 / DuckDB-Wasm npm 1.29.1-dev132.0（エンジン v1.2.2）
- Node でのテストには Node 24.19 以上が必要です（Node 22 の V8 ではこの Wasm がクラッシュすることを確認）

## 更新するとき

1. `wasm/` を変える PR を作ると、CI（`Rails runtime` ワークフロー）がビルドと動作確認をします
2. 確認後、`release_tag`（例：`rails-runtime-r3`）を指定してワークフローを手動実行すると、Release に公開されます
3. `scripts/rails-runtime.mjs` の URL・SHA-256 と、`app/javascript/rails/rails_runtime.js` の URL・バイト数を更新します

## PGlite アダプター

PGlite adapter と pg shim は https://github.com/palkan/wasmify-rails の 296a374fd863aa67c554d80b677b9a6cb2220fe7 から MIT ライセンスで同梱しています。ライセンスは vendor/LICENSE.wasmify-rails にあります。adapter の escape が引用符をそのまま返す問題を検証で確認したため、シングルクォートを二重化する最小修正を明記しています。prepared statements も有効です。 Rails 8.1 の PostgreSQL アダプターは `gem "pg"` で本物の pg gem を要求するため、代役の gem 定義を登録する変更も加えています。JS 側の接続部分（`app/javascript/rails/pglite_interface.js`）も同じ出典から取り込んでいます。

## 起動チェック

`runtime-check.html` loads no Wasm by default. It reads the last locally saved startup stage, or explicitly tests Ruby alone → Rails → real ERB rendering without the map/databases. There is no external telemetry. Physical iPhone Safari failures remain unresolved until verified on a device; Linux WebKit success is not that verification.
