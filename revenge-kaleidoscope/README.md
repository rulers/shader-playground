# リベンジの万華鏡 / Revenge Kaleidoscope

参考: Adobe Stock asset 1207640549, “Kaleidoscopic VJ Lights Loop Background” by shufilm.
https://stock.adobe.com/jp/video/kaleidoscopic-vj-lights-loop-background/1207640549

黒い余白、シアン／紫の発光パーツ、中心と周辺に繰り返す星形を観察し、独自の手続き的シェーダーで試作しました。参考映像・静止フレームは組み込んでいません。既存の /kaleidoscope/ と別の作品です。

## 構成

三角形の格子へ座標を変換し、重心座標を並べ替えることで鏡面の反復を作ります。1枚の中心模様だけでなく、周囲にも反射されたロゼットが続きます。5層の星形輪郭、対になった放射線、小さな三角形を距離関数で描きます。

輪郭の半径、尖り、線の長さと小片の角度をゆっくり変化させ、全体の回転とは独立した内部の動きを作ります。発光の芯と距離に応じたハローを解析的に加算し、トーンマッピングで階調を圧縮。通常のSDR出力で、物理的なレンズ計算や多段の画像ブルームではありません。

WebGL 2の1パス、動画・画像テクスチャ・外部ライブラリ不要。リポジトリルートで `python3 -m http.server 8000`、`/revenge-kaleidoscope/` を開きます。

## 操作

＋から回転と内部の速さを調整。一時停止・再生、最初から。×・再クリック・Escで閉じます。モーション低減設定時は静止状態から開始し、非表示中は連続描画を停止します。

## 検証

`node --check revenge-kaleidoscope/app.js`、`git diff --check`。PC・390px幅のブラウザーでシェーダーのコンパイル・描画・パネル・停止・リサイズを確認。
