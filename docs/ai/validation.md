# 検証の選択

すべてリポジトリルートから実行する。Node.js 22系を起点とし、対象READMEを優先する。ルートの`npm test`は存在しない。

| 対象 | 既存の実行例 | 証明する範囲 |
| --- | --- | --- |
| 芥川・漱石 | `node --test portraits/tests/*.test.js soseki/tests/*.test.js` | 配置・降雨・本文・素材等。実レイアウトは別途 |
| 鯉の運動 | `node --test koi/tests/motion.test.mjs` | 運動ロジック |
| 磁力の図形 | `node --test magnetic-shapes/tests/model.test.mjs` | 純粋モデル |
| 蝶の虚空 | `node --test tests/butterfly-void/*.test.mjs` | 時計・造形・運動・噴出演出のロジック |
| NOODLE昼夜 | `node tests/noodle-check.mjs` | DOM／描画スタブによる操作・有限値 |
| 花間の蝶 | `node tests/flower-runtime.mjs` | Three.jsオブジェクト＋rendererスタブ。実GLSLではない |
| 光を彫る | `node tests/light-runtime.cjs` | Canvas実ラスタ＋イベントスタブ。`@napi-rs/canvas`が必要 |
| 磁力の図形の実行 | `node magnetic-shapes/tests/runtime.cjs` | Canvas実ラスタ＋イベントスタブ。`@napi-rs/canvas`が必要 |
| 蝶の実描画 | `node tests/butterfly-void/browser.cjs` | 実ブラウザーのThree.js・GLSL・UI。Playwright・pngjs・Chromiumが必要 |
| 蝶の噴出演出 | `node tests/butterfly-void/opening-browser.cjs` | 実描画と時系列。[手順](../../butterfly-void/OPENING.md)を確認 |
| Canvas小作品 | `node tests/study-smoke.cjs fragile-geometry` | 対応する小作品のブラウザー検証。任意の作品へ無条件適用しない |
| 墨の庭 | `python3 inkplay/tools/build.py` | 生成。描画は[既存検証](../../inkplay/VALIDATION.md)を参考に別途確認 |
| AI文書のみ | `python3 tools/check_ai_docs.py`、`git diff --check` | ローカルリンク、記録形式、空白差分 |

## 起動と実描画

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

`http://127.0.0.1:8000/<作品ディレクトリ>/`を開く。最低限、PCと縦長画面の初期描画・主操作・調整UI・停止とリセットを確認する。変更に応じてフォント／Worker失敗、非表示復帰、入力キャンセル、モーション低減、コンテキスト復旧を加える。

テスト依存は既存の開発環境を優先し、必要なときだけ別の一時ディレクトリ等へ用意する。作品実行の依存へ混ぜない。CJSテストは必要に応じ`NODE_PATH`で依存の場所を渡せるが、ESMでは同じ解決方法が使えると仮定しない。Chromiumのパス指定は蝶テストが`CHROMIUM_PATH`、study-smokeが`STUDY_BROWSER_PATH`。各スクリプトを確認する。

ブラウザーテストには追跡済みcapturesを書き換えるものがある。実行前に保存先と既存差分を確認し、意図しない基準更新はコミットしない。蝶の通常テストの`VOID_CAPTURE_DIR`を、すべてのテストが受け付けると仮定しない。

## 結果を残す

対象コミット、日時、OS／ブラウザー／GPU（実機かSwiftShaderか）、viewport・DPR、コマンド、期待値と観測、画像／ログ、未確認事項を記す。過去の記録は出典付きの過去実績として扱う。スタブ成功・非空画像・60fpsのいずれも、作品の触感を単独で証明しない。
