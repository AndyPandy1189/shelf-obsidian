import urllib.request
import json

url = 'https://comicvine.gamespot.com/api/search/?api_key=46a177d2683a65480d92bfc5dbe254759082bba9&format=json&resources=issue&query=Demon+Slayer'
req = urllib.request.Request(url, headers={'User-Agent': 'Shelf-Obsidian-Plugin/1.0'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        if data['results']:
            r = data['results'][0]
            print('Issue Name:', r.get('name'))
            print('Volume in search result?:', 'volume' in r)
            if 'volume' in r:
                print('Volume Name:', r['volume'].get('name'))
        else:
            print('No results')
except Exception as e:
    print('Error:', e)
