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

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Fix subDays(new Date(), 30).toISOString().split('T')[0]
  if (content.includes("subDays(new Date(), 30).toISOString().split('T')[0]")) {
    content = content.replace(/subDays\(new Date\(\), 30\)\.toISOString\(\)\.split\('T'\)\[0\]/g, "new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(subDays(new Date(), 30))");
    changed = true;
  }
  
  // Fix monthStart
  if (content.includes("new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]")) {
    content = content.replace(/new Date\(new Date\(\)\.getFullYear\(\), new Date\(\)\.getMonth\(\), 1\)\.toISOString\(\)\.split\('T'\)\[0\]/g, "new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(new Date().getFullYear(), new Date().getMonth(), 1))");
    changed = true;
  }
  
  // Fix prevDate.toISOString().split('T')[0] in rates.ts
  if (content.includes("prevDate.toISOString().split('T')[0]")) {
    content = content.replace(/prevDate\.toISOString\(\)\.split\('T'\)\[0\]/g, "new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(prevDate)");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content);
  }
});
