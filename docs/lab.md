# 技術デモ（lab.html）

PGlite（IndexedDB）と DuckDB-Wasm に、Rails の検証を通した架空のデータを保存・集計する実験ページです。ガイド本体とは別のランタイム（Ruby 3.3.3 / Rails 8.0.1）で動きます。

## 技術デモを試す

`npm run dev` で開いたガイドのページ下部の「技術デモを開く」から lab.html を開いてください。技術デモの初回は 79 MiB の Ruby/Rails Wasm に加え、PGlite と DuckDB の Wasm を読み込みます。メモリ消費の小さいデモではありません。

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

## 技術デモの制限

- 本番用途・個人情報・予約・決済向けではありません
- 技術デモは古い固定 Ruby 3.3.3 / Rails 8.0.1 ベースです。JS 依存の npm audit は 0 件でしたが、内蔵 gem 全体のセキュリティ評価は行っていません
- upstream runtime の日時パースでクラッシュを確認したため、この最小スキーマは timestamp 列を持ちません
- 一般用途の PostgreSQL adapter 完全互換性、複雑なトランザクション、マイグレーション運用は未検証です
- 更新・削除、共有、同期、外部情報取得、公式イベント情報、実在の施設データは含みません
- オフライン再起動は保証しません。静的サーバーは必要です
- .npmrc の legacy-peer-deps は、未使用の SQLite peer dependency の prerelease 解決問題を避けるためです。SQLite は使いません

初期技術デモの検証記録: [TEST_REPORT.md](../TEST_REPORT.md)。現在の実行結果は GitHub Actions の verification / live-browser artifacts を参照してください。

## 公開版での扱い

GitHub Actions が Node/Wasm テスト、プロジェクト用サブパスのビルド、COOP/COEP なしの Chromium E2E を通過してから Pages に配信します。配信後は公開 URL に対して再度フォーム保存・再読み込み・ブラウザ終了/再起動をテストします。

公開 URL: https://o6lvl4.github.io/ruby-kaigi-kaigi-2027-lab/

技術デモの DB のデータは各閲覧者のブラウザ内に保存され、GitHub へ送信されません。初回ロードは大きいため Wi-Fi とデスクトップ Chrome を推奨します。DuckDB は単一スレッド版を使い、SharedArrayBuffer や特殊なレスポンスヘッダーを要求しません。

