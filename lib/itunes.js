const https = require('https');

const UA = 'Mozilla/5.0';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = https.get({
      hostname: 'itunes.apple.com',
      path,
      headers: { 'User-Agent': UA },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(data)); } catch { reject(new Error('Parse error')); }
      });
    });
    req.on('error', reject);
  });
}

function getVariants(query) {
  const words = query.split(/\s+/);
  const variants = [query];
  for (let i = words.length - 1; i >= 2; i--) {
    variants.push(words.slice(0, i).join(' '));
  }
  return variants;
}

async function searchiTunes(query, limit = 5) {
  let results = [];
  let lastError;

  const variants = getVariants(query);
  const strategies = (q) => [
    `/search?term=${encodeURIComponent(q)}&limit=50`,
    `/search?term=${encodeURIComponent(q)}&country=US&media=music&limit=50`,
    `/search?term=${encodeURIComponent(q)}&media=music&limit=50`
  ];

  for (const variant of variants) {
    for (const path of strategies(variant)) {
      try {
        const json = await makeRequest(path);
        if (json.resultCount > 0) {
          results = json.results || [];
          break;
        }
      } catch (e) {
        lastError = e;
        await new Promise(r => setTimeout(r, 300));
      }
    }
    if (results.length) break;
  }

  if (!results.length) {
    throw new Error('No results found');
  }

  const tracks = results
    .filter(t => t.kind === 'song')
    .slice(0, limit)
    .map(t => ({
      name: t.trackName,
      artist: t.artistName,
      album: t.collectionName || '',
      albumArt: t.artworkUrl100?.replace('100x100', '600x600') || '',
      duration: t.trackTimeMillis,
      previewUrl: t.previewUrl,
      trackId: t.trackId
    }));

  if (!tracks.length) {
    throw new Error('No songs found');
  }

  return tracks;
}

module.exports = { searchiTunes };