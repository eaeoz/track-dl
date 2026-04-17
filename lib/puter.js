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

async function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
}

async function searchDeezer(query) {
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
    const data = await httpGet(url);
    const json = JSON.parse(data);
    
    if (json.data && json.data[0]) {
      const t = json.data[0];
      let year = '';
      let genre = '';
      
      if (t.album?.id) {
        try {
          const albumUrl = `https://api.deezer.com/album/${t.album.id}`;
          const albumData = await httpGet(albumUrl);
          const albumJson = JSON.parse(albumData);
          year = albumJson.release_date?.substring(0, 4) || '';
          if (albumJson.genres?.data?.[0]) {
            genre = albumJson.genres.data[0].name;
          }
        } catch {}
      }
      
      return {
        artist: t.artist?.name || '',
        title: t.title,
        album: t.album?.title || '',
        year: year,
        genre: genre,
        coverUrl: t.album?.cover_big || t.album?.cover_medium || t.album?.cover || ''
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function searchITunes(query) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`;
    const data = await httpGet(url);
    const json = JSON.parse(data);
    
    if (json.results && json.results[0]) {
      const t = json.results[0];
      return {
        artist: t.artistName || '',
        title: t.trackName || '',
        album: t.collectionName || '',
        year: t.releaseDate?.substring(0, 4) || '',
        genre: t.primaryGenreName || '',
        coverUrl: t.artworkUrl100?.replace('100x100', '600x600') || ''
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function searchMusicBrainz(query) {
  try {
    const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=1`;
    const data = await httpGet(url);
    const json = JSON.parse(data);
    
    if (json.recordings?.[0]) {
      const rec = json.recordings[0];
      return {
        artist: rec['artist-credit']?.[0]?.name || '',
        title: rec.title,
        album: rec.releases?.[0]?.title || '',
        year: rec.releases?.[0]?.date?.substring(0, 4) || '',
        genre: ''
      };
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function fillGenreYear(artist, title, album, token) {
  if (!token) return { year: '', genre: '' };
  
  console.log('\n=== Using Puter AI for missing year/genre ===');
  
  const prompt = `Music info: "${artist}" - "${title}" (Album: ${album || 'unknown'})

Respond JSON only with year and genre:
{"year": "2024", "genre": "Pop"}`;

  try {
    const postData = JSON.stringify({
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
        'Content-Length': postData.length,
        'Authorization': `Bearer ${token}`
      }
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.choices?.[0]?.message?.content) {
              let content = json.choices[0].message.content.trim();
              if (content.startsWith('```json')) {
                content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
              }
              const filled = JSON.parse(content);
              console.log(`Puter filled: year=${filled.year}, genre=${filled.genre}`);
              resolve(filled);
            } else {
              resolve({ year: '', genre: '' });
            }
          } catch {
            resolve({ year: '', genre: '' });
          }
        });
      });
      req.on('error', () => resolve({ year: '', genre: '' }));
      req.write(postData);
      req.end();
    });
  } catch {
    return { year: '', genre: '' };
  }
}

async function fetchSongInfo(query) {
  console.log('\n=== Fetching song info from free APIs ===');
  
  let info = await searchDeezer(query);
  if (info?.artist) {
    console.log(`Deezer: ${info.artist} - ${info.title}`);
    return info;
  }
  
  info = await searchITunes(query);
  if (info?.artist) {
    console.log(`iTunes: ${info.artist} - ${info.title}`);
    return info;
  }
  
  info = await searchMusicBrainz(query);
  if (info?.artist) {
    console.log(`MusicBrainz: ${info.artist} - ${info.title}`);
    return info;
  }
  
  return null;
}

async function findBestSongMatch(userQuery, youtubeResults) {
  if (!youtubeResults?.length) {
    throw new Error('No YouTube results');
  }

  const config = loadConfig();
  const token = config.puterToken || process.env.PUTER_AUTH_TOKEN;
  const youtubeDir = path.dirname(require.main.filename);
  const tokenPath = path.join(youtubeDir, '.puter-token');
  
  let savedToken = '';
  try {
    if (fs.existsSync(tokenPath)) {
      savedToken = fs.readFileSync(tokenPath, 'utf8').trim();
    }
  } catch {}
  
  const puterToken = token || savedToken;

  let songInfo = await fetchSongInfo(userQuery);
  
  if (!songInfo) {
    songInfo = { artist: '', title: '', album: '', year: '', genre: '', coverUrl: '' };
  }

  const needsFill = !songInfo.year || !songInfo.genre;
  
  if (puterToken && needsFill) {
    const puterFill = await fillGenreYear(songInfo.artist, songInfo.title, songInfo.album, puterToken);
    if (puterFill.year) songInfo.year = puterFill.year;
    if (puterFill.genre) songInfo.genre = puterFill.genre;
  }

  let selectedIndex = 0;
  let bestScore = -1;
  const queryLower = userQuery.toLowerCase();

  for (let i = 0; i < youtubeResults.length; i++) {
    const v = youtubeResults[i];
    const vTitle = v.title.toLowerCase();
    let score = 0;
    
    if (vTitle.includes('official') && vTitle.includes('audio')) score += 10;
    else if (vTitle.includes('official')) score += 8;
    if (!vTitle.includes('live')) score += 3;
    
    if (songInfo.artist) {
      const artistWords = songInfo.artist.toLowerCase().split(' ').filter(w => w.length > 2);
      for (const w of artistWords) {
        if (vTitle.includes(w)) { score += 15; break; }
      }
    }
    
    if (songInfo.title) {
      const titleWords = songInfo.title.toLowerCase().split(' ').filter(w => w.length > 2);
      for (const w of titleWords) {
        if (vTitle.includes(w)) { score += 10; break; }
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      selectedIndex = i;
    }
  }

  const video = youtubeResults[selectedIndex];
  const parsed = parseYouTubeTitle(video.title);

  return {
    index: selectedIndex,
    reason: 'Best match',
    artist: songInfo.artist || parsed.artist || video.uploader,
    title: songInfo.title || parsed.title,
    album: songInfo.album || '',
    year: songInfo.year || '',
    genre: songInfo.genre || '',
    coverUrl: songInfo.coverUrl || '',
    video: video
  };
}

module.exports = { findBestSongMatch, loadConfig, saveConfig };