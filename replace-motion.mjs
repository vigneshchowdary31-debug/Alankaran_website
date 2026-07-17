import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('src');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('framer-motion')) {
    // Replace <motion. with <m.
    content = content.replace(/<motion\./g, '<m.');
    // Replace </motion. with </m.
    content = content.replace(/<\/motion\./g, '</m.');
    
    // Replace import { motion, ... } with import { m, ... }
    // We need to carefully replace 'motion' with 'm' only in the import statement
    content = content.replace(/import\s+{[^}]*}\s+from\s+['"]framer-motion['"];/g, (match) => {
      // Split the destructured imports
      const inside = match.substring(match.indexOf('{') + 1, match.indexOf('}')).split(',').map(s => s.trim());
      const newInside = inside.map(imp => {
        if (imp === 'motion') return 'm';
        return imp;
      }).filter(Boolean);
      return `import { ${newInside.join(', ')} } from "framer-motion";`;
    });
    
    fs.writeFileSync(file, content);
  }
}

