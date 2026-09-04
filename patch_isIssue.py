import os

path = 'src/ui/AddMediaModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

block = "const isIssue = r.resource_type === 'issue';"
block_new = "const isIssue = r.resource_type === 'issue' || (r.api_detail_url && r.api_detail_url.includes('/issue/')) || !!r.issue_number;"
content = content.replace(block, block_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

path2 = 'src/ui/App.tsx'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()

block2 = "const isIssue = r.resource_type === 'issue' || item.externalId.startsWith('4000-');"
block2_new = "const isIssue = r.resource_type === 'issue' || item.externalId.startsWith('4000-') || (r.api_detail_url && r.api_detail_url.includes('/issue/')) || !!r.issue_number;"
content2 = content2.replace(block2, block2_new)

with open(path2, 'w', encoding='utf-8') as f:
    f.write(content2)
