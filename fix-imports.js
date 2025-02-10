const fs = require('fs');
const path = require('path');

function fixImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Replace all variations of convex imports with the alias
  const newContent = content
    .replace(/from ['"](\.\.\/)*convex\/_generated\/api['"]/g, 'from "@convex/_generated/api"')
    .replace(/from ['"](\.\.\/)*convex\/_generated\/dataModel['"]/g, 'from "@convex/_generated/dataModel"');
  
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Fixed imports in ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      walkDir(filePath);
    } else if (stat.isFile() && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
      fixImports(filePath);
    }
  });
}

// Start from the root directory
walkDir('.'); 