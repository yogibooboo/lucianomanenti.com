-- ---------------------------------------------------------------------------
-- Esperimento a tre bracci sul burraco -- analisi delle mani online
-- Database Aruba Sql824778_1, tabella burraco_partite
--
-- Filtro comune a tutte le query:
--     modalita = '2v2'        solo il 2 contro 2
--     motore_noi IS NULL      al posto "noi" c'e' una persona, non un motore
--     seme IS NULL            mazzo mescolato davvero (le righe di prova
--                             offline portano sempre il seme)
--
-- Bracci:  A = nessuno modificato (controllo)
--          B = modificati i due avversari
--          C = modificato il compagno
-- Il contrasto che porta il segnale e' C - B: se il motore in prova e' piu'
-- forte, "vinte" e "chiude noi" salgono e "pozzetto loro" scende.
--
-- Lanciarle una per volta. La 2 e la 3 vogliono MySQL 8 (clausola WITH).
-- ---------------------------------------------------------------------------


-- ===========================================================================
-- 0.  IGIENE -- da lanciare per prima
--     Controlla che i bracci siano bilanciati (~1/3 ciascuno) e che non ci
--     siano righe anteriori alla partenza dell'esperimento: quelle avevano
--     braccio 'A' per default e gonfierebbero il controllo. Se ce ne sono,
--     aggiungi  AND creato_il >= '2026-08-23'  a tutte le query seguenti.
--     Lanciata il 25/08/2026: 8208 mani, 2750/2749/2709, la piu' vecchia
--     del 23/08 12:12 -> nessun filtro sulla data necessario.
-- ===========================================================================
SELECT braccio,
       COUNT(*)                                   AS mani,
       MIN(id) AS id_min, MAX(id) AS id_max,
       MIN(creato_il) AS dal, MAX(creato_il) AS al,
       SUM(giocatore_id IS NULL)                  AS senza_consenso,
       SUM(modalita = '1v1')                      AS mani_1v1
FROM burraco_partite
WHERE motore_noi IS NULL AND seme IS NULL
GROUP BY braccio WITH ROLLUP;


-- ===========================================================================
-- 1.  IL QUADRO PER BRACCIO
--     L'ultima riga, con braccio vuoto, e' il totale (WITH ROLLUP).
--     Gli errori standard sono quelli del singolo braccio: per confrontare
--     due bracci fra loro usa la query 2, che li combina come si deve.
-- ===========================================================================
SELECT braccio,
       COUNT(*)                                                     AS mani,
       ROUND(100*AVG(esito), 1)                                     AS vinte_pct,
       ROUND(100*SQRT(AVG(esito)*(1-AVG(esito))/COUNT(*)), 2)       AS se_vinte_pp,
       ROUND(AVG(punti_noi), 1)                                     AS punti_noi,
       ROUND(AVG(punti_loro), 1)                                    AS punti_loro,
       ROUND(AVG(punti_noi - punti_loro), 1)                        AS margine,
       ROUND(STDDEV_SAMP(punti_noi - punti_loro)/SQRT(COUNT(*)), 1) AS se_margine,
       ROUND(AVG(punti_noi + punti_loro), 1)                        AS punti_totali,
       ROUND(100*AVG(chiusura =  1), 1)                             AS chiude_noi_pct,
       ROUND(100*AVG(chiusura = -1), 1)                             AS chiude_loro_pct,
       ROUND(100*AVG(chiusura =  0), 1)                             AS mazzo_esaurito_pct,
       ROUND(100*AVG(pozzetto_noi), 1)                              AS pozz_noi_pct,
       ROUND(100*AVG(pozzetto_loro), 1)                             AS pozz_loro_pct,
       ROUND(AVG(durata_s))                                         AS durata_s
FROM burraco_partite
WHERE modalita = '2v2' AND motore_noi IS NULL AND seme IS NULL
GROUP BY braccio WITH ROLLUP;


-- ===========================================================================
-- 2.  I CONTRASTI, CON LO z GIA' CALCOLATO
--     Le percentuali sono gia' moltiplicate per 100, quindi "delta" e "se"
--     si leggono in punti percentuali. Le varianze sono scalate di 10000
--     di conseguenza, cosi' lo z resta giusto.
--     Soglie:  |z| > 1,96  = p < 0,05
--              |z| > 2,39  = p < 0,0167, cioe' Bonferroni su tre contrasti
-- ===========================================================================
WITH s AS (
  SELECT braccio,
         COUNT(*)                            AS n,
         AVG(esito)                          AS vinte,
         AVG(chiusura = 1)                   AS chiude_noi,
         AVG(pozzetto_noi)                   AS pozz_noi,
         AVG(pozzetto_loro)                  AS pozz_loro,
         AVG(punti_noi - punti_loro)         AS margine,
         VAR_SAMP(punti_noi - punti_loro)    AS var_margine,
         AVG(punti_noi + punti_loro)         AS punti_tot,
         VAR_SAMP(punti_noi + punti_loro)    AS var_tot
  FROM burraco_partite
  WHERE modalita = '2v2' AND motore_noi IS NULL AND seme IS NULL
  GROUP BY braccio
),
m AS (
            SELECT braccio, 'a) vinte %'      AS metrica, 100*vinte AS val, 10000*vinte*(1-vinte)            AS varianza, n FROM s
  UNION ALL SELECT braccio, 'b) chiude noi %',      100*chiude_noi,        10000*chiude_noi*(1-chiude_noi),  n FROM s
  UNION ALL SELECT braccio, 'c) pozzetto noi %',    100*pozz_noi,          10000*pozz_noi*(1-pozz_noi),      n FROM s
  UNION ALL SELECT braccio, 'd) pozzetto loro %',   100*pozz_loro,         10000*pozz_loro*(1-pozz_loro),    n FROM s
  UNION ALL SELECT braccio, 'e) margine punti',     margine,               var_margine,                      n FROM s
  UNION ALL SELECT braccio, 'f) punti totali',      punti_tot,             var_tot,                          n FROM s
)
SELECT x.metrica,
       CONCAT(y.braccio, ' - ', x.braccio)                              AS contrasto,
       ROUND(y.val - x.val, 2)                                          AS delta,
       ROUND(SQRT(x.varianza/x.n + y.varianza/y.n), 2)                  AS se,
       ROUND((y.val - x.val)/SQRT(x.varianza/x.n + y.varianza/y.n), 2)  AS z
FROM m x
JOIN m y ON y.metrica = x.metrica AND y.braccio > x.braccio
ORDER BY x.metrica, contrasto;


-- ===========================================================================
-- 3.  APPAIATA DENTRO IL GIOCATORE  (C - B)
--     Toglie di mezzo la bravura del singolo: ogni persona fa da controllo
--     a se stessa. Pesa ogni giocatore allo stesso modo, indipendentemente
--     da quante mani ha giocato -- versione semplice e conservativa.
--     Usa solo le righe con consenso (giocatore_id valorizzato).
-- ===========================================================================
WITH g AS (
  SELECT giocatore_id, braccio,
         COUNT(*)          AS n,
         AVG(esito)        AS vinte,
         AVG(chiusura = 1) AS chiude
  FROM burraco_partite
  WHERE modalita = '2v2' AND motore_noi IS NULL AND seme IS NULL
    AND giocatore_id IS NOT NULL
  GROUP BY giocatore_id, braccio
)
SELECT COUNT(*)                                                      AS giocatori,
       SUM(b.n + c.n)                                                AS mani_usate,
       ROUND(100*AVG(c.vinte  - b.vinte), 2)                         AS delta_vinte_pp,
       ROUND(100*STDDEV_SAMP(c.vinte  - b.vinte)/SQRT(COUNT(*)), 2)  AS se_vinte,
       ROUND(100*AVG(c.chiude - b.chiude), 2)                        AS delta_chiude_pp,
       ROUND(100*STDDEV_SAMP(c.chiude - b.chiude)/SQRT(COUNT(*)), 2) AS se_chiude
FROM g b
JOIN g c ON c.giocatore_id = b.giocatore_id
WHERE b.braccio = 'B' AND c.braccio = 'C';


-- ===========================================================================
-- 4.  CONTROLLO DI CONFONDIMENTO: il mazziere
--     Il ciclo dei bracci e' a 12 e le posizioni del mazziere sono 4, con
--     MCD(3,4)=1: ogni braccio deve vedere ogni posizione lo stesso numero
--     di volte. Se le quattro colonne non sono simili, c'e' uno sbilancio
--     da tenere presente nella lettura delle altre query.
-- ===========================================================================
SELECT braccio,
       SUM(mazziere = 0) AS maz_0,
       SUM(mazziere = 1) AS maz_1,
       SUM(mazziere = 2) AS maz_2,
       SUM(mazziere = 3) AS maz_3,
       ROUND(100*AVG(esito), 1) AS vinte_pct
FROM burraco_partite
WHERE modalita = '2v2' AND motore_noi IS NULL AND seme IS NULL
GROUP BY braccio;
