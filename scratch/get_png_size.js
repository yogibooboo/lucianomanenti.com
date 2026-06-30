const fs = require('fs');

// We can read the PNG width and height directly from the IHDR chunk.
// A PNG file starts with 8 bytes signature, followed by chunks.
// The first chunk is always IHDR, starting with 4 bytes length, 4 bytes chunk type "IHDR",
// 4 bytes width, 4 bytes height.
const pngPath = 'c:\\Users\\Luciano\\OneDrive\\backup Documents\\websites\\lucianomanenti.com\\images\\scala40\\conjollyplus.png';
const buffer = fs.readFileSync(pngPath);

// PNG Signature: 89 50 4E 47 0D 0A 1A 0A
if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    const width = buffer.readInt32BE(16);
    const height = buffer.readInt32BE(20);
    console.log("conjollyplus.png dimensions:", width, "x", height);
} else {
    console.log("Not a valid PNG file!");
}
