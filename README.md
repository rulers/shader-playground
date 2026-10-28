# Shader Playground

[トップページ](https://rulers.github.io/shader-playground/)

## トップページの開発

`index.html` と `assets/home.css` がページを構成し、`assets/warp.js` が背景を描画します。
ビルドや外部ライブラリは不要です。リポジトリ全体を静的HTTPサーバーで配信してください。
GitHub Pagesは `main` ブランチのルート `/` から公開します。

背景は [php-hacker / Warp Animation](https://codepen.io/php-hacker/pen/dyVdgRX) のコードを利用しています。
[作者表記・MITライセンス・変更点](third_party/warp/NOTICE.md) を同梱しています。
背景を一時停止でき、OSのモーション低減設定では静止します。WebGL非対応時も作品リンクを利用できます。

## 作品

「墨の庭」「雨粒と曇りガラス」「言葉の肖像」を独立して育てるブラウザー表現の実験集です。
[rulers/kodelife-leaning](https://github.com/rulers/kodelife-leaning) の教材10・11を、ソース・生成ツール・解説・画像とともに切り出しています。

| 作品 | 動かし方 | 解説 | ライセンス |
| --- | --- | --- | --- |
| 墨の庭 / Ink Playground | [preview.html](inkplay/preview.html) をダウンロードしてブラウザーで開く | [操作と仕組み](tutorials/11_interactive_ink.md) | MIT |
| Heartfelt：雨粒と曇りガラス | [ブラウザーで体験](https://rulers.github.io/shader-playground/rain/) | [設定と仕組み](tutorials/10_heartfelt.md) | CC BY-NC-SA 3.0 |
| 言葉の肖像：芥川龍之介 × 羅生門 | [ブラウザーで体験](portraits/) | [操作と仕組み](portraits/README.md) | 実装MIT／フォントOFL等、[素材別条件](portraits/NOTICE.md) |

## 言葉の肖像を動かす

[ブラウザー版](portraits/)で芥川龍之介 × 羅生門を体験できます。添付肖像・Zen Antique Soft・本文を同梱し、外部素材配信に依存しません。Canvas 2DとModule Workerを使用します。
操作・実装・検証方法は [portraits/README.md](portraits/README.md)、素材の条件は [NOTICE](portraits/NOTICE.md) を参照してください。

## 墨の庭を動かす

WebGL2と EXT_color_buffer_float に対応するブラウザーが必要です。外部ライブラリや画像は不要です。

```sh
python3 -m http.server 8766 --bind 127.0.0.1 --directory inkplay
```

http://127.0.0.1:8766/ を開きます。マウスやタッチで描画し、PNG保存できます。再読み込みで絵は消えます。
単一ファイルの `inkplay/preview.html` はオフラインでも利用できます。GitHub上ではHTMLのソースが表示されるため、Download raw fileで保存してください。

## 雨粒と曇りガラスを動かす

[ブラウザー版](https://rulers.github.io/shader-playground/rain/)では、雨量の調整・一時停止・再生・時間のリセットができます。WebGL 2が必要です。モーション低減設定では停止状態で開き、非対応環境では静止画を表示します。外部画像や音声は読み込みません。

ブラウザー版は `rain/` にあり、既存の `third_party/heartfelt/heartfelt_kodelife.frag` を読み込んでWebGL 2向けに変換します。`rain/` のHTML・CSS・JavaScriptもCC BY-NC-SA 3.0です。

KodeLifeで利用する場合はOpenGL 3.2以上／GLSL 150のフルスクリーン1 Passを用意し、`heartfelt_kodelife.frag` をFragmentへ貼り付けます。
`resolution`（vec2）をFrame → Resolution、`time`（float）をClockに接続してください。
ネイティブ `.kode` プロジェクトは含みません。原作の画像・音楽・雨音も含みません。

## 開発

Python 3のみで生成できます。

```sh
python3 inkplay/tools/build.py
python3 third_party/heartfelt/tools/build.py
```

墨の庭は `inkplay/src/`・`app.js`・`index.html` を編集後、ビルドして配布用HTMLとGLSLを更新します。
雨粒は原作を `original.glsl` に保持し、`tools/build.py` でKodeLife向けの移植版を生成します。
既存の墨の庭の検証記録は [VALIDATION.md](inkplay/VALIDATION.md) を参照してください。

## ライセンスと出典

- 墨の庭および本プロジェクト独自部分：[MIT](LICENSE)。Copyright (c) 2026 Masaaki Kurihara。
- Heartfeltの原作・移植版・描画例：[CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/)。原作者 Martijn Steinrucken / BigWIngs。作者表示・非営利・同一ライセンスでの継承が必要です。[NOTICE](third_party/heartfelt/NOTICE.md) に出典と変更点を記載しています。
- リポジトリ全体をMITとして扱わないでください。第三者作品には上記の個別条件が適用されます。

切り出し元：[kodelife-leaning](https://github.com/rulers/kodelife-leaning/tree/62069083f16e27c156350e846cfbb7daf0676af1)。元リポジトリは変更せず、このリポジトリには新しい履歴で収録しています。
