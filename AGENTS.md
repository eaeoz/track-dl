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

- Output: MP3 saved as `{artist} - {title}.mp3`

## Options

| Option | Description |
|--------|-------------|
| `-v, --version` | Show version |
| `-u, --update` | Update yt-dlp.exe |
| `-m, --manual` | Select source, metadata and album cover manually (6 options per step) |

## How It Works

1. Searches YouTube with query
2. Fetches metadata from Deezer -> iTunes (artist, title, album, year, genre, cover)
3. Matches best YouTube result
4. Downloads audio automatically
5. Embeds metadata + album cover into MP3

## Manual Mode (`-m`)

Each step shows 6 options:
1. Select a YouTube source
2. Select metadata (artist, title, album, year, genre) from Deezer/iTunes
3. Select an album cover
4. Downloads audio and embeds the chosen metadata + cover

## Characters & Shell Safety

- Subprocess calls (yt-dlp, ffmpeg) use `spawn` with argument arrays, so queries may contain
  Turkish, English, Arabic, Chinese, Japanese and any other characters without breaking the shell.
- Only Windows-invalid filename characters (`< > : " \ / | ? *`) plus `` $ `` and backtick are
  removed from the output file name.

## APIs Used

- **Deezer**: Primary - artist, title, album, year, genre, cover
- **iTunes**: Backup - same fields