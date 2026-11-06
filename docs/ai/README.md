# AI開発の入口

最初に[AGENTS.md](../../AGENTS.md)を読む。必要な情報だけ以下から取得する。

| 目的 | 参照先 |
| --- | --- |
| 新作・演出・操作を作る | [制作SKILL](../../.agents/skills/develop-shader-artwork/SKILL.md) |
| 不具合を直す・レビューする | [検証SKILL](../../.agents/skills/verify-shader-artwork/SKILL.md) |
| コード構造・生成元を知る | [architecture.md](architecture.md) |
| テストを選ぶ | [validation.md](validation.md) |
| 作品と実装の所在を調べる | [プロジェクト地図](../knowledge/project-map.okf.md) |
| 判断を引き継ぐ | [OKF運用](../knowledge/README.md) |

## 読み込みと保守

- `AGENTS.md`は常時参照する短い共通ルール。SKILLは作業時だけ読み、OKFは必要な主題だけ読む。
- `.agents/skills/<name>/SKILL.md`はリポジトリ管理のプロジェクト用手順。自動検出の可否はクライアントに依存する。検出しない環境では上表のファイルを明示して読ませる。
- 個人用スキルのインストールや全クライアントへの自動配布を行うものではない。
- 作品追加・方式変更時は地図とREADMEを更新する。新しい判断は既存OKFを探してから追記・追加し、知識索引を更新する。
- 古い検証記録や企画書は履歴として保持する。現在のコードと不一致なら状態・根拠・未確認箇所を明記する。
- 検証：`python3 tools/check_ai_docs.py`。対象はAIドキュメントのローカルリンク、SKILL・OKFの基本構造。外部仕様への適合認証や実描画の検証ではない。

## 依頼例

「`AGENTS.md`と制作SKILLを読み、`butterfly-void/`の主操作を保って演出を追加する。検証SKILLで確認し、判断が変われば対応するOKFを更新する。」
