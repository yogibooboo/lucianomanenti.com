-- ---------------------------------------------------------------------------
-- Promozione degli otto coefficienti -- riferimento PRIMA e confronto DOPO
-- Database Aruba Sql824778_1, tabella burraco_partite
--
-- A COSA SERVE. Fotografare come gioca il motore che sta online adesso
-- (gioco 9.11, coefficienti di serie vecchi), per poterlo confrontare con
-- quello che verra' pubblicato dopo aver copiato in
-- burraco-engine-default.coeffs.js gli otto valori oggi confinati in
-- burraco-engine-b.coeffs.js.
--
-- Le query 0-3 e 3bis sono state lanciate l'1/09/2026: i risultati stanno qui
-- sotto, nella sezione RIFERIMENTO. Le query 4-6 vanno lanciate DOPO.
--
-- ===========================================================================
-- COME SI SEPARANO PRIMA E DOPO
-- ===========================================================================
-- NON basta la colonna `versione` (che e' la versione di burraco-game.js):
-- toccando solo i coefficienti quella non cambia. Cambia invece l'identita' del
-- motore, perche' l'impronta della tabella dei coefficienti di serie entra
-- nella firma. La query 4 dell'1/09 mostra i tre motori esistenti:
--
--   id 6   10.3/615967   parametri NULL    17.327 mani   23/08 -> 31/08
--   id 7   10.3/615967   {valCarte:1,...}   8.721 mani   23/08 -> 29/08
--   id 8   10.5/615967   parametri NULL    11.235 mani   29/08 -> in corso
--
-- id 8 e' il motore di adesso: nucleo 10.5, coefficienti di serie con impronta
-- 615967, nessuna deviazione.
--
-- Dopo la promozione (fatta l'1/09) comparira' una riga nuova con versione
-- esattamente  10.5/2acc54  e parametri NULL: l'impronta e' stata ricalcolata
-- in locale con la stessa formula di _improntaCoeff, quindi e' quella, non una
-- previsione. Il nucleo resta 10.5 perche' burraco-core.js non e' cambiato.
-- Le mani nuove porteranno versione gioco '9.12' (era 9.11).
-- Quindi:  @prima := 8  e  @dopo := l'id della riga 10.5/2acc54 (verosimilmente
-- 9, ma leggilo dalla query 4: se qualcuno ha giocato con una cache strana
-- potrebbe essercene finita in mezzo un'altra).
--
-- (id 6 tiene dentro sia il braccio A sia il braccio C: nel braccio C era
-- modificato il COMPAGNO, non gli avversari, quindi 8.658 + 8.669 = 17.327.
-- Per leggere i bracci si usa la colonna `braccio`, non il motore.)
--
-- ===========================================================================
-- TRE AVVERTENZE, DA LEGGERE PRIMA DI LEGGERE I NUMERI
-- ===========================================================================
--
-- 1. NON E' UN ESPERIMENTO. L'esperimento a tre bracci assegnava A/B/C mano per
--    mano, quindi i gruppi erano confrontabili per costruzione. Qui prima e
--    dopo sono due periodi: cambia il pubblico, i giorni, i nuovi arrivati.
--    Serve ad ACCORGERSI DI UNA REGRESSIONE, non a stimare l'effetto -- quella
--    stima e' gia' l'esperimento chiuso il 25/08. La query 3 misura quanto
--    ballano i numeri da soli e la 6 sfrutta la coda della cache per avere un
--    controllo contemporaneo.
--
-- 2. LE VITTORIE DEVONO CALARE, ED E' GIUSTO COSI'. Nei bracci B (avversari) e
--    C (compagno) il margine della persona si muoveva in direzioni opposte, ma
--    NON si elidono: la persona ha DUE avversari e UN compagno, quindi la
--    promozione vale -2d dagli avversari e +d dal compagno, netto **-d**.
--    Il tavolo diventa piu' difficile. Vedi la tabella PREVISIONE qui sotto: e'
--    l'esito atteso di un motore piu' forte, non una regressione. Se le
--    vittorie NON calassero, sarebbe quello il segnale che qualcosa non va.
--
-- 3. IL BANCO A SPECCHIO NON E' IL METRO GIUSTO. Sul banco le chiusure erano il
--    49% delle mani e i pozzetti il 40%; online sono il 99% e l'80%. Le
--    previsioni "chiusure su, mazzo esaurito giu'" NON si trasferiscono:
--    `mazzo_esaurito_pct` e' gia' a 1,1% e non ha dove scendere, i pozzetti
--    sono vicini al soffitto. Da dove venga quel divario non e' stato
--    verificato. La previsione buona viene dall'esperimento -- stessa
--    piattaforma, stesso pubblico, randomizzato: e' la tabella PREVISIONE qui
--    sotto, e la query 3bis la rilegge dai dati grezzi per controllo.
--
-- Filtro comune a tutte le query, lo stesso dell'esperimento:
--     modalita = '2v2'        solo il 2 contro 2
--     motore_noi IS NULL      al posto "noi" c'e' una persona, non un motore
--     seme IS NULL            mazzo mescolato davvero (le prove offline
--                             portano sempre il seme)
--
-- Lanciarle una per volta. Le 5 e 6 vogliono MySQL 8 (clausola WITH).
--
-- ===========================================================================
-- RIFERIMENTO -- la 9.11 / motore 8, misurata l'1/09/2026 su 11.225 mani
-- ===========================================================================
--   vinte_pct        55,7  +- 0,47 pp
--   punti_noi       471,2      punti_loro  438,4
--   margine          32,8  +- 3,8
--   punti_totali    909,7
--   mazzo_esaurito    1,1 %     <- pavimento, inutile come indicatore
--   chiude_noi       56,9 %     chiude_loro  42,0 %
--   pozz_noi         83,9 %     pozz_loro    77,1 %   (totale 161,0 su 200)
--   durata_s          291
--   burrachi/mano   1,946      puliti 2.306  semipuliti 4.094  sporchi 15.450
--   mani senza nessun burraco: 0,1 %
--
-- QUANTA DIFFERENZA SERVE PER CREDERCI. Con circa 11.000 mani anche dopo, la
-- soglia a due sigma (calcolata dagli errori standard qui sopra, x radice 2):
--   vinte_pct        1,3 punti percentuali
--   margine         10,5 punti
--   pozz_noi         1,0 pp             pozz_loro  1,1 pp
--   chiude_noi       1,3 pp
--   mazzo_esaurito   0,3 pp             ma il margine di manovra e' 1,1 in tutto
-- Le soglie di burrachi/mano e punti_totali escono dalla query 5 stessa.
-- A ~3.700 mani al giorno, per 11.000 mani nuove servono circa TRE GIORNI.
--
-- ===========================================================================
-- PREVISIONE -- cosa deve succedere, e di quanto
-- ===========================================================================
-- Non serve indovinare: l'esperimento chiuso il 25/08 ha misurato l'effetto di
-- UNA sedia modificata (d) su 8.319 mani vere, e i tre contrasti davano lo
-- stesso d entro il decimo. La promozione modifica TRE sedie: compagno (+d dal
-- punto di vista della persona) e due avversari (-2d), netto -d sulle metriche
-- di parte; sulle metriche neutre l'effetto e' quello di tre sedie.
--
-- L'ipotesi di lavoro e' che l'effetto sia LINEARE nel numero di sedie. Non e'
-- gratis, ma l'esperimento la sostiene: la durata faceva -40 s per sedia
-- indipendentemente da quale, e d usciva uguale dai tre contrasti.
--
--   colonna            9.11 oggi   d/sedia   atteso dopo   soglia   verdetto
--   vinte_pct              55,7      3,98       ~51,7        1,3    deve calare
--   margine                32,8      28,3        ~+5         10,5   deve calare
--   chiude_noi_pct         56,9      6,38       ~50,5        1,3    deve calare
--   pozz_noi_pct           83,9      3,91       ~80,0        1,0    deve calare
--   pozz_loro_pct          77,1      ~4         ~85,2        1,1    deve SALIRE
--   punti_totali          909,7         0        ~910         --    NON si muove
--   durata_s                291        40        ~170..200    --    deve calare
--
-- Le prime cinque righe sono il segnale. `punti_totali` e' il CONTROLLO
-- NEGATIVO: a 8.319 mani i tre bracci facevano 898,0 / 896,9 / 903,7, cioe'
-- nessuna differenza (il -49 visto a 734 mani era rumore, corretto poi). Se
-- dopo la promozione il monte punti si muove parecchio, non e' il mazzetto:
-- e' qualcos'altro, e va capito prima di dare la colpa ai coefficienti.
--
-- `durata_s` va presa con le molle: la query 3 l'ha vista derivare di 26
-- secondi da sola a motore fermo. Il calo previsto (~100 s) e' pero' quattro
-- volte la deriva, quindi qualcosa si dovrebbe vedere lo stesso.
--
-- SE LE VITTORIE NON CALANO di ~4 punti, la promozione non ha attecchito:
-- controlla con la query 4 che le mani stiano arrivando sul motore nuovo.
--
-- NON confrontare con la 9.7: fra 9.7 e 9.11 non sono cambiati solo i
-- coefficienti (c'e' dentro la chiusura senza scarto, che da sola vale ~5
-- punti a mano). Il riferimento e' la 9.11 e basta.
-- ---------------------------------------------------------------------------


-- ===========================================================================
-- 0.  IGIENE -- da lanciare per prima, e da rilanciare dopo la pubblicazione
--     Quante mani per versione del gioco, da quando a quando, con quale
--     braccio. Nota utile vista l'1/09: la 9.7 ha continuato a produrre mani
--     fino al 31/08, DUE GIORNI dopo la pubblicazione della 9.11 -- e' la coda
--     della cache dei browser. Succedera' di nuovo, ed e' un bene: vedi
--     query 6.
-- ===========================================================================
SELECT versione,
       COUNT(*)                     AS mani,
       SUM(braccio = 'A')           AS braccio_a,
       SUM(braccio = 'B')           AS braccio_b,
       SUM(braccio = 'C')           AS braccio_c,
       MIN(creato_il)               AS dal,
       MAX(creato_il)               AS al,
       COUNT(DISTINCT motore_avv1)  AS motori_avv1_distinti,
       SUM(giocatore_id IS NULL)    AS senza_consenso
FROM burraco_partite
WHERE modalita = '2v2' AND motore_noi IS NULL AND seme IS NULL
GROUP BY versione
ORDER BY dal;


-- ===========================================================================
-- 1.  IL RIFERIMENTO -- la fotografia della 9.11
--     Rilanciala identica dopo la pubblicazione cambiando la versione nel
--     WHERE (se bumpi burraco-game.js) e mettile una sotto l'altra.
-- ===========================================================================
SELECT versione,
       COUNT(*)                                                     AS mani,
       -- Guarda con sospetto: vedi avvertenza 2.
       ROUND(100*AVG(esito), 1)                                     AS vinte_pct,
       ROUND(100*SQRT(AVG(esito)*(1-AVG(esito))/COUNT(*)), 2)       AS se_vinte_pp,
       ROUND(AVG(punti_noi), 1)                                     AS punti_noi,
       ROUND(AVG(punti_loro), 1)                                    AS punti_loro,
       ROUND(AVG(punti_noi - punti_loro), 1)                        AS margine,
       ROUND(STDDEV_SAMP(punti_noi - punti_loro)/SQRT(COUNT(*)), 1) AS se_margine,
       ROUND(AVG(punti_noi + punti_loro), 1)                        AS punti_totali,
       -- Al pavimento (1,1%): tenuta solo come spia di regressione grossa.
       ROUND(100*AVG(chiusura =  0), 1)                             AS mazzo_esaurito_pct,
       ROUND(100*AVG(chiusura =  1), 1)                             AS chiude_noi_pct,
       ROUND(100*AVG(chiusura = -1), 1)                             AS chiude_loro_pct,
       ROUND(100*AVG(pozzetto_noi), 1)                              AS pozz_noi_pct,
       ROUND(100*AVG(pozzetto_loro), 1)                             AS pozz_loro_pct,
       ROUND(100*AVG(pozzetto_noi + pozzetto_loro), 1)              AS pozz_totali_pct,
       ROUND(AVG(durata_s))                                         AS durata_s
FROM burraco_partite
WHERE modalita = '2v2' AND motore_noi IS NULL AND seme IS NULL
  AND braccio = 'A'
  AND versione = '9.11'
GROUP BY versione;


-- ===========================================================================
-- 2.  I BURRACHI -- quanti e di che qualita'
--     Non c'e' una colonna con il conteggio: `burrachi_noi` e' una stringa di
--     gettoni separati da virgola ('pulito,sporco'). Si contano misurando di
--     quanto si accorcia la stringa togliendo il gettone cercato, diviso la sua
--     lunghezza.
--
--     ATTENZIONE al tranello: 'semipulito' CONTIENE 'pulito'. I puliti veri
--     sono (occorrenze di 'pulito') meno (occorrenze di 'semipulito').
--     Sbagliare qui gonfia i puliti del numero dei semipuliti.
-- ===========================================================================
SELECT versione,
       COUNT(*) AS mani,
       -- totale delle due squadre: e' l'indicatore piu' sensibile che ci sia
       ROUND(SUM(
           (LENGTH(burrachi_noi)  - LENGTH(REPLACE(burrachi_noi,  'pulito', '')))/6 +
           (LENGTH(burrachi_loro) - LENGTH(REPLACE(burrachi_loro, 'pulito', '')))/6 +
           (LENGTH(burrachi_noi)  - LENGTH(REPLACE(burrachi_noi,  'sporco', '')))/6 +
           (LENGTH(burrachi_loro) - LENGTH(REPLACE(burrachi_loro, 'sporco', '')))/6
       )/COUNT(*), 3) AS burrachi_per_mano,
       SUM((LENGTH(burrachi_noi)  - LENGTH(REPLACE(burrachi_noi,  'pulito', '')))/6
         - (LENGTH(burrachi_noi)  - LENGTH(REPLACE(burrachi_noi,  'semipulito', '')))/10
         + (LENGTH(burrachi_loro) - LENGTH(REPLACE(burrachi_loro, 'pulito', '')))/6
         - (LENGTH(burrachi_loro) - LENGTH(REPLACE(burrachi_loro, 'semipulito', '')))/10
       ) AS puliti,
       SUM((LENGTH(burrachi_noi)  - LENGTH(REPLACE(burrachi_noi,  'semipulito', '')))/10
         + (LENGTH(burrachi_loro) - LENGTH(REPLACE(burrachi_loro, 'semipulito', '')))/10
       ) AS semipuliti,
       SUM((LENGTH(burrachi_noi)  - LENGTH(REPLACE(burrachi_noi,  'sporco', '')))/6
         + (LENGTH(burrachi_loro) - LENGTH(REPLACE(burrachi_loro, 'sporco', '')))/6
       ) AS sporchi,
       ROUND(100*AVG(burrachi_noi = '' AND burrachi_loro = ''), 1) AS mani_senza_burraco_pct
FROM burraco_partite
WHERE modalita = '2v2' AND motore_noi IS NULL AND seme IS NULL
  AND braccio = 'A'
  AND versione = '9.11'
GROUP BY versione;


-- ===========================================================================
-- 3.  QUANTO BALLANO I NUMERI DA SOLI -- il metro per giudicare il dopo
--     La 9.11 spezzata per settimana, senza che sia cambiato niente nel
--     motore. Le differenze che si vedono qui sono RUMORE.
--
--     Esito dell'1/09 (settimane 202635 e 202636, 3.651 e 7.581 mani):
--        vinte 55,8 -> 55,7      margine 33,9 -> 32,2
--        mazzo esaurito 1,0 -> 1,1   pozz totali 161,2 -> 160,9
--        durata 308 -> 282
--     Tutto fermissimo tranne la durata, che ha fatto 26 secondi in meno da
--     sola. Quindi `durata_s` NON e' un indicatore affidabile: dipende da come
--     giocano le persone, non solo dal motore.
-- ===========================================================================
SELECT YEARWEEK(creato_il, 3)                          AS settimana,
       COUNT(*)                                        AS mani,
       ROUND(100*AVG(esito), 1)                        AS vinte_pct,
       ROUND(AVG(punti_noi - punti_loro), 1)           AS margine,
       ROUND(AVG(punti_noi + punti_loro), 1)           AS punti_totali,
       ROUND(100*AVG(chiusura = 0), 1)                 AS mazzo_esaurito_pct,
       ROUND(100*AVG(pozzetto_noi + pozzetto_loro), 1) AS pozz_totali_pct,
       ROUND(AVG(durata_s))                            AS durata_s
FROM burraco_partite
WHERE modalita = '2v2' AND motore_noi IS NULL AND seme IS NULL
  AND braccio = 'A'
  AND versione = '9.11'
GROUP BY settimana
ORDER BY settimana;


-- ===========================================================================
-- 3bis. COSA ASPETTARSI -- letto dall'esperimento, non dal banco
--     Questa e' la query piu' utile del file. Il banco a specchio non predice
--     l'online (avvertenza 3), ma l'esperimento a tre bracci SI': stessa
--     piattaforma, stesso pubblico, assegnazione randomizzata mano per mano,
--     ~8.700 mani per braccio dentro la 9.7.
--
--        A = tutto di serie (vecchi coefficienti)
--        B = AVVERSARI con i coefficienti nuovi
--        C = COMPAGNO con i coefficienti nuovi
--
--     La promozione da' i coefficienti nuovi a tutte e tre le sedie, cioe'
--     grosso modo B e C INSIEME. Sulle colonne che non dipendono da chi siede
--     dove (punti totali, pozzetti, burrachi, mazzo esaurito) la previsione e'
--     circa (B - A) + (C - A) sommate ad A. Su `vinte_pct` e `margine` invece
--     B e C tirano in direzioni opposte: guarda quanto si elidono.
--
--     ATTENZIONE: la 9.7 non aveva la chiusura senza scarto, quindi i LIVELLI
--     qui non sono confrontabili con la 9.11. Servono le DIFFERENZE fra bracci.
-- ===========================================================================
SELECT braccio,
       COUNT(*)                                        AS mani,
       ROUND(100*AVG(esito), 1)                        AS vinte_pct,
       ROUND(AVG(punti_noi - punti_loro), 1)           AS margine,
       ROUND(AVG(punti_noi + punti_loro), 1)           AS punti_totali,
       ROUND(100*AVG(chiusura =  0), 1)                AS mazzo_esaurito_pct,
       ROUND(100*AVG(chiusura =  1), 1)                AS chiude_noi_pct,
       ROUND(100*AVG(pozzetto_noi), 1)                 AS pozz_noi_pct,
       ROUND(100*AVG(pozzetto_loro), 1)                AS pozz_loro_pct,
       ROUND(100*AVG(pozzetto_noi + pozzetto_loro), 1) AS pozz_totali_pct,
       ROUND(SUM(
           (LENGTH(burrachi_noi)  - LENGTH(REPLACE(burrachi_noi,  'pulito', '')))/6 +
           (LENGTH(burrachi_loro) - LENGTH(REPLACE(burrachi_loro, 'pulito', '')))/6 +
           (LENGTH(burrachi_noi)  - LENGTH(REPLACE(burrachi_noi,  'sporco', '')))/6 +
           (LENGTH(burrachi_loro) - LENGTH(REPLACE(burrachi_loro, 'sporco', '')))/6
       )/COUNT(*), 3)                                  AS burrachi_per_mano,
       ROUND(AVG(durata_s))                            AS durata_s
FROM burraco_partite
WHERE modalita = '2v2' AND motore_noi IS NULL AND seme IS NULL
  AND versione = '9.7'
GROUP BY braccio
ORDER BY braccio;


-- ===========================================================================
-- 4.  CHI SONO I MOTORI -- rilanciare DOPO la pubblicazione
--     La riga nuova si crea da sola. Conviene riempire a mano la colonna
--     `nome` (6='serie vecchia', 7='braccio B', 8='serie vecchia + 10.5',
--     9='serie promossa'): fra sei mesi l'impronta non dira' piu' niente.
-- ===========================================================================
SELECT m.id,
       m.nome,
       m.versione,
       m.parametri,
       COUNT(*)                    AS mani_come_avversario,
       MIN(p.creato_il)            AS dal,
       MAX(p.creato_il)            AS al,
       COUNT(DISTINCT p.versione)  AS versioni_gioco
FROM burraco_partite p
JOIN burraco_motori m ON m.id = p.motore_avv1
WHERE p.modalita = '2v2' AND p.motore_noi IS NULL AND p.seme IS NULL
GROUP BY m.id, m.nome, m.versione, m.parametri
ORDER BY dal;


-- ===========================================================================
-- 5.  IL CONFRONTO, CON LO z GIA' CALCOLATO -- DOPO
--     Metti in @dopo l'id nuovo letto dalla query 4. Il taglio e' sul motore e
--     non sulla data: cosi' non dipende dall'ora esatta in cui hai caricato i
--     file, e le mani di chi ha ancora la pagina vecchia in cache finiscono
--     dalla parte giusta da sole.
--
--     Le metriche sono ordinate per RAPPORTO fra effetto atteso e soglia, e
--     ognuna porta scritto in etichetta quanto dovrebbe muoversi (vedi la
--     tabella PREVISIONE in testa al file). Da a) a f) e' il segnale; g) e' il
--     controllo negativo, deve restare fermo; i) e' al pavimento e non puo'
--     dire quasi niente.
--
--     Soglia: |z| > 1,96 su UNA metrica sola. Qui se ne guardano nove, quindi
--     per non farsi ingannare dal caso serve |z| > 2,8 circa (Bonferroni). E
--     vale l'avvertenza 1: anche uno z alto va confrontato con il ballo
--     naturale della query 3 e con la previsione della 3bis.
-- ===========================================================================
SET @prima := 8;   -- motore con i coefficienti VECCHI (nucleo 10.5)
SET @dopo  := 9;   -- <-- CONFERMARE con la query 4 dopo la pubblicazione

WITH s AS (
  SELECT IF(motore_avv1 = @dopo, 'dopo', 'prima') AS gruppo,
         COUNT(*)                                 AS n,
         AVG(esito)                               AS vinte,
         AVG(chiusura = 0)                        AS mazzo_esaurito,
         AVG(chiusura = 1)                        AS chiude_noi,
         AVG(pozzetto_noi)                        AS pozz_noi,
         AVG(pozzetto_loro)                       AS pozz_loro,
         AVG(punti_noi - punti_loro)              AS margine,
         VAR_SAMP(punti_noi - punti_loro)         AS var_margine,
         AVG(punti_noi + punti_loro)              AS punti_tot,
         VAR_SAMP(punti_noi + punti_loro)         AS var_tot,
         AVG(durata_s)                            AS durata,
         VAR_SAMP(durata_s)                       AS var_durata,
         AVG(  (LENGTH(burrachi_noi)  - LENGTH(REPLACE(burrachi_noi,  'pulito', '')))/6
             + (LENGTH(burrachi_loro) - LENGTH(REPLACE(burrachi_loro, 'pulito', '')))/6
             + (LENGTH(burrachi_noi)  - LENGTH(REPLACE(burrachi_noi,  'sporco', '')))/6
             + (LENGTH(burrachi_loro) - LENGTH(REPLACE(burrachi_loro, 'sporco', '')))/6
         )                                        AS burrachi,
         VAR_SAMP(
               (LENGTH(burrachi_noi)  - LENGTH(REPLACE(burrachi_noi,  'pulito', '')))/6
             + (LENGTH(burrachi_loro) - LENGTH(REPLACE(burrachi_loro, 'pulito', '')))/6
             + (LENGTH(burrachi_noi)  - LENGTH(REPLACE(burrachi_noi,  'sporco', '')))/6
             + (LENGTH(burrachi_loro) - LENGTH(REPLACE(burrachi_loro, 'sporco', '')))/6
         )                                        AS var_burrachi
  FROM burraco_partite
  WHERE modalita = '2v2' AND motore_noi IS NULL AND seme IS NULL
    AND braccio = 'A'
    AND motore_avv1 IN (@prima, @dopo)
  GROUP BY gruppo
),
m AS (
            SELECT gruppo, 'a) chiude noi % (atteso -6,4)' AS metrica, 100*chiude_noi AS val, 10000*chiude_noi*(1-chiude_noi) AS varianza, n FROM s
  UNION ALL SELECT gruppo, 'b) vinte % (atteso -4,0)',      100*vinte,      10000*vinte*(1-vinte),          n FROM s
  UNION ALL SELECT gruppo, 'c) pozzetto noi % (atteso -3,9)',  100*pozz_noi,  10000*pozz_noi*(1-pozz_noi),  n FROM s
  UNION ALL SELECT gruppo, 'd) pozzetto loro % (atteso +8,1)', 100*pozz_loro, 10000*pozz_loro*(1-pozz_loro),n FROM s
  UNION ALL SELECT gruppo, 'e) margine punti (atteso -28)',    margine,       var_margine,                  n FROM s
  UNION ALL SELECT gruppo, 'f) durata s (atteso -100)',        durata,        var_durata,                   n FROM s
  UNION ALL SELECT gruppo, 'g) punti totali (CONTROLLO: ~0)',  punti_tot,     var_tot,                      n FROM s
  UNION ALL SELECT gruppo, 'h) burrachi per mano',             burrachi,      var_burrachi,                 n FROM s
  UNION ALL SELECT gruppo, 'i) mazzo esaurito % (pavimento)',  100*mazzo_esaurito, 10000*mazzo_esaurito*(1-mazzo_esaurito), n FROM s
)
SELECT x.metrica,
       x.n                                                             AS n_prima,
       y.n                                                             AS n_dopo,
       ROUND(x.val, 3)                                                 AS prima,
       ROUND(y.val, 3)                                                 AS dopo,
       ROUND(y.val - x.val, 3)                                         AS delta,
       ROUND(SQRT(x.varianza/x.n + y.varianza/y.n), 3)                 AS se,
       ROUND((y.val - x.val)/SQRT(x.varianza/x.n + y.varianza/y.n), 2) AS z
FROM m x
JOIN m y ON y.metrica = x.metrica AND x.gruppo = 'prima' AND y.gruppo = 'dopo'
ORDER BY x.metrica;


-- ===========================================================================
-- 6.  IL CONTROLLO CONTEMPORANEO -- la coda della cache
--     Dopo la 9.11 la 9.7 ha continuato a produrre mani per due giorni: chi
--     aveva la pagina in cache giocava ancora col motore vecchio MENTRE gli
--     altri giocavano col nuovo. Succedera' di nuovo, e regala una finestra in
--     cui i due motori girano NELLO STESSO PERIODO -- via gli effetti di
--     calendario, di giorno della settimana, di stagione.
--
--     Il confronto resta confondato (chi ha la cache vecchia e' un giocatore
--     di ritorno, fra i nuovi ci sono i visitatori freschi), ma e' comunque
--     molto piu' solido del prima/dopo secco. Se i due danno lo stesso segno,
--     credici; se danno segni diversi, il prima/dopo secco stava misurando il
--     calendario.
--
--     Lanciare qualche giorno dopo la pubblicazione, quando la coda si e'
--     esaurita: la finestra e' da quando compare il motore nuovo a quando
--     sparisce il vecchio.
-- ===========================================================================
WITH f AS (
  SELECT MIN(CASE WHEN motore_avv1 = @dopo  THEN creato_il END) AS inizio,
         MAX(CASE WHEN motore_avv1 = @prima THEN creato_il END) AS fine
  FROM burraco_partite
  WHERE modalita = '2v2' AND motore_noi IS NULL AND seme IS NULL
    AND motore_avv1 IN (@prima, @dopo)
)
SELECT IF(p.motore_avv1 = @dopo, 'dopo', 'prima')  AS gruppo,
       COUNT(*)                                    AS mani,
       ROUND(100*AVG(p.esito), 1)                  AS vinte_pct,
       ROUND(AVG(p.punti_noi - p.punti_loro), 1)   AS margine,
       ROUND(AVG(p.punti_noi + p.punti_loro), 1)   AS punti_totali,
       ROUND(100*AVG(p.pozzetto_noi + p.pozzetto_loro), 1) AS pozz_totali_pct,
       ROUND(AVG(
             (LENGTH(p.burrachi_noi)  - LENGTH(REPLACE(p.burrachi_noi,  'pulito', '')))/6
           + (LENGTH(p.burrachi_loro) - LENGTH(REPLACE(p.burrachi_loro, 'pulito', '')))/6
           + (LENGTH(p.burrachi_noi)  - LENGTH(REPLACE(p.burrachi_noi,  'sporco', '')))/6
           + (LENGTH(p.burrachi_loro) - LENGTH(REPLACE(p.burrachi_loro, 'sporco', '')))/6
       ), 3)                                       AS burrachi_per_mano,
       MIN(p.creato_il)                            AS dal,
       MAX(p.creato_il)                            AS al
FROM burraco_partite p, f
WHERE p.modalita = '2v2' AND p.motore_noi IS NULL AND p.seme IS NULL
  AND p.braccio = 'A'
  AND p.motore_avv1 IN (@prima, @dopo)
  AND p.creato_il BETWEEN f.inizio AND f.fine     -- solo la finestra di sovrapposizione
GROUP BY gruppo;
