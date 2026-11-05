# 造形の再調整・軽量化の検証記録

2026-11-05 / PR #34 / `feature/butterfly-void`。比較元は `399b09e1cb2f071d761d80824c284ca425f6cbe3`。mainへの直接コミット・マージ・公開は行いません。

## 表現と目視確認

写実的な輪郭・模様から、Rounded／Elegant／Compactの独立したBezier輪郭へ変更。Elegantの鋭い前翅を丸め、後翅の面積を増やしました。Compactは短い前翅と大きめの後翅にしています。7色の高彩度パレットを全タイプへ適用し、黒い縁・翅脈・斑点・眼状紋を削除。GLSLは広い淡い陰影に簡素化し、白影は完全な白です。

輪郭リング・別の頭部・触角のチューブを削除。曲線1区間12分割、胴体8三角形、触角2三角形、1タイプ146〜148三角形です。分割数を減らしすぎた際の拡大輪郭を目視し、12分割を選びました。羽ばたき途中の付け根の隙間を連結テストで検出し、根元を胴体の内側へ重ねて修正しました。

前後翅・個体位相・後翅の遅れ・姿勢追従は維持し、開閉角を抑えました。通常飛行・風・初期配置・個体数・既存UI・同梱Three.js・既存作品のソースは変更していません。実行時ライブラリ・npm依存・テクスチャの追加はありません。

本番のメッシュ・GLSLを使う [shapes.html](../tests/butterfly-void/shapes.html) を再利用。3タイプ×3姿勢×開閉×カラー／白影の**36条件**を画像化し、両画像と変更前後を実際に開いて目視確認しました。その後に基準を更新し、通常の画像回帰を再実行しています。

- [開いた翅](../tests/butterfly-void/captures/shapes-open.png) / [閉じた翅](../tests/butterfly-void/captures/shapes-folded.png)
- [Before / After・開](../tests/butterfly-void/captures/comparison-open.png) / [Before / After・閉](../tests/butterfly-void/captures/comparison-folded.png)（上が変更前、下が変更後）
- [PC初期画面](../tests/butterfly-void/captures/1280-initial.png) / [390×844初期画面](../tests/butterfly-void/captures/390-initial.png)

先端の丸み、前後翅の面積、鮮やかな色の面を確認。Elegantは長く、Compactは後翅の比率が大きく見えます。白影・閉じた正面・真横にも面が残ります。斜めの途中で片側の翅が細くなる変化はありますが、個体全体が線に消える状態は検出されませんでした。カメラ正面へ向け直す補正はありません。

| タイプ | 真横・開の幅×高さ | 白い領域の画素数 |
| --- | --- | --- |
| Rounded | 50×202 px | 6,650 |
| Elegant | 41×215 px | 5,459 |
| Compact | 41×137 px | 3,574 |

正規化した白影の種類間IoUは0.694〜0.878（全3姿勢、上限0.92）。色・大きさを除いても違いが残ります。4位相・9段階の連続yawで面積・寸法・95%以上の連結を検証。18セルごとの画像回帰と、1匹を消す負例も成功しました。[生データ](../tests/butterfly-void/captures/shapes-results.json)

## 性能の変更前後

同じMac・ブラウザー・表示サイズで、2秒ウォームアップ後6秒間のrAFを測定。1回ずつの短い測定であり、負荷によって変動します。

| 項目 | 1280×800・前→後 | 390×844・前→後 |
| --- | --- | --- |
| 個体数 | 180→180 | 120→120 |
| 三角形数 | 112,632→26,398（76.6%減） | 75,044→17,596（76.6%減） |
| Draw calls | 3→3 | 3→3 |
| Geometry / Texture / Program | 3 / 0 / 1 | 3 / 0 / 1 |
| Apple M3実GPU・fps | 60.0→60.0 | 60.0→60.0 |
| SwiftShader・fps | 26.1→59.2 | 42.8→60.0 |

実GPUはIABのANGLE Metal / Apple M3、DPR 1。[実GPUの生データ](../tests/butterfly-void/captures/hardware-performance.json)。390×844もMac上の表示サイズ変更であり、スマートフォン実機ではありません。変更前から約60fpsだったため、実GPUでのfps改善は主張しません。

ソフトウェアGPUはmacOS、Chrome **156.0.8078.80**、ANGLE Vulkan / SwiftShader LLVM 10。[変更前](../tests/butterfly-void/captures/performance-before.json) / [変更後](../tests/butterfly-void/captures/performance-after.json)。比較スクリプトのみ適応解像度を止め、両方DPR 1に固定。本番の適応解像度は維持しています。旧記録のLinux Chromium 155での1.0／3.2fpsとは環境が異なり、直接比較しません。ソフトウェアGPUを実機GPUの性能として扱いません。

## 時計・操作・ライフサイクル

作品時計はアクティブな実経過時間、飛行と羽ばたきは最大0.1秒のdeltaを使用。5秒おきの低fps相当でも15秒で白影、30秒でカラーへ戻ります。反映は次の描画フレームです。停止・非表示・コンテキスト喪失では作品時計も止め、復帰時に空白時間を加算しません。

- 実WebGLの1280×800／390×844で位置・羽ばたき・カラー／白影、実際のマウス／CDPタッチの風を確認。
- UI・キーボード・フォーカス・停止／再生・手動指定・リセット・モーション低減・リサイズが成功。初期位置と描画画素のハッシュがリセット後に一致。
- 15秒の単発stepで色彩は切り替わり、飛行時間は0.1秒以内。30秒の戻りも成功。
- 非表示はvisibilitychangeの注入。停止中の時計固定、復帰時点で非表示時間を加算しないことを確認。実OSのタブ切替・bfcache往復は未検証。
- WEBGL_lose_contextによる喪失・復帰、240描画後のgeometry 3／texture 0、破棄、WebGL非対応案内が成功。
- console errorと予期しないwarningは0。PNG取得時の既知の「GPU stall due to ReadPixels」は別配列に保存。[操作テストの生データ](../tests/butterfly-void/captures/results.json)

## 実施したテスト

- `simulation.test.mjs`：180／144／120匹、120秒相当の飛行、配置・姿勢・方向・リセット、個体位相、局所風・減衰・通常飛行への復帰が成功。
- `geometry.test.mjs`：独立した3輪郭、三角形数の予算、奥行き、バッチ、状態同期、共有material、破棄が成功。
- `clock.test.mjs`：低fps相当の15／30秒、制限した飛行、停止・非表示・復帰・手動指定・リセットが成功。
- `shapes-browser.cjs`：目視確認後の基準登録と通常回帰、輪郭差・色・4位相・連続yaw・連結・欠損の負例が成功。
- `browser.cjs`：両画面の実描画・操作・時計・風・復旧・リソース・負例が成功。
- `performance.cjs ROOT OUTPUT.json`：SwiftShaderの変更前後を測定。実GPUはbenchmark.htmlをIABで操作して測定。
- `node tests/flower-runtime.mjs`：既存作品の4条件、飛行・姿勢・初期構図・リセットが成功。
- 変更JavaScriptの構文チェックと `git diff --check` が成功。

上記の作品テストは `tests/butterfly-void/` 配下。テスト用Playwright／pngjsだけを作業用ディレクトリにインストールし、既存Google Chromeを `CHROMIUM_PATH` で指定しました。

## 残る確認

スマートフォン実機のfps・温度・風の感触、Safari／Firefox／他OS、長時間メモリは未確認。このMacの短い測定から全端末60fpsを保証しません。技術テストは通過していますが、マージ前に実機で造形と操作感の最終レビューを推奨します。既存PRのdraft状態を維持します。
