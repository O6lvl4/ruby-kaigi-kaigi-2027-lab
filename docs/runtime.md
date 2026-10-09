# Ruby/Wasm ランタイム

ランタイムは2つあり、`npm run setup:runtime`（`scripts/fetch-runtime.mjs`）が SHA-256 を検証してから `public/` に置きます。ハッシュが一致しないものは実行しません。

## ガイド：Ruby 4.0.7 / Rails 8.1.4（`public/guide-runtime.wasm`）

`wasm/` のレシピで、チェックサム固定の Ruby 4.0.7 ソースと ruby.wasm 2.10.1 から CI でビルドし、GitHub Release（`guide-runtime-r1`）に置いています。Wasm に入っているのは Ruby と gem（railties・actionpack・actionview 8.1.4 ほか）だけで、アプリ本体は起動時にメモリ上の `/demo` としてマウントします。そのためアプリを変更してもランタイムの再ビルドは不要です。

- 配布元: https://github.com/O6lvl4/ruby-kaigi-kaigi-2027-lab/releases/tag/guide-runtime-r1
- SHA-256: 58e96a8136fd5d7d3e4404bec051e50064bf53c3714688219c7234ee256a416a（40,638,460 bytes）
- JS bridge: @ruby/wasm-wasi 2.10.1（`@ruby/wasm-wasi-2.10` の別名で導入）
- HTML サニタイズ（Nokogiri）とソケットは含みません。サニタイズ呼び出しは例外で止まり、生の入力を返しません。ERB の通常のエスケープは有効です
- 新しいランタイムは `Guide runtime` ワークフローを手動実行（`release_tag` を指定）して公開し、レビュー後に `scripts/fetch-runtime.mjs` の URL とハッシュを更新します
- Node でのテストには Node 24.19 以上が必要です（Node 22 の V8 ではこの Wasm がクラッシュすることを確認）

## 技術デモ：Ruby 3.3.3 / Rails 8.0.1（`public/base-app.wasm`）

技術デモ（lab.html）は ActiveRecord と PGlite を使うため、従来どおり palkan の公式サンプルで公開されている実物の app.wasm をベースにしています。付属の取得スクリプトは HTTPS と SHA-256 を検証し、そのバイナリに含まれる Ruby / Rails と依存 gem を使用します。公式サンプルのブログは起動せず、同梱した Ruby アプリを仮想ファイルシステムの /demo に読み込んで起動します。

- 出典: https://github.com/palkan/rails-15min-blog-on-wasm
- 配布元: https://rails-blog-on-wasm.vladem.com/app.wasm
- 確認したソースコミット: 073e891248b3506fab6ecbe6c096f4abcfa87de1
- バイナリ SHA-256: de9cc366e32e24a13b58b7bf1409744fd50159d6554f8575fc325a5a4b3605d4
- 実測: Ruby 3.3.3 / Rails 8.0.1 / wasm32-wasi
- JS bridge: @ruby/wasm-wasi 2.7.0 / wasmify-rails 0.2.3
- PGlite 0.2.17 / DuckDB-Wasm npm 1.29.1-dev132.0（エンジン v1.2.2）

アプリのコードは両方のランタイムで共通です。違いは `config/boot.rb`（gem の読み込み場所）と、lab の Ruby 3.3.3 だけに必要な Erubi 互換パッチに閉じ込めています。

ソース ZIP には第三者の巨大な Wasm バイナリや node_modules は含めません。取得先の内容が変わるとスクリプトは停止します。ハッシュを確認せず書き換えないでください。これは固定済み配布物を使う再現可能なセットアップで、Ruby/Wasm の完全なソース再ビルドを保証するものではありません。

PGlite adapter と pg shim は https://github.com/palkan/wasmify-rails の 296a374fd863aa67c554d80b677b9a6cb2220fe7 から MIT ライセンスで同梱しています。ライセンスは vendor/LICENSE.wasmify-rails にあります。adapter の escape が引用符をそのまま返す問題を検証で確認したため、シングルクォートを二重化する最小修正を明記しています。prepared statements も有効です。

## Safari の調査と起動チェック

The published runtime removes only DWARF `.debug_*` sections from the pinned upstream module:82,698,936→65,019,499bytes. The setup script verifies both hashes and byte-identical executable/data sections; generated Wasm is still not committed. See `docs/mobile-runtime.md` for measurements and limits.

`runtime-check.html` loads no Wasm by default. It reads the last locally saved startup stage, or explicitly tests Ruby alone → Rails → real ERB rendering without the map/databases. There is no external telemetry. Physical iPhone Safari failures remain unresolved until verified on a device; Linux WebKit success is not that verification.

