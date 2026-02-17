
// Mock jQuery
var $ = function (selector) {
    return {
        offset: function () { return { left: 0, top: 0 }; },
        css: function () { return 0; },
        append: function () { },
        width: function () { return 1000; },
        height: function () { return 1000; },
        hide: function () { },
        show: function () { },
        text: function () { },
        html: function () { },
        val: function () { return 0; },
        click: function () { },
        bind: function () { },
        removeClass: function () { },
        addClass: function () { },
        animate: function () { }
    };
};
$.extend = function () { };

// Mock window and document
var window = {
    gameScale: 1,
    console: console,
    location: { search: "" },
    setTimeout: function (fn) { fn(); }
};
var document = {
    getElementById: function () { return { play: function () { } }; },
    querySelector: function () { return { style: {} }; },
    addEventListener: function () { }
};
var location = window.location;

// Global variables expected by the script
var log = function (msg) { console.log(msg); };
log.enabled = true;

// Load the game code (we will concatenate this with the file content in the next step, 
// but for now I'm writing the harness)

// --- TEST HARNESS ---

function runTests() {
    console.log("Starting Tests...");

    // Helper to create cards
    function createCard(suit, rank, id) {
        // Suit: C=Cuori, Q=Quadri, F=Fiori, P=Picche, J=Jolly
        var card = new Card(suit, rank, 0, id);
        return card;
    }

    // Mock setup
    scala.numeroavversari = 1;
    scala.campiavversario = [{ carte: [] }];
    scala.trispossibili = [];
    scala.coppie = [];
    scala.f40avversario = [false];

    // TEST 1: 39 Points with Joker (e.g. 4, 5, J) -> 4+5+max(6) = 15? No.
    // Let's try the High Ace case: Q, K, A.
    // Q=12, K=13, A=1. Points: 10+10+11 = 31.
    // Add a pair of 4s (4+4+4=12). Total 43.

    // Let's try the "Close Call" case:
    // Hand: 9C, 10C. (Predict 29).
    // Hand: 5D, 5H. (Predict 15).
    // Total 44.

    // Let's try the specific "39 points" failure case.
    // Maybe: 10, J, Q (30). + 3,3 (9). = 39.
    // Does it predict 40?

    console.log("\n--- TEST CASE A: 10, J, Q (30) + 3,3,J (9) = 39 actual ---");
    // We give AI: 10C, JC. (Joker fills QC). -> 30 pts.
    // And: 3D, 3S. (Joker fills 3H). -> 9 pts.
    // Hand: 10C, 11C(J), 3D, 3S, Joker(50), Joker(51)? No only 1 joker usually.
    // Hand: 10C, JC, 3D, 3S, Joker.
    // If Joker attached to 10,J -> 30. Remaining 3D, 3S -> Pair (no joker). 0 pts.
    // If Joker attached to 3,3 -> 9. Remaining 10,J -> Pair (no joker). 0 pts.
    // Max is 30.

    // We need a case where Sum(Components) > 39 but Real < 40?
    // How?
    // If components share a card?
    // Hand: 9C, 10C, 10D. Joker.
    // Pair 1: 9C, 10C (Scala, J=11). Pts 9+10+10 = 29.
    // Pair 2: 10C, 10D (Tris, J=10). Pts 10+10+10 = 30.
    // Optimizzacoppie should pick Pair 2 (30).
    // Remaining: 9C. No pair.
    // Total 30.

    // What if we have TWO jokers?
    // Hand: 9C, 10C, 10D. Joker1, Joker2.
    // Pair 1: 10C, 10D (+J1) -> 30.
    // Remaining: 9C. (+J2). No pair.
    // Total 30.

    // What if:
    // Hand: 8, 9, 10, 10. Joker.
    // Tris (8,9,10) -> 27.
    // 10, 10 -> Pair.
    // If we use J for 10,10,10 -> 30.
    // Remaining 8,9.
    // If we use J for 8,9,10,J? (Scala 4 cards).

    // Let's simulate the user report condition:
    // "Pesca dagli scarti anche se alla fine i punti sono 39."
    // This implies `verifica40` returns true (>= 40).
    // But actual points < 40.
    // This means prediction was overestimated.

    // Scenario: A pair is evaluated as X points, but when constructed it is worth Y < X.

    // Test: A-2.
    // Cards: A(Cuori), 2(Cuori). + Joker.
    // A=1 or 11.
    // If A=1. 1+2+3 = 6.
    // If prediction = 6. Correct.

    // Test: A-K.
    // Cards: A(Cuori), K(Cuori). + Joker.
    // K-A-2? No. Q-K-A.
    // 10+10+11 = 31.
    // Prediction: 31?

    // Test: Joker Reuse?
    // Hand: 3D, 4D, 4H. Joker.
    // Pair 1: 3D, 4D (Scala). 3+4+5=12.
    // Pair 2: 4D, 4H (Tris). 4+4+4=12.
    // They share 4D.
    // `ottimizzacoppie` removes overlap.
    // Should be correct.

    // Test: 8, 10. (Hole 9).
    // 8C, 10C. + Joker.
    // 8+9+10 = 27.

    // Test: 5, 6.
    // 5C, 6C. + Joker.
    // 5+6+7 = 18.

    // Test: 4, 6.
    // 4C, 6C. + Joker.
    // 4+5+6 = 15.

    // Let's try to find an overestimation.
    // Logic: `numero*3 + 3`.
    // Exception: `numero >= 10 -> 30`.

    // Case: 8, 8. (Tris 8s).
    // 8+8+8 = 24.
    // Formula: 8*3 = 24. Correct.

    // Case: 9, 9. (Tris 9s).
    // 9+9+9 = 27.
    // Formula: 9*3 = 27. Correct.

    // Case: 10, 10. (Tris 10s).
    // 10+10+10 = 30.
    // Formula: 10*3 = 30. Correct.

    console.log("Generating Case: 9C, 11C (Jack). Hole 10.");
    scala.campiavversario[0].carte = [
        createCard("C", 9, 1),
        createCard("C", 11, 2),
        createCard("J", 50, 3) // Joker
    ];
    // Expected: 9, 10(J), 11(Jcard)? No. 9, 10(Joker), 11(Jack).
    // Points: 9 + 10 + 10 = 29.
    // Prediction?

    scala.cancellapuntietris(0);
    scala.calcolatrispossibili(0); // Should be 0
    scala.ottimizzatris();
    scala.cercacoppie(0);
    // Log couples
    console.log("Coppie found:", scala.coppie.length);
    if (scala.coppie.length > 0) {
        console.log("Pair 1 points w/ Joker:", scala.coppie[0].punticonjolly);
    }

    var result = scala.verifica40(0);
    console.log("Verifica40 result:", result);
    console.log("f40avversario:", scala.f40avversario[0]);

}
