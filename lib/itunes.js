const https = require('https');

function searchiTunes(query, limit = 5) {
  return new Promise((resolve, reject) => {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://itunes.apple.com/search?term=${encodedQuery}&media=music&entity=song&limit=${limit}`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const tracks = json.results.map(track => ({
            name: track.trackName,
            artist: track.artistName,
            album: track.collectionName || '',
            albumArt: track.artworkUrl100?.replace('100x100', '600x600') || '',
            duration: track.trackTimeMillis,
            previewUrl: track.previewUrl,
            trackId: track.trackId
          }));
          resolve(tracks);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

module.exports = { searchiTunes };