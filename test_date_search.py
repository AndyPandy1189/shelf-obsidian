import urllib.request
import urllib.parse
import json

api_key = '46a177d2683a65480d92bfc5dbe254759082bba9'
query = urllib.parse.quote('Amazing Spider-Man 68')
url = f'https://comicvine.gamespot.com/api/search/?api_key={api_key}&format=json&resources=issue&query={query}&limit=5'
req = urllib.request.Request(url, headers={'User-Agent': 'Shelf-Obsidian-Plugin/1.0'})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        for r in data['results']:
            print(f"ID: {r.get('id')}, Issue: {r.get('issue_number')}, Vol: {r.get('volume',{}).get('name')}, Cover: {r.get('cover_date')}")
except Exception as e:
    print('Error:', e)
