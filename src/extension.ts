// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

interface VideoHistory {
	id: string;
	title: string;
	url: string;
	timestamp: number;
}

class YouTubeViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private _currentVideoId: string | null = null;
	private readonly _maxHistoryItems = 30;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _context: vscode.ExtensionContext,
	) { }

	public playVideo(videoId: string, title?: string, url?: string) {
		if (this._view) {
			this._currentVideoId = videoId;
			this._view.webview.postMessage({ type: 'playVideo', videoId });

			// Save to history if title and url are provided
			if (url) {
				this._addToHistory(videoId, title || `Video ${videoId}`, url);
			}
		}
	}

	private async _addToHistory(videoId: string, title: string, url: string) {
		const history = this._context.globalState.get<VideoHistory[]>('youtubePlayer.history', []);
		
		// Remove if already exists
		const filteredHistory = history.filter(item => item.id !== videoId);
		
		// Add new item at the beginning
		const newHistory = [
			{ id: videoId, title, url, timestamp: Date.now() },
			...filteredHistory
		].slice(0, this._maxHistoryItems);

		await this._context.globalState.update('youtubePlayer.history', newHistory);
	}

	public async getHistory(): Promise<VideoHistory[]> {
		return this._context.globalState.get<VideoHistory[]>('youtubePlayer.history', []);
	}

	public async removeFromHistory(videoId: string) {
		const history = await this.getHistory();
		const newHistory = history.filter(item => item.id !== videoId);
		await this._context.globalState.update('youtubePlayer.history', newHistory);
	}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		webviewView.webview.html = this._getHtmlForWebview();

		// Restore video state when webview becomes visible
		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible && this._currentVideoId) {
				webviewView.webview.postMessage({ 
					type: 'playVideo', 
					videoId: this._currentVideoId
				});
			}
		});

		webviewView.webview.onDidReceiveMessage(async data => {
			if (data.type === 'addVideo') {
				const url = await vscode.window.showInputBox({
					prompt: 'Enter YouTube URL',
					placeHolder: 'https://www.youtube.com/watch?v=...'
				});

				if (url) {
					const videoId = extractVideoId(url);
					if (videoId) {
						if (this._view) {
							this._currentVideoId = videoId;
							this._view.webview.postMessage({ type: 'playVideo', videoId });
							// Save to history with temporary title
							this._addToHistory(videoId, `Video ${videoId}`, url);
						}
					} else {
						vscode.window.showErrorMessage('Invalid YouTube URL');
					}
				}
			}
		});
	}

	private _getHtmlForWebview() {
		return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="referrer" content="strict-origin-when-cross-origin">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<style>
					body {
						margin: 0;
						padding: 0px;
						color: var(--vscode-foreground);
						background-color: var(--vscode-editor-background);
						height: 100vh;
						display: flex;
						flex-direction: column;
						align-items: center;
						justify-content: center;
					}
					#player {
						position: absolute;
						width: 100%;
						height: 100%;
						display: none;
					}
					#player iframe {
						width: 100%;
						height: 100%;
						border: none;
					}
					button {
						background-color: #FF0000;
						color: white;
						border: none;
						width: 60px;
						height: 60px;
						border-radius: 50%;
						cursor: pointer;
						display: flex;
						align-items: center;
						justify-content: center;
						position: relative;
						transition: transform 0.2s;
					}
					button:hover {
						background-color: #CC0000;
						transform: scale(1.1);
					}
					button::before {
						content: '';
						width: 0;
						height: 0;
						border-style: solid;
						border-width: 12px 0 12px 20px;
						border-color: transparent transparent transparent white;
						margin-left: 4px;
						border-radius: 2px;
					}
				</style>
			</head>
			<body>
				<div id="player"></div>
				<button id="addVideoButton"></button>
				<script>
					(function() {
						const vscode = acquireVsCodeApi();
						let currentVideoId = null;

						// DOM 요소들을 캐시
						const playerContainer = document.getElementById('player');
						const addVideoButton = document.getElementById('addVideoButton');

						// Add Video 버튼에 이벤트 리스너 등록
						addVideoButton.addEventListener('click', () => {
							vscode.postMessage({ type: 'addVideo' });
						});

						// 메시지 이벤트 리스너
						window.addEventListener('message', event => {
							const message = event.data;
							if (message.type === 'playVideo') {
								playVideo(message.videoId);
							}
						});

						// 비디오 재생 함수
						function playVideo(videoId) {
							if (currentVideoId === videoId) return;
							
							currentVideoId = videoId;

							// Hide the button, show the player
							addVideoButton.style.display = 'none';
							playerContainer.style.display = 'block';

							// Load via proxy page to avoid YouTube Error 153
							// The proxy page on GitHub Pages provides a valid HTTPS origin for the Referer header
							playerContainer.innerHTML = '<iframe ' +
								'src="https://pearlismylove.github.io/vscode-ext-youtube-player/youtube.html?v=' + encodeURIComponent(videoId) + '&autoplay=1" ' +
								'referrerpolicy="strict-origin-when-cross-origin" ' +
								'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
								'allowfullscreen>' +
								'</iframe>';
						}
					})();
				</script>
			</body>
			</html>
		`;
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('YouTube Player extension is now active!');

	const provider = new YouTubeViewProvider(context.extensionUri, context);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider('youtube-media-player.view', provider)
	);

	// Register command for adding video via command palette
	let addVideoCommand = vscode.commands.registerCommand('youtube-media-player.addVideo', async () => {
		const url = await vscode.window.showInputBox({
			prompt: 'Enter YouTube URL',
			placeHolder: 'https://www.youtube.com/watch?v=...'
		});

		if (url) {
			const videoId = extractVideoId(url);
			if (videoId) {
				provider.playVideo(videoId, `Video ${videoId}`, url);
			} else {
				vscode.window.showErrorMessage('Invalid YouTube URL');
			}
		}
	});

	// Register command for showing video history
	let showHistoryCommand = vscode.commands.registerCommand('youtube-media-player.showHistory', async () => {
		while (true) {  // Loop to show history after deletion
			const history = await provider.getHistory();
			if (history.length === 0) {
				vscode.window.showInformationMessage('No video history found.');
				return;
			}

			const items = history.map(item => ({
				label: item.title,
				description: item.url,
				detail: new Date(item.timestamp).toLocaleString(),
				videoId: item.id,
				url: item.url
			}));

			const selected = await vscode.window.showQuickPick(items, {
				placeHolder: 'Select a video from history',
				matchOnDescription: true,
				matchOnDetail: true
			});

			if (!selected) {
				return;  // User cancelled
			}
			provider.playVideo(selected.videoId, selected.label, selected.url);
			return;
		}
	});

	context.subscriptions.push(addVideoCommand, showHistoryCommand);
}

function extractVideoId(url: string): string | null {
	// Support for regular video URLs and live streaming URLs
	const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
	const match = url.match(regExp);
	return (match && match[2].length === 11) ? match[2] : null;
}

// This method is called when your extension is deactivated
export function deactivate() {}
