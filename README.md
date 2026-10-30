# Shader Playground

[DEMO](https://rulers.github.io/shader-playground/)

## トップページ

`index.html` と `assets/home.css` がページを構成し、`assets/warp.js` が背景を描画します。
ビルドや外部ライブラリは不要です。リポジトリ全体を静的HTTPサーバーで配信してください。
GitHub Pagesは `main` ブランチのルート `/` です

[作者表記・MITライセンス・変更点](third_party/warp/NOTICE.md) を同梱しています。
背景を一時停止でき、OSのモーション低減設定では静止します。WebGL非対応時も作品リンクを利用できます。

## 作品

「墨の庭」「雨粒と曇りガラス」「言葉の肖像」を独立して育てるブラウザー表現の実験集です。
[rulers/kodelife-leaning](https://github.com/rulers/kodelife-leaning) の教材10・11を、ソース・生成ツール・解説・画像とともに切り出しています。

| 作品 | 動かし方 | 解説 | ライセンス |
| --- | --- | --- | --- |
| 墨の庭 / Ink Playground | [DEMO](https://rulers.github.io/shader-playground/inkplay/) | [操作と仕組み](tutorials/11_interactive_ink.md) | MIT |
| 墨が鯉になる / Ink Becomes Koi | [DEMO](https://rulers.github.io/shader-playground/ink-to-koi/) | [操作と仕組み](ink-to-koi/README.md) | MIT |
| 水のあわい / Between Depth and Light | [DEMO](https://rulers.github.io/shader-playground/koi/) | [操作と仕組み](koi/README.md) | MIT／three.js MIT |
| Heartfelt：雨粒と曇りガラス | [DEMO](https://rulers.github.io/shader-playground/rain/) | [設定と仕組み](tutorials/10_heartfelt.md) | CC BY-NC-SA 3.0 |
| 言葉の肖像：芥川龍之介 × 羅生門 | [DEMO](https://rulers.github.io/shader-playground/portraits/) | [操作と仕組み](portraits/README.md) | 実装MIT／フォントOFL等、[素材別条件](portraits/NOTICE.md) |
| 言葉の肖像：夏目漱石 × 吾輩は猫である | [DEMO](https://rulers.github.io/shader-playground/soseki/) | [操作と仕組み](soseki/README.md) | 実装MIT／three.js MIT／フォントOFL等、[素材別条件](soseki/NOTICE.md) |

## NOODLE DISCO

[DAYを体験する](https://rulers.github.io/shader-playground/noodle-disco/) — 麺をつかんで引っ張り、離すとぷるっと戻るCanvas 2D作品。外部依存・ビルド不要。[操作と実装](noodle-disco/README.md)。

[NIGHT MIXを体験する](https://rulers.github.io/shader-playground/noodle-night/) — 10月31日分。長押しでためて、離すとネオンの麺が弾ける。[操作と実装](noodle-night/README.md)。

## 言葉の肖像を動かす

添付肖像・Zen Antique Soft・本文を同梱し、外部素材配信に依存しません。Canvas 2DとModule Workerを使用します。
操作・実装・検証方法は [portraits/README.md](portraits/README.md)、素材の条件は [NOTICE](portraits/NOTICE.md) を参照してください。

## 墨の庭を動かす

WebGL2と EXT_color_buffer_float に対応するブラウザーが必要です。外部ライブラリや画像は不要です。

マウスやタッチで描画し、PNG保存できます。再読み込みで絵は消えます。
単一ファイルの `inkplay/preview.html` はオフラインでも利用できます。GitHub上ではHTMLのソースが表示されるため、Download raw fileで保存してください。

## 雨粒と曇りガラスを動かす

雨量の調整・一時停止・再生・時間のリセットができます。WebGL 2が必要です。モーション低減設定では停止状態で開き、非対応環境では静止画を表示します。外部画像や音声は読み込みません。

`third_party/heartfelt/heartfelt_kodelife.frag` を読み込んでWebGL 2向けに変換します。`rain/` のHTML・CSS・JavaScriptもCC BY-NC-SA 3.0です。

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
- ⚠️このリポジトリ全体をMITとして扱わないでください。第三者作品には上記の個別条件が適用されます。

切り出し元：[kodelife-leaning](https://github.com/rulers/kodelife-leaning/tree/62069083f16e27c156350e846cfbb7daf0676af1)。元リポジトリは変更せず、このリポジトリには新しい履歴で収録しています。
