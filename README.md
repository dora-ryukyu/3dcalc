# 3D電卓アプリ (Three.js & GitHub Pages)

## 概要

これは [Three.js](https://threejs.org/) を使用して作成された、ブラウザで動作する3D電卓アプリケーションです。
ユーザーは3Dでレンダリングされた電卓モデルをマウスで回転させたり、モデル上のボタンを直接クリックして計算を行うことができます。
このプロジェクトはGitHub Pagesでホスティングされ、CDN経由でThree.jsライブラリを利用しています。

## 特徴

*   **3D電卓モデル**: Three.jsの基本的なジオメトリとマテリアルで構築された電卓モデル。
*   **インタラクティブな操作**:
    *   マウスドラッグ（左クリック）で3Dモデルを自由に回転可能。
    *   マウスホイールでズームイン・ズームアウト。
    *   3Dモデル上のボタンを直接クリックして、数値入力や演算操作が可能。
*   **基本的な電卓機能**:
    *   四則演算（加算、減算、乗算、除算）。
    *   小数点入力。
    *   クリア機能（Cボタン）。
*   **リアルタイムディスプレイ**: 計算結果や入力中の数値が3Dモデルのディスプレイに表示されます。
*   **レスポンシブデザイン**: ブラウザウィンドウのサイズに合わせて表示が調整されます。
*   **CDN利用**: Three.jsライブラリをCDNから読み込むため、ローカルでのビルドステップが不要です。

## 技術スタック

*   HTML5
*   CSS3
*   JavaScript (ES Modules)
*   [Three.js](https://threejs.org/) (CDN経由)
*   [OrbitControls](https://threejs.org/docs/#examples/en/controls/OrbitControls) (Three.jsアドオン)

## セットアップと実行

このアプリケーションはGitHub Pagesで直接ホストされているため、特別なセットアップは不要です。
以下のURLからアクセスできます：

[https://dora-ryukyu.github.io/3dcalc/](https://dora-ryukyu.github.io/3dcalc/)

### ローカルでの実行

もしローカル環境で試したい場合は、以下の手順で行えます。

1.  このリポジトリをクローンまたはダウンロードします。
    ```bash
    git clone https://github.com/あなたのGitHubユーザー名/あなたのリポジトリ名.git
    cd あなたのリポジトリ名
    ```
2.  `index.html` ファイルを直接ブラウザで開きます。
    *   ただし、ES Modulesのセキュリティ制約により、一部のブラウザではローカルファイル (`file://`) から直接開くと動作しない場合があります。その場合は、ローカルサーバーを立ててアクセスしてください。
    *   簡単なローカルサーバーの例 (Node.jsと`http-server`を使用):
        ```bash
        npm install -g http-server
        http-server .
        ```
        その後、ブラウザで `http://localhost:8080` (または表示されたアドレス) にアクセスします。

## ファイル構成

*   `index.html`: アプリケーションのメインHTMLファイル。
*   `style.css`: スタイリング用CSSファイル。
*   `script.js`: Three.jsのロジック、3Dモデルの生成、電卓機能を含むメインのJavaScriptファイル。
