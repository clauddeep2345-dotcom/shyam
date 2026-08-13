const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes("new Date().toISOString().split('T')[0]")) {
    const newContent = content.replace(/new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/g, "new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())");
    fs.writeFileSync(file, newContent);
    changedCount++;
  }
});

console.log('Replaced in ' + changedCount + ' files.');
