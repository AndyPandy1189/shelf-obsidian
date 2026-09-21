import urllib.request
import json

api_key = '46a177d2683a65480d92bfc5dbe254759082bba9'
url = f'https://comicvine.gamespot.com/api/issue/4000-1189468/?api_key={api_key}&format=json'
req = urllib.request.Request(url, headers={'User-Agent': 'Shelf-Obsidian-Plugin/1.0'})

try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        r = data['results']
        print("Name:", r.get('name'))
        print("Cover Date:", r.get('cover_date'))
        print("Store Date:", r.get('store_date'))
        print("Start Year (if any):", r.get('start_year'))
        print("Issue Number:", r.get('issue_number'))
        print("Volume:", r.get('volume', {}).get('name'))
except Exception as e:
    print('Error:', e)
