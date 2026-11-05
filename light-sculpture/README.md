# light-sculpture

静的HTTPサーバーから `light-sculpture/` を開きます。外部ライブラリ・素材・ネットワーク通信を使わないCanvas 2Dの作品です。

- 画面の説明に従ってドラッグ／クリック。右下の小さな＋から調整・一時停止・最初からを操作できます。
- キーボード：canvasにTabでフォーカスしEnterで体験、Spaceで再生／停止。調整UIはEscapeで閉じられます。
- OSのモーション低減時は停止して開き、明示操作で再生できます。非表示タブの描画は停止。DPRは2を上限とします。

実装：MIT / Copyright (c) 2026 Masaaki Kurihara。元プロジェクトLICENSEに従います。


検証手順・三者レビュー・未確認範囲は [REVIEW.md](REVIEW.md) を参照してください。

## 2026-10-31 再検証と修正

11月2日分。現在のmain（NIGHT MIXまで）との競合を解消。ドラッグのcaptureをEscape・フォーカス喪失・リサイズで解除し、Spaceのキーリピートによる停止／再生の連打を防止。Resetは余韻0.96も復元し、停止の選択は保持。調整＋は現在の作品と同じ右上へ移動。

`node tests/light-runtime.cjs`：@napi-rs/canvasで実Canvas描画とDOMイベントを検証。1440×900／390×844、ドラッグ変形、Escape・画面離脱・リサイズ時のcapture解除、Reset、停止、キーリピート、モーション低減の停止を確認。`node tests/noodle-check.mjs`も成功。

この再検証はブラウザーテストではありません。既存REVIEW.mdのChromium結果は前回の記録です。今回のChromium導入はアーカイブ破損で失敗したため、変更後のHTML/CSS配置、実機Safari／Android、fpsは未確認。

公開順は11月1日のMAGNETIC SHAPES（PR #29）→本作品（PR #20）。本ブランチは#29の実装を取り込み、両作品と既存11作品を並べたトップ13件の連番・導線を確認しています。#29を先にマージすると本PRの差分は11月2日分だけになります。
