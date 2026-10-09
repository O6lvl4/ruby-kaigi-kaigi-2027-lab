# アーキテクチャ

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

