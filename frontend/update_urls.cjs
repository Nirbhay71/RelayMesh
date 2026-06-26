const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.{jsx,js}');
const searchRegex = /http\:\/\/\$\{window\.location\.hostname\}\:\$\{import\.meta\.env\.VITE_API_PORT \|\| 7100\}/g;
const replaceString = "${import.meta.env.VITE_API_URL || 'http://localhost:7100'}";

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (content.match(searchRegex)) {
        content = content.replace(searchRegex, replaceString);
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
});
