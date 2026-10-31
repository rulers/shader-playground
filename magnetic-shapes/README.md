# MAGNETIC SHAPES — 色と余白の引力

2026年11月1日分。生成りの余白に青・朱・黒の図形。マウスを近づけると近くの図形が移動・回転し、離れると構図へ戻ります。タッチは指を置いてなぞります。スコア、音声、自律的なダンスはありません。

- Canvasにフォーカスして矢印キーで磁力を移動、Escapeで解放、Spaceで停止／再生。
- 右上の32pxの四角い＋で調整。引き合う強さ、停止／再生、最初から。Resetは停止の選択を保持します。
- 単一ポインター、キャンセル、フォーカス喪失、非表示タブ、リサイズに対応。DPRは1.5、描画長辺は1920pxまで。操作終了後は収束して描画を停止します。
- モーション低減時は1フレーム内で更新を多く進め、長い揺れを短縮。停止ボタンでも動きを止められます。
- `model.mjs`：DOM非依存の状態・局所引力・反発・復元・減衰。`app.js`：入力・Canvas 2D描画・UI。外部ライブラリ・CDN・ビルドは不要です。

リポジトリルートで `python3 -m http.server 8000`、`http://localhost:8000/magnetic-shapes/` を開きます。

## 検証（2026-10-31）

- `node --test magnetic-shapes/tests/model.test.mjs`：局所性、復元、10000ステップの有限値・境界、引力0、Resetの再現性を確認。
- `node magnetic-shapes/tests/runtime.cjs`：@napi-rs/canvasを使用する開発用のDOMイベントハーネス。1440×900／390×844・DPR3、実Canvasラスタ描画、停止、入力キャンセル、パネル、モーション低減、非表示、横向きへのリサイズを確認。このツールは作品の実行には不要です。
- 構文チェック、差分空白検査。`preview.jpg` は上記Canvas描画の初期状態であり、ブラウザーUIのスクリーンショットではありません。
- Chromiumの導入は取得アーカイブの破損で失敗。ブラウザーでのHTML/CSS配置、実機Safari／Android、操作の触感、60秒のfps計測は未確認です。

最新の会話内改訂を反映し、以前のthree.js彫刻仕様からCanvas 2Dポスターへ変更。理由は[設計記録](../docs/plans/magnetic-shapes/IMPLEMENTATION.md)を参照。

独自実装 MIT / Copyright (c) 2026 Masaaki Kurihara。
