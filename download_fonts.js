const fs = require('fs');
const https = require('https');

const cmunrmUrl = 'https://mirrors.ctan.org/fonts/cm-unicode/fonts/ttf/cmunrm.ttf';
const cmunbxUrl = 'https://mirrors.ctan.org/fonts/cm-unicode/fonts/ttf/cmunbx.ttf';

function download(url, dest) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            // handle redirects
            if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
                return download(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error('Failed to get ' + url + ' status ' + response.statusCode));
            }
            const file = fs.createWriteStream(dest);
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function run() {
    try {
        console.log("Downloading cmunrm.ttf...");
        await download(cmunrmUrl, 'cmunrm.ttf');
        console.log("Downloading cmunbx.ttf...");
        await download(cmunbxUrl, 'cmunbx.ttf');
        console.log("Done downloading CMU fonts.");
    } catch (e) {
        console.error("Error:", e);
    }
}

run();
