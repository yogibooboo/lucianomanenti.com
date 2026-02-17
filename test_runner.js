
// Trigger ready
if (readyCallback) readyCallback();

console.log("Starting Tests...");

function createCard(suit, rank, id) {
    // Card(suit, rank, back, indice)
    return new Card(suit, rank, 0, id);
}

// Reset for test
scala.numeroavversari = 1;
scala.campiavversario = [];
scala.campiavversario[0] = { carte: [] };
scala.trispossibili = [];
scala.coppie = [];
scala.f40avversario = [false];

// --- TEST CASE 1: 8,9,10 (27) + 4,4,J (12) = 39 ---
console.log("\n--- TEST CASE: 8C,9C,10C (27) + 4D,4S,J (12) = 39 ---");

scala.campiavversario[0].carte = [
    createCard("C", 8, 1),
    createCard("C", 9, 2),
    createCard("C", 10, 3),
    createCard("D", 4, 4),
    createCard("S", 4, 5),
    createCard("J", 50, 6) // Joker
];

// Initialize structures
scala.cancellapuntietris(0);

// Calculate Tris (8,9,10)
scala.calcolatrispossibili(0);
scala.ottimizzatris();

// Calculate Pairs (4,4)
scala.cercacoppie(0);
scala.ottimizzacoppie();

// Debug Output
console.log("trispossibili length:", scala.trispossibili.length);
if (scala.trispossibili.length > 0) {
    var pts = scala.calcolapuntitris(scala.trispossibili[0]);
    console.log("Tris 0 points:", pts);
}

console.log("coppie length:", scala.coppie.length);
if (scala.coppie.length > 0) {
    console.log("Pair 0 punticonjolly:", scala.coppie[0].punticonjolly);
}

// Run verification
var result = scala.verifica40(0);
console.log("Result verifica40(0): " + result);

if (result) console.log("FAILURE: verify40 returned true for 39 points!");
else console.log("SUCCESS: verify40 returned false for 39 points.");
