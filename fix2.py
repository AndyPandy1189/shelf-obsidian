import os
import re

file_path = 'src/ui/App.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import * as React from 'react';", "import * as React from 'react';\nimport { SearchResult, MediaDetails } from '../types';")
content = content.replace('(item: any)', '(item: MediaItem)')
content = content.replace('(e: any)', '(e: Error)')
content = content.replace('(err: any)', '(error: unknown)')
content = content.replace('catch (e: any)', 'catch (err: unknown)')
content = content.replace('if (e.message', 'const e = err as Error;\n            if (e.message')
content = content.replace('let details: any = {};', 'let details: Record<string, unknown> = {};')
content = content.replace('let item: any', 'let item: MediaItem')
content = content.replace('as any', 'as never') 

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
