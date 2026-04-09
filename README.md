# track-dl

Search iTunes, download from YouTube, and merge metadata with album art.

## Requirements

- [Node.js](https://nodejs.org/) (v14+)
- [FFmpeg](https://ffmpeg.org/) installed system-wide
- Spotify API credentials

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set Spotify credentials** (Windows System environment variables):
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   
   Get credentials at: https://developer.spotify.com/dashboard/
   
   > **Note:** Set at Windows System level (not .env file). Restart terminal after setting.

3. **Ensure yt-dlp.exe exists** in the project folder.

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

### FFmpeg not found
Install FFmpeg and ensure it's in your system PATH.

### Spotify credentials not working
Verify env vars are set at Windows System level, then restart your terminal.

### yt-dlp.exe missing
Run `track-dl -u` to download the latest version.