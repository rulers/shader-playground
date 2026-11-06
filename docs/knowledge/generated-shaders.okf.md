---
id: "shader-playground/generated-shaders"
title: "生成元からシェーダー配布物を更新する"
project: "Shader Playground"
record_type: "decision"
status: "accepted"
created_at: "2026-11-06"
updated_at: "2026-11-06"
source_revision: "f40ddff5d4202b127df99031cb9bee9f67a32d9b"
---

# シェーダーの生成経路

## Knowledge / Context

事実：墨の庭は共通GLSLと6つのPassからGLSL150、ブラウザー用JS、単体HTMLを生成する。Heartfeltにも元GLSLからKodeLife向け変換を行う別スクリプトがある。すべての`.frag`がこの生成方式ではない。

## Decision / Rationale

生成元とbuild.pyを編集して再生成する。生成物だけのパッチは次の生成で消えるため避ける。全作品向けの新しいビルドシステムは現状不要。ブラウザー用`rain/app.js`をHeartfeltのKodeLife生成物と混同しない。

## Evidence / Validation

- [inkplay/tools/build.py](../../inkplay/tools/build.py)：`src/common.glsl`とPassを結合し、`shaders/*.frag`、`shaders.js`、`preview.html`を出力する。
- [inkplay/README.md](../../inkplay/README.md)：編集元と実行方法。
- [Heartfelt build.py](../../third_party/heartfelt/tools/build.py)：`original.glsl`を変換し`heartfelt_kodelife.frag`を出力する。
- [Heartfelt NOTICE](../../third_party/heartfelt/NOTICE.md)：元作品と利用条件。
- 今回の根拠は指定コミットのコード読解。今回シェーダー再生成・GPU検証を実施したという記録ではない。過去の実行結果は[墨の庭の検証記録](../../inkplay/VALIDATION.md)を参照。

## Reuse / Limits

生成元が追跡されているファイルへ適用する。新しい生成方式を導入したら[生成経路表](../ai/architecture.md)と本記録を更新する。生成物の一致とGPUでの動作は別々に確認する。

## Decision history

- 2026-11-06：既存コードの生成経路を明文化。新しいビルド方式は追加しない。
