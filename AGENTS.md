# AGENTS.md

Project: Node.js CLI tool to search Spotify, download from YouTube, merge metadata with Spotify album art.

## Setup

- **Spotify credentials required** - set env vars: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- Get keys at: https://developer.spotify.com/dashboard/
- Install: `npm install`
- yt-dlp.exe stored locally (do not delete)

## Run

```bash
node index.js "song name" [spotify_limit] [youtube_limit]
# Example: node index.js "Shape of You" 5 3
```

- Valid limits: 3, 5, 10
- Output: MP3 saved to current folder

## Update yt-dlp

```bash
npm run update-yt-dlp
```

## Architecture

```
index.js        - CLI entry, inquirer prompts
lib/spotify.js  - Spotify search + metadata
lib/youtube.js  - YouTube search + download (local yt-dlp.exe)
lib/merger.js   - Merge audio + Spotify metadata + cover via ffmpeg
yt-dlp.exe      - Local binary (must exist in project root)
```

## Key Quirks

- Uses local `yt-dlp.exe` via `child_process.exec`, not shell command
- Env vars must be set at **Windows System level** (not .env file)
- Restart terminal after setting env variables
- FFmpeg must be installed system-wide for metadata merging
