
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
			// デバック(要素数)
			console.log('[DEBUG] メッセージ取得件数(' + group + ')=' + messages.length);
			
			// メッセージが空でないか確認
			if (!Array.isArray(messages) || messages.length === 0) {
				console.error('指定されたグループにメッセージがありません:', group);
				showNotification('メッセージの読み込みに失敗しました', 'error');
				recordMessageLog(null, group, 'failed', 'No messages found');
				
				return;
			}

			// 再読み込み判定	
			var currentKey = group + 'Current';
			var isReload = localStorage.getItem(currentKey) !== null;
			console.log('[DEBUG] isReload=' + isReload);
			
			// ランダムにメッセージを選択
			var randomMessage = getRandomMessage(messages, group);
			
			if (!isReload) {
				recordMessageLog(randomMessage, group, 'success', null);
			} else {
				console.log('[DEBUG] リロードのため記録スキップ');
			}

			// グループに応じて通知タイプを設定
			var notificationType = "success";
			
			// 遅延してから通知を表示
			setTimeout(function() {
				showNotification(randomMessage, notificationType);
			}, 500);
		})
		.catch(function(error) {
			console.error('サーバーからのデータ取得に失敗しました:', error);
			//エラー時もメッセージログを記録
			recordMessageLog(null, group, 'error', error.message);
			// エラー時は0.5秒後にエラー通知を表示
			setTimeout(function() {
				showNotification('メッセージの読み込みに失敗しました', 'error');
			}, 500);
		});
}

function shuffle(array) {
    const arr = [...array];

    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
}

// ランダムにメッセージを選択する関数
function getRandomMessage(messagesArray, group) {
	const storageKey = group + "Bag";
	const currentKey = group + "Current";

	//既に表示(再読み込み)していれば再度表示
	const currentMessage = localStorage.getItem(currentKey);
	if (currentMessage) {
		return currentMessage;
	}

	let state = JSON.parse(localStorage.getItem(storageKey));

	//初回/全テキストを表示しきったらシャッフルして50問表示
	if (!state || state.index >= state.list.length) {

		state = {
			list: shuffle([...Array(messagesArray.length).keys()]).slice(0,50),//json indexのシャッフル
			index: 0
		};
	}
	const randomMessage = messagesArray[state.list[state.index]];
	state.index++;

	localStorage.setItem(storageKey, JSON.stringify(state));
	localStorage.setItem(currentKey, randomMessage);
	console.log(group, state.index, randomMessage);//デバック

	return randomMessage;
}

// クアルトリクスの埋め込み変数にメッセージログを記録する関数
// 【説明】
// このロギング機能により、以下の情報が自動的にクアルトリクスに記録されます：
// - DisplayedMessage: 実際に表示されたメッセージ
// - MessageGroup: メッセージのグループ（positive/neutral/negative）
// - MessageStatus: 処理の成功/失敗ステータス
// - MessageTimestamp: メッセージが表示された日時（ISO 8601形式）
// - MessageError: エラーが発生した場合のエラーメッセージ
// - MessageLogs: 複数のメッセージログを JSON形式で蓄積
function recordMessageLog(message, group, status, errorMessage) {
	try {
		var timestamp = new Date().toISOString();
		
		// メッセージログオブジェクトを作成
		var logEntry = {
			displayedMessage: message || '(メッセージなし)',
			messageGroup: group,
			status: status, // 'success' / 'error' / 'failed'
			timestamp: timestamp,
			errorMessage: errorMessage || null
		};
		
		try {
			// ★ 新しいAPI (Qualtrics最新バージョン対応)
			if (typeof Qualtrics.SurveyEngine.setJSEmbeddedData === 'function') {
				Qualtrics.SurveyEngine.setJSEmbeddedData('DisplayedMessage', message || '(メッセージなし)');
				Qualtrics.SurveyEngine.setJSEmbeddedData('MessageGroup', group);
				Qualtrics.SurveyEngine.setJSEmbeddedData('MessageStatus', status);
				Qualtrics.SurveyEngine.setJSEmbeddedData('MessageTimestamp', timestamp);
				if (errorMessage) {
					Qualtrics.SurveyEngine.setJSEmbeddedData('MessageError', errorMessage);
				}
				console.log('setJSEmbeddedDataでログを記録しました');
			} else {
				// フォールバック: 従来のAPI
				Qualtrics.SurveyEngine.setEmbeddedData('DisplayedMessage', message || '(メッセージなし)');
				Qualtrics.SurveyEngine.setEmbeddedData('MessageGroup', group);
				Qualtrics.SurveyEngine.setEmbeddedData('MessageStatus', status);
				Qualtrics.SurveyEngine.setEmbeddedData('MessageTimestamp', timestamp);
				if (errorMessage) {
					Qualtrics.SurveyEngine.setEmbeddedData('MessageError', errorMessage);
				}
				console.log('従来のAPIでログを記録しました');
			}
		} catch(e) {
			console.warn('埋め込み変数の設定に失敗しました:', e);
		}
		 
		// 【ステップ2】JSON形式で全ログを保存（複数回表示される場合に対応）
		// 既存のログを取得
		var existingLogs;
		try {
			// 新しいAPI
			if (typeof Qualtrics.SurveyEngine.getJSEmbeddedData === 'function') {
				existingLogs = Qualtrics.SurveyEngine.getJSEmbeddedData('MessageLogs');
			} else {
				// フォールバック: 従来のAPI
				existingLogs = Qualtrics.SurveyEngine.getEmbeddedData('MessageLogs');
			}
		} catch(e) {
			console.warn('既存ログの取得に失敗しました:', e);
			existingLogs = '';
		}
		
		var logsArray = [];
		
		// 既存ログが存在する場合は、JSON形式で解析
		if (existingLogs && existingLogs !== '') {
			try {
				logsArray = JSON.parse(existingLogs);
				if (!Array.isArray(logsArray)) {
					logsArray = [];
				}
			} catch(e) {
				console.warn('既存のMessageLogsをパースできません:', e);
				logsArray = [];
			}
		}
		
		// 新しいログエントリを配列に追加
		logsArray.push(logEntry);
		
		// ログ配列をJSON文字列に変換
		var logsJson = JSON.stringify(logsArray);
		
		// 文字数制限チェック（クアルトリクスの埋め込み変数は文字数に制限がある場合がある）
		// 上限を超える場合は、最新100件のみ保持
		if (logsJson.length > 10000) {
			logsArray = logsArray.slice(-100); // 最新10件のみ保持
			logsJson = JSON.stringify(logsArray);
		}
		
		// MessageLogsに全ログを保存
		try {
			if (typeof Qualtrics.SurveyEngine.setJSEmbeddedData === 'function') {
				Qualtrics.SurveyEngine.setJSEmbeddedData('MessageLogs', logsJson);
			} else {
				Qualtrics.SurveyEngine.setEmbeddedData('MessageLogs', logsJson);
			}
		} catch(e) {
			console.warn('MessageLogsの設定に失敗しました:', e);
		}
		
		console.log('メッセージログを記録しました:', logEntry);
	} catch(error) {
		console.error('メッセージログの記録に失敗しました:', error);
	}
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
	//5000ms後に削除
	setTimeout(function() {
		notification.style.animation = 'slideOut 0.3s ease-in';
		setTimeout(function() {
			if (notification.parentNode) {
				notification.parentNode.removeChild(notification);
			}
		}, 300);
	}, 5000);
	
	
}