# AGENTS.md

Project: Node.js CLI tool to search YouTube and download music with auto metadata.

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

## How It Works

1. Searches YouTube with user query
2. Fetches metadata from Deezer/iTunes (artist, title, album, year, genre, cover)
3. Matches best YouTube result using metadata
4. Downloads audio automatically
5. Embeds metadata and album cover into MP3

## APIs Used

- **Deezer**: Primary - provides artist, title, album, year, genre, cover
- **iTunes**: Backup - provides artist, title, album, year, genre, cover
- **LastFM**: Fallback - provides artist, title only