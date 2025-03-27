// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

class YouTubeViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

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
							this._view.webview.postMessage({ type: 'playVideo', videoId });
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
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<style>
					body {
						margin: 0;
						padding: 10px;
						color: var(--vscode-foreground);
						background-color: var(--vscode-editor-background);
					}
					.video-container {
						position: relative;
						padding-bottom: 56.25%;
						height: 0;
						overflow: hidden;
						margin-top: 10px;
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
						background-color: var(--vscode-button-background);
						color: var(--vscode-button-foreground);
						border: none;
						padding: 4px 8px;
						cursor: pointer;
						border-radius: 2px;
						margin: 5px 0;
					}
					button:hover {
						background-color: var(--vscode-button-hoverBackground);
					}
				</style>
			</head>
			<body>
				<button id="addVideoButton">Add Video</button>
				<div id="player"></div>
				<script>
					(function() {
						const vscode = acquireVsCodeApi();
						let currentVideoId = null;

						// DOM 요소들을 캐시
						const player = document.getElementById('player');
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
							player.innerHTML = \`
								<div class="video-container">
									<iframe
										src="https://www.youtube.com/embed/\${videoId}?autoplay=1"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
										allowfullscreen>
									</iframe>
								</div>
							\`;
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
}

function extractVideoId(url: string): string | null {
	const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
	const match = url.match(regExp);
	return (match && match[2].length === 11) ? match[2] : null;
}

// This method is called when your extension is deactivated
export function deactivate() {}
