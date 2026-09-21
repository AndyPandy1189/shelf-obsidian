import urllib.request
import json

api_key = '46a177d2683a65480d92bfc5dbe254759082bba9'
url = f'https://comicvine.gamespot.com/api/issues/?api_key={api_key}&format=json&filter=volume:4050-112161'
req = urllib.request.Request(url, headers={'User-Agent': 'Shelf-Obsidian-Plugin/1.0'})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        for r in data['results']:
            if r.get('issue_number') == '68':
                print(f"Found it! ID: {r.get('id')}, Cover Date: {r.get('cover_date')}, Store Date: {r.get('store_date')}")
except Exception as e:
    print('Error:', e)
