const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const YTDLP_PATH = path.join(__dirname, 'yt-dlp.exe');
const tempFile = path.join(__dirname, 'temp_audio2');
const url = 'https://www.youtube.com/watch?v=2mIBS3fHp6A';
const cookieOptions = '--cookies-from-browser firefox';

const command = `"${YTDLP_PATH}" "${url}" -x --audio-format mp3 --audio-quality 0 -o "${tempFile}" ${cookieOptions}`;

console.log('Running:', command);

exec(command, { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 }, (error, stdout, stderr) => {
  console.log('=== RESULTS ===');
  console.log('Error:', error ? error.message : 'none');
  console.log('STDOUT:', stdout);
  console.log('STDERR:', stderr);
  
  console.log('\n=== FILES ===');
  const files = fs.readdirSync(__dirname);
  console.log(files.filter(f => f.startsWith('temp')));
  
  const possibleExts = ['.mp3', '.m4a', '.webm', '.opus', '.aac', '.mkv', '.flv'];
  for (const ext of possibleExts) {
    const f = tempFile + ext;
    if (fs.existsSync(f)) {
      console.log('FOUND:', f);
    }
  }
});