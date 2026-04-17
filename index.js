#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const https = require('https');
const { searchYouTube, downloadYouTubeAudioWithTemp } = require('./lib/youtube');
const { mergeMetadata } = require('./lib/merger');
const { findBestSongMatch, saveConfig: savePuterConfig } = require('./lib/puter');

const packageJson = require('./package.json');

const CONFIG_PATH = path.join(__dirname, '.track-dl-config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch {}
  return { puterToken: null };
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

const config = loadConfig();

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
            console.log('yt-dlp.exe downloaded successfully.');
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
  
  if (args.length === 0) {
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
      console.error('Failed to update yt-dlp:', err.message);
      process.exit(1);
    }
  }

  if (firstArg === '--auth' && args[1]) {
    const token = args[1];
    config.puterToken = token;
    savePuterConfig(config);
    console.log('Puter auth token saved.');
    process.exit(0);
  }

  let query = args.join(' ');

  console.log(`\n=== Searching YouTube for: "${query}" ===`);
  
  const youtubeResults = await searchYouTube(query, 5);
  
  if (youtubeResults.length === 0) {
    console.log('No results from YouTube.');
    process.exit(1);
  }

  console.log(`\nFound ${youtubeResults.length} results. Using AI to find the best match...`);

  const bestMatch = await findBestSongMatch(query, youtubeResults);
  const selectedYoutube = bestMatch.video;

  console.log(`\nBest match: ${bestMatch.artist} - ${bestMatch.title}`);
  console.log(`Reason: ${bestMatch.reason}`);

  console.log('\n=== Downloading audio from YouTube ===');

  const tempAudioPath = await downloadYouTubeAudioWithTemp(selectedYoutube.url);
  
  if (!tempAudioPath) {
    console.log('Failed to download audio.');
    process.exit(1);
  }

  console.log('Audio downloaded successfully.');

  const safeArtist = (bestMatch.artist || '').replace(/[<>:"/\\|?*]/g, '').trim();
  const safeTitle = (bestMatch.title || '').replace(/[<>:"/\\|?*]/g, '').trim();
  const outputPath = path.join(process.cwd(), `${safeArtist} - ${safeTitle}.mp3`);

  const metadata = {
    title: bestMatch.title,
    artist: bestMatch.artist,
    album: '',
    albumArt: ''
  };

  try {
    await mergeMetadata(tempAudioPath, metadata, outputPath);
    console.log(`\n=== SUCCESS ===`);
    console.log(`File saved: ${outputPath}`);
  } catch (err) {
    console.error('Error saving file:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});