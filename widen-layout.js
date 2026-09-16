const fs = require('fs');
const path = require('path');

const REPLACEMENTS = [
  {
    regex: /max-w-7xl mx-auto px-4 sm:px-6 lg:px-8/g,
    replace: "w-full px-3 sm:px-4 md:px-5 lg:px-6"
  },
  {
    regex: /max-w-7xl mx-auto/g,
    replace: "w-full"
  },
  {
    regex: /max-w-6xl mx-auto/g,
    replace: "w-full"
  },
  {
    regex: /max-w-5xl mx-auto/g,
    replace: "w-full"
  },
  {
    regex: /max-w-4xl mx-auto/g,
    replace: "w-full"
  },
  {
    regex: /w-full w-full/g,
    replace: "w-full"
  }
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;

      for (const rule of REPLACEMENTS) {
        content = content.replace(rule.regex, rule.replace);
      }

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated layout in ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'frontend/src/app'));
processDir(path.join(__dirname, 'frontend/src/components'));
console.log("Done updating layout widths.");
