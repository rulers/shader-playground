# Shader Playground — AI開発ガイド

## 最初に読む

- 作品を主役にし、「触って面白い・気持ちいい」を具体的な操作で評価する。
- [AI向け入口](docs/ai/README.md)から対象作品のREADME・NOTICE・検証記録へ進む。全作品を毎回読み込まない。
- 実装の現在値はコード、操作仕様は作品README、判断の根拠はOKFを確認する。矛盾は記録し、古い提案を現行仕様と扱わない。
- 本ファイルは共通ルール、`.agents/skills/`は手順、`docs/knowledge/`は知識記録。指示を三重にコピーしない。

## 実装の境界

- 静的HTTP配信で動く作品集。新規フレームワーク・実行時CDN・全体ビルドを必要性なしに導入しない。
- Canvas 2D・生WebGL・Three.jsが混在する。名前だけで全作品をGLSLへ置換しない。GLSL指定の依頼ではGPUによる表現を実際に実装する。
- 新作は独立したディレクトリへ。共有ファイルを変更する場合は利用作品を検索して影響範囲を確認する。
- `inkplay/src/*.glsl`等の生成元を編集し、対応するbuild.pyで再生成する。[生成経路](docs/ai/architecture.md)を参照。
- `third_party/three/`の配布物を直接改変しない。他の第三者素材はNOTICEと生成経路を確認し、出典・条件を維持する。リポジトリ全体をMITと説明しない。
- GitHub Pagesの`/shader-playground/`配下で動く相対パスを使う。ES Modules・Worker作品はHTTPで検証する。

## UI・品質

- 調整UIは小さな四角い＋から開く既存方式に合わせる。位置・寸法・初期値は対象作品を確認し、一律変更しない。
- ポインター／タッチ・キーボード、停止／再開、リセット、リサイズ、非表示タブ、モーション低減を変更に応じて確認する。
- WebGLではコンパイル・描画・コンテキスト復旧・資源破棄を確認する。DPR・個体数等の予算は作品ごとに扱う。
- テスト成功やCanvasスタブを、実ブラウザーの描画・触感・実機性能の確認と同一視しない。

## 作業を完了する

1. 新作・表現変更は[制作手順](.agents/skills/develop-shader-artwork/SKILL.md)、修正の検証・レビューは[検証手順](.agents/skills/verify-shader-artwork/SKILL.md)を使う。
2. 変更リスクに合う既存テストを選ぶ。[検証一覧](docs/ai/validation.md)を参照する。
3. 操作変更は作品README、作品追加はトップのカードとルートREADMEを更新する。素材追加はNOTICEを整える。
4. 再利用価値のある設計判断だけ、[OKF記録方法](docs/knowledge/README.md)に従って根拠・状態・見直し条件を記録する。
5. `python3 tools/check_ai_docs.py`と`git diff --check`を実行する。完了報告は変更内容、実行した検証、未確認事項を区別する。
6. 作業ブランチからPRにまとめる。mainへのマージ・公開はユーザーの依頼範囲に従う。
