const fs = require('fs');

const calibriReg = 'C:\\Windows\\Fonts\\calibri.ttf';
const calibriBold = 'C:\\Windows\\Fonts\\calibrib.ttf';
const timesReg = 'C:\\Windows\\Fonts\\times.ttf';
const timesBold = 'C:\\Windows\\Fonts\\timesbd.ttf';

function getB64(path) {
    if(fs.existsSync(path)) {
        return fs.readFileSync(path).toString('base64');
    }
    return null;
}

const cReg = getB64(calibriReg);
const cBold = getB64(calibriBold);
const tReg = getB64(timesReg);
const tBold = getB64(timesBold);

if(!cReg || !cBold || !tReg || !tBold) {
    console.error("Missing system fonts!");
    process.exit(1);
}

let extraFonts = {
    "Calibri-Regular.ttf": cReg,
    "Calibri-Bold.ttf": cBold,
    "LMRoman-Regular.ttf": tReg, // using 'Times New Roman' as substitute for Latin Modern Roman
    "LMRoman-Bold.ttf": tBold
};

let extraFontsStr = JSON.stringify(extraFonts);

// We append to the existing vfs_fonts.js file code to merge this object inside
let injectStr = `\n// --- APPENDED FONTS ---
if (typeof pdfMake !== 'undefined' && pdfMake.vfs) {
    Object.assign(pdfMake.vfs, ${extraFontsStr});
} else if (typeof window !== 'undefined' && window.pdfMake && window.pdfMake.vfs) {
    Object.assign(window.pdfMake.vfs, ${extraFontsStr});
} else if (typeof global !== 'undefined' && global.pdfMake && global.pdfMake.vfs) {
    Object.assign(global.pdfMake.vfs, ${extraFontsStr});
}
`;

fs.appendFileSync('vfs_fonts.js', injectStr);
console.log("Successfully appended Calibri & LM Roman (Times Proxy) to vfs_fonts.js!");
