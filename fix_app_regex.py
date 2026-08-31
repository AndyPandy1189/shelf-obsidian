import re

path = 'src/ui/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'onClick={async \(e\) => \{(.*?)\}\}'

def replacer(match):
    inner_code = match.group(1)
    return f'onClick={{(e) => {{ void (async () => {{{inner_code}}})(); }}}}'

new_content = re.sub(pattern, replacer, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
