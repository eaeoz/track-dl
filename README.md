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
- FFmpeg (installed automatically via ffmpeg-static)

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
| `-h, --help` | Show this help message |
| `-b, --browser` | Browser for YouTube cookies (chrome, firefox, edge, disabled). Default: disabled |
| `-e, --export-cookies` | Export cookies when setting browser (use with -b) |
| `itunes_limit` | Number of iTunes results (3, 5, or 10). Default: 3 |
| `youtube_limit` | Number of YouTube results (3, 5, or 10). Default: 3 |

## YouTube Cookies

Some YouTube videos require cookies to download. By default, cookies are disabled.

### Setting up cookies

```bash
# Enable cookies from Firefox and export to file
track-dl -b firefox -e

# Enable cookies from Chrome
track-dl -b chrome

# Enable cookies from Edge
track-dl -b edge

# Disable cookies
track-dl -b disabled
```

When you set a browser, the setting is saved to `.track-dl-config.json` and persists for future runs.

The `-e` flag exports cookies from your browser to a local file, which can help avoid issues with some browsers (like Firefox DPAPI encryption problems).

## Commands

### Update yt-dlp

```bash
track-dl -u
# or
track-dl --update
```

## Output

- MP3 file saved to the **project directory** (where track-dl is installed)
- File naming: `{artist} - {title}.mp3`
- Includes metadata: title, artist, album, album art

## Configuration

Settings are stored in `.track-dl-config.json` in the project directory:

```json
{
  "browser": "firefox",
  "cookiesFile": "cookies.txt"
}
```

## Troubleshooting

### yt-dlp.exe not found
Run `track-dl -u` to download the latest version.

### "Requested format is not available" error
This usually means YouTube requires cookies. Set a browser with `-b chrome`, `-b firefox`, or `-b edge`.

### Download fails with cookies
The tool will automatically retry without cookies if the first attempt fails.

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