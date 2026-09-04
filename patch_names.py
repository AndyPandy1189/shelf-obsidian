import os

path = 'src/ui/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the sync logic in App.tsx
block = '''                    // Same heuristics as AddMediaModal for title
                    const isIssue = r.resource_type === 'issue';
                    const tag = isIssue ? [Issue #] : '[Volume]';
                    let titleName = r.name || (r.volume && r.volume.name ? ${r.volume.name} # : 'Unknown');
                    if (!isIssue && r.name && r.start_year) {
                        titleName = ${r.name} ();
                    }
                    fm[t('title')] = ${titleName} ;'''

block_new = '''                    // We determine issue/volume based on ID if resource_type is missing from details endpoint
                    const isIssue = r.resource_type === 'issue' || item.externalId.startsWith('4000-');
                    const tag = isIssue ? [Issue #] : (r.start_year ? [Volume ] : '[Volume]');
                    const titleName = r.name || (r.volume && r.volume.name ? r.volume.name : 'Unknown');
                    fm[t('title')] = ${titleName.trim()} ;'''
                    
content = content.replace(block, block_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)


path2 = 'src/ui/AddMediaModal.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

block2 = '''                    const tag = isIssue ? [Issue #] : '[Volume]';
                    let title = r.name || (r.volume && r.volume.name ? ${r.volume.name} # : 'Unknown');
                    if (!isIssue && r.name && r.start_year) {
                        title = ${r.name} ();
                    }'''
block2_new = '''                    const tag = isIssue ? [Issue #] : (r.start_year ? [Volume ] : '[Volume]');
                    const title = r.name || (r.volume && r.volume.name ? r.volume.name : 'Unknown');'''
content2 = content2.replace(block2, block2_new)

with open(path2, 'w', encoding='utf-8') as f:
    f.write(content2)
