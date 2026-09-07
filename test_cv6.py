import urllib.request
import json

url = 'https://comicvine.gamespot.com/api/issue/4000-675811/?api_key=46a177d2683a65480d92bfc5dbe254759082bba9&format=json'
req = urllib.request.Request(url, headers={'User-Agent': 'Shelf-Obsidian-Plugin/1.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        r = data['results']
        print('Publisher in issue:', r.get('publisher'))
        print('Keys in issue:', list(r.keys()))
        print('Concepts in issue:', r.get('concepts', [])[:2] if 'concepts' in r else None)
except Exception as e:
    print('Error:', e)
