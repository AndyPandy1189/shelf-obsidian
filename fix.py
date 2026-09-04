import os
import re

path = 'src/ui/AddMediaModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const tag = isIssue ? [Issue #] : '[Volume]';",
                          "const tag = isIssue ? [Issue #] : '[Volume]';")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
