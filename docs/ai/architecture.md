# 構造と編集元

この一覧は2026-11-06、mainの`f40ddff5d4202b127df99031cb9bee9f67a32d9b`を読んだ結果。新しい作業では実ファイルを再確認する。

- ルートの[index.html](../../index.html)がギャラリー、[assets/home.css](../../assets/home.css)・[assets/warp.js](../../assets/warp.js)がトップの表示。
- 作品はルート直下の独立ディレクトリ。HTML、app.js等、CSS、必要なGLSL・素材を静的配信する。ルート共通のpackage.json・全体ビルドはない。
- Canvas 2D、生WebGL、同梱Three.jsが混在する。[作品地図](../knowledge/project-map.okf.md)から対象を選ぶ。
- [assets/noodle-engine.js](../../assets/noodle-engine.js)・[assets/noodle.css](../../assets/noodle.css)は昼夜のNOODLE作品で共有する。他の共通化も変更前に参照検索する。
- [portraits/](../../portraits/README.md)はCanvas 2D＋Worker、[soseki/](../../soseki/README.md)はThree.js＋GLSL。似た構造でも独立した実装・初期値を持つ。
- [third_party/three/NOTICE.md](../../third_party/three/NOTICE.md)は同梱ライブラリの出典。作品実行とテスト用依存を分ける。

## 生成物

| 編集元 | コマンド（ルートで実行） | 生成物 |
| --- | --- | --- |
| `inkplay/src/*.glsl`、`app.js`、`index.html`、`tools/build.py` | `python3 inkplay/tools/build.py` | `inkplay/shaders/*.frag`、`shaders.js`、`preview.html` |
| `third_party/heartfelt/original.glsl`、`tools/build.py` | `python3 third_party/heartfelt/tools/build.py` | `third_party/heartfelt/heartfelt_kodelife.frag` |

生成物を単独修正せず生成元から反映する。Heartfeltのブラウザー作品[rain/app.js](../../rain/app.js)へ上記生成が自動反映されるとは見なさない。変更対象と[NOTICE](../../third_party/heartfelt/NOTICE.md)を確認する。

## 新しい判断を記録する基準

単純なパラメータ修正は作品READMEで足りる。方式変更、時間管理、入力と状態、生成経路など次回の判断を変える内容は、採用理由・代替案・制約をOKFに残す。[例：蝶の時間管理](../knowledge/butterfly-time.okf.md)。
