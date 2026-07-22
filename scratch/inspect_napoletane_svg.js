const fs = require('fs');
const svg = fs.readFileSync('napoletane.svg', 'utf8');

const figureIds = [
    'club_jack', 'club_queen', 'club_king',
    'diamond_jack', 'diamond_queen', 'diamond_king',
    'heart_jack', 'heart_queen', 'heart_king',
    'spade_jack', 'spade_queen', 'spade_king'
];

figureIds.forEach(id => {
    const idx = svg.indexOf(`id="${id}"`);
    if (idx !== -1) {
        console.log(`Found ${id} at index ${idx}`);
        const snippet = svg.substring(idx, idx + 800);
        console.log(`Snippet for ${id}:\n`, snippet.substring(0, 300));
    } else {
        console.log(`NOT found: ${id}`);
    }
});
