import os

path = 'src/ui/AddMediaModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

block = '''                    const tag = isIssue ? [Issue #] : (r.start_year ? [Volume ] : '[Volume]');
                    const titleName = (r.name && r.name.trim()) ? r.name.trim() : (r.volume && r.volume.name ? r.volume.name.trim() : 'Unknown');
                    
                    const rawDate = r.cover_date || r.start_year || '';'''

block_new = '''                    const tag = isIssue ? [Issue #] : (r.start_year ? [Volume ] : '[Volume]');
                    
                    let titleName = 'Unknown';
                    if (isIssue) {
                        const volName = r.volume && r.volume.name ? r.volume.name.trim() : '';
                        const issueName = r.name && r.name.trim() ? r.name.trim() : '';
                        if (volName && issueName) {
                            titleName = ${volName}: ;
                        } else if (volName) {
                            titleName = volName;
                        } else if (issueName) {
                            titleName = issueName;
                        }
                    } else {
                        titleName = (r.name && r.name.trim()) ? r.name.trim() : (r.volume && r.volume.name ? r.volume.name.trim() : 'Unknown');
                    }
                    
                    const rawDate = r.cover_date || r.start_year || '';'''

content = content.replace(block, block_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

path2 = 'src/ui/App.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

block2 = '''                    const isIssue = r.resource_type === 'issue' || item.externalId.startsWith('4000-') || (r.api_detail_url && r.api_detail_url.includes('/issue/')) || !!r.issue_number;
                    const tag = isIssue ? [Issue #] : (r.start_year ? [Volume ] : '[Volume]');
                    const titleName = (r.name && r.name.trim()) ? r.name.trim() : (r.volume && r.volume.name ? r.volume.name.trim() : 'Unknown');
                    fm[t('title')] = ${titleName} ;'''

block2_new = '''                    const isIssue = r.resource_type === 'issue' || item.externalId.startsWith('4000-') || (r.api_detail_url && r.api_detail_url.includes('/issue/')) || !!r.issue_number;
                    const tag = isIssue ? [Issue #] : (r.start_year ? [Volume ] : '[Volume]');
                    
                    let titleName = 'Unknown';
                    if (isIssue) {
                        const volName = r.volume && r.volume.name ? r.volume.name.trim() : '';
                        const issueName = r.name && r.name.trim() ? r.name.trim() : '';
                        if (volName && issueName) {
                            titleName = ${volName}: ;
                        } else if (volName) {
                            titleName = volName;
                        } else if (issueName) {
                            titleName = issueName;
                        }
                    } else {
                        titleName = (r.name && r.name.trim()) ? r.name.trim() : (r.volume && r.volume.name ? r.volume.name.trim() : 'Unknown');
                    }
                    fm[t('title')] = ${titleName} ;'''

content2 = content2.replace(block2, block2_new)

with open(path2, 'w', encoding='utf-8') as f:
    f.write(content2)
