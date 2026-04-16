const https = require('https');

const terms = ['Shape', 'of', 'You'];

for (const term of terms) {
  const uri = 'https://itunes.apple.com/search?term=' + encodeURIComponent(term);
  https.get(uri, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(term, res.statusCode, data.length);
    });
  });
}