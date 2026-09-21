import urllib.request
import urllib.parse
import json

api_key = '46a177d2683a65480d92bfc5dbe254759082bba9'
query = urllib.parse.quote('Amazing Spider-Man')
url = f'https://comicvine.gamespot.com/api/search/?api_key={api_key}&format=json&resources=volume&query={query}&limit=10'
req = urllib.request.Request(url, headers={'User-Agent': 'Shelf-Obsidian-Plugin/1.0'})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        for r in data['results']:
            print(f"ID: {r.get('id')}, Vol: {r.get('name')}, Year: {r.get('start_year')}")
except Exception as e:
    print('Error:', e)
