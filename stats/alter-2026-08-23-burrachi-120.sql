-- ============================================================================
-- 23/08/2026 — BURRACHI PIU' LARGHI (60 -> 120)
-- ============================================================================
-- QUESTO VA ESEGUITO SUL SERVER **PRIMA** DI CARICARE stats/burraco.php.
--
-- Perche'. `burrachi_noi` e `burrachi_loro` tengono un gettone per ogni burraco
-- chiuso, separati da virgola. VARCHAR(60) era stato dimensionato pensando a
-- due burachi ('semipulito,semipulito' = 21 caratteri), ma il massimo vero e'
-- piu' alto: SEI 'semipulito' fanno 65 caratteri, e persino cinque semipuliti
-- piu' uno sporco ne fanno 61. Oltre i 60, elenco_burrachi() torna null e
-- burraco.php risponde 400 — e siccome la mano parte con sendBeacon, che non
-- riporta ne' esito ne' errore, quella riga sparirebbe SENZA CHE SI VEDA.
-- Servono 42 carte in sei combinazioni per una squadra sola: raro, ma in una
-- mano che va a mazzo esaurito non e' impossibile.
-- 120 caratteri tengono dieci burachi, che e' oltre il massimo fisico.
--
-- Ordine giusto: prima questo, poi il PHP. In quest'ordine non si perde niente,
-- perche' finche' il PHP vecchio e' online il tetto resta 60 e la colonna piu'
-- larga semplicemente non viene usata. Al contrario — PHP nuovo su colonna
-- stretta — una stringa fra 61 e 120 passerebbe la validazione e morirebbe
-- alla scrittura: errore 500, riga persa, sempre in silenzio.
--
-- Si esegue da phpMyAdmin di Aruba sul database delle statistiche.

-- ---------------------------------------------------------------------------
-- ATTENZIONE: questo ALTER RISCRIVE la tabella, non la modifica sul posto.
-- ---------------------------------------------------------------------------
-- In utf8mb4 un VARCHAR(60) occupa al massimo 240 byte e si porta dietro UN
-- byte di lunghezza; un VARCHAR(120) arriva a 480 byte e di byte di lunghezza
-- ne vuole DUE. Cambiare quel prefisso vuol dire riscrivere ogni riga.
-- MISURATO su MySQL 8.0.35, non dedotto:
--     VARCHAR(63)  ALGORITHM=INPLACE  -> OK      (63*4 = 252 byte, sta sotto 256)
--     VARCHAR(120) ALGORITHM=INPLACE  -> "Cannot change column type INPLACE"
--     VARCHAR(120) senza vincoli      -> OK, cioe' COPY
--
-- Con la tabella a poche decine di righe la copia dura millesimi di secondo:
-- gli inserimenti che arrivassero nel frattempo aspettano, non falliscono.
-- E' proprio per questo che si fa ADESSO: a tre milioni di righe la stessa
-- operazione terrebbe la tabella bloccata in scrittura per minuti, e li' le
-- mani si perderebbero davvero.
--
-- Il prezzo permanente e' quel byte di lunghezza in piu' per colonna: due byte
-- per riga, per sempre. Su due anni di raccolta sono una manciata di megabyte,
-- pagati per non perdere righe in silenzio.

ALTER TABLE burraco_partite
    MODIFY COLUMN burrachi_noi  VARCHAR(120) NOT NULL DEFAULT ''
        COMMENT 'Tipi concatenati, un gettone per burraco chiuso: pulito|semipulito|sporco',
    MODIFY COLUMN burrachi_loro VARCHAR(120) NOT NULL DEFAULT ''
        COMMENT 'Tipi concatenati, un gettone per burraco chiuso: pulito|semipulito|sporco';

-- Controllo: devono rispondere varchar(120) tutte e due.
SHOW COLUMNS FROM burraco_partite LIKE 'burrachi_%';

-- Controllo che i dati siano sopravvissuti alla copia: deve tornare lo stesso
-- numero di righe di prima, e le stringhe intatte.
SELECT COUNT(*) AS righe,
       MAX(CHAR_LENGTH(burrachi_noi))  AS max_noi,
       MAX(CHAR_LENGTH(burrachi_loro)) AS max_loro
FROM burraco_partite;
