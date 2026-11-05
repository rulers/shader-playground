# NOODLE DISCO / DAY MIX

2026-10-30。クリーム色の背景と6本のカラフルな麺。つかんで、のばして、離すと局所的に揺れ戻ります。余白のタップで近くの麺を軽く揺らせます。

- 操作: マウス／タッチのドラッグ。Canvasにフォーカス後、矢印キーで揺らす、Spaceで一時停止。
- 右上の小さな四角い＋で調整。Speed / Elasticity / Influence、Pause、Reset。初期状態は閉じています。
- 描画: `../assets/noodle-engine.js` と `../assets/noodle.css`。JavaScriptが6本×12制御点とばね・減衰・入力を管理し、Canvas 2Dが曲線を描画。WebGL・外部依存・ビルド不要。
- 高DPIは2倍まで、積分は最大1/120秒。リサイズ時は画面へ適応し、入力を解除。
- OSモーション低減時は自律運動を止め、明示操作の反応のみ短く再生。タブ非表示、フォーカス離脱、Escape、pointercancelは入力解除。音声なし。
- Resetは配置と3調整値を戻し、一時停止の選択は維持します。

## 検証と受け入れ

`node tests/noodle-check.mjs` をリポジトリルートで実行。有限座標での長時間動作、DPR上限、390×844へのリサイズ、パネル、Pause、キャンセル後の誤burst防止、解放、モーション低減での描画停止をDAY/NIGHT両モードで検証。

ブラウザーでDAYの描画、ドラッグ後の局所変形、解放、調整UI開閉、Speed変更、Pause／再生、Resetを確認。NIGHTは長押し解放を複数回確認。

3人レビュー: A（画面・配色）、B（操作・運動）、C（統合・技術検証）。見出し組版、横向きでの操作説明消失、Burst=0でも反動が発生する問題、入力混在、復帰ラベルを修正。

実機Safari／Androidでのタッチ確認と実機60fpsの計測は未実施。ブラウザー確認はデスクトップChromium、モバイル寸法とモーション低減の動作は上記Node検証によるものです。

MIT / Copyright (c) 2026 Masaaki Kurihara.
