import os
import re

path = 'src/main.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# TMDB API Key
content = re.sub(
    r'\.addText\(text => text\s*\n\s*\.setPlaceholder\(\'Enter your API key\'\)\s*\n\s*\.setValue\(this\.plugin\.settings\.tmdbApiKey\)\s*\n\s*\.onChange\(async \(value\) => \{\s*\n\s*this\.plugin\.settings\.tmdbApiKey = value;\s*\n\s*await this\.plugin\.saveSettings\(\);\s*\n\s*\}\)\)',
    r'''.addText(text => {
\t\t\t\ttext.inputEl.type = 'password';
\t\t\t\ttext.setPlaceholder('Enter your API key')
\t\t\t\t.setValue(this.plugin.settings.tmdbApiKey)
\t\t\t\t.onChange(async (value) => {
\t\t\t\t\tthis.plugin.settings.tmdbApiKey = value;
\t\t\t\t\tawait this.plugin.saveSettings();
\t\t\t\t});
\t\t\t})''',
    content
)

# IGDB Client ID
content = re.sub(
    r'\.addText\(text => text\s*\n\s*\.setPlaceholder\(\'Enter your Client ID\'\)\s*\n\s*\.setValue\(this\.plugin\.settings\.igdbClientId\)\s*\n\s*\.onChange\(async \(value\) => \{\s*\n\s*this\.plugin\.settings\.igdbClientId = value;\s*\n\s*await this\.plugin\.saveSettings\(\);\s*\n\s*\}\)\)',
    r'''.addText(text => {
\t\t\t\ttext.inputEl.type = 'password';
\t\t\t\ttext.setPlaceholder('Enter your Client ID')
\t\t\t\t.setValue(this.plugin.settings.igdbClientId)
\t\t\t\t.onChange(async (value) => {
\t\t\t\t\tthis.plugin.settings.igdbClientId = value;
\t\t\t\t\tawait this.plugin.saveSettings();
\t\t\t\t});
\t\t\t})''',
    content
)

# IGDB Client Secret
content = re.sub(
    r'\.addText\(text => text\s*\n\s*\.setPlaceholder\(\'Enter your Client Secret\'\)\s*\n\s*\.setValue\(this\.plugin\.settings\.igdbClientSecret\)\s*\n\s*\.onChange\(async \(value\) => \{\s*\n\s*this\.plugin\.settings\.igdbClientSecret = value;\s*\n\s*await this\.plugin\.saveSettings\(\);\s*\n\s*\}\)\)',
    r'''.addText(text => {
\t\t\t\ttext.inputEl.type = 'password';
\t\t\t\ttext.setPlaceholder('Enter your Client Secret')
\t\t\t\t.setValue(this.plugin.settings.igdbClientSecret)
\t\t\t\t.onChange(async (value) => {
\t\t\t\t\tthis.plugin.settings.igdbClientSecret = value;
\t\t\t\t\tawait this.plugin.saveSettings();
\t\t\t\t});
\t\t\t})''',
    content
)

# Google Books API Key
content = re.sub(
    r'\.addText\(text => text\s*\n\s*\.setPlaceholder\(\'Enter your API key\'\)\s*\n\s*\.setValue\(this\.plugin\.settings\.googleBooksApiKey\)\s*\n\s*\.onChange\(async \(value\) => \{\s*\n\s*this\.plugin\.settings\.googleBooksApiKey = value;\s*\n\s*await this\.plugin\.saveSettings\(\);\s*\n\s*\}\)\)',
    r'''.addText(text => {
\t\t\t\ttext.inputEl.type = 'password';
\t\t\t\ttext.setPlaceholder('Enter your API key')
\t\t\t\t.setValue(this.plugin.settings.googleBooksApiKey)
\t\t\t\t.onChange(async (value) => {
\t\t\t\t\tthis.plugin.settings.googleBooksApiKey = value;
\t\t\t\t\tawait this.plugin.saveSettings();
\t\t\t\t});
\t\t\t})''',
    content
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
