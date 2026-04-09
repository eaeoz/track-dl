# AGENTS.md

Project: Node.js CLI tool to search iTunes, download from YouTube, merge metadata with album art.

## Setup

- Install: `npm install`
- yt-dlp.exe stored locally (do not delete)
- FFmpeg installed automatically via ffmpeg-static

## Run

```bash
node index.js "song name" [itunes_limit] [youtube_limit]
# Example: node index.js "Shape of You" 5 3
```

- Valid limits: 3, 5, 10
- Output: MP3 saved to project directory

## Options

| Option | Description |
|--------|-------------|
| `-v, --version` | Show version number |
| `-u, --update` | Update yt-dlp.exe to latest version |
| `-h, --help` | Show help message |
| `-b, --browser` | Browser for YouTube cookies (chrome, firefox, edge, disabled) |
| `-e, --export-cookies` | Export cookies when setting browser |

## YouTube Cookies

```bash
# Enable cookies from Firefox and export
track-dl -b firefox -e

# Disable cookies
track-dl -b disabled
```

## Architecture

```
index.js        - CLI entry, inquirer prompts
lib/itunes.js   - iTunes search + metadata
lib/youtube.js  - YouTube search + download (local yt-dlp.exe)
lib/merger.js   - Merge audio + iTunes metadata + cover via ffmpeg
yt-dlp.exe      - Local binary (must exist in project root)
.track-dl-config.json - Saved browser/cookies settings
```

## Key Quirks

- Uses local `yt-dlp.exe` via `child_process.exec`
- Config saved to `.track-dl-config.json` in project directory
- Downloads retry without cookies if cookie-based download fails