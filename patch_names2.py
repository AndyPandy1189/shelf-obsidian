import os

path = 'src/ui/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

block = '''                    const tag = isIssue ? [Issue #] : (r.start_year ? [Volume ] : '[Volume]');
                    const titleName = r.name || (r.volume && r.volume.name ? r.volume.name : 'Unknown');
                    fm[t('title')] = ${titleName.trim()} ;'''
block_new = '''                    const tag = isIssue ? [Issue #] : (r.start_year ? [Volume ] : '[Volume]');
                    let titleName = (r.name && r.name.trim()) ? r.name.trim() : (r.volume && r.volume.name ? r.volume.name.trim() : 'Unknown');
                    fm[t('title')] = ${titleName} ;'''
content = content.replace(block, block_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)


path2 = 'src/ui/AddMediaModal.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

block2 = '''                    const tag = isIssue ? [Issue #] : (r.start_year ? [Volume ] : '[Volume]');
                    const title = r.name || (r.volume && r.volume.name ? r.volume.name : 'Unknown');'''
block2_new = '''                    const tag = isIssue ? [Issue #] : (r.start_year ? [Volume ] : '[Volume]');
                    let title = (r.name && r.name.trim()) ? r.name.trim() : (r.volume && r.volume.name ? r.volume.name.trim() : 'Unknown');'''
content2 = content2.replace(block2, block2_new)

with open(path2, 'w', encoding='utf-8') as f:
    f.write(content2)
