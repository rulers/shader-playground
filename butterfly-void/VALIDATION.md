# 検証記録

2026-11-05。`feature/butterfly-void`、main `f0a2d253b20ddeee27d4e274b2d0e5e2aa3ec151` から開始。

## 作業開始前

- 既存の14作品、ギャラリー、同梱Three.js 0.186.1、既存のGLSLと「□＋」UIを確認。
- PR #31はmerge済み。既存の `flower-butterflies/` とそのテスト・画像、PR #31、同梱Three.jsのファイルは変更しない。
- `butterfly_void_mvp.html` および指定のMOV添付は作業領域にない。公開Stockページから30秒のプレビューを一時領域へ取得し、5秒間隔の画面と表現を確認。参考ファイルとフレームは成果物・Gitに含めない。
- MVPを先に実ブラウザーで検証してから、ギャラリーを15番へ更新。

## 実ブラウザー

Chromium **155.0.8059.79**、ANGLE / SwiftShader、headless、Linux。ブラウザーでThree.jsとGLSLを実行した結果です。実GPUやスマートフォン実機の結果ではありません。

| 項目 | 1280×800 | 390×844（タッチエミュレーション） |
| --- | --- | --- |
| 初期個体数 | 180 | 144 |
| 初期の正面／斜め／横姿勢 | 40 / 68 / 72 | 34 / 54 / 56 |
| 奥行き・大きさ・輪郭比率 | 各3段階 | 各3段階 |
| Draw calls | 1 | 1 |
| 三角形数 | 22,320 | 17,856 |
| Geometry / Texture / Program | 1 / 0 / 1 | 1 / 0 / 1 |
| 初期画面の黒い画素の割合 | 92.2% | 79.2% |
| 自動白影時の色付き画素 | 0 | 0 |
| ソフトウェアGPUの測定fps | 9.6 | 15.0 |
| 取得時のJSヒープ使用量 | 4,383,200 bytes | 4,619,952 bytes |
| 通常操作・復旧・破棄後のconsole error / warning | 0 / 0 | 0 / 0 |

黒の割合はRGB最大値20以下を黒とし、UIを含まない描画バッファを計数。白影の縁はMSAAで灰色の画素になります。fpsは約1.8秒のrAF測定で、60fps達成を示すものではありません。JSヒープは1点の採取値で、GPUメモリ使用バイト数や長時間のJSリークを証明する測定ではありません。

生データ：[results.json](../tests/butterfly-void/captures/results.json)。

## テスト結果

`node tests/butterfly-void/simulation.test.mjs` 成功。

- 2画面比率の決定論的初期配置・リセット、3種類の形状とサイズ・奥行き、個別の翅位相、進行方向と初期姿勢の一致。
- 最大活動量で120秒相当の固定ステップ：NaNなし、画面内、1ステップの最大移動約0.044 world units以下。
- 17秒経過時の端付近の個体はPC 10/180、縦画面14/144。端へ留まる旧挙動を回帰検出。
- 15秒で白影、30秒でカラー、手動指定の優先。
- 近くの個体への風、遠い個体への減衰、風の強さ0、入力終了後の減衰を確認。

`tests/butterfly-void/browser.cjs` 成功。

- 2サイズで本物の描画バッファを読んで、蝶の存在・色付き画素・白影・時間経過による変化を確認。初期画面、カラー、白影、操作中を撮影。
- 通常の本番入口で自動再生。モーション低減で静止開始し、キーボードから明示的に再生。
- 本物のUIによる手動色切り替え、矢印キーによる活動量変更、Space、Esc、パネルとフォーカス。
- 風はマウスイベントとCDP touchStart/Move/Endで確認。停止後も静止し、リセットで位置・画素ハッシュが初期画面と一致。
- 240描画後もgeometry/texture数が増加しない。
- `WEBGL_lose_context` による実際の喪失と復帰、リセット後の画素一致、破棄後までWebGL警告なし。
- 縦横のリサイズと横スクロールなし。非表示状態のテストは `document.hidden` とvisibilitychangeをテスト中に注入して確認したもので、OSの実タブ切替ではない。
- WebGLを返さない負例で案内表示を確認。通信はローカル同梱ファイルのみ。

ギャラリーは15作品・プレビュー画像の読み込み・新作への遷移と再生をChromiumで確認。既存の `node tests/flower-runtime.mjs` も4条件と飛行・初期構図の各検証が成功。`git diff --check`、新規JavaScriptの構文チェックも成功。

開発中の検証では、端に個体が留まる挙動と、コンテキスト復旧後に古いGPUキャッシュを破棄する際の警告を発見。前者は飛行目標の選び直し、後者は喪失中に古いキャッシュを解放して復帰時にrendererを再構築することで修正し、再実行で確認。

## スクリーンショット

| 状態 | PC | 縦画面 |
| --- | --- | --- |
| 初期 | [1280](../tests/butterfly-void/captures/1280-initial.png) | [390](../tests/butterfly-void/captures/390-initial.png) |
| カラー | [1280](../tests/butterfly-void/captures/1280-color.png) | [390](../tests/butterfly-void/captures/390-color.png) |
| 白影 | [1280](../tests/butterfly-void/captures/1280-white.png) | [390](../tests/butterfly-void/captures/390-white.png) |
| 風の操作中 | [1280](../tests/butterfly-void/captures/1280-wind.png) | [390](../tests/butterfly-void/captures/390-wind.png) |

`preview.jpg` はこの実装をChromiumで描画し、UIだけを隠して撮影したもの。参考映像の画素は使っていません。

## 未確認・マージ前の確認

- ハードウェアGPUでの60fps、スマートフォン実機の操作感・温度・長時間のメモリ挙動。ソフトウェアGPUでは目標fps未達。
- Safari・Firefox・他OS／GPU、実タブ切り替えとbfcache往復、ブラウザーの拡大縮小、長時間運転。
- 視覚面では、黒の余白、蝶の大きさ、旋回と風の強さを実機で最終レビューする。
- 長押しの色彩波紋は未実装。MVPの必須機能から除外。
- Draftのままレビューする。mainへの直接コミット、マージ、本番公開は行わない。
