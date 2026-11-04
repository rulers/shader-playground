# Shader Playground

WebGL・three.js・Canvas 2Dなどを使った、ブラウザー表現の実験集です。

[作品を見る](https://rulers.github.io/shader-playground/)

## 作品一覧

| 作品 | 解説 | ライセンス |
| --- | --- | --- |
| [墨の庭](https://rulers.github.io/shader-playground/inkplay/) | [操作と仕組み](tutorials/11_interactive_ink.md) | [MIT](LICENSE) |
| [Heartfelt：雨粒と曇りガラス](https://rulers.github.io/shader-playground/rain/) | [設定と仕組み](tutorials/10_heartfelt.md) | [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/)／[出典・条件](third_party/heartfelt/NOTICE.md) |
| [言葉の肖像：芥川龍之介](https://rulers.github.io/shader-playground/portraits/) | [操作と仕組み](portraits/README.md) | 実装[MIT](LICENSE)／フォントOFL等（[素材別条件](portraits/NOTICE.md)） |
| [水中のインク](https://rulers.github.io/shader-playground/inkcloud/) | [操作と仕組み](inkcloud/README.md) | [MIT](LICENSE) |
| [水のあわい](https://rulers.github.io/shader-playground/koi/) | [操作と仕組み](koi/README.md) | [MIT](LICENSE)／[three.js MIT](third_party/three/LICENSE) |
| [薄膜の万華鏡](https://rulers.github.io/shader-playground/kaleidoscope/) | [操作と仕組み](kaleidoscope/README.md) | [MIT](LICENSE) |
| [リベンジの万華鏡](https://rulers.github.io/shader-playground/revenge-kaleidoscope/) | [操作と仕組み](revenge-kaleidoscope/README.md) | [MIT](LICENSE) |
| [墨が鯉になる](https://rulers.github.io/shader-playground/ink-to-koi/) | [操作と仕組み](ink-to-koi/README.md) | [MIT](LICENSE) |
| [言葉の肖像：夏目漱石](https://rulers.github.io/shader-playground/soseki/) | [操作と仕組み](soseki/README.md) | 実装[MIT](LICENSE)／[three.js MIT](third_party/three/LICENSE)／フォントOFL等（[素材別条件](soseki/NOTICE.md)） |
| [NOODLE DISCO](https://rulers.github.io/shader-playground/noodle-disco/) | [操作と仕組み](noodle-disco/README.md) | [MIT](LICENSE) |
| [NOODLE DISCO — NIGHT MIX](https://rulers.github.io/shader-playground/noodle-night/) | [操作と仕組み](noodle-night/README.md) | [MIT](LICENSE) |
| [MAGNETIC SHAPES](https://rulers.github.io/shader-playground/magnetic-shapes/) | [操作と仕組み](magnetic-shapes/README.md) | [MIT](LICENSE) |
| [光を彫る](https://rulers.github.io/shader-playground/light-sculpture/) | [操作と仕組み](light-sculpture/README.md) | [MIT](LICENSE) |
| [花間の蝶](https://rulers.github.io/shader-playground/flower-butterflies/) | [操作と仕組み](flower-butterflies/README.md) | [MIT](LICENSE)／[three.js MIT](third_party/three/LICENSE) |

## ローカルで動かす

リポジトリのルートで静的HTTPサーバーを起動します。

```sh
python3 -m http.server 8000
```

[http://localhost:8000](http://localhost:8000) を開いてください。
操作方法・実装・生成手順は、各ディレクトリのドキュメントを参照してください。

## 公開

GitHub Pagesで、`main`ブランチのルートを公開しています。

## ライセンス

独自部分は[MIT](LICENSE)ですが、リポジトリ全体がMITではありません。作品・素材ごとの利用条件は上表と各ディレクトリのLICENSE・NOTICEを確認してください。

トップページ背景の作者表記・MITライセンスは[NOTICE](third_party/warp/NOTICE.md)に記載しています。
