#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const https = require('https');
const { searchYouTube, downloadYouTubeAudioWithTemp } = require('./lib/youtube');
const { mergeMetadata } = require('./lib/merger');
const { findBestSongMatch } = require('./lib/puter');

const packageJson = require('./package.json');

const TOKEN_FILE = path.join(__dirname, '.puter-token');

function savePuterToken(token) {
  fs.writeFileSync(TOKEN_FILE, token.trim());
  console.log('Puter token saved (will fill missing year/genre)');
}

function loadPuterToken() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
    }
  } catch {}
  return '';
}

async function updateYtDlp() {
  const exePath = path.join(__dirname, 'yt-dlp.exe');
  console.log('Downloading yt-dlp.exe...');

  function download(url) {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        if (response.statusCode === 302 && response.headers.location) {
          download(response.headers.location).then(resolve).catch(reject);
        } else {
          const file = fs.createWriteStream(exePath);
          response.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log('yt-dlp.exe downloaded');
            resolve();
          });
        }
      }).on('error', (err) => {
        fs.unlink(exePath, () => {});
        reject(err);
      });
    });
  }

  await download('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (!args.length) {
    console.log(`track-dl v${packageJson.version}`);
    console.log('Usage: track-dl song name');
    console.log('Example: track-dl god is a dj');
    process.exit(1);
  }

  const firstArg = args[0];

  if (firstArg === '-v' || firstArg === '--version') {
    console.log(`track-dl v${packageJson.version}`);
    process.exit(0);
  }

  if (firstArg === '-u' || firstArg === '--update') {
    try {
      await updateYtDlp();
      process.exit(0);
    } catch (err) {
      console.error('Failed to update:', err.message);
      process.exit(1);
    }
  }

  if (firstArg === '--auth' && args[1]) {
    savePuterToken(args[1]);
    process.exit(0);
  }

  const query = args.join(' ');

  console.log(`\n=== Searching YouTube: "${query}" ===`);
  
  const youtubeResults = await searchYouTube(query, 5);
  
  if (!youtubeResults.length) {
    console.log('No results');
    process.exit(1);
  }

  console.log(`Found ${youtubeResults.length} results`);

  const bestMatch = await findBestSongMatch(query, youtubeResults);
  const selectedYoutube = bestMatch.video;

  console.log(`\nBest: ${bestMatch.artist} - ${bestMatch.title}`);
  if (bestMatch.album) console.log(`Album: ${bestMatch.album}`);
  if (bestMatch.year) console.log(`Year: ${bestMatch.year}`);
  if (bestMatch.genre) console.log(`Genre: ${bestMatch.genre}`);

  console.log('\n=== Downloading ===');

  const tempAudioPath = await downloadYouTubeAudioWithTemp(selectedYoutube.url);
  
  if (!tempAudioPath) {
    console.log('Download failed');
    process.exit(1);
  }

  console.log('Downloaded');

  const safeArtist = (bestMatch.artist || '').replace(/[<>:"/\\|?*]/g, '').trim();
  const safeTitle = (bestMatch.title || '').replace(/[<>:"/\\|?*]/g, '').trim();
  const outputPath = path.join(process.cwd(), `${safeArtist} - ${safeTitle}.mp3`);

  const metadata = {
    title: bestMatch.title,
    artist: bestMatch.artist,
    album: bestMatch.album || '',
    year: bestMatch.year || '',
    genre: bestMatch.genre || '',
    albumArt: bestMatch.coverUrl || ''
  };

  try {
    await mergeMetadata(tempAudioPath, metadata, outputPath);
    console.log(`\n=== SUCCESS ===`);
    console.log(`File: ${outputPath}`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});