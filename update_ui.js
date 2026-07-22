const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ejs')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Inject Google Fonts and Custom CSS into all EJS files if not already there
      if (!content.includes('fonts.googleapis.com')) {
        const headInjection = `
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/style.css">
</head>`;
        content = content.replace(/<\/head>/i, headInjection);
      }
      
      // Update Navbar classes to remove bg-dark/bg-primary and just use the custom CSS
      content = content.replace(/navbar-dark bg-dark/g, 'navbar-light bg-white');
      content = content.replace(/navbar-dark bg-primary/g, 'navbar-light bg-white');
      content = content.replace(/navbar-light bg-light/g, 'navbar-light bg-white');
      
      fs.writeFileSync(fullPath, content);
      console.log(`Updated ${fullPath}`);
    }
  }
}

processDir(viewsDir);
console.log('UI Overhaul script completed.');
