// ============================================================================
// COEFFICIENTI MOTORE AI — B
//
// 11/09/2026 — B È TORNATA UNA VARIANTE VIVA, e stavolta è il CONTROLLO.
// In prova c'è la penalità sugli scarti che sporcano il monte
// (penScartoCoppiaPozzo / penScartoTrisPozzo, il termine sta in
// burraco-core.js dentro calcolaScartoPer). Il verso è rovesciato rispetto agli
// esperimenti di agosto: la variante NUOVA sta nella tabella di SERIE e qui c'è
// quella VECCHIA, coi due coefficienti a zero.
//
// Perché in questo verso. La penalità è la correzione estetica: l'IA non butta
// più il 7 sopra il 7. Mettendola di serie la vedono subito anche tutti quelli
// che il braccio non ce l'hanno mai (fuori UE, ad blocker, chi si è chiamato
// fuori dalla raccolta), e il motore imbruttito compare solo in 3 sedie su 12.
// Il contrasto che si misura è identico, cambia solo il segno: qui d è l'effetto
// di TOGLIERE il termine, quindi in B (due avversari senza) la persona dovrebbe
// fare MEGLIO e in C (compagno senza) PEGGIO. Se si muovono dalla stessa parte
// non stiamo misurando questo.
//
// Attenzione a non leggerlo come "B è il motivo in prova": nel database
// `parametri` porterà {"penScartoCoppiaPozzo":0,"penScartoTrisPozzo":0}, cioè
// la sottrazione, non l'aggiunta.
//
// Che cosa aspettarsi. Al banco appaiato il termine NON sposta i punti
// (+2,5 ± 3,9 su 8.000 mani), quindi è quasi certo che online non si veda
// nessuna differenza: questa è una prova di NON inferiorità, serve a mettere un
// tetto al costo, non a trovare un guadagno. L'unica ragione per cui potrebbe
// uscire qualcosa è che il banco fa giocare automi contro automi, mentre il
// regalo lasciato nel monte lo raccoglie una PERSONA, che magari lo sfrutta
// meglio. Vedi la nota in burraco-game.js sopra AB_ATTIVO.
//
// --- prima di oggi ---
//
// 10/09/2026 — aggiunti anche qui penScartoCoppiaPozzo e penScartoTrisPozzo,
// con gli stessi valori di serie, proprio per NON creare una variante: B deve
// restare identico ad A finche' qualcuno non decide che cosa provare.
//
// 01/09/2026 — ATTENZIONE: QUESTA TABELLA ERA IDENTICA A QUELLA DI SERIE.
// Gli otto coefficienti sono stati promossi in burraco-engine-default.coeffs.js,
// quindi B non si scostava più da niente. Non faceva danni perché i bracci erano
// spenti (AB_ATTIVO = false in burraco-game.js), ma chi avesse riacceso
// l'esperimento senza prima mettere qui dei valori NUOVI avrebbe ottenuto un
// esperimento nullo che sembra funzionare: tre bracci che giocano tutti allo
// stesso modo, e nel database `parametri` vuoto su tutti e tre — cioè B
// indistinguibile da A. È la trappola che il blocco dell'11/09 evita.
//
// Il giro naturale resta quello mai fatto: togliere un coefficiente per
// volta dagli otto per sapere quale porta il peso (vedi la nota in fondo).
//
// --- storia, da qui in giù ---
//
// 22/08/2026: ripristinati gli OTTO valori che erano annotati nel commento
// "era N", cioè la combinazione trovata a maggio tarando i coefficienti tutti
// insieme (i guadagni del singolo parametro NON si sommano: questa è una
// combinazione, non una somma di ottimi). Sono le otto righe che qui sotto
// portano il commento "combinazione 22/08".
//
// Misurata contro la tabella di serie su 4000 mani a specchio (stesso mazzo
// giocato due volte coi motori scambiati di posto, così la fortuna delle carte
// si annulla per costruzione): 59,2% di mani vinte, margine medio +66,6 punti,
// t = 14,8. Il meccanismo non è limare punti ma andare fuori: 1272 chiusure
// contro 698, pozzetti 1807 contro 1408.
//
// Il sospetto che l'esperimento online deve sciogliere è che quel vantaggio
// sfrutti un punto cieco del motore A invece di essere una vera miglioria: in
// autoscontro le due cose danno gli stessi numeri. Vedi i tre bracci in
// burraco-game.js.
//
// Nota per quando si leggeranno i risultati: cambiando otto coefficienti
// insieme, un esito positivo dirà che il MAZZETTO funziona, non quale degli
// otto lo faccia funzionare. Per quello serve un giro di prove a togliere un
// coefficiente per volta.
// ============================================================================

window.coeffScoreOpzB = {

    // --- VALORE CARTE ---
    valCarte:                     1,  // Moltiplicatore sui punti delle carte fisiche giocate in combinazioni — combinazione 22/08 (di serie 0.5)

    // --- PREMI COMBINAZIONI ---
    premioTris:                   8,  // Premio base per un tris completato (3 carte) — combinazione 22/08 (di serie 10)
    premioScala:                 20,  // Premio base per una scala completata (3 carte)
    premioTrisEstremo:            8,  // Bonus extra per tris di valori estremi (Asso, 3, Re) — combinazione 22/08 (di serie 5)
    premio4c:                    10,  // Premio incrementale per portare una combo a 4 carte
    premio5c:                    20,  // Premio incrementale per portare una combo a 5 carte
    premio6c:                    40,  // Premio incrementale per portare una combo a 6 carte
    premioBurraco:              100,  // Premio per completare il burraco (7ª carta)
    premioOltreBurraco:           0,  // Premio per ogni carta aggiuntiva oltre il burraco (8+)

    // --- MATTE ---
    penMattaBase:                15,  // Penalità base per uso matta in combinazione (×lunghezza-2)
    penCalataMatta:              35,  // Penalità per calata di una matta (scoraggia calate non decisive)
    penMattaSuBurracoPulito:    100,  // Penalità per matta che "sporca" un burraco pulito
    premioLiberaMattaInterna:    15,  // Bonus per calata che libera una matta interna da una scala
    premioLiberaMattaBordo:      10,  // Bonus per calata che libera una matta di bordo da una scala
    premioMattaSolitaria:       200,  // Bonus per variante M: calata di matta solitaria su combo esistente

    // --- SCARTO ---
    coeffScartoDecent:            3,  // Peso della decentralizzazione nella scelta dello scarto (favorisce scarti di carte non centrali)
    coeffScartoConn:              4,  // Penalità per scartare carte connesse ad altre in mano
    penScarto6c:                  5,  // Penalità per scartare carta che completerebbe combo avversaria a 6 — combinazione 22/08 (di serie 25)
    penScarto5c:                  3,  // Penalità per scartare carta che completerebbe combo avversaria a 5 — combinazione 22/08 (di serie 15)
    penScarto4c:                  3,  // Penalità per scartare carta che completerebbe combo avversaria a 4 — combinazione 22/08 (di serie 7)
    penScartoCalabile:            7,  // Penalità per scartare carta calabile su combo propria a terra
    penScartoMatta:              50,  // Penalità pesante per scartare una matta
    penScartoCoppiaPozzo:         0,  // A ZERO DI PROPOSITO — è la variante in prova, vedi in testa al file (11/09/2026)
    penScartoTrisPozzo:           0,  // A ZERO DI PROPOSITO — è la variante in prova, vedi in testa al file (11/09/2026)

    // --- BONUS SOTTRAZIONE AVVERSARIO ---
    // Applicati quando una carta giocata impedisce all'avversario di raggiungere quella lunghezza
    bonusAvv4c:                  10,  // Bonus se la carta avrebbe portato una combo avversaria a 4
    bonusAvv5c:                  20,  // Bonus se la carta avrebbe portato una combo avversaria a 5
    bonusAvv6c:                  40,  // Bonus se la carta avrebbe portato una combo avversaria a 6
    bonusAvv7c:                 100,  // Bonus se la carta avrebbe completato il burraco avversario
    bonusAvv8c:                   0,  // Bonus per carte oltre il burraco avversario (normalmente 0)

    // --- CARTE ORFANE ---
    penCartaOrfana:               2,  // Penalità per ogni carta orfana rimasta in mano dopo l'opzione

    // --- SCENARIO E PESCA ---
    premioMazzo:                 10,  // Bonus per lo scenario 'mano' (pesca dal mazzo invece che dagli scarti) — combinazione 22/08 (di serie 5)
    premioMattaPescata:          40,  // Bonus per prendere gli scarti quando la carta visibile è una matta

    // --- POZZETTO ---
    premioPrimoBurraco:         150,  // Bonus extra per la calata che completa esattamente il 7° posto (primo burraco) — combinazione 22/08 (di serie 50)
    premioPozzetto:             100   // Bonus per opzioni che svuotano la mano permettendo il pozzetto
};
