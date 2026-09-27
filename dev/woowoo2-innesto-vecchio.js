// woowoo2 - schemi nostri.
// NIENTE in questo file viene dal dischetto Kingsoft: il tracciato e i
// parametri sono disegnati e tarati da zero. Si innesta su W2DATI dopo il
// caricamento dei dati estratti e occupa i primi sei quadri del livello M.
// E' il seme del file che un giorno sostituira' `woowoo2-dati.js`.
(function () {
    var D = window.W2DATI;
    if (!D || !D.liv || !D.liv.M) return;

    // ===================== "Due Ponti" ==================================
    //
    //        0   1   2   3   4   5   6   7   8   9
    //   0    .   .  Av   .   .   .   ~  Bv   .   .
    //   1    .   ,- (8) (5) --- (7) =#= (6) -,   .
    //   2    .   |   .   |   .   |   ~   .   |   .
    //   3   C>  (2)  .   |  [#]  |   ~   .   |   .
    //   4    .  (1) --- (0) --- (2)  ~   .  (3) D<
    //   5    .   |   .   |   .   |   ~   .   |   .
    //   6    .   '- (5) (8) --- (6) =#= (7) -'   .
    //   7    .   .  E^   .   .   .   ~  F^   .   .
    //
    // Un anello esterno percorribile nei due versi, tagliato in verticale da
    // un fiume (colonna 6) che si passa solo sui due ponti, in riga 1 e in
    // riga 6. Le tre stazioni di ponente (A, C, E) e le tre di levante
    // (B, D, F) comunicano quindi solo per di li': i due ponti sono le
    // strozzature del quadro ed e' dove si fanno i danni.
    //
    // Dentro l'anello ci sono due raccordi verticali, in colonna 3 e in
    // colonna 5. NON sono uguali: servono a ribaltare il verso di marcia, e
    // ciascuno lo ribalta in un senso solo. Senza tutti e due la rete resta
    // a senso unico e meta' delle stazioni non si raggiunge (provato: con il
    // solo raccordo di colonna 3 si servono 20 coppie su 36; con tutti e due
    // se ne servono 36 su 36).
    //
    // Il raccordo orizzontale di riga 4 attraversa la colonna 3 con un
    // incrocio piano (codice 0) e si innesta sulla colonna 5: da' una
    // scorciatoia est-ovest dentro l'anello senza creare vicoli ciechi.
    //
    // Verificato con le stesse regole del Bretter-Test dell'originale:
    // nessuna Sackgasse, campo info presente, sei stazioni, 36/36 coppie
    // servite.
    //
    // 33 prato, 32/34/35/36/41 decoro, 38/39 acqua, 40 ponte, 37 tabellone
    var DUEPONTI = [
    //   0   1   2   3   4   5   6   7   8   9
        [33, 35, 29, 33, 34, 33, 38, 29, 36, 33],   // 0
        [32, 24,  8,  5, 22,  7, 40,  6, 25, 34],   // 1
        [33, 23, 36, 23, 41, 23, 39, 33, 23, 33],   // 2
        [30,  2, 33, 23, 37, 23, 38, 32, 23, 36],   // 3
        [34,  1, 22,  0, 22,  2, 39, 33,  3, 28],   // 4
        [33, 23, 41, 23, 33, 23, 38, 35, 23, 33],   // 5
        [35, 26,  5,  8, 22,  6, 40,  7, 27, 33],   // 6
        [33, 32, 31, 33, 36, 34, 39, 31, 41, 35]    // 7
    ];

    // Tre giri sullo stesso schema, come fa l'originale. La taratura viene
    // dal banco di prova (20 partite a configurazione, pilota automatico che
    // instrada sul percorso piu' corto e non evita i tamponamenti): il
    // contatore residuo a fine quadro scende 37% -> 32% -> 16%, cioe' dentro
    // la forchetta dei quadri veri (A/1 sta al 28%, B/1 al 70%, G/1 al 31%).
    var GIRI = [
        { s: 1, amb: 1, ord: 10, sec: 22, inc: 8, traf: 2, tmax: 5, vel: 3, dest: 1 },
        { s: 1, amb: 1, ord: 15, sec: 20, inc: 8, traf: 2, tmax: 6, vel: 3, dest: 1 },
        { s: 1, amb: 1, ord: 20, sec: 16, inc: 6, traf: 1, tmax: 7, vel: 3, dest: 1 }
    ];

    // ===================== "Le Due Racchette" ===========================
    //
    //        0   1   2   3   4   5   6   7   8   9
    //   0    .   .   .  Av   .   .   .   .   .   .
    //   1    ,- --- (5) (8) -,   .   .  Bv   .   .
    //   2    |   .   |   .   |   .   .   |   .   .
    //   3    |   .   |   .   |   .   .   |   .   .
    //   4    '- --- (8) --- (8) (5) --- (8) (7) -,
    //   5    .   .   .   .   .   |   .   .   |   |
    //   6    .   .  [#]  .   .   '- (5) --- (6) -'
    //   7    .   .   .   .   .   .  C^   .   .   .
    //
    // Due anelli di ritorno (in gergo ferroviario "racchette") attaccati
    // punta contro punta al centro del quadro, in 4/4 e in 4/5. Chi entra in
    // una racchetta ne esce col verso di marcia ribaltato: e' quello che in
    // "Due Ponti" costava due raccordi controrotanti, e qui viene gratis
    // dalla forma del tracciato.
    //
    // Ogni racchetta ha la sua scorciatoia verticale -- colonna 2 in alto,
    // colonna 8 in basso -- che taglia il giro lungo. Sono le uniche scelte
    // vere del quadro, e stanno in due punti lontani fra loro: si leggono a
    // colpo d'occhio, al contrario dell'intreccio di "Due Ponti".
    //
    // Tre stazioni su altrettanti tronchini a fondo cieco: A in alto a
    // sinistra (esce a sud), B in alto a destra (esce a sud), C in basso
    // (esce a nord). Ogni tronchino e' innestato con un solo scambio, che
    // serve sia la partenza sia l'arrivo perche' il treno ci passa nei due
    // versi.
    //
    // Stesse regole del Bretter-Test dell'originale: nessuna Sackgasse,
    // un solo campo info, tre stazioni, 9/9 coppie servite. Nove scambi:
    // A/1 ne ha dodici, "Due Ponti" diciotto.
    //
    // Decorazioni: 36 alberi, 34 casa, 41 cascinale, 35 stagno,
    // 32 trattore, 33 prato.
    var RACCHETTE = [
    //    0   1   2   3   4   5   6   7   8   9
        [ 36, 41, 36, 29, 36, 33, 33, 36, 34, 33],  // 0
        [ 24, 22,  5,  8, 25, 34, 33, 29, 33, 32],  // 1
        [ 23, 33, 23, 33, 23, 33, 33, 23, 35, 33],  // 2
        [ 23, 33, 23, 33, 23, 33, 36, 23, 33, 36],  // 3
        [ 26, 22,  8, 22,  8,  5, 22,  8,  7, 25],  // 4
        [ 33, 36, 33, 36, 33, 23, 33, 33, 23, 23],  // 5
        [ 33, 36, 37, 33, 35, 26,  5, 22,  6, 27],  // 6
        [ 33, 41, 33, 32, 33, 33, 31, 33, 36, 33]   // 7
    ];

    // Tre giri sullo stesso schema. Taratura dal banco di prova (20 partite
    // a configurazione, pilota automatico sul percorso piu' corto che non
    // evita i tamponamenti):
    //   1o giro  ord 5  sec 32   17/20 vinte, 4.5/5 consegne, 2.0 scontri
    //   2o giro  ord 8  sec 26   10/20 vinte, 5.7/8 consegne, 3.2 scontri
    //   3o giro  ord 12 sec 30   14/20 vinte, 11/12 consegne, 2.8 scontri
    //
    // Il primo giro e' tarato su A/1, che al banco fa 19/20 col 28% di
    // contatore residuo: qui 17/20 col 27%. Serve pero' `sec` 32 invece di
    // 25, perche' con le racchette i percorsi sono piu' lunghi -- per andare
    // da una stazione all'altra spesso si fa un anello intero.
    //
    // Il terzo giro rallenta i treni (vel 4 -> 3) come fa A/3: con dodici
    // treni in linea e `vel` 4 il pilota automatico crolla a 1/20, ma solo
    // perche' non evita i tamponamenti, non perche' il quadro sia ingiocabile.
    // `inc` e `traf` il banco non li misura: sono presi dalla lettera A.
    var RGIRI = [
        { s: 0, amb: 1, ord: 5, sec: 32, inc: 10, traf: 3, tmax: 3, vel: 4, dest: 1 },
        { s: 0, amb: 1, ord: 8, sec: 26, inc: 10, traf: 2, tmax: 4, vel: 4, dest: 1 },
        { s: 0, amb: 1, ord: 12, sec: 30, inc: 10, traf: 3, tmax: 4, vel: 3, dest: 1 }
    ];

    D.liv.M.schemi[1] = DUEPONTI;
    for (var i = 0; i < GIRI.length; i++) D.liv.M.sub[i] = GIRI[i];
    D.liv.M.schemi[0] = RACCHETTE;
    for (var j = 0; j < RGIRI.length; j++) D.liv.M.sub[3 + j] = RGIRI[j];
})();
