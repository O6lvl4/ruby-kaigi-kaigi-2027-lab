# RubyKaigiKaigi 2027

RubyKaigiKaigi 2027は、RubyKaigi 2027 宮崎開催の公開情報を読むための非公式ガイドです。公式に掲載された日程・会場、会場公式のアクセス情報、確認範囲内でまだ見つからない詳細、提案の確認リストを分けて掲載しています。情報確認日は 2026年10月8日です。個人による非公式のまとめであり、主催者の承認・提携を示すものではありません。

ガイドの各ページは、ブラウザ内の本物の Ruby/Wasm・Rails で生成します。軽量な初期 HTML は起動中・失敗時の案内だけで、静的なまとめを成功表示として代用しません。ブラウザの Worker → Rack → ルーティング → 各コントローラー → ActionView（レイアウト＋ERB）→ HTML レスポンス、という経路です。構成は「アーキテクチャ」の節を参照してください。

ガイドは **Ruby 4.0.7 / Rails 8.1.4** で動きます。起動には約41 MB の Ruby/Wasm が必要です。失敗時はエラー詳細・再試行・診断情報のコピーを表示します。読み取りモードでは技術デモの PGlite DB を開かず、DuckDB も起動しません。PGlite・DuckDB の実験は lab.html に残しています。iPhone 実機の互換性は未検証です。

- 公開版に含めるのは出典と確認日を明示した公開情報だけです（飲食店は公式サイト・掲載情報を区別）
- 担当者、会議内容、非公開メール、未確定の期限、架空の進捗を掲載しません
- 提案は決定事項・担当済みのタスクとして扱いません
- 技術デモのデータは架空であり、開催準備の実績ではありません

## GitHub Pages

GitHub Actions が Node/Wasm テスト、プロジェクト用サブパスのビルド、COOP/COEP なしの Chromium E2E を通過してから Pages に配信します。配信後は公開 URL に対して再度フォーム保存・再読み込み・ブラウザ終了/再起動をテストします。

公開 URL: https://o6lvl4.github.io/ruby-kaigi-kaigi-2027-lab/

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

ランタイムは2つあり、`npm run setup:runtime`（`scripts/fetch-runtime.mjs`）が SHA-256 を検証してから `public/` に置きます。ハッシュが一致しないものは実行しません。

### ガイド：Ruby 4.0.7 / Rails 8.1.4（`public/guide-runtime.wasm`）

`wasm/` のレシピで、チェックサム固定の Ruby 4.0.7 ソースと ruby.wasm 2.10.1 から CI でビルドし、GitHub Release（`guide-runtime-r1`）に置いています。Wasm に入っているのは Ruby と gem（railties・actionpack・actionview 8.1.4 ほか）だけで、アプリ本体は起動時にメモリ上の `/demo` としてマウントします。そのためアプリを変更してもランタイムの再ビルドは不要です。

- 配布元: https://github.com/O6lvl4/ruby-kaigi-kaigi-2027-lab/releases/tag/guide-runtime-r1
- SHA-256: 58e96a8136fd5d7d3e4404bec051e50064bf53c3714688219c7234ee256a416a（40,638,460 bytes）
- JS bridge: @ruby/wasm-wasi 2.10.1（`@ruby/wasm-wasi-2.10` の別名で導入）
- HTML サニタイズ（Nokogiri）とソケットは含みません。サニタイズ呼び出しは例外で止まり、生の入力を返しません。ERB の通常のエスケープは有効です
- 新しいランタイムは `Guide runtime` ワークフローを手動実行（`release_tag` を指定）して公開し、レビュー後に `scripts/fetch-runtime.mjs` の URL とハッシュを更新します
- Node でのテストには Node 24.19 以上が必要です（Node 22 の V8 ではこの Wasm がクラッシュすることを確認）

### 技術デモ：Ruby 3.3.3 / Rails 8.0.1（`public/base-app.wasm`）

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

## テスト

```sh
npm test                # 実物の Rails/PGlite/DuckDB Wasm を Node で実行
npm run build           # ブラウザ用静的配布物を dist に生成
npm run lint            # ESLint・Prettier・依存レイヤー・RuboCop・erb_lint
npm run quality:ruby    # RubyCritic（複雑度・重複・コードの臭い）
```

Ruby の lint には `bundle install` が必要です（Gemfile は開発ツール専用で、アプリの gem は Wasm に内蔵）。

npm test はテスト専用の新しいディレクトリに PGlite を保存し、別プロセスで開き直します。ブラウザの IndexedDB テストと同じではありません。テスト用データは .test-data 以下に残ります。

ブラウザの確認は別ターミナルで npm run dev を実行したうえで:

```sh
npx playwright install chromium webkit
node tests/summary.mjs  # Chromium/WebKitで実物Rails/ERB・ページ遷移・失敗・再試行・再読込を検証
npm run test:e2e         # 別ページの技術デモを検証
```

既存 Chromium を使う場合は CHROMIUM_PATH を指定できます。テストは新しい専用ブラウザプロファイルを作り、フォーム保存・Rails 検証・DuckDB 集計・2 タブ競合防止・ブラウザ終了後の復元・モバイル横スクロールを確認します。成功時に evidence にスクリーンショットと結果を保存します。

## 技術デモの制限

- 本番用途・個人情報・予約・決済向けではありません
- 技術デモは古い固定 Ruby 3.3.3 / Rails 8.0.1 ベースです。JS 依存の npm audit は 0 件でしたが、内蔵 gem 全体のセキュリティ評価は行っていません
- upstream runtime の日時パースでクラッシュを確認したため、この最小スキーマは timestamp 列を持ちません
- 一般用途の PostgreSQL adapter 完全互換性、複雑なトランザクション、マイグレーション運用は未検証です
- 更新・削除、共有、同期、外部情報取得、公式イベント情報、実在の施設データは含みません
- オフライン再起動は保証しません。静的サーバーは必要です
- .npmrc の legacy-peer-deps は、未使用の SQLite peer dependency の prerelease 解決問題を避けるためです。SQLite は使いません

初期技術デモの検証記録: TEST_REPORT.md。現在の実行結果は GitHub Actions の verification / live-browser artifacts を参照してください。

## アーキテクチャ

リポジトリ全体を Rails アプリと同じ形にしています。Ruby 側（`app/` の controllers・models・helpers・views、`config/`、`db/`、`lib/`、`vendor/`）は、そのまま Wasm 内の Rails.root（`/demo`）にマウントされ、Zeitwerk の自動読み込みで動きます。ファイルを追加しても読み込み一覧を書き換える必要はありません（`app/javascript/rails/app_files.js` が自動で集めます）。

```
app/
  controllers/      MapsController, EventsController, RestaurantsController,
                    EditionsController, MapScenariosController（+ 技術デモの VenuesController）
    concerns/       BrowserRendered（Wasm 内 ActionView が描いた印のヘッダー）
  models/           StaticRecord（db/data の JSON を読む読み取り専用モデル）と
                    Event, Restaurant, Edition, Place, MapScenario, SchematicLayout（+ Venue）
  helpers/          リンク・ナビゲーション・Google Maps の目的地リンク
  views/            layouts/application（ヘッダー・フッター）と各ページ・部分テンプレート
  javascript/
    entrypoints/    guide.js（index.html）, lab.js, runtime_check.js
    rails/          Worker（Ruby/Wasm）, RailsClient, 生成結果の検証
    navigation/     Router（ページ遷移）, ヘッダーメニュー
    pages/          ページごとの登録（パス・必要な JSON・JS）
    features/       map/, restaurants/, destinations/（機能ごと・互いに依存しない）
    lib/            Leaflet + 地理院タイルの共通部品
    runtime/        起動画面・起動記録
  assets/stylesheets/
config/             application.rb, environment.rb, routes.rb, initializers/
db/data/            出典確認済みの公開情報（event, restaurants, editions, places, map_scenarios）
lib/                WasmRequestBridge（JS ↔ Rack）
```

ルーティング（`config/routes.rb`）:

| URL | コントローラー | 内容 |
| --- | --- | --- |
| `/` | `maps#show` | 宮崎の地図 |
| `/event` | `events#show` | 開催・アクセス |
| `/restaurants`（`.json`） | `restaurants#index` | ごはん・人数 |
| `/archives`（`.json`） | `editions#index` | 過去の開催 |
| `/map/scenarios/:id.json` | `map_scenarios#show` | 地図の見方ごとの GeoJSON とカード |

起動時に全ページと必要な JSON を Rails で1回ずつ生成し、Ruby の実行ワーカーを終了してから表示します。以後のページ遷移は `Router` が生成済み HTML を差し替え、そのページの JS を付け外しします。URL は実パス（例：`/ruby-kaigi-kaigi-2027-lab/restaurants`）で、Rails の URL ヘルパーは `SCRIPT_NAME` から Pages のサブパスを含むリンクを出します。直接アクセスやリロードは `404.html`（ビルド時に `index.html` を複製）経由で同じページを開きます。旧1ページ版のアンカー（`#dining` など）は対応するページへ移ります。

JS のレイヤーは `.dependency-cruiser.cjs` で検査します（entrypoints → pages → features → lib/runtime/rails の一方向。機能同士の直接依存は禁止）。

- tests/support/rails_app.mjs: Node で同じ Rails アプリを Wasm 上に起動するヘルパー
- tests/summary-node.mjs: 実物 Wasm で各ページのルート・コントローラー・ERB・JSON を検証
- tests/summary.mjs: Chromium/WebKit で本物の Rails レスポンス、ページ遷移・直接アクセス・旧アンカー、Wasm読込失敗時に静的成功画面を出さないこと、診断・再試行・再読込を検証

技術デモの固定 Ruby 3.3.3/Wasm の Erubi 1.13.0 において MatchData#begin/#end を使うとテンプレートの一部が重複・破損する問題を再現したため、`config/initializers/erubi_wasm_compat.rb` で既存 gem ソースのその2式だけを等価な pre_match/post_match の文字数計算へ置き換える限定的な互換パッチを適用しています。Rails・ActionView・ERB の実行や出力エスケープは置き換えていません。元の Erubi: https://github.com/jeremyevans/erubi 。これは Ruby の正規表現全般や日時処理の互換性を修正したものではありません。

## 地図で読む宮崎

大きな2D地図と地点カードで「宮崎に着く」「会場へ行く」「夜の街へ」を切り替えます。`GET /map/scenarios/arrival|venue|night.json` はブラウザ内の Rails が処理し、同じ絞り込み済みデータから ActionView ERB のカードと GeoJSON を返します。地点をクリックするとカードも連動します。

- 地図：Leaflet 1.9.4 と地理院タイル（淡色地図）。WebGL・APIキー・現在地取得は使いません
- 地図の出典表示と重ね合わせの説明を画面内に表示します。タイルをまとめて保存する機能やオフライン一括取得はありません
- 線は地点を結ぶ概略線です。道路形状、歩行ナビ、ライブ交通、徒歩圏半径を表しません
- 7地点の座標・出典・代表点としての精度は `db/data/places.json`、見方ごとの導線は `db/data/map_scenarios.json` に記録します
- 駅は施設代表点、文化公園前はバス停周辺、橘通り3丁目は交差点・乗換エリアの参考点です。乗車方向別の停留所位置は断定しません
- ニシタチは地元団体の公開マップ78地点の座標中央値から求めた参考点です。公式の境界や特定店舗を意味しません
- タイルが読み込めない場合も、同じ Rails 生成の地点カード・移動説明・公式出典を読み続けられます

地図の資料： https://maps.gsi.go.jp/development/ichiran.html / https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html 。国土地理院の背景地図に独自の地点と概略線を重ねたもので、国土地理院作成の移動案内ではありません。

地図のブラウザ検証： `node tests/map.mjs`（Chromium / WebKit、3つの見方、カード連動、タイル読込失敗時のテキスト継続）。

### Safari investigation: smaller release artifact and isolated check

The published runtime removes only DWARF `.debug_*` sections from the pinned upstream module:82,698,936→65,019,499bytes. The setup script verifies both hashes and byte-identical executable/data sections; generated Wasm is still not committed. See `docs/mobile-runtime.md` for measurements and limits.

`runtime-check.html` loads no Wasm by default. It reads the last locally saved startup stage, or explicitly tests Ruby alone → Rails → real ERB rendering without the map/databases. There is no external telemetry. Physical iPhone Safari failures remain unresolved until verified on a device; Linux WebKit success is not that verification.

## ごはんと人数・過去の開催

`db/data/restaurants.json` と `db/data/editions.json` は2026年10月8日に確認した公開情報です。20件（飲食店16店・ホテル宴会場4施設）の総席数と宴会・着席予約上限を分け、2022〜2026年の公式日程・会場・プログラム・交流イベントへのリンクをまとめています。元の私的な会議記録や担当者情報は含めていません。

実物の Rails が JSON を読み、同じデータを `/restaurants.json`・`/archives.json` と ActionView ERB のカードに出力します。人数フィルターは既に生成したカードの宴会・着席予約上限だけを参照し、総席数から推定しません。人数不明の店は「人数要確認」として残します。追加リクエスト、追加 Worker、DB 起動はありません。営業時間・定休日・料理は確認できた公開情報を掲載し、未確認は明示します。ホテルは表示中の部屋の食事定員だけでフィルター判定し、スクール・シアター形式や総席数を転用しません。2027年の空席・営業・料金や同一宴会の受入可否を保証せず、公式関連イベント・予約済み店舗として扱いません。座標未検証の飲食店は地図に追加していません。

`npm test` は ERB と JSON の一致を検証し、`tests/summary.mjs` は Chromium/WebKit のデスクトップ・モバイル幅で人数フィルター、未確認表示、出典リンク、スクロール時の Worker 解放維持を検証します。Linux WebKit の成功は iPhone 実機確認ではありません。

## 住所・飲食店の地図・ナビゲーション

読む画面はヘッダーのメニューで「宮崎の地図」「開催・アクセス」「ごはん・人数」「過去の開催」の4ページに分かれ、1画面に1つの話題だけを表示します。各ページは Rails のルート（`/event`、`/restaurants` など）で、URL を共有・リロードしても同じページが開きます。Rails の生成は起動時の1回だけで、ページ切り替えで Wasm を再起動しません。モバイルは開閉式メニューで、Escape・リンク選択・履歴移動で閉じます。過去5年の公式サイトへの外部リンクもヘッダーに配置しています。

飲食店20件は一覧／地図を同じ人数・住所の町名フィルターで切り替えます。地図では確認済み全20地点を残し、条件外を淡色表示します。重なるピンは候補選択でも選べます。ホテルや商業施設のピンは建物代表点で、入口・階数の位置・安全な乗降場所を示しません。地図は選択時だけ読み込み、一覧に戻ると破棄します。追加のRailsリクエストやWorker起動はありません。

飲食店20件と元の7地点に名称・住所コピー、Google Maps検索、徒歩・車ルートのリンクを表示します。このアプリから閲覧者の現在地を取得しません。出発地はGoogle Maps側で選びます。バス停・交差点・繁華街は周辺／エリアの参考住所として明示し、宮崎神宮駅と文化公園前の住所はYahoo!マップの補助出典であることを表示します。

写真は公開サイトに載っているだけでは転載しません。今回、配信可能な実画像まで確認できた素材はないため、全件に「写真未掲載」の非写真サムネイルを使っています。架空の店舗写真は生成していません。

Google Maps URL形式: https://developers.google.com/maps/documentation/urls/get-started 。地図とコピー・メニューの繰り返し操作、背景タイル失敗時、現在地API不使用、Worker解放維持は `tests/dining-navigation.mjs` で検証します。
