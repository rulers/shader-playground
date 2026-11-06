---
id: "shader-playground/butterfly-time"
title: "作品時計と安定化したシミュレーション時間を分ける"
project: "Shader Playground"
record_type: "lesson"
status: "accepted"
created_at: "2026-11-06"
updated_at: "2026-11-06"
source_revision: "f40ddff5d4202b127df99031cb9bee9f67a32d9b"
---

# 蝶の時間管理

## Knowledge / Context

事実：蝶の虚空ではカラー15秒・白影15秒の切替と飛行が共存する。低fps対策で全用途のdtを制限すると、色の切替まで遅くなる。非表示中の時間をそのまま加えると復帰時に演出が飛ぶ。

## Decision / Rationale

アクティブ実経過時間と、最大0.1秒へ制限した飛行・羽ばたき用時間を分ける。停止・非表示・コンテキスト喪失中は作品時計を止める。オープニングは作品時計×活動量を使い、通常飛行へ接続する。単一の制限dtで全演出を進める案は色周期を満たさない。

## Evidence / Validation

- [ArtworkClock](../../butterfly-void/clock.mjs)：経過秒の加算、停止・再開・リセット。
- [app.js](../../butterfly-void/app.js)、[README](../../butterfly-void/README.md)：時計と描画・飛行・状態の接続。
- [OPENING.md](../../butterfly-void/OPENING.md)：初期噴出と活動量、停止・復帰の仕様。
- [clock.test.mjs](../../tests/butterfly-void/clock.test.mjs)、[opening.test.mjs](../../tests/butterfly-void/opening.test.mjs)：既存の再現用テスト。今回のコード読解と過去のテスト実行結果は区別する。
- 今回この記録のための実機・GPU・低fps再検証は行っていない。

## Reuse / Limits

時間指定の演出と物理的な安定性が異なる制約を持つ作品で使う。全作品へ時計クラスを強制しない。低fpsではフレームが間引かれるため、秒数が正しくても滑らかさは保証されない。停止・活動量の意味を変える場合に再評価する。

## Decision history

- 2026-11-06：既存の時計設計を再利用可能な教訓として記録。
