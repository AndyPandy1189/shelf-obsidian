import os
import re

file_path = 'src/ui/AddMediaModal.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("import * as React from 'react';", "import * as React from 'react';\nimport { SearchResult, MediaDetails } from '../types';")
content = content.replace('<any[]>', '<SearchResult[]>')
content = content.replace('(r: any)', '(r: SearchResult)')
content = content.replace('catch (e: any)', 'catch (err: unknown)')
content = content.replace('if (e.message', 'const e = err as Error;\n            if (e.message')
content = content.replace('catch (err: any)', 'catch (error: unknown)')
content = content.replace('console.error(err)', 'const err = error as Error;\n            console.error(err)')
content = content.replace('handleAdd = async (result: any)', 'handleAdd = async (result: SearchResult)')
content = content.replace('let finalMetadata: any = {', 'let finalMetadata: Record<string, unknown> = {')
content = content.replace('(g: any)', '(g: {name: string})')
content = content.replace('(c: any)', '(c: {name: string, job?: string, developer?: boolean, company?: {name: string}})')
content = content.replace('(s: any)', '(s: {season_number: number, episode_count: number})')
content = content.replace('onChange={e => {setType(e.target.value as any);', 'onChange={e => {setType(e.target.value as "Movies" | "TV" | "Games" | "Books");')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
