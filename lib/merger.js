const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegStatic = require('ffmpeg-static');

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
  const ffmpegPath = ffmpegStatic;
  
  try {
    const safeTitle = (metadata.title || '').replace(/[<>:"/\\|?*]/g, '');
    const safeArtist = (metadata.artist || '').replace(/[<>:"/\\|?*]/g, '');
    const safeAlbum = (metadata.album || '').replace(/[<>:"/\\|?*]/g, '');

    const args = [
      '-i', audioPath,
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      '-id3v2_version', '3',
      '-write_id3v1', '1',
      '-metadata', `title=${safeTitle}`,
      '-metadata', `artist=${safeArtist}`,
      '-metadata', `album=${safeAlbum}`,
      '-y',
      outputPath
    ];

    await execPromise(ffmpegPath, args);

    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    
    return outputPath;
  } catch (err) {
    console.error('Merge error:', err.message);
    if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
    throw err;
  }
}

module.exports = { mergeMetadata };