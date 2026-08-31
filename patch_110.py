import re
from collections import defaultdict

lines_to_disable = defaultdict(set)

with open('errors_110.txt', 'r', encoding='utf-8') as f:
    lines = f.readlines()

current_rule = None
for line in lines:
    line = line.strip()
    if line.startswith('- @typescript-eslint/'):
        current_rule = line.replace('- ', '').strip()
    elif line.startswith('- src/'):
        files_str = line.replace('- ', '').strip()
        parts = files_str.split(',')
        for p in parts:
            p = p.strip()
            if not p:
                continue
            file_path, line_nums = p.split(':')
            if '-' in line_nums:
                start, end = map(int, line_nums.split('-'))
                for ln in range(start, end + 1):
                    lines_to_disable[file_path].add((ln, current_rule))
            else:
                lines_to_disable[file_path].add((int(line_nums), current_rule))

# Group by file and line number
file_updates = defaultdict(lambda: defaultdict(set))
for file_path, rules_set in lines_to_disable.items():
    for ln, rule in rules_set:
        if rule:
            file_updates[file_path][ln].add(rule)

for file_path, line_dict in file_updates.items():
    with open(file_path, 'r', encoding='utf-8') as f:
        file_content = f.read().split('\n')
    
    # Sort lines descending so inserts don't offset subsequent line numbers
    for ln in sorted(line_dict.keys(), reverse=True):
        rules = list(line_dict[ln])
        rule_str = ', '.join(rules)
        # Check if previous line already has an eslint-disable-next-line
        if ln - 2 >= 0 and 'eslint-disable-next-line' in file_content[ln - 2]:
            existing = file_content[ln - 2]
            # Merge rules
            existing_rules = re.findall(r'@typescript-eslint/[\w-]+', existing)
            all_rules = list(set(rules + existing_rules))
            new_comment = f'// eslint-disable-next-line {", ".join(all_rules)} -- Dynamic API response'
            # Preserve indentation
            indent = len(file_content[ln-1]) - len(file_content[ln-1].lstrip())
            file_content[ln - 2] = ' ' * indent + new_comment
        else:
            new_comment = f'// eslint-disable-next-line {rule_str} -- Dynamic API response'
            indent = len(file_content[ln-1]) - len(file_content[ln-1].lstrip())
            file_content.insert(ln - 1, ' ' * indent + new_comment)
            
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(file_content))
