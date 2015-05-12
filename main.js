// アプリケーションのライフサイクルをコントロールするモジュール
var app = require('app');
// アプリケーションのウィンドウを作成するためのモジュール
var Window = require('browser-window');
// GCで回収されないようにメインウィンドウはグローバル領域で宣言します。
var mainWindow = null;
// Electronの初期化が完了したら呼び出されます。
app.on('ready', function() {
	// 画面を表示します。
	mainWindow = new Window({
		width : 800,
		height : 600
	});
	
	// 画面の内容となるHTMLファイルをロードします。
	mainWindow.loadUrl('file://' + __dirname + '/index.html');
	//mainWindow.loadUrl('about://blank');
	mainWindow.closeDevTools()
	mainWindow.openDevTools();
	console.log("url loaded");
	// ウィンドウが閉じられたら、アプリも終了するようにします。
	mainWindow.on('closed', function() {
		app.quit();
	});
});