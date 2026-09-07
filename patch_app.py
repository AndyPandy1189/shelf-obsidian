import os

path = 'src/ui/App.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

block = '''                    const charKey = mapped('characters');
                    if (r.character_credits && charKey) fm[charKey] = r.character_credits.map((c: any) => c.name);
                    
                    const authorKey = mapped('author');
                    if (r.person_credits && authorKey) fm[authorKey] = r.person_credits.map((c: any) => c.name);
                    
                    const pubKey = mapped('publisher');
                    if (r.publisher && pubKey) fm[pubKey] = r.publisher.name;'''

block_new = '''                    const charKey = mapped('characters');
                    const chars = r.character_credits || r.characters;
                    if (chars && charKey) fm[charKey] = chars.map((c: any) => c.name);
                    
                    const authorKey = mapped('author') || mapped('authors');
                    const peeps = r.person_credits || r.people;
                    if (peeps && authorKey) fm[authorKey] = peeps.map((c: any) => c.name);
                    
                    const pubKey = mapped('publisher');
                    if (r.publisher && pubKey) fm[pubKey] = r.publisher.name;

                    const catKey = mapped('categories') || mapped('genres');
                    const concepts = r.concept_credits || r.concepts;
                    if (concepts && catKey) fm[catKey] = concepts.map((c: any) => c.name);'''

content = content.replace(block, block_new)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

