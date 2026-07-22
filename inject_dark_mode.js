const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');

const toggleBtnHtml = `
                    <li class="nav-item d-flex align-items-center me-2">
                        <button class="btn btn-link nav-link theme-toggle-btn p-2" title="Toggle Dark Mode">
                            <i class="fas fa-moon fs-5"></i>
                        </button>
                    </li>
`;
const scriptHtml = `\n    <script src="/js/theme-toggle.js"></script>\n</body>`;

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ejs')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Inject script at the bottom
            if (!content.includes('theme-toggle.js')) {
                content = content.replace(/<\/body>/i, scriptHtml);
            }

            // Inject toggle button before notification bell
            if (content.includes('href="/notifications"') && !content.includes('theme-toggle-btn')) {
                content = content.replace(/<a href="\/notifications"/i, toggleBtnHtml.trim() + '\n                    <a href="/notifications"');
            } 
            // Or before login button for guests
            else if (content.includes('href="/auth/login"') && content.includes('Masuk') && !content.includes('theme-toggle-btn')) {
                 content = content.replace(/<li class="nav-item">\s*<a class="btn btn-outline-light/i, toggleBtnHtml.trim() + '\n                        <li class="nav-item"><a class="btn btn-outline-light');
            }
            // Or just anywhere inside the right-aligned nav items
            else if (content.includes('ms-auto') && !content.includes('theme-toggle-btn')) {
                content = content.replace(/(<ul[^>]*ms-auto[^>]*>)/i, '$1\n' + toggleBtnHtml);
            }

            fs.writeFileSync(fullPath, content);
            console.log(`Injected Dark Mode to ${fullPath}`);
        }
    }
}

processDir(viewsDir);
console.log('Dark mode injection completed.');
