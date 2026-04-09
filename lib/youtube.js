const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpegStatic = require('ffmpeg-static');

const YTDLP_PATH = path.join(__dirname, '..', 'yt-dlp.exe');
const FFMPEG_PATH = path.dirname(ffmpegStatic);

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error && !stdout.trim()) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

async function searchYouTube(query, limit = 5, browser = null, cookiesFile = null) {
  try {
    let cookieOptions = '';
    if (cookiesFile && fs.existsSync(cookiesFile)) {
      cookieOptions = `--cookies ${cookiesFile}`;
    } else if (browser) {
      cookieOptions = `--cookies-from-browser ${browser}`;
    }
    const result = await execPromise(`"${YTDLP_PATH}" "ytsearch${limit}:${query}" --dump-json --no-warnings --flat-playlist ${cookieOptions}`);
    
    if (!result.trim()) {
      return [];
    }

    const lines = result.trim().split('\n');
    const videos = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);

    return videos.map(video => ({
      id: video.id,
      title: video.title,
      uploader: video.uploader || '',
      duration: video.duration || '',
      url: `https://www.youtube.com/watch?v=${video.id}`,
      thumbnail: video.thumbnails?.[0]?.url || video.thumbnail || ''
    }));
  } catch (err) {
    console.error('Error searching YouTube:', err.message);
    return [];
  }
}

async function downloadYouTubeAudioWithTemp(url, browser = null, cookiesFile = null) {
  const tempDir = path.join(__dirname, '..');
  const tempFile = path.join(tempDir, 'temp_audio');
  
  const tryDownload = async (useCookies) => {
    let cookieOptions = '';
    if (useCookies) {
      if (cookiesFile && fs.existsSync(cookiesFile)) {
        cookieOptions = `--cookies ${cookiesFile}`;
      } else if (browser) {
        cookieOptions = `--cookies-from-browser ${browser}`;
      }
    }
    const command = `"${YTDLP_PATH}" "${url}" -x --audio-format mp3 --audio-quality 0 -o "${tempFile}" --ffmpeg-location "${FFMPEG_PATH}" ${cookieOptions}`;
    await execPromise(command);
    
    const possibleExtensions = ['.mp3', '.m4a', '.webm', '.opus', '.aac'];
    for (const ext of possibleExtensions) {
      if (fs.existsSync(tempFile + ext)) {
        return tempFile + ext;
      }
    }
    return null;
  };
  
  try {
    let result = await tryDownload(true);
    if (!result && browser) {
      console.log('Download with cookies failed, retrying without cookies...');
      result = await tryDownload(false);
    }
    if (!result) {
      console.error('Downloaded file not found.');
      return null;
    }
    return result;
  } catch (err) {
    if (browser) {
      console.log('Download with cookies failed, retrying without cookies...');
      try {
        const result = await tryDownload(false);
        if (result) return result;
      } catch (retryErr) {
        console.error('Error downloading YouTube audio:', retryErr.message);
        return null;
      }
    }
    console.error('Error downloading YouTube audio:', err.message);
    return null;
  }
}

module.exports = {
  searchYouTube,
  downloadYouTubeAudioWithTemp
};
