# 素材とライセンス

## 肖像写真

`assets/akutagawa.jpg` はユーザー指定の添付ファイル `Akutagawa_Ryunosuke_photo.jpg` を、そのまま同梱しています。
写真そのものの描き直し・生成は行っていません。描画時のみ切り抜き・縮小・明暗解析を行います。
指定された出典：https://commons.wikimedia.org/wiki/File:Akutagawa_Ryunosuke_photo.jpg
作者不詳。Commonsでは日本および米国でパブリックドメインと表記。

## 『羅生門』

芥川龍之介『羅生門』、青空文庫。
https://www.aozora.gr.jp/cards/000879/files/127_15260.html

底本：「芥川龍之介全集1」ちくま文庫、筑摩書房。
入力：平山誠、野口英司。校正：もりみつじゅんじ。
公開：1997年10月29日、修正：2022年7月16日。
本文原本を `assets/rashomon-source.html` に保持。描画用データではルビ・奥付・日付を除去し、外字をUnicodeへ変換しています。

Zen Antique Softに含まれない「扭」「眶」は、青空文庫の原典で使われる外字画像で補完します。
「―」は横線として描画します。本文データの文字そのものは変更しません。

- https://www.aozora.gr.jp/gaiji/2-12/2-12-93.png
- https://www.aozora.gr.jp/gaiji/1-88/1-88-81.png

## Zen Antique Soft

Copyright 2021 The Zen Antique Project Authors (https://github.com/googlefonts/zen-antique)
SIL Open Font License 1.1。全文は `assets/OFL.txt`。

`assets/ZenAntiqueSoft-Regular.ttf` はGoogle Fonts公式リポジトリから取得した未改変ファイルです。
https://github.com/google/fonts/tree/main/ofl/zenantiquesoft
Git blob SHA-1: `0b1ecf6a20191e267ae6f97003703a582ecda103`

## 実装

本作品のHTML・CSS・JavaScriptはリポジトリのMITライセンスに従います。
「雨粒と曇りガラス」のレイアウト構成を参考にしていますが、その実装・シェーダーは流用していません。
写真・本文・フォント・原典外字の条件は、それぞれ上記に従います。
