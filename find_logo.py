import re

file_path = r'C:\Users\HI\.gemini\antigravity\brain\1fd99702-83b1-4246-b290-84c1b165a89e\.system_generated\steps\422\content.md'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# find all img tags src or logo URLs
logo_urls = []
for match in re.finditer(r'src=["\']([^"\']+)["\']', content):
    url = match.group(1)
    if 'logo' in url.lower() or 'brand' in url.lower():
        logo_urls.append(url)

for url in set(logo_urls):
    print(url)
