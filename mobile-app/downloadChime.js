const https = require('https');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'assets', 'chime.mp3');
const file = fs.createWriteStream(filePath);
// A public domain short "ding" sound
https.get('https://cdn.freesound.org/previews/411/411088_5121236-lq.mp3', function(response) {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Chime downloaded successfully to assets/chime.mp3');
  });
}).on('error', (err) => {
  fs.unlink(filePath, () => {});
  console.error('Error downloading chime:', err.message);
});
