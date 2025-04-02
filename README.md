# YouTube Player for VS Code

Watch YouTube videos directly within Visual Studio Code! This extension allows you to play YouTube videos in a dedicated view, making it easy to follow tutorials or watch educational content while coding.

## Features

- 🎥 Play YouTube videos directly in VS Code
- 📝 Add videos via URL or command palette
- 📋 Maintain a history of recently watched videos (up to 30)
- ⏯️ Preserve video playback state (pause position, etc.)
- 🎯 Quick access through VS Code's sidebar

## Installation

1. Open VS Code
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (Mac) to open the Extensions view
3. Search for "YouTube Player"
4. Click Install

## Usage

### Playing a Video

1. Open the YouTube Player view from the sidebar
2. Click the "+" button or use the command palette and type "YouTube Media Player: Play Video"
3. Enter a YouTube URL (e.g., https://www.youtube.com/watch?v=...)
4. The video will start playing automatically

### Viewing History

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "YouTube Media Player: Show History"
3. Select a video from your history to play it

## Screenshots

![Watching a YouTube video](https://pearlismylove-commons.s3.ap-northeast-2.amazonaws.com/images/readme/youtube-vscode-ext-readme1.png)

![Watching a YouTube video](https://pearlismylove-commons.s3.ap-northeast-2.amazonaws.com/images/readme/youtube-vscode-ext-readme2.png)

## Requirements

- VS Code version 1.74.0 or higher

## Extension Settings

This extension contributes the following settings:

* `youtubeMediaPlayer.maxHistoryItems`: Maximum number of videos to keep in history (default: 30)

## Release Notes

### 1.0.4

- Support Live URL

### 1.0.3

- Update Screenshot URL

### 1.0.2

- Bugfix

### 1.0.1

- Updated command names to be more descriptive:
  - "YouTube Player: Play Video" → "YouTube Media Player: Play Video"
  - "YouTube Player: Show History" → "YouTube Media Player: Show History"

### 1.0.0

Initial release of YouTube Player for VS Code:
- Basic video playback functionality
- Video history management
- Playback state preservation
- Command palette integration

---

**Enjoy coding with YouTube!** 🚀
