// ============================================================================
// COEFFICIENTI MOTORE AI — B
//
// 17/09/2026 — NUOVO ESPERIMENTO, e il verso torna QUELLO NORMALE.
// In prova c'è il pacchetto sugli scarti pericolosi:
//     penScarto4c/5c/6c  3/3/5 → 2/4/7   (base "scalata")
//     moltScartoSostMatta  1 → 1,5       (malus se lo scarto sostituisce una matta)
// La variante NUOVA sta QUI, la tabella di serie resta sul motore già validato.
// Quindi d è l'effetto di AVERE il pacchetto: in B (due avversari con la
// variante) la persona dovrebbe fare PEGGIO e in C (compagno con la variante)
// MEGLIO. È il contrario di come si leggeva l'esperimento di settembre: non
// riusare quella nota senza cambiare i segni.
//
// Perché stavolta non si inverte. A settembre la variante nuova stava di serie
// perché era una correzione estetica vistosa (l'IA che butta il 7 sopra il 7) e
// conveniva darla subito a tutti. Qui no: 2/4/7 vale +4,30 ± 11,11 punti a mano
// al banco, cioè non è dimostrato, e x1,5 taglia i regali di matta solo del
// 13,8% (contro il 53% di quella correzione). Il default resta dov'è e il
// rischio sta in 3 sedie su 12.
//
// Che cosa aspettarsi. Al banco appaiato il pacchetto contro il motore attuale
// dà +1,56 ± 11,20 punti a mano su 1.200 mani (scratchpad/griglia-molt-matta.csv):
// indistinguibile da zero, come al solito. È ancora una prova di NON
// inferiorità. La ragione per cui online potrebbe vedersi qualcosa che al banco
// non si vede è la solita: il regalo della matta al banco lo raccoglie un
// automa, online lo raccoglie una PERSONA.
//
// Le due parti del pacchetto, misurate separatamente al banco (1.200 mani
// appaiate ciascuna, scratchpad/griglia-penscarto-scalati.csv e
// griglia-molt-matta.csv e sonda-molt-confronto.csv):
//     2/4/7 da solo          +4,30 ± 11,11
//     x1,5 sopra 2/4/7       -0,23 ± 11,10   e -13,8% regali di matta
//     x2   sopra 2/4/7       -3,87 ± 11,08   — troppo, scartato
//     x1,2 sopra 2/4/7       -6,1% regali    — metà del beneficio, nessuna soglia
//     x1,5 sopra 3/3/5       -0,69 ± 11,23   — piatto: senza base scalata non morde
// Vanno insieme come un pacchetto solo perché separarli chiederebbe un quarto
// braccio; se il pacchetto perde, il sospettato numero uno è il moltiplicatore.
//
// --- prima di oggi ---
//
// 11/09/2026 — esperimento sul monte scarti (penScartoCoppiaPozzo /
// penScartoTrisPozzo tenuti a zero qui, variante nuova di serie, verso
// rovesciato). CHIUSO il 17/09 senza segnale, come previsto: serviva arrivare a
// ~66.000 mani per separare da zero un effetto da +2,5 punti e non ci si è
// arrivati. I due coefficienti sono stati riallineati ai valori di serie.
// Nota metodologica che vale ancora: `parametri` nel database porta la
// DIFFERENZA rispetto alla tabella di serie, quindi "B" non vuol dire "il
// motivo in prova" — va sempre letto che cosa c'è scritto dentro.
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
    penScarto6c:                    7,  // IN PROVA 17/09 - base scalata (di serie 5)
    penScarto5c:                    4,  // IN PROVA 17/09 - base scalata (di serie 3)
    penScarto4c:                    2,  // IN PROVA 17/09 - base scalata (di serie 3)
    moltScartoSostMatta:          1.5,  // IN PROVA 17/09 - malus x1,5 se lo scarto sostituisce una matta avversaria (di serie 1, spento)
    penScartoCalabile:            7,  // Penalità per scartare carta calabile su combo propria a terra
    penScartoMatta:              50,  // Penalità pesante per scartare una matta
    penScartoCoppiaPozzo:           3,  // riallineato al valore di serie: l'esperimento monte-scarti si chiude qui (17/09)
    penScartoTrisPozzo:            24,  // riallineato al valore di serie: l'esperimento monte-scarti si chiude qui (17/09)

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
