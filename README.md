# track-dl

Search and download music from YouTube with automatic metadata and album cover.

## Quick Start

### Run without installation
```bash
node index.js song name
```

### Install globally
```bash
npm install -g track-dl
track-dl song name
```

### Check version
```bash
track-dl --version
```

## Requirements

- [Node.js](https://nodejs.org/) (v14+)
- FFmpeg (installed automatically via ffmpeg-static)

## Usage

```bash
track-dl song name
```

### Examples

```bash
# Basic search
track-dl god is a dj
track-dl shape of you
track-dl superman eminem
```

## Options

| Option | Description |
|--------|-------------|
| `-v, --version` | Show version number |
| `-u, --update` | Update yt-dlp.exe to latest version |

## Features

- **Free APIs**: Uses Deezer, iTunes, and LastFM APIs (no API keys needed)
- **Auto metadata**: Gets artist, title, album, year, and genre automatically
- **Album cover**: Downloads and embeds album art from Deezer/iTunes
- **Smart matching**: Matches YouTube results based on artist/song info

## How It Works

1. **Search**: Searches YouTube with your query
2. **Fetch metadata**: Gets song info from Deezer (genre, cover, album, year)
3. **Match**: Finds best YouTube match using metadata
4. **Download**: Automatically downloads audio
5. **Merge**: Embeds metadata and album cover into MP3

## Output

- MP3 file saved to the **project directory**
- File naming: `{artist} - {title}.mp3`
- Includes: title, artist, album, year, genre, cover art

## Setup

```bash
npm install
```

This will download ffmpeg-static and yt-dlp.exe automatically.

## Author

Sedat ERGOZ [@eaeoz](https://github.com/eaeoz)

## License

MIT License