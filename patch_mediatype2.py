import os

path = 'src/ui/AddMediaModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Since I removed the useState hook for customMediaType, and it's causing build errors, I'll remove the whole Comics & Manga input block.
block = '''                        {type === 'Comics & Manga' && (
                            <div style={{ marginTop: '8px' }}>
                                <input 
                                    type="text" 
                                    placeholder="Media Type (e.g., comic, manga)" 
                                    value={customMediaType}
                                    onChange={e => setCustomMediaType(e.target.value)}
                                    title="Custom Media Type for Frontmatter"
                                    style={{ width: '100%', fontSize: '0.9em' }}
                                />
                            </div>
                        )}'''
content = content.replace(block, "")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

