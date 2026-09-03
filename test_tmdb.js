const https = require('https');

https.get('https://api.themoviedb.org/3/tv/30669?api_key=c81d8304553763e5e3b3dc508a074812', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    try {
        const parsed = JSON.parse(data);
        console.log(JSON.stringify(parsed.seasons.map(s => ({name: s.name, season: s.season_number})), null, 2));
    } catch(e) { console.log(e); }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
