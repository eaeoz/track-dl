const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegStatic = require('ffmpeg-static');

async function downloadImage(url, filepath) {
  try {
    const response = await axios({
      url,
      responseType: 'stream'
    });
    return new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);
      writer.on('finish', () => resolve(filepath));
      writer.on('error', reject);
    });
  } catch (err) {
    console.error('Error downloading image:', err.message);
    return null;
  }
}

function execPromise(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    proc.on('close', code => {
      if (code !== 0) {
        reject(new Error(stderr || `exit code ${code}`));
      } else {
        resolve(stdout);
      }
    });
    proc.on('error', reject);
  });
}

async function mergeMetadata(audioPath, metadata, outputPath) {
  const tempImage = path.join(process.cwd(), 'temp_cover.jpg');
  const ffmpegPath = ffmpegStatic;
  
  try {
    await downloadImage(metadata.albumArt, tempImage);

    const safeTitle = (metadata.title || '').replace(/[<>:"/\\|?*]/g, '');
    const safeArtist = (metadata.artist || '').replace(/[<>:"/\\|?*]/g, '');
    const safeAlbum = (metadata.album || '').replace(/[<>:"/\\|?*]/g, '');

    const args = [
      '-i', audioPath,
      '-i', tempImage,
      '-map', '0:a',
      '-map', '1:v',
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      '-id3v2_version', '3',
      '-write_id3v1', '1',
      '-metadata', `title=${safeTitle}`,
      '-metadata', `artist=${safeArtist}`,
      '-metadata', `album=${safeAlbum}`,
      '-metadata', 'comment=Cover from iTunes',
      '-y',
      outputPath
    ];

    await execPromise(ffmpegPath, args);

    if (fs.existsSync(tempImage)) fs.unlinkSync(tempImage);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    
    return outputPath;
  } catch (err) {
    console.error('Merge error:', err.message);
    if (fs.existsSync(tempImage)) fs.unlinkSync(tempImage);
    throw err;
  }
}

module.exports = {
  mergeMetadata,
  downloadImage
};