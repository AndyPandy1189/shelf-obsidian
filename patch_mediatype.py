import os
import re

path = 'src/ui/AddMediaModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove the state
content = re.sub(r"\s*const \[customMediaType, setCustomMediaType\] = React\.useState\('comic'\);", "", content)

# Remove the override
block1 = '''            if (type === 'Comics & Manga') {
                // Allow overriding the mediaType
                finalMetadata.mediaType = customMediaType;
            }'''
content = content.replace(block1, "")

# Remove the UI select
block2 = '''                  {type === 'Comics & Manga' && (
                      <select 
                          value={customMediaType} 
                          onChange={(e) => setCustomMediaType(e.target.value)}
                          style={{ 
                              padding: '8px 12px', 
                              border: '1px solid var(--background-modifier-border)', 
                              borderRadius: '4px',
                              background: 'var(--background-primary)',
                              color: 'var(--text-normal)'
                          }}
                      >
                          <option value="comic">Comic</option>
                          <option value="manga">Manga</option>
                      </select>
                  )}'''
content = content.replace(block2, "")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

