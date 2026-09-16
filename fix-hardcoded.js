const fs = require('fs');
const path = require('path');

function replaceInDir(dir, type) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath, type);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      const adminReplacement = "`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/";
      const frontendReplacement = "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/";
      const replacement = type === 'admin' ? adminReplacement : frontendReplacement;

      // Replace fetch('http://localhost:5000/api/...
      content = content.replace(/fetch\(['"]http:\/\/localhost:5000\/api\/(.*?)['"]\)/g, `fetch(${replacement}$1\`)`);
      content = content.replace(/fetch\(['"]http:\/\/localhost:5000\/api\/(.*?)(['"],)/g, `fetch(${replacement}$1\`$2`);

      // Replace other random string concatenations or template literals if they missed the var
      // fetch(`http://localhost:5000/api/categories/${id}` -> fetch(`${API}/categories/${id}`)
      content = content.replace(/`http:\/\/localhost:5000\/api\//g, `${replacement}`);

      if (content !== fs.readFileSync(fullPath, 'utf8')) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceInDir(path.join(__dirname, 'admin/src'), 'admin');
replaceInDir(path.join(__dirname, 'frontend/src'), 'frontend');
console.log("Done checking hardcoded URLs.");
