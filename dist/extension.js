/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(__webpack_require__(1));
class YouTubeViewProvider {
    _extensionUri;
    _view;
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview();
        webviewView.webview.onDidReceiveMessage(async (data) => {
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
                    }
                    else {
                        vscode.window.showErrorMessage('Invalid YouTube URL');
                    }
                }
            }
        });
    }
    _getHtmlForWebview() {
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
function activate(context) {
    console.log('YouTube Player extension is now active!');
    const provider = new YouTubeViewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('youtube-player.view', provider));
}
function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
// This method is called when your extension is deactivated
function deactivate() { }


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map