const https = require('https');
const fs = require('fs');
const path = require('path');

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
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
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

async function searchDeezer(query, limit = 1) {
  try {
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const data = await httpGet(url);
    const json = JSON.parse(data);

    if (!json.data) {
      return [];
    }

    const entries = json.data.slice(0, limit);
    return await Promise.all(entries.map(async (t) => {
      let year = '';
      let genre = '';

      if (t.album?.id) {
        try {
          const albumUrl = `https://api.deezer.com/album/${t.album.id}`;
          const albumData = await httpGet(albumUrl);
          const albumJson = JSON.parse(albumData);
          year = albumJson.release_date?.substring(0, 4) || '';
          genre = albumJson.genres?.data?.[0]?.name || '';
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
    }));
  } catch (err) {
    return [];
  }
}

async function searchITunes(query, limit = 1) {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=${limit}`;
    const data = await httpGet(url);
    const json = JSON.parse(data);

    if (!json.results) {
      return [];
    }

    return json.results.slice(0, limit).map(t => ({
      artist: t.artistName || '',
      title: t.trackName || '',
      album: t.collectionName || '',
      year: t.releaseDate?.substring(0, 4) || '',
      genre: t.primaryGenreName || '',
      coverUrl: t.artworkUrl100?.replace('100x100', '600x600') || ''
    }));
  } catch (err) {
    return [];
  }
}

async function fetchSongInfo(query) {
  console.log('\n=== Fetching song info ===');

  let results = await searchDeezer(query, 1);
  if (results[0]?.artist) {
    console.log(`Deezer: ${results[0].artist} - ${results[0].title}`);
    return results[0];
  }

  results = await searchITunes(query, 1);
  if (results[0]?.artist) {
    console.log(`iTunes: ${results[0].artist} - ${results[0].title}`);
    return results[0];
  }

  return null;
}

async function fetchSongInfoOptions(query, limit = 6) {
  const options = [];
  const seen = new Set();

  function add(r, source) {
    if (!r?.artist || !r?.title) return;
    const key = `${r.artist}|||${r.title}|||${r.album}`;
    if (seen.has(key)) return;
    seen.add(key);
    options.push({ ...r, source });
  }

  const [deezer, itunes] = await Promise.all([
    searchDeezer(query, limit),
    searchITunes(query, limit)
  ]);

  for (const r of deezer) add(r, 'Deezer');
  for (const r of itunes) add(r, 'iTunes');

  return options.slice(0, limit);
}

async function fetchCoverOptions(metadata, limit = 6) {
  const options = [];
  const seen = new Set();

  function add(url, source, label) {
    if (!url || seen.has(url)) return;
    seen.add(url);
    options.push({ url, source, label });
  }

  if (metadata?.coverUrl) {
    add(metadata.coverUrl, metadata.source || 'Selected metadata', `${metadata.artist} - ${metadata.album || metadata.title}`);
  }

  const query = [metadata?.artist, metadata?.title].filter(Boolean).join(' ');
  if (query.trim()) {
    const [deezer, itunes] = await Promise.all([
      searchDeezer(query, limit),
      searchITunes(query, limit)
    ]);
    for (const r of deezer) add(r.coverUrl, 'Deezer', `${r.artist} - ${r.album || r.title}`);
    for (const r of itunes) add(r.coverUrl, 'iTunes', `${r.artist} - ${r.album || r.title}`);
  }

  return options.slice(0, limit);
}

function cleanTitle(title) {
  return title
    .toLowerCase()
    .replace(/\(official.*?\)/gi, '')
    .replace(/\(audio.*?\)/gi, '')
    .replace(/\(lyric.*?\)/gi, '')
    .replace(/\(video.*?\)/gi, '')
    .replace(/\(live.*?\)/gi, '')
    .replace(/\[official.*?\]/gi, '')
    .replace(/\[audio.*?\]/gi, '')
    .replace(/\|.*$/gi, '')
    .replace(/\s*[-|]\s*YouTube.*$/gi, '')
    .replace(/ft\..*/gi, '')
    .replace(/feat\..*/gi, '')
    .trim();
}

async function findBestSongMatch(userQuery, youtubeResults) {
  if (!youtubeResults?.length) {
    throw new Error('No YouTube results');
  }

  let songInfo = await fetchSongInfo(userQuery);

  if (!songInfo) {
    songInfo = { artist: '', title: '', album: '', year: '', genre: '', coverUrl: '' };
  }

  const queryClean = cleanTitle(userQuery);
  const queryWords = queryClean.split(/\s+/).filter(w => w.length > 1);

  let selectedIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < youtubeResults.length; i++) {
    const v = youtubeResults[i];
    const vTitle = v.title.toLowerCase();
    const vClean = cleanTitle(v.title);
    let score = 0;

    for (const w of queryWords) {
      if (w.length > 1 && vClean.includes(w)) score += 10;
    }

    const vTitleOnly = vClean.replace(/^[^-]+-\s*/, '').trim();
    if (vTitleOnly === queryClean.replace(/^[^-]+-\s*/, '').trim()) score += 50;
    else if (vClean.includes(queryClean)) score += 30;

    if (!vTitle.includes('live') || vTitle.includes('official')) score += 2;
    if (vTitle.includes('official') && vTitle.includes('audio')) score += 1;

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
    artist: songInfo?.artist || parsed.artist || video.uploader,
    title: songInfo?.title || parsed.title,
    album: songInfo?.album || '',
    year: songInfo?.year || '',
    genre: songInfo?.genre || '',
    coverUrl: songInfo?.coverUrl || '',
    video: video
  };
}

module.exports = { findBestSongMatch, fetchSongInfoOptions, fetchCoverOptions, parseYouTubeTitle };
