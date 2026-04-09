#!/usr/bin/env node

const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { searchiTunes } = require('./lib/itunes');
const { searchYouTube, downloadYouTubeAudioWithTemp } = require('./lib/youtube');
const { mergeMetadata } = require('./lib/merger');

const packageJson = require('./package.json');

const CONFIG_PATH = path.join(__dirname, '.track-dl-config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch {}
  return { browser: null, cookiesFile: null };
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
    const browserStatus = config.browser ? config.browser : 'disabled';
    const cookiesStatus = config.cookiesFile ? 'enabled' : 'disabled';
    console.log('');
    console.log('Usage: track-dl "song name" [itunes_limit] [youtube_limit]');
    console.log('Example: track-dl "Shape of You" 5 3');
    console.log('');
    console.log('Options:');
    console.log('  -v, --version          Show version number');
    console.log('  -u, --update           Update yt-dlp.exe to latest version');
    console.log(`  -b, --browser          Browser for YouTube cookies (chrome, firefox, edge, disabled). Current: ${browserStatus}`);
    console.log('  -e, --export-cookies   Export cookies when setting browser (use with -b)');
    console.log('  itunes_limit           Number of iTunes results (3, 5, or 10). Default: 3');
    console.log('  youtube_limit          Number of YouTube results (3, 5, or 10). Default: 3');
    console.log(`  cookies file           YouTube cookies file: ${config.cookiesFile || 'none'}`);
    process.exit(1);
  }

  const firstArg = args[0];

  if (firstArg === '-v' || firstArg === '--version') {
    console.log(`track-dl v${packageJson.version}`);
    process.exit(0);
  }

  if (firstArg === '-h' || firstArg === '--help') {
    const browserStatus = config.browser ? config.browser : 'disabled';
    const cookiesStatus = config.cookiesFile ? 'enabled' : 'disabled';
    console.log(`track-dl v${packageJson.version}`);
    console.log('');
    console.log('Usage: track-dl "song name" [itunes_limit] [youtube_limit]');
    console.log('Example: track-dl "Shape of You" 5 3');
    console.log('');
    console.log('Options:');
    console.log('  -v, --version          Show version number');
    console.log('  -u, --update           Update yt-dlp.exe to latest version');
    console.log('  -h, --help             Show this help message');
    console.log(`  -b, --browser          Browser for YouTube cookies (chrome, firefox, edge, disabled). Current: ${browserStatus}`);
    console.log('  -e, --export-cookies   Export cookies when setting browser (use with -b)');
    console.log('  itunes_limit           Number of iTunes results (3, 5, or 10). Default: 3');
    console.log('  youtube_limit          Number of YouTube results (3, 5, or 10). Default: 3');
    console.log(`  cookies file           YouTube cookies file: ${config.cookiesFile || 'none'}`);
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

  let query = args[0];
  let itunesLimit = 3;
  let youtubeLimit = 3;
  let argIndex = 0;

  const browserIndex = args.indexOf('-b') !== -1 ? args.indexOf('-b') : args.indexOf('--browser');
  const exportCookies = args.indexOf('-e') !== -1 || args.indexOf('--export-cookies') !== -1;

  if (browserIndex !== -1 && args[browserIndex + 1]) {
    const newBrowser = args[browserIndex + 1].toLowerCase();
    if (newBrowser === 'disabled') {
      config.browser = null;
      saveConfig(config);
      console.log('Browser cookies disabled.');
      process.exit(0);
    }
    if (['chrome', 'firefox', 'edge'].includes(newBrowser)) {
      config.browser = newBrowser;
      saveConfig(config);
      console.log(`Default browser set to: ${config.browser}`);
      
      if (exportCookies) {
        const cookiesFile = path.join(__dirname, 'cookies.txt');
        console.log(`Exporting cookies from ${config.browser} to ${cookiesFile}...`);
        try {
          const YTDLP_PATH = path.join(__dirname, 'yt-dlp.exe');
          require('child_process').execSync(`"${YTDLP_PATH}" --cookies-from-browser ${config.browser} --cookies ${cookiesFile}`, { stdio: 'inherit' });
          config.cookiesFile = cookiesFile;
          saveConfig(config);
          console.log('Cookies exported successfully!');
          process.exit(0);
        } catch (err) {
          console.error('Failed to export cookies:', err.message);
          process.exit(1);
        }
      }
      
      const remainingArgs = args.slice(browserIndex + 2);
      if (remainingArgs.length === 0) {
        process.exit(0);
      }
    } else {
      console.error('Invalid browser. Use: chrome, firefox, edge, or disabled');
      process.exit(1);
    }
  }

  const queryArgsStart = browserIndex !== -1 ? browserIndex + 2 : 0;
  const remainingArgs = args.slice(queryArgsStart);
  if (remainingArgs.length === 0) {
    const browserStatus = config.browser ? config.browser : 'disabled';
    const cookiesStatus = config.cookiesFile ? 'enabled' : 'disabled';
    console.log(`track-dl v${packageJson.version}`);
    console.log('');
    console.log('Usage: track-dl "song name" [itunes_limit] [youtube_limit]');
    console.log('Example: track-dl "Shape of You" 5 3');
    console.log('');
    console.log('Options:');
    console.log('  -v, --version          Show version number');
    console.log('  -u, --update           Update yt-dlp.exe to latest version');
    console.log(`  -b, --browser          Browser for YouTube cookies (chrome, firefox, edge, disabled). Current: ${browserStatus}`);
    console.log('  -e, --export-cookies   Export cookies when setting browser (use with -b)');
    console.log('  itunes_limit           Number of iTunes results (3, 5, or 10). Default: 3');
    console.log('  youtube_limit          Number of YouTube results (3, 5, or 10). Default: 3');
    console.log(`  cookies                YouTube cookies file status: ${cookiesStatus}`);
    process.exit(1);
  }
  query = remainingArgs[0];
  itunesLimit = 3;
  youtubeLimit = 3;
  argIndex = 1;

  if (remainingArgs[1] && [3, 5, 10].includes(parseInt(remainingArgs[1]))) {
    itunesLimit = parseInt(remainingArgs[1]);
    argIndex = 2;
  }

  if (remainingArgs[argIndex] && [3, 5, 10].includes(parseInt(remainingArgs[argIndex]))) {
    youtubeLimit = parseInt(remainingArgs[argIndex]);
  }

  console.log('\n=== Searching iTunes ===');
  const itunesResults = await searchiTunes(query, itunesLimit);
  
  if (itunesResults.length === 0) {
    console.log('No results from iTunes.');
    process.exit(1);
  }

  const itunesChoices = itunesResults.map((track, idx) => 
    `${idx + 1}. ${track.name} - ${track.artist} (${track.album})`
  );

  const itunesAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'itunesSelection',
      message: 'Select iTunes track:',
      choices: itunesChoices
    }
  ]);

  const itunesIndex = itunesChoices.indexOf(itunesAnswers.itunesSelection);
  const selectediTunes = itunesResults[itunesIndex];

  console.log(`\nSelected: ${selectediTunes.name} - ${selectediTunes.artist}`);
  console.log(`Album: ${selectediTunes.album}`);

  const ytQuery = `${selectediTunes.artist} ${selectediTunes.name} official audio`;
  console.log(`\n=== Searching YouTube for: "${ytQuery}" ===`);
  
  const youtubeResults = await searchYouTube(ytQuery, youtubeLimit, config.browser, config.cookiesFile);
  
  if (youtubeResults.length === 0) {
    console.log('No results from YouTube.');
    process.exit(1);
  }

  const youtubeChoices = youtubeResults.map((video, idx) => 
    `${idx + 1}. ${video.title} (${video.duration || 'N/A'})`
  );

  const youtubeAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'youtubeSelection',
      message: 'Select YouTube video:',
      choices: youtubeChoices
    }
  ]);

  const youtubeIndex = youtubeChoices.indexOf(youtubeAnswers.youtubeSelection);
  const selectedYoutube = youtubeResults[youtubeIndex];

  console.log(`\nSelected: ${selectedYoutube.title}`);
  console.log('\n=== Downloading audio from YouTube ===');

  const tempAudioPath = await downloadYouTubeAudioWithTemp(selectedYoutube.url, config.browser, config.cookiesFile);
  
  if (!tempAudioPath) {
    console.log('Failed to download audio.');
    process.exit(1);
  }

  console.log('Audio downloaded successfully.');

  const safeArtist = selectediTunes.artist.replace(/[<>:"/\\|?*]/g, '').trim();
  const safeTitle = selectediTunes.name.replace(/[<>:"/\\|?*]/g, '').trim();
  const safeAlbum = selectediTunes.album.replace(/[<>:"/\\|?*]/g, '').trim();
  const safeOutputFileName = `${safeArtist} - ${safeTitle}.mp3`;
  const outputPath = path.join(process.cwd(), safeOutputFileName);

  console.log('\n=== Merging metadata and album art ===');

  const metadata = {
    title: selectediTunes.name,
    artist: selectediTunes.artist,
    album: selectediTunes.album,
    albumArt: selectediTunes.albumArt
  };

  try {
    await mergeMetadata(tempAudioPath, metadata, outputPath);
    console.log(`\n=== SUCCESS ===`);
    console.log(`File saved: ${outputPath}`);
    console.log(`Title: ${metadata.title}`);
    console.log(`Artist: ${metadata.artist}`);
    console.log(`Album: ${metadata.album}`);
  } catch (err) {
    console.error('Error merging metadata:', err.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
