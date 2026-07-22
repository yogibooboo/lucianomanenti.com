const fs = require('fs');
const svg = fs.readFileSync('napoletane.svg', 'utf8');

const jackIdx = svg.indexOf('id="club_jack"');
const jackChunk = svg.substring(jackIdx, jackIdx + 10000);
console.log("Chunk start of club_jack:\n", jackChunk.substring(0, 2000));
