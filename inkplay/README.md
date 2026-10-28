# 墨の庭 / Ink Playground

マウスやタッチでインクを落とし、にじみと色の重なりを描く2Dアプリです。

## 試す

[preview.html](preview.html)をダウンロードしてブラウザーで開きます。WebGL2と浮動小数点描画（EXT_color_buffer_float）が必要です。ネット接続は不要です。

- マウス移動またはドラッグで描画
- 筆の太さ・色・にじみを調整
- 一時停止・白紙へのリセット・PNG保存

絵は再読み込みで消えるため、残したい作品はPNGで保存してください。詳しい操作と仕組みは[チュートリアル11](../tutorials/11_interactive_ink.md)、検証結果は[VALIDATION.md](VALIDATION.md)を参照してください。

## 開発

`src/`のシェーダーと`app.js`を編集し、リポジトリのルートで実行します。

```sh
python3 inkplay/tools/build.py
```

GLSL 150と配布用の`preview.html`を生成します。ライセンスは[MIT](../LICENSE)です。
