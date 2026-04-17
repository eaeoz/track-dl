# track-dl

Search and download music from YouTube using AI to find the best match.

## Quick Start

### Run without installation (npx)
```bash
npx track-dl song name
```

### Install globally (recommended)
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

# Search with any query
track-dl shape of you
```

## Options

| Option | Description |
|--------|-------------|
| `-v, --version` | Show version number |
| `-u, --update` | Update yt-dlp.exe to latest version |
| `--auth <token>` | Set Puter AI auth token for better matching |

## Puter AI

For better song matching, get a free auth token from https://puter.com/dashboard and set it:

```bash
track-dl --auth YOUR_TOKEN_HERE
```

Then search normally - AI will extract correct artist and title from YouTube results.

## How It Works

1. **Search**: Searches YouTube with your query
2. **Match**: Uses algorithm (or Puter AI if token set) to find best match
3. **Download**: Automatically downloads the best match (no prompts)
4. **Save**: Saves MP3 file as `{artist} - {title}.mp3`

## Output

- MP3 file saved to the **project directory**
- File naming: `{artist} - {title}.mp3`

## Setup (for local development)

**Install dependencies:**

```bash
npm install
```

This will download ffmpeg-static and yt-dlp.exe automatically.

## Author

Sedat ERGOZ [@eaeoz](https://github.com/eaeoz)

## License

MIT License