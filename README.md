# Shader Playground

WebGL・three.js・Canvas 2Dなどを使った、ブラウザー表現の実験集です。

[作品を見る](https://rulers.github.io/shader-playground/)

## AIと開発する

[AGENTS.md](AGENTS.md)を入口に、[制作・検証手順](docs/ai/README.md)と[OKF知識索引](docs/knowledge/README.md)を参照してください。トップページの全作品は[作品地図](docs/knowledge/project-map.okf.md)から確認できます。

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
| [蝶の虚空](https://rulers.github.io/shader-playground/butterfly-void/) | [操作と仕組み](butterfly-void/README.md) | [MIT](LICENSE)／[three.js MIT](third_party/three/LICENSE) |
| [壊れる秩序](https://rulers.github.io/shader-playground/fragile-geometry/) | [操作と仕組み](fragile-geometry/README.md) | [MIT](LICENSE) |
| [光の植物](https://rulers.github.io/shader-playground/growing-light/) | [操作と仕組み](growing-light/README.md) | [MIT](LICENSE) |
| [ピクセルの錬金術](https://rulers.github.io/shader-playground/pixel-alchemy/) | [操作と仕組み](pixel-alchemy/README.md) | [MIT](LICENSE) |
| [磁力のモアレ](https://rulers.github.io/shader-playground/magnetic-moire/) | [操作と仕組み](magnetic-moire/README.md) | [MIT](LICENSE) |
| [矛盾する部屋](https://rulers.github.io/shader-playground/paradox-room/) | [操作と仕組み](paradox-room/README.md) | [MIT](LICENSE) |
| [時間の残響](https://rulers.github.io/shader-playground/echo-of-time/) | [操作と仕組み](echo-of-time/README.md) | [MIT](LICENSE) |

## ローカルで動かす

Node.jsとnpmが必要です。リポジトリのルートで実行してください。初回は[http-server](https://github.com/http-party/http-server)を取得します。

```sh
npx --yes http-server@14.1.1 . -a 127.0.0.1 -p 8000 -c-1
```

[http://localhost:8000](http://localhost:8000) を開いてください。
操作方法・実装・生成手順は、各ディレクトリのドキュメントを参照してください。

## 公開

GitHub Pagesで、`main`ブランチのルートを公開しています。

## ライセンス

独自部分は[MIT](LICENSE)ですが、リポジトリ全体がMITではありません。作品・素材ごとの利用条件は上表と各ディレクトリのLICENSE・NOTICEを確認してください。

トップページ背景の作者表記・MITライセンスは[NOTICE](third_party/warp/NOTICE.md)に記載しています。
