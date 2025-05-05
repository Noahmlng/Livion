// analyze-imports.js
import fs from 'fs';
import path from 'path';

const sourceDir = './src';

// Components imported in various files
const importedComponents = {};
// Components defined in their own files
const definedComponents = {};

function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileBasename = path.basename(filePath);
    
    // Find component definitions
    const componentDefMatches = content.match(/(?:const|function)\s+([A-Z][A-Za-z0-9_]*)\s*(?::|=)/g);
    if (componentDefMatches) {
      componentDefMatches.forEach(match => {
        const componentName = match.replace(/(?:const|function)\s+/, '').replace(/\s*(?::|=)/, '');
        definedComponents[componentName] = filePath;
      });
    }
    
    // Find imports
    const importMatches = content.match(/import\s+.*?\s+from\s+['"]([^'"]+)['"]/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const importPath = match.match(/from\s+['"]([^'"]+)['"]/)[1];
        const components = match.replace(/import\s+/, '').replace(/\s+from.*/, '');
        
        // Extract component names from import statements
        if (components.includes('{')) {
          // Named imports
          const namedComponents = components.match(/\{([^}]+)\}/)[1].split(',');
          namedComponents.forEach(comp => {
            const compName = comp.trim().replace(/\s+as\s+.*/, '');
            if (!importedComponents[compName]) {
              importedComponents[compName] = [];
            }
            importedComponents[compName].push(filePath);
          });
        } else if (!components.includes('*') && components !== 'React') {
          // Default import
          const compName = components.trim();
          if (!importedComponents[compName]) {
            importedComponents[compName] = [];
          }
          importedComponents[compName].push(filePath);
        }
      });
    }
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
  }
}

function traverseDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      traverseDirectory(filePath);
    } else if (stats.isFile() && /\.(js|jsx|ts|tsx)$/.test(file)) {
      checkFile(filePath);
    }
  }
}

// Start the analysis
traverseDirectory(sourceDir);

// Find components that are imported but not defined
console.log("Components imported but not defined:");
Object.keys(importedComponents).forEach(comp => {
  if (!definedComponents[comp] && !comp.startsWith('styled') && comp !== 'css') {
    console.log(`- ${comp} (imported in ${importedComponents[comp].join(', ')})`);
  }
});

console.log("\nComponents defined but not imported elsewhere:");
Object.keys(definedComponents).forEach(comp => {
  if (!importedComponents[comp] || importedComponents[comp].length === 1) {
    const onlyImportedInSelf = importedComponents[comp] && 
                              importedComponents[comp].length === 1 && 
                              importedComponents[comp][0] === definedComponents[comp];
    if (onlyImportedInSelf || !importedComponents[comp]) {
      console.log(`- ${comp} (defined in ${definedComponents[comp]})`);
    }
  }
});

console.log("\nAnalysis complete!"); 