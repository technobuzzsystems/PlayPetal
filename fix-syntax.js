const fs = require('fs');
const path = require('path');

function fixSyntaxInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixSyntaxInDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix `', or `", -> `,
      content = content.replace(/`['"],/g, '`,');
      // Fix `') -> `)
      content = content.replace(/`['"]\)/g, '`)');

      if (content !== fs.readFileSync(fullPath, 'utf8')) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed syntax in ${fullPath}`);
      }
    }
  }
}

fixSyntaxInDir(path.join(__dirname, 'admin/src'));
fixSyntaxInDir(path.join(__dirname, 'frontend/src'));
console.log("Done fixing syntax.");
