# track-dl

Search iTunes, download from YouTube, and merge metadata with album art.

## Quick Start

### Run without installation (npx)
```bash
npx track-dl "song name"
```

### Install globally (recommended)
```bash
npm install -g track-dl
track-dl "song name"
```

### Check version
```bash
track-dl --version
```

## Requirements

- [Node.js](https://nodejs.org/) (v14+)

## Usage

```bash
track-dl "song name" [itunes_limit] [youtube_limit]
```

### Examples

```bash
# Basic search
track-dl "Shape of You"

# With custom result limits
track-dl "Shape of You" 5 3
```

### Options

| Option | Description |
|--------|-------------|
| `-v, --version` | Show version number |
| `-u, --update` | Update yt-dlp.exe to latest version |
| `itunes_limit` | Number of iTunes results (3, 5, or 10). Default: 3 |
| `youtube_limit` | Number of YouTube results (3, 5, or 10). Default: 3 |

## Commands

### Update yt-dlp

```bash
track-dl -u
# or
track-dl --update
```

## Output

- MP3 file saved to the **current working directory** (where you run the command)
- File naming: `{artist} - {title}.mp3`
- Includes metadata: title, artist, album, album art

## Troubleshooting

### yt-dlp.exe not found
Run `track-dl -u` to download the latest version.

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