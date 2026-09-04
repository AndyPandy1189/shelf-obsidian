import urllib.request
import json

url = 'https://comicvine.gamespot.com/api/volume/4050-796/?api_key=c81d8304553763e5e3b3dc508a074812&format=json'
req = urllib.request.Request(url, headers={'User-Agent': 'Shelf-Obsidian-Plugin/1.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(json.dumps(data['results'], indent=2)[:500])
except Exception as e:
    print('Error:', e)
