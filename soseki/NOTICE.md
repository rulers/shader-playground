# 素材とライセンス

## 肖像写真

`assets/soseki.jpg` はユーザー添付の `Natsume_Soseki_photo.jpg` を未改変で同梱しています。描画準備時に縮小・明暗解析を行います。生成・描き直し・左右の切り取りは行いません。

出典：https://commons.wikimedia.org/wiki/File:Natsume_Soseki_photo.jpg
撮影：小川一眞。1912年9月。Commonsでは日本および米国でパブリックドメインと表記されています。

## 『吾輩は猫である』

夏目漱石『吾輩は猫である』、青空文庫。
https://www.aozora.gr.jp/cards/000148/files/789_14547.html

底本：「夏目漱石全集1」ちくま文庫、筑摩書房。
入力：柴田卓治。
校正：渡部峰子（一）、おのしげひこ（二、五）、田尻幹二（三）、高橋真也（四、七、八、十、十一）、しず（六）、瀬戸さえ子（九）。
公開：1999年9月17日、修正：2018年2月5日。

原典HTML（Shift JIS）を `assets/wagahai-source.html` に保持しています。描画用データ `wagahai.js` はルビ・見出し・奥付を除去し、原典外字画像のJIS X 0213コードをUnicodeへ変換したものです。

配置上限12,000文字までに現れる「譃」は同梱フォントに含まれないため、原典の外字画像 `assets/gaiji-uso.png` で補完します。「―」は横線として描画します。本文の文字は置き換えません。
https://www.aozora.gr.jp/gaiji/2-88/2-88-74.png

## フォント・ライブラリ・実装

- Zen Antique Soft：Copyright 2021 The Zen Antique Project Authors。SIL Open Font License 1.1。全文は `assets/OFL.txt`。`portraits/` と同じ未改変のフォントです。
- Three.js：同梱の `../third_party/three/` を使用。MITライセンスと作者表記は同ディレクトリを参照。
- HTML・CSS・JavaScript：リポジトリのMITライセンス。芥川龍之介版の配置・演出を基に、Three.js描画と夏目漱石の素材を使う独立作品として構成しました。
