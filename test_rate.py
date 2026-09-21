import urllib.request
import json
import time

url = 'https://comicvine.gamespot.com/api/search/?api_key=46a177d2683a65480d92bfc5dbe254759082bba9&format=json&resources=issue&query=Batman+1'
req = urllib.request.Request(url, headers={'User-Agent': 'Shelf-Obsidian-Plugin/1.0'})

print("Testing rate limit...")
try:
    with urllib.request.urlopen(req) as response:
        headers = response.headers
        print("Rate limit headers:")
        for k, v in headers.items():
            if 'rate' in k.lower() or 'limit' in k.lower() or 'x-' in k.lower():
                print(f"{k}: {v}")
except Exception as e:
    print('Error:', e)
