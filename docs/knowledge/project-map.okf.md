---
id: "shader-playground/project-map"
title: "作品とコードの地図"
project: "Shader Playground"
record_type: "project-map"
status: "accepted"
created_at: "2026-11-06"
updated_at: "2026-11-06"
source_revision: "f40ddff5d4202b127df99031cb9bee9f67a32d9b"
---

# 作品とコードの地図

## Knowledge / Context

事実：調査したコミットのトップページには21作品のカードがある。この記録はトップの実装を起点とし、未実装・未検証・公開状態を推測しない。ルートREADMEの一覧も本整備で21作品へ揃える。

## Decision / Rationale

作品の詳細を再複製せず、入口とREADMEへ案内する。描画方式・初期値は対象のコードで確認する。新作追加時はこの地図とトップ・ルートREADMEを同時に見直す。

| 作品 | 入口 | 詳細 |
| --- | --- | --- |
| 墨の庭 | [inkplay](../../inkplay/index.html) | [README](../../inkplay/README.md) |
| 雨粒と曇りガラス | [rain](../../rain/index.html) | [チュートリアル](../../tutorials/10_heartfelt.md) |
| 言葉の肖像 | [portraits](../../portraits/index.html) | [README](../../portraits/README.md) |
| 水中のインク | [inkcloud](../../inkcloud/index.html) | [README](../../inkcloud/README.md) |
| 水のあわい | [koi](../../koi/index.html) | [README](../../koi/README.md) |
| 薄膜の万華鏡 | [kaleidoscope](../../kaleidoscope/index.html) | [README](../../kaleidoscope/README.md) |
| リベンジの万華鏡 | [revenge-kaleidoscope](../../revenge-kaleidoscope/index.html) | [README](../../revenge-kaleidoscope/README.md) |
| 墨が鯉になる | [ink-to-koi](../../ink-to-koi/index.html) | [README](../../ink-to-koi/README.md) |
| 言葉の肖像 — 夏目漱石 | [soseki](../../soseki/index.html) | [README](../../soseki/README.md) |
| NOODLE DISCO | [noodle-disco](../../noodle-disco/index.html) | [README](../../noodle-disco/README.md) |
| NOODLE DISCO — NIGHT MIX | [noodle-night](../../noodle-night/index.html) | [README](../../noodle-night/README.md) |
| MAGNETIC SHAPES | [magnetic-shapes](../../magnetic-shapes/index.html) | [README](../../magnetic-shapes/README.md) |
| 光を彫る | [light-sculpture](../../light-sculpture/index.html) | [README](../../light-sculpture/README.md) |
| 花間の蝶 | [flower-butterflies](../../flower-butterflies/index.html) | [README](../../flower-butterflies/README.md) |
| 蝶の虚空 | [butterfly-void](../../butterfly-void/index.html) | [README](../../butterfly-void/README.md) |
| 壊れる秩序 | [fragile-geometry](../../fragile-geometry/index.html) | [README](../../fragile-geometry/README.md) |
| 光の植物 | [growing-light](../../growing-light/index.html) | [README](../../growing-light/README.md) |
| ピクセルの錬金術 | [pixel-alchemy](../../pixel-alchemy/index.html) | [README](../../pixel-alchemy/README.md) |
| 磁力のモアレ | [magnetic-moire](../../magnetic-moire/index.html) | [README](../../magnetic-moire/README.md) |
| 矛盾する部屋 | [paradox-room](../../paradox-room/index.html) | [README](../../paradox-room/README.md) |
| 時間の残響 | [echo-of-time](../../echo-of-time/index.html) | [README](../../echo-of-time/README.md) |

## Evidence / Validation

- [index.html](../../index.html)のカードとディレクトリを照合したコード読解。今回21作品の実描画を確認した記録ではない。
- [architecture.md](../ai/architecture.md)：共有コードと生成元。
- [validation.md](../ai/validation.md)：対象別の検証。テストの有無と完成度を同一視しない。

## Reuse / Limits

AIが修正対象を探す入口として使う。新作追加・改名・方式変更時に更新する。公開中のPagesが同じコミットかは別途確認する。

## Decision history

- 2026-11-06：トップページを根拠に21作品を索引化。既存READMEに不足していた6作品も追記。

