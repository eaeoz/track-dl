const https = require('https');

const tests = [
  { path: '/search?term=test', name: 'basic' },
  { path: '/search?term=test&limit=1', name: 'limit' },
  { path: '/search?term=test&media=music', name: 'media' },
  { path: '/search?term=test&country=US', name: 'country' },
  { path: '/search?term=test&media=music&limit=1', name: 'media+limit' }
];

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

for (const test of tests) {
  const options = {
    hostname: 'itunes.apple.com',
    path: test.path,
    headers: headers
  };

  https.get(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(test.name, res.statusCode, data.length);
    });
  });
}