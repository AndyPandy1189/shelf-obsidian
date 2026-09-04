import os

path = 'src/ui/AddMediaModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

search_str = "const titleName = r.name || (r.volume && r.volume.name ? ${r.volume.name} # : 'Unknown');"
search_str_new = "const titleName = r.name ? (isIssue ? r.name : ${r.name} ()) : (r.volume && r.volume.name ? ${r.volume.name} # : 'Unknown');"

# Let's be safer and replace the whole block
block = '''                    const tag = isIssue ? [Issue #] : '[Volume]';
                    const title = r.name || (r.volume && r.volume.name ? ${r.volume.name} # : 'Unknown');'''
block_new = '''                    const tag = isIssue ? [Issue #] : '[Volume]';
                    let title = r.name || (r.volume && r.volume.name ? ${r.volume.name} # : 'Unknown');
                    if (!isIssue && r.name && r.start_year) {
                        title = ${r.name} ();
                    }'''
content = content.replace(block, block_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)


path2 = 'src/ui/App.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

block2 = '''                    const tag = isIssue ? [Issue #] : '[Volume]';
                    const titleName = r.name || (r.volume && r.volume.name ? ${r.volume.name} # : 'Unknown');'''
block2_new = '''                    const tag = isIssue ? [Issue #] : '[Volume]';
                    let titleName = r.name || (r.volume && r.volume.name ? ${r.volume.name} # : 'Unknown');
                    if (!isIssue && r.name && r.start_year) {
                        titleName = ${r.name} ();
                    }'''
content2 = content2.replace(block2, block2_new)

with open(path2, 'w', encoding='utf-8') as f:
    f.write(content2)

