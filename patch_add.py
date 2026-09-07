import os

path = 'src/ui/AddMediaModal.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

block = '''                    if (r.character_credits) finalMetadata.characters = r.character_credits.map((c: any) => c.name);
                    if (r.person_credits) finalMetadata.authors = r.person_credits.map((c: any) => c.name);
                    if (r.publisher) finalMetadata.publisher = r.publisher.name;
                    if (r.issue_number) finalMetadata.issueNumber = r.issue_number;'''

block_new = '''                    const chars = r.character_credits || r.characters;
                    if (chars) finalMetadata.characters = chars.map((c: any) => c.name);
                    
                    const peeps = r.person_credits || r.people;
                    if (peeps) {
                        finalMetadata.author = peeps.map((c: any) => c.name);
                        finalMetadata.authors = finalMetadata.author; // Alias
                    }
                    
                    const concepts = r.concept_credits || r.concepts;
                    if (concepts) finalMetadata.categories = concepts.map((c: any) => c.name);
                    
                    if (r.publisher) finalMetadata.publisher = r.publisher.name;
                    if (r.issue_number) finalMetadata.issueNumber = r.issue_number;'''

content = content.replace(block, block_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

