# RubyKaigiKaigi 2027

RubyKaigiKaigi 2027は、RubyKaigi 2027 宮崎開催の公開情報を読むための非公式ガイドです。公式に掲載された日程・会場、会場公式のアクセス情報、確認範囲内でまだ見つからない詳細、提案の確認リストを分けて掲載しています。情報確認日は 2026年10月8日です。個人による非公式のまとめであり、主催者の承認・提携を示すものではありません。

ホームのまとめ自体を、ブラウザ内の本物の Ruby/Wasm・Rails で生成します。軽量な初期 HTML は起動中・失敗時の案内だけで、静的なまとめを成功表示として代用しません。ブラウザの Worker → Rack → SummaryController → ActionView ERB → HTML レスポンス、という経路です。Ruby の PreparationSnapshot が公開情報を組み立て、同じ内容を /summary.json でも返します。

起動には約62 MiB の Ruby/Wasm が必要です。失敗時はエラー詳細・再試行・診断情報のコピーを表示します。読み取りモードでは技術デモの PGlite DB を開かず、DuckDB も起動しません。PGlite・DuckDB の実験は lab.html に残しています。iPhone 実機の互換性は未検証です。

- 公開版に含めるのは公式サイトで確認した公開情報だけです
- 担当者、会議内容、非公開メール、未確定の期限、架空の進捗を掲載しません
- 提案は決定事項・担当済みのタスクとして扱いません
- 技術デモのデータは架空であり、開催準備の実績ではありません

## GitHub Pages

GitHub Actions が Node/Wasm テスト、プロジェクト用サブパスのビルド、COOP/COEP なしの Chromium E2E を通過してから Pages に配信します。配信後は公開 URL に対して再度フォーム保存・再読み込み・ブラウザ終了/再起動をテストします。

公開 URL: https://o6lvl4.github.io/ruby-kaigi-lab/

技術デモの DB のデータは各閲覧者のブラウザ内に保存され、GitHub へ送信されません。初回ロードは大きいため Wi-Fi とデスクトップ Chrome を推奨します。DuckDB は単一スレッド版を使い、SharedArrayBuffer や特殊なレスポンスヘッダーを要求しません。

## 技術デモを試す

Node.js 22 以上、npm、Chromium 系のブラウザを用意してください。

```sh
npm ci
npm run setup:runtime
npm run dev
```

表示されたローカル URL では、Ruby/Wasm と Rails の起動後にまとめページを読めます。技術デモを試す場合は、ページ下部の「技術デモを開く」から lab.html を開いてください。技術デモの初回は 79 MiB の Ruby/Rails Wasm に加え、PGlite と DuckDB の Wasm を読み込みます。メモリ消費の小さいデモではありません。

1. 架空の名前・種類・人数・概算費用を入力して「Rails で検証して保存」
2. 候補一覧と種類別の集計を確認
3. ブラウザを終了し、同じブラウザプロファイル・同じ URL で再度開く
4. 候補と集計が復元されることを確認

同時編集を避けるため、Web Locks API で同じオリジンの書き込みタブを 1 つに制限しています。2 つ目のタブは閉じてください。データは端末ローカルです。サイトデータの削除、プライベートモード、ストレージ退避などで失われる可能性があり、バックアップや同期の代わりにはなりません。

## 技術デモの構成

```
フォーム
  → Dedicated Worker のメッセージキュー
  → ruby.wasm 上の Rails.application.call（Rack）
  → ActionController + ActiveRecord の検証・保存
  → wasmify-rails PGlite adapter
  → PGlite PostgreSQL / idb://rubykaigi-miyazaki-v1
  → Rails GET /venues による読み出し
  → DuckDB-Wasm の独立した分析用コピー
  → GROUP BY category / COUNT / SUM
```

Rails API を JavaScript で模倣していません。Ruby コードで Rails Application・Controller・Model を定義しています。PGlite が正本、DuckDB は毎回作り直せる派生データです。Rails はサーバープロセスではなく Wasm 内で動きます。ローカルの Vite は静的ファイルを配るためだけに使います。

今回は最小の検証用に Dedicated Worker + RPC を使い、Service Worker による HTTP interception、PWA インストール、完全オフライン起動は実装していません。画面は JavaScript/HTML、検証・書き込み・読み出しは Rails です。

## ランタイムの由来

ネイティブ Ruby や Wasm のコンパイル環境を要求しないよう、palkan の公式サンプルで公開されている実物の app.wasm をベースにしています。付属の取得スクリプトは HTTPS と SHA-256 を検証し、そのバイナリに含まれる Ruby / Rails と依存 gem を使用します。公式サンプルのブログは起動せず、同梱した Ruby アプリを仮想ファイルシステムの /demo に読み込んで起動します。

- 出典: https://github.com/palkan/rails-15min-blog-on-wasm
- 配布元: https://rails-blog-on-wasm.vladem.com/app.wasm
- 確認したソースコミット: 073e891248b3506fab6ecbe6c096f4abcfa87de1
- バイナリ SHA-256: de9cc366e32e24a13b58b7bf1409744fd50159d6554f8575fc325a5a4b3605d4
- 実測: Ruby 3.3.3 / Rails 8.0.1 / wasm32-wasi
- JS bridge: @ruby/wasm-wasi 2.7.0 / wasmify-rails 0.2.3
- PGlite 0.2.17 / DuckDB-Wasm npm 1.29.1-dev132.0（エンジン v1.2.2）

ソース ZIP には第三者の巨大な Wasm バイナリや node_modules は含めません。取得先の内容が変わるとスクリプトは停止します。ハッシュを確認せず書き換えないでください。これは固定済み配布物を使う再現可能なセットアップで、Ruby/Wasm の完全なソース再ビルドを保証するものではありません。

PGlite adapter と pg shim は https://github.com/palkan/wasmify-rails の 296a374fd863aa67c554d80b677b9a6cb2220fe7 から MIT ライセンスで同梱しています。ライセンスは src/ruby/vendor/LICENSE.wasmify-rails にあります。adapter の escape が引用符をそのまま返す問題を検証で確認したため、シングルクォートを二重化する最小修正を明記しています。prepared statements も有効です。

## テスト

```sh
npm test                # 実物の Rails/PGlite/DuckDB Wasm を Node で実行
npm run build          # ブラウザ用静的配布物を dist に生成
```

npm test はテスト専用の新しいディレクトリに PGlite を保存し、別プロセスで開き直します。ブラウザの IndexedDB テストと同じではありません。テスト用データは .test-data 以下に残ります。

ブラウザの確認は別ターミナルで npm run dev を実行したうえで:

```sh
npx playwright install chromium webkit
node tests/summary.mjs  # Chromium/WebKitで実物Rails/ERB・失敗・再試行・再読込を検証
npm run test:e2e         # 別ページの技術デモを検証
```

既存 Chromium を使う場合は CHROMIUM_PATH を指定できます。テストは新しい専用ブラウザプロファイルを作り、フォーム保存・Rails 検証・DuckDB 集計・2 タブ競合防止・ブラウザ終了後の復元・モバイル横スクロールを確認します。成功時に evidence にスクリーンショットと結果を保存します。

## 技術デモの制限

- 本番用途・個人情報・予約・決済向けではありません
- 古い固定 Ruby/Rails ベースです。JS 依存の npm audit は 0 件でしたが、内蔵 gem 全体のセキュリティ評価は行っていません
- upstream runtime の日時パースでクラッシュを確認したため、この最小スキーマは timestamp 列を持ちません
- 一般用途の PostgreSQL adapter 完全互換性、複雑なトランザクション、マイグレーション運用は未検証です
- 更新・削除、共有、同期、外部情報取得、公式イベント情報、実在の施設データは含みません
- オフライン再起動は保証しません。静的サーバーは必要です
- .npmrc の legacy-peer-deps は、未使用の SQLite peer dependency の prerelease 解決問題を避けるためです。SQLite は使いません

初期技術デモの検証記録: TEST_REPORT.md。現在の実行結果は GitHub Actions の verification / live-browser artifacts を参照してください。

## 読む画面の Rails/Wasm 実装

- src/ruby/summary.rb: 公開情報の Ruby オブジェクトと SummaryController
- src/ruby/views/summary/show.html.erb: ブラウザ内 ActionView が実行する ERB ビュー
- src/summary.js: Worker に Rails リクエストを送り、成功した HTML を表示する起動シェル
- tests/summary-node.mjs: 実物 Wasm で HTML/JSON の経路と ERB 展開を検証
- tests/summary.mjs: Chromium/WebKit で本物の Rails レスポンス、Wasm読込失敗時に静的成功画面を出さないこと、診断・再試行・再読込を検証

固定 Ruby/Wasm の Erubi 1.13.0 において MatchData#begin/#end を使うとテンプレートの一部が重複・破損する問題を再現したため、既存 gem ソースのその2式だけを等価な pre_match/post_match の文字数計算へ置き換える限定的な互換パッチを適用しています。Rails・ActionView・ERB の実行や出力エスケープは置き換えていません。元の Erubi: https://github.com/jeremyevans/erubi 。これは Ruby の正規表現全般や日時処理の互換性を修正したものではありません。

## 地図で読む宮崎

大きな2D地図と地点カードで「宮崎に着く」「会場へ行く」「夜の街へ」を切り替えます。`GET /map.json?scenario=arrival|venue|night` はブラウザ内の Rails が処理し、同じ絞り込み済みデータから ActionView ERB のカードと GeoJSON を返します。地点をクリックするとカードも連動します。

- 地図：Leaflet 1.9.4 と地理院タイル（淡色地図）。WebGL・APIキー・現在地取得は使いません
- 地図の出典表示と重ね合わせの説明を画面内に表示します。タイルをまとめて保存する機能やオフライン一括取得はありません
- 線は地点を結ぶ概略線です。道路形状、歩行ナビ、ライブ交通、徒歩圏半径を表しません
- 7地点の座標・出典・代表点としての精度は `src/ruby/map_places.json` に記録します
- 駅は施設代表点、文化公園前はバス停周辺、橘通り3丁目は交差点・乗換エリアの参考点です。乗車方向別の停留所位置は断定しません
- ニシタチは地元団体の公開マップ78地点の座標中央値から求めた参考点です。公式の境界や特定店舗を意味しません
- タイルが読み込めない場合も、同じ Rails 生成の地点カード・移動説明・公式出典を読み続けられます

地図の資料： https://maps.gsi.go.jp/development/ichiran.html / https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html 。国土地理院の背景地図に独自の地点と概略線を重ねたもので、国土地理院作成の移動案内ではありません。

地図のブラウザ検証： `node tests/map.mjs`（Chromium / WebKit、3つの見方、カード連動、タイル読込失敗時のテキスト継続）。

### Safari investigation: smaller release artifact and isolated check

The published runtime removes only DWARF `.debug_*` sections from the pinned upstream module:82,698,936→65,019,499bytes. The setup script verifies both hashes and byte-identical executable/data sections; generated Wasm is still not committed. See `docs/mobile-runtime.md` for measurements and limits.

`runtime-check.html` loads no Wasm by default. It reads the last locally saved startup stage, or explicitly tests Ruby alone → Rails → real ERB rendering without the map/databases. There is no external telemetry. Physical iPhone Safari failures remain unresolved until verified on a device; Linux WebKit success is not that verification.
