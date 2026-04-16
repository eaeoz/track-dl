const https = require('https');

for (let i = 1; i <= 10; i++) {
  const path = '/search?term=test&limit=' + i;
  const options = {
    hostname: 'itunes.apple.com',
    path: path,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  };

  https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('limit=' + i, res.statusCode, data.length);
    });
  });
}