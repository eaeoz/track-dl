const https = require('https');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function searchDeezer(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.deezer.com/search?q=${encodedQuery}&limit=1`;
    
    const data = await httpGet(url);
    const json = JSON.parse(data);
    
    if (json.data && json.data[0]) {
      const track = json.data[0];
      let genre = '';
      
      if (track.genres && track.genres.data && track.genres.data[0]) {
        genre = track.genres.data[0].name;
      }
      
      return {
        artist: track.artist?.name || '',
        title: track.title,
        album: track.album?.title || '',
        year: track.album?.release_date?.substring(0, 4) || '',
        genre: genre,
        coverUrl: track.album?.cover_big || track.album?.cover_medium || track.album?.cover || ''
      };
    }
    return null;
  } catch (err) {
    console.log('Deezer error:', err.message);
    return null;
  }
}

async function searchLastFM(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodedQuery}&api_key=4d216716cc791a0d3f3b33b0b3a3e7b9&format=json&limit=1`;
    
    const data = await httpGet(url);
    const json = JSON.parse(data);
    
    if (json.results?.trackmatches?.track?.[0]) {
      const track = json.results.trackmatches.track[0];
      return {
        artist: track.artist || '',
        title: track.name || ''
      };
    }
    return null;
  } catch (err) {
    console.log('LastFM error:', err.message);
    return null;
  }
}

async function searchITunes(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://itunes.apple.com/search?term=${encodedQuery}&media=music&limit=1`;
    
    const data = await httpGet(url);
    const json = JSON.parse(data);
    
    if (json.results && json.results[0]) {
      const track = json.results[0];
      return {
        artist: track.artistName || '',
        title: track.trackName || '',
        album: track.collectionName || '',
        year: track.releaseDate?.substring(0, 4) || '',
        genre: track.primaryGenreName || '',
        coverUrl: track.artworkUrl100?.replace('100x100', '600x600') || ''
      };
    }
    return null;
  } catch (err) {
    console.log('iTunes error:', err.message);
    return null;
  }
}

async function fetchSongInfo(query) {
  console.log('\n=== Fetching song info ===');
  
  let songInfo = null;
  
  songInfo = await searchDeezer(query);
  if (songInfo && songInfo.artist) {
    console.log(`Found: ${songInfo.artist} - ${songInfo.title}`);
    if (songInfo.album) console.log(`Album: ${songInfo.album}`);
    if (songInfo.year) console.log(`Year: ${songInfo.year}`);
    if (songInfo.genre) console.log(`Genre: ${songInfo.genre}`);
    if (songInfo.coverUrl) console.log(`Cover: Found`);
    return songInfo;
  }
  
  songInfo = await searchITunes(query);
  if (songInfo && songInfo.artist) {
    console.log(`Found: ${songInfo.artist} - ${songInfo.title}`);
    if (songInfo.album) console.log(`Album: ${songInfo.album}`);
    if (songInfo.year) console.log(`Year: ${songInfo.year}`);
    if (songInfo.genre) console.log(`Genre: ${songInfo.genre}`);
    if (songInfo.coverUrl) console.log(`Cover: Found`);
    return songInfo;
  }
  
  songInfo = await searchLastFM(query);
  if (songInfo) {
    console.log(`Found: ${songInfo.artist} - ${songInfo.title}`);
    return songInfo;
  }
  
  console.log('Could not find song info from any API');
  return null;
}

async function findBestSongMatch(userQuery, youtubeResults) {
  if (!youtubeResults || youtubeResults.length === 0) {
    throw new Error('No YouTube results provided');
  }

  const songInfo = await fetchSongInfo(userQuery);

  let selectedIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < youtubeResults.length; i++) {
    const video = youtubeResults[i];
    const titleLower = video.title.toLowerCase();
    
    let score = 0;
    
    if (titleLower.includes('official') && titleLower.includes('audio')) score += 10;
    else if (titleLower.includes('official')) score += 8;
    if (!titleLower.includes('live')) score += 3;
    
    if (songInfo?.artist) {
      const artistWords = songInfo.artist.toLowerCase().split(' ').filter(w => w.length > 2);
      for (const word of artistWords) {
        if (titleLower.includes(word)) {
          score += 15;
          break;
        }
      }
    }
    
    if (songInfo?.title) {
      const titleWords = songInfo.title.toLowerCase().split(' ').filter(w => w.length > 2);
      for (const word of titleWords) {
        if (titleLower.includes(word)) {
          score += 10;
          break;
        }
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
    reason: 'Best match found',
    artist: songInfo?.artist || parsed.artist || video.uploader,
    title: songInfo?.title || parsed.title,
    album: songInfo?.album || '',
    year: songInfo?.year || '',
    genre: songInfo?.genre || '',
    coverUrl: songInfo?.coverUrl || '',
    video: video
  };
}

module.exports = { findBestSongMatch, loadConfig, saveConfig };