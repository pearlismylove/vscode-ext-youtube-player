// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

class YouTubeViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private _currentVideoId: string | null = null;
	private _isPaused: boolean = false;
	private _currentTime: number = 0;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public playVideo(videoId: string) {
		if (this._view) {
			this._currentVideoId = videoId;
			this._isPaused = false;
			this._currentTime = 0;
			this._view.webview.postMessage({ type: 'playVideo', videoId });
		}
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
						}
					} else {
						vscode.window.showErrorMessage('Invalid YouTube URL');
					}
				}
			} else if (data.type === 'playerStateChanged') {
				this._isPaused = data.isPaused;
				this._currentTime = data.currentTime;
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

						// 비디오 재생 함수
						function playVideo(videoId, isPaused = false, currentTime = 0) {
							if (currentVideoId === videoId) return;
							currentVideoId = videoId;
							pendingTime = currentTime;
							pendingPaused = isPaused;

							playerContainer.innerHTML = \`
								<div class="video-container">
									<iframe
										id="youtube-player"
										src="https://www.youtube.com/embed/\${videoId}?autoplay=1&enablejsapi=1"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowfullscreen>
									</iframe>
								</div>
							\`;
							// Hide the button after video is loaded
							addVideoButton.style.display = 'none';

							// YouTube IFrame API 로드
							if (typeof YT === 'undefined') {
								const tag = document.createElement('script');
								tag.src = "https://www.youtube.com/iframe_api";
								const firstScriptTag = document.getElementsByTagName('script')[0];
								firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
							}

							window.onYouTubeIframeAPIReady = function() {
								player = new YT.Player('youtube-player', {
									events: {
										'onStateChange': onPlayerStateChange,
										'onReady': onPlayerReady
									}
								});
							};
						}

						function onPlayerReady(event) {
							if (player) {
								player.seekTo(pendingTime);
								if (pendingPaused) {
									player.pauseVideo();
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

	const provider = new YouTubeViewProvider(context.extensionUri);
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
				provider.playVideo(videoId);
			} else {
				vscode.window.showErrorMessage('Invalid YouTube URL');
			}
		}
	});

	context.subscriptions.push(addVideoCommand);
}

function extractVideoId(url: string): string | null {
	const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
	const match = url.match(regExp);
	return (match && match[2].length === 11) ? match[2] : null;
}

// This method is called when your extension is deactivated
export function deactivate() {}
