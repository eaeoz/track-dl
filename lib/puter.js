const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', '.track-dl-config.json');

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

function parseYouTubeTitle(title) {
  const cleanTitle = title
    .replace(/\(Official.*?\)/gi, '')
    .replace(/\(Audio.*?\)/gi, '')
    .replace(/\(Lyric.*?\)/gi, '')
    .replace(/\(Video.*?\)/gi, '')
    .replace(/\(Lyrics.*?\)/gi, '')
    .replace(/\(Visualizer.*?\)/gi, '')
    .replace(/\[Official.*?\]/gi, '')
    .replace(/\[Audio.*?\]/gi, '')
    .replace(/\s*[-|]\s*YouTube.*$/gi, '')
    .replace(/\s*ft\..*$/gi, '')
    .replace(/\s*feat\..*$/gi, '')
    .replace(/\s*featuring.*$/gi, '')
    .trim();

  if (cleanTitle.includes(' - ')) {
    const parts = cleanTitle.split(' - ');
    return {
      artist: parts[0].trim(),
      title: parts.slice(1).join(' - ').trim()
    };
  }

  return { artist: '', title: cleanTitle };
}

async function callPuterAPI(prompt, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'gpt-5.4-nano',
      messages: [{ role: 'user', content: prompt }]
    });

    const options = {
      hostname: 'api.puter.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 401 || res.statusCode === 403) {
          reject(new Error('Unauthorized - invalid or missing auth token'));
          return;
        }
        try {
          const json = JSON.parse(body);
          if (json.choices && json.choices[0]) {
            resolve(json.choices[0].message.content);
          } else if (json.error) {
            reject(new Error(json.error.message));
          } else {
            reject(new Error('Invalid API response'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function findBestSongMatch(userQuery, youtubeResults) {
  if (!youtubeResults || youtubeResults.length === 0) {
    throw new Error('No YouTube results provided');
  }

  const config = loadConfig();
  const token = process.env.PUTER_AUTH_TOKEN || config.puterToken;

  const resultsText = youtubeResults.map((video, idx) => {
    return `${idx}. Title: "${video.title}" | Channel: "${video.uploader}" | Duration: ${video.duration || 'N/A'}`;
  }).join('\n');

  const prompt = `You are a music metadata expert. User searched for: "${userQuery}"

YouTube results:
${resultsText}

Choose the BEST video (index 0-${youtubeResults.length - 1}) and extract correct artist and title.
Respond JSON only: {"index":0,"artist":"Artist Name","title":"Song Title","reason":"why"}`;

  if (token) {
    try {
      const aiResponse = await callPuterAPI(prompt, token);
      let jsonStr = aiResponse.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\w*\n/, '').replace(/\n```$/, '');
      }

      const parsed = JSON.parse(jsonStr);
      const video = youtubeResults[parsed.index];

      return {
        index: parsed.index,
        reason: parsed.reason,
        artist: parsed.artist,
        title: parsed.title,
        video: video
      };
    } catch (err) {
      console.log('Puter AI error:', err.message);
    }
  } else {
    console.log('No Puter auth token. Set PUTER_AUTH_TOKEN env var or run: track-dl --auth <token>');
  }

  return fallbackMatch(userQuery, youtubeResults);
}

function fallbackMatch(userQuery, youtubeResults) {
  let bestIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < youtubeResults.length; i++) {
    const video = youtubeResults[i];
    const titleLower = video.title.toLowerCase();

    let score = 0;
    if (titleLower.includes('official') && titleLower.includes('audio')) score += 10;
    else if (titleLower.includes('official')) score += 8;
    if (!titleLower.includes('live')) score += 3;
    if (titleLower.includes('lyric')) score -= 2;

    const queryWords = userQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const titleWords = titleLower.split(/\s+/);
    for (const word of queryWords) {
      if (titleWords.includes(word)) score += 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  const video = youtubeResults[bestIndex];
  const parsed = parseYouTubeTitle(video.title);

  return {
    index: bestIndex,
    reason: 'Best match based on title analysis',
    artist: parsed.artist || video.uploader,
    title: parsed.title,
    video: video
  };
}

module.exports = { findBestSongMatch, loadConfig, saveConfig };