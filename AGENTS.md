# AGENTS.md

Project: Node.js CLI tool to search YouTube and download music using AI.

## Setup

- Install: `npm install`
- yt-dlp.exe stored locally (do not delete)
- FFmpeg installed automatically via ffmpeg-static

## Run

```bash
node index.js song name
# Example: node index.js god is a dj
```

- Output: MP3 saved to project directory as `{artist} - {title}.mp3`

## Options

| Option | Description |
|--------|-------------|
| `-v, --version` | Show version number |
| `-u, --update` | Update yt-dlp.exe to latest version |
| `--auth <token>` | Set Puter AI auth token |

## Puter AI

To use Puter AI for better song matching:
1. Get token from https://puter.com/dashboard
2. Run: `track-dl --auth YOUR_TOKEN`

Then search without quotes: `track-dl god is a dj`

## YouTube Cookies

```bash
# Enable cookies from Firefox
track-dl -b firefox

# Disable cookies
track-dl -b disabled
```

## How It Works

1. Searches YouTube with user query
2. Uses AI to find best match (extracts artist/title)
3. Auto-downloads to MP3
4. Saves as `{artist} - {title}.mp3`