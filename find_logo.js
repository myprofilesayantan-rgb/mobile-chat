const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\HI\\.gemini\\antigravity\\brain\\1fd99702-83b1-4246-b290-84c1b165a89e\\.system_generated\\steps\\422\\content.md';
if (!fs.existsSync(filePath)) {
  console.log("File not found");
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');
const regex = /src=["']([^"']+)["']/g;
let match;
const urls = new Set();

while ((match = regex.exec(content)) !== null) {
  const url = match[1];
  if (url.toLowerCase().includes('logo') || url.toLowerCase().includes('brand')) {
    urls.add(url);
  }
}

urls.forEach(url => console.log(url));
