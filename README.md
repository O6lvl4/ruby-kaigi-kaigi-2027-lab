# RubyKaigiKaigi 2027

RubyKaigi 2027（宮崎）の公開情報を読むための、個人による非公式ガイドです。主催者の承認・提携を示すものではありません。

**公開版:** https://o6lvl4.github.io/ruby-kaigi-kaigi-2027-lab/

ページは「宮崎の地図」「開催・アクセス」「ごはん・人数」「過去の開催」の4つです。どのページも、ブラウザの中で動く本物の **Ruby 4.0.7 / Rails 8.1.4**（WebAssembly）が描画します。

## 掲載の方針

- 出典と確認日がある公開情報だけを載せます（確認日：2026年10月8日）
- 担当者・会議内容・未確定の期限・架空の進捗は載せません
- 「次に確認すること」は提案であり、決定事項ではありません

## 動かす

Node.js 24.19 以上が必要です。

```sh
npm ci
npm run setup:runtime   # Ruby/Wasm ランタイムを取得（SHA-256 を検証）
npm run dev
```

## よく使うコマンド

```sh
npm test                # Node 上の Rails/Wasm テスト
node tests/summary.mjs  # ブラウザテスト（npm run dev の起動中に、Chromium/WebKit）
npm run lint            # ESLint・Prettier・依存レイヤー・RuboCop・erb_lint
npm run build           # dist/ に静的ファイルを生成
```

Ruby の lint には `bundle install` が必要です（開発ツール専用。アプリの gem は Wasm に内蔵）。

## 構成

リポジトリは Rails アプリと同じ形です。

| 場所 | 中身 |
| --- | --- |
| `app/` | コントローラー・モデル・ビュー・ヘルパー、`app/javascript/`（ブラウザ側） |
| `config/routes.rb` | `/`・`/event`・`/restaurants`・`/archives` |
| `db/data/` | 掲載する公開情報（JSON、出典つき） |
| `wasm/` | Ruby 4.0.7 / Rails 8.1.4 ランタイムのビルド手順 |
| `tests/` | Node とブラウザのテスト |

## 詳しく

- [アーキテクチャ](docs/architecture.md)：ページの描画の流れ、ルーティング、JS のレイヤー、テスト
- [ランタイム](docs/runtime.md)：2つの Ruby/Wasm の出所・ハッシュ・更新方法
- [掲載データと出典](docs/data.md)：地図・経路・飲食店・過去開催の扱い
- [技術デモ](docs/lab.md)：PGlite・DuckDB を使う lab.html
- [モバイルでの動作](docs/mobile-runtime.md)：iPhone Safari の調査状況（実機確認は未了）
