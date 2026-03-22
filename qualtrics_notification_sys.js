Qualtrics.SurveyEngine.addOnload(function()
{
	/*ページが読み込まれたときに実行するJavaScriptをここに配置してください*/
});

Qualtrics.SurveyEngine.addOnReady(function()
{
	// node.jsサーバーのurl
	var serverUrl = "https://9dc9l30c-8080.asse.devtunnels.ms/";
	
	//テキストタイプ変更点 ("positive" / "neutral" / "negative" から選択)
	var messageGroup = "negative";

	loadMessagesFromServer(serverUrl, messageGroup);
});

Qualtrics.SurveyEngine.addOnUnload(function()
{
	/*ページの読み込みが解除されたときに実行するJavaScriptをここに配置してください*/
});

// サーバーからJSONを取得してランダムに通知を表示する関数
function loadMessagesFromServer(url, group) {
	fetch(url)
		.then(function(response) {
			if (!response.ok) {
				throw new Error('サーバーへの接続に失敗しました');
			}
			return response.json();
		})
		.then(function(data) {
			// 指定されたグループのメッセージを取得
			var messages = data[group] || [];
			
			// メッセージが空でないか確認
			if (!Array.isArray(messages) || messages.length === 0) {
				console.error('指定されたグループにメッセージがありません:', group);
				showNotification('メッセージの読み込みに失敗しました', 'error');
				return;
			}
			
			// ランダムにメッセージを選択
			var randomMessage = getRandomMessage(messages);
			
			// グループに応じて通知タイプを設定
			var notificationType = getNotificationType(group, data.type);
			
			// 1秒遅延してから通知を表示
			setTimeout(function() {
				showNotification(randomMessage, notificationType);
			}, 1000);
		})
		.catch(function(error) {
			console.error('サーバーからのデータ取得に失敗しました:', error);
			
			// エラー時は1秒後にエラー通知を表示
			setTimeout(function() {
				showNotification('メッセージの読み込みに失敗しました', 'error');
			}, 1000);
		});
}

// グループに応じて通知タイプを返す関数
function getNotificationType(group, defaultType) {
	switch(group) {
		case "positive":
			return "success"; // 緑色
		case "neutral":
			return "success";
		case "negative":
			return "success";
		default:
			return defaultType || "info";
	}
}

// ランダムにメッセージを選択する関数
function getRandomMessage(messagesArray) {
	var randomIndex = Math.floor(Math.random() * messagesArray.length);
	return messagesArray[randomIndex];
}

// 通知を表示する関数
function showNotification(message, type) {
	// 通知要素を作成
	var notification = document.createElement('div');
	notification.textContent = message;
	notification.style.cssText = 
		'position: fixed; ' +
		'top: 20px; ' +
		'right: 20px; ' +
		'padding: 15px 20px; ' +
		'border-radius: 5px; ' +
		'color: white; ' +
		'font-size: 14px; ' +
		'z-index: 10000; ' +
		'box-shadow: 0 4px 6px rgba(0,0,0,0.1); ' +
		'animation: slideIn 0.3s ease-out; ' +
		'max-width: 300px;';
	
	// タイプに応じて背景色を変更
	switch(type) {
		case 'success':
			notification.style.backgroundColor = '#4CAF50';
			break;
		case 'error':
			notification.style.backgroundColor = '#f44336';
			break;
		case 'warning':
			notification.style.backgroundColor = '#ff9800';
			break;
		case 'info':
		default:
			notification.style.backgroundColor = '#2196F3';
			break;
	}
	
	// アニメーション用のスタイルを追加
	if (!document.getElementById('notification-styles')) {
		var style = document.createElement('style');
		style.id = 'notification-styles';
		style.textContent = `
			@keyframes slideIn {
				from {
					transform: translateX(400px);
					opacity: 0;
				}
				to {
					transform: translateX(0);
					opacity: 1;
				}
			}
			@keyframes slideOut {
				from {
					transform: translateX(0);
					opacity: 1;
				}
				to {
					transform: translateX(400px);
					opacity: 0;
				}
			}
		`;
		document.head.appendChild(style);
	}
	
	// 通知をページに追加
	document.body.appendChild(notification);
	
	// 5秒後に通知を削除
	setTimeout(function() {
		notification.style.animation = 'slideOut 0.3s ease-in';
		setTimeout(function() {
			if (notification.parentNode) {
				notification.parentNode.removeChild(notification);
			}
		}, 300);
	}, 5000);
}