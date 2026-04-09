const SpotifyWebApi = require('spotify-web-api-node');

const clientId = process.env.SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET || process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.log('\n=== Spotify API Credentials Required ===');
  console.log('Please set environment variables:');
  console.log('  SPOTIFY_CLIENT_ID');
  console.log('  SPOTIFY_CLIENT_SECRET');
  console.log('\nWindows PowerShell:');
  console.log('[System.Environment]::SetEnvironmentVariable("SPOTIFY_CLIENT_ID", "your_id", "User")');
  console.log('[System.Environment]::SetEnvironmentVariable("SPOTIFY_CLIENT_SECRET", "your_secret", "User")');
  console.log('');
}

const spotifyApi = new SpotifyWebApi({
  clientId: clientId,
  clientSecret: clientSecret
});

async function getSpotifyToken() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
    return true;
  } catch (err) {
    console.error('Error getting Spotify access token:', err.message);
    if (err.message.includes('invalid_client')) {
      console.error('>> Invalid client ID or secret. Please check your credentials.');
    }
    return false;
  }
}

async function searchSpotify(query, limit = 5) {
  if (!clientId || !clientSecret) {
    console.error('Spotify credentials not configured');
    return [];
  }
  
  const tokenOk = await getSpotifyToken();
  if (!tokenOk) return [];

  try {
    const data = await spotifyApi.searchTracks(query, { limit });
    return data.body.tracks.items.map(track => ({
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      albumArt: track.album.images[0]?.url || '',
      duration: track.duration_ms,
      uri: track.uri,
      previewUrl: track.preview_url
    }));
  } catch (err) {
    console.error('Error searching Spotify:', err.message);
    if (err.statusCode === 403) {
      console.error('>> 403 Forbidden - API credentials may lack required scopes or be restricted.');
    }
    return [];
  }
}

async function getTrackMetadata(uri) {
  const trackId = uri.split(':')[2];
  
  try {
    const data = await spotifyApi.getTrack(trackId);
    const track = data.body;
    return {
      name: track.name,
      artist: track.artists.map(a => a.name).join(', '),
      album: track.album.name,
      albumArt: track.album.images[0]?.url || '',
      duration: track.duration_ms
    };
  } catch (err) {
    console.error('Error getting track metadata:', err.message);
    return null;
  }
}

module.exports = {
  searchSpotify,
  getTrackMetadata
};
