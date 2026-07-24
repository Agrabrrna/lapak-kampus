const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');

function processFile(filePath) {
    if (filePath.includes(path.join('views', 'partials')) || filePath.includes(path.join('views', 'auth'))) {
        return; // skip partials and auth
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Find <nav class="navbar ...> ... </nav>
    const navStartRegex = /<nav[^>]*class="[^"]*navbar[^"]*"[^>]*>/;
    const match = content.match(navStartRegex);
    
    if (match) {
        const startIndex = match.index;
        // Find closing </nav>
        const closingTag = '</nav>';
        let endIndex = content.indexOf(closingTag, startIndex);
        
        if (endIndex !== -1) {
            endIndex += closingTag.length;
            
            // Replace with partial include
            const replacement = `<%- include('../partials/navbar') %>`;
            const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
            
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Updated ${filePath}`);
        }
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.ejs')) {
            processFile(fullPath);
        }
    }
}

walkDir(viewsDir);
console.log('Refactor complete!');
