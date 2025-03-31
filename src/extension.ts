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
	private _isPaused: boolean = false;
	private _currentTime: number = 0;
	private readonly _maxHistoryItems = 30;

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _context: vscode.ExtensionContext,
	) { }

	public playVideo(videoId: string, title?: string, url?: string) {
		if (this._view) {
			this._currentVideoId = videoId;
			this._isPaused = false;
			this._currentTime = 0;
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
					videoId: this._currentVideoId,
					isPaused: this._isPaused,
					currentTime: this._currentTime
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
							this._isPaused = false;
							this._currentTime = 0;
							this._view.webview.postMessage({ type: 'playVideo', videoId });
							// Save to history with temporary title
							this._addToHistory(videoId, `Video ${videoId}`, url);
						}
					} else {
						vscode.window.showErrorMessage('Invalid YouTube URL');
					}
				}
			} else if (data.type === 'playerStateChanged') {
				this._isPaused = data.isPaused;
				this._currentTime = data.currentTime;
			} else if (data.type === 'videoLoaded') {
				// Update video title in history
				const history = await this.getHistory();
				const video = history.find(item => item.id === data.videoId);
				if (video && video.title !== data.title) {
					await this._addToHistory(data.videoId, data.title, video.url);
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
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<script src="https://www.youtube.com/iframe_api"></script>
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
						display: flex;
						align-items: center;
						justify-content: center;
					}
					.video-container {
						position: relative;
						width: 100%;
						height: 100%;
						overflow: hidden;
					}
					.video-container iframe {
						position: absolute;
						top: 0;
						left: 0;
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
						let player = null;
						let pendingTime = 0;
						let pendingPaused = false;
						let isAPIReady = false;

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
								playVideo(message.videoId, message.isPaused, message.currentTime);
							}
						});

						// YouTube API Ready 핸들러
						window.onYouTubeIframeAPIReady = function() {
							isAPIReady = true;
							if (currentVideoId) {
								createPlayer(currentVideoId);
							}
						};

						// 비디오 재생 함수
						function playVideo(videoId, isPaused = false, currentTime = 0) {
							if (currentVideoId === videoId && player) return;
							
							currentVideoId = videoId;
							pendingTime = currentTime;
							pendingPaused = isPaused;

							if (player) {
								player.destroy();
								player = null;
							}

							// Hide the button
							addVideoButton.style.display = 'none';

							if (isAPIReady) {
								createPlayer(videoId);
							}
						}

						function createPlayer(videoId) {
							player = new YT.Player('player', {
								height: '100%',
								width: '100%',
								videoId: videoId,
								playerVars: {
									autoplay: 1,
									enablejsapi: 1
								},
								events: {
									'onReady': onPlayerReady,
									'onStateChange': onPlayerStateChange
								}
							});
						}

						function onPlayerReady(event) {
							if (player) {
								player.seekTo(pendingTime);
								if (pendingPaused) {
									player.pauseVideo();
								}
								// Send video title to extension
								const videoData = player.getVideoData();
								if (videoData && videoData.title) {
									vscode.postMessage({
										type: 'videoLoaded',
										videoId: currentVideoId,
										title: videoData.title
									});
								}
							}
						}

						function onPlayerStateChange(event) {
							// YT.PlayerState.PAUSED = 2
							const isPaused = event.data === 2;
							const currentTime = player ? player.getCurrentTime() : 0;
							
							vscode.postMessage({ 
								type: 'playerStateChanged', 
								isPaused,
								currentTime
							});

							// 상태가 변경될 때마다 제목 확인 및 업데이트
							if (player) {
								const videoData = player.getVideoData();
								if (videoData && videoData.title) {
									vscode.postMessage({
										type: 'videoLoaded',
										videoId: currentVideoId,
										title: videoData.title
									});
								}
							}
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
		vscode.window.registerWebviewViewProvider('youtube-player.view', provider)
	);

	// Register command for adding video via command palette
	let addVideoCommand = vscode.commands.registerCommand('youtube-player.addVideo', async () => {
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
	let showHistoryCommand = vscode.commands.registerCommand('youtube-player.showHistory', async () => {
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
	const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
	const match = url.match(regExp);
	return (match && match[2].length === 11) ? match[2] : null;
}

// This method is called when your extension is deactivated
export function deactivate() {}
