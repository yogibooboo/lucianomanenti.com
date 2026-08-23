-- ============================================================================
-- STATISTICHE BURRACO - SCHEMA PER MYSQL 8
-- ============================================================================
-- Due tabelle, e la divisione fra le due e' il punto:
--
--   burraco_partite  una riga per mano giocata. Cresce di ~4.000 righe al
--                    giorno: tutto quello che sta qui va moltiplicato per
--                    centinaia di migliaia, quindi ogni byte conta.
--   burraco_motori   una riga per CONFIGURAZIONE DEL MOTORE mai vista. Cresce
--                    di una riga ogni volta che si prova qualcosa di nuovo:
--                    dieci, venti, cinquanta righe in tutto. Qui lo spazio non
--                    e' un problema, quindi ci si mette dentro tutto.
--
-- Le mani non descrivono il motore che le ha giocate: lo NOMINANO, con un
-- numero da 2 byte. La descrizione sta in una riga sola, condivisa da tutte le
-- mani giocate con quella configurazione. Se domani serve un parametro in piu'
-- per caratterizzare una variante, si aggiunge a `parametri` (che e' JSON, non
-- ha uno schema fisso) e le tabelle non si toccano.
--
-- Nessun indirizzo IP, nessuno user agent: l'unico dato che collega fra loro
-- piu' righe e' giocatore_id, generato dal browser e scritto solo con il
-- consenso alle finalita' publisher 1 e 10.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- I MOTORI
-- ----------------------------------------------------------------------------
-- Una configurazione e' identificata dal suo CONTENUTO, non da un'etichetta
-- decisa a priori: `firma` e' l'md5 di versione + parametri, calcolato
-- dall'endpoint. Conseguenza pratica: i motori si registrano da soli. Non c'e'
-- niente da preparare prima di lanciare una prova, e due prove fatte con la
-- stessa identica configurazione finiscono sulla stessa riga anche a distanza
-- di mesi e senza che nessuno se ne sia ricordato.
--
-- `nome`, `base_id` e `note` restano vuoti finche' non li riempi tu a mano (in
-- HeidiSQL, in phpMyAdmin, dove capita): servono a leggere i risultati, non a
-- raccoglierli, e a raccolta finita si sa molto meglio come chiamare le cose.
--
-- NON c'e' una colonna `tipo` (standard / coefficienti / codice), e la ragione
-- e' che non direbbe niente che non sia gia' scritto altrove:
--   parametri vuoti           = e' lo standard di quella versione
--   parametri pieni           = e' una variante di coefficienti
--   versione diversa          = e' una variante di codice
-- "Standard" non e' un tipo: e' il caso in cui l'insieme degli scostamenti e'
-- vuoto. Una colonna in piu' sarebbe solo un'occasione di dire una cosa e
-- scriverne un'altra.
--
-- ATTENZIONE alla dipendenza nascosta di `parametri`: contiene gli SCOSTAMENTI,
-- quindi e' leggibile solo sapendo da cosa si scosta. La base sta in un file
-- (burraco-engine-default.coeffs.js) che cambia. Percio' `versione` deve portare
-- con se' un'impronta della tabella di base - vedi la nota in fondo - o le righe
-- vecchie continueranno a dire "nessuno scostamento" intendendo un'altra cosa.

CREATE TABLE IF NOT EXISTS burraco_motori (
    id           SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,

    firma        CHAR(32)          NOT NULL,              -- md5 di versione+parametri: l'identita' vera
    nome         VARCHAR(60)       NOT NULL DEFAULT '',   -- etichetta leggibile, la metti dopo
    versione     VARCHAR(20)       NOT NULL DEFAULT '',   -- versione del motore, non del gioco
    base_id      SMALLINT UNSIGNED DEFAULT NULL,          -- "variante di quale motore", a mano
    parametri    JSON              DEFAULT NULL,          -- solo cio' che DIFFERISCE dallo standard
    note         TEXT,

    prima_volta  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultima_volta DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Quante MANI ha giocato, non quante sedie ha occupato: in 2v2 lo stesso
    -- motore siede spesso in due posti, e contarlo due volte gonfierebbe
    -- proprio il numero che si guarda per sapere su quanti dati si ragiona.
    mani         INT UNSIGNED NOT NULL DEFAULT 0,

    PRIMARY KEY (id),
    UNIQUE KEY uq_firma (firma)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Nota su `firma`. La calcola l'endpoint sulla stringa JSON che ha costruito
-- lui, con le chiavi in ordine alfabetico. MySQL, quando immagazzina un valore
-- JSON, si riordina le chiavi a modo suo (prima le piu' corte): il contenuto e'
-- lo stesso ma il testo no, quindi ricalcolare l'md5 leggendo `parametri` da
-- qui darebbe un risultato diverso. La firma si confronta, non si ricalcola.
--
-- Nota su `parametri`. Contiene SOLO le differenze rispetto allo standard, non
-- l'intera configurazione: se un giorno il valore di serie di un coefficiente
-- cambia, le righe vecchie continuano a dire la verita' ("questa variante
-- girava con 1,4") invece di diventare bugie silenziose.
--
-- Interrogarlo e' diretto - `->>` estrae il valore come testo:
--
--   SELECT id, nome, parametri->>'$.coeffScoreOpz' AS coeff
--   FROM burraco_motori;
--
--   -- tutte le mani giocate contro un avversario con quel coefficiente
--   SELECT p.* FROM burraco_partite p
--   JOIN burraco_motori m ON m.id = p.motore_avv1
--   WHERE m.parametri->>'$.coeffScoreOpz' = '1.4';
--
-- Il JOIN non costa niente: MySQL legge le venti righe dei motori una volta e
-- se le tiene in memoria. Se un giorno un parametro diventasse cosi' frequente
-- da volerlo indicizzare, la strada e' una colonna generata - si aggiunge dopo,
-- senza riscrivere niente:
--
--   ALTER TABLE burraco_motori
--     ADD COLUMN coeff DECIMAL(5,3)
--       GENERATED ALWAYS AS (parametri->>'$.coeffScoreOpz') STORED,
--     ADD KEY idx_coeff (coeff);


-- ----------------------------------------------------------------------------
-- LE MANI
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS burraco_partite (
    id            BIGINT UNSIGNED   NOT NULL AUTO_INCREMENT,

    -- Identificativi
    mano_id       CHAR(20)          NOT NULL,              -- univoco: regge l'INSERT IGNORE sui doppi invii
    giocatore_id  CHAR(20)          DEFAULT NULL,          -- NULL senza consenso
    torneo_id     CHAR(20)          DEFAULT NULL,          -- NULL senza consenso (lega fra loro le mani, quindi e' un identificatore), per le mani singole e per i tornei aperti prima di questa versione
    mano_num      SMALLINT UNSIGNED NOT NULL DEFAULT 1,    -- progressivo dentro il torneo

    -- Configurazione della mano
    modalita      ENUM('1v1','2v2') NOT NULL,
    -- Quale braccio dell'esperimento in corso. Vale per le partite VERE. Nelle
    -- prove offline non vuol dire niente e resta 'A': li' chi ha giocato lo
    -- dicono le quattro colonne motore_*, che sono piu' precise (dicono anche
    -- CON QUALI numeri) e non dipendono da quale esperimento era attivo.
    --   'A'  nessuno modificato          (l'ancora)
    --   'B'  i due avversari modificati  (il motore in prova contro la persona)
    --   'C'  il compagno modificato      (il motore in prova con la persona)
    -- B e C devono spostare il margine della persona in direzioni OPPOSTE: e'
    -- quella la prova che il motore e' piu' forte e non solo diverso.
    -- In 1v1 il compagno non esiste e 'C' non compare.
    braccio       ENUM('A','B','C') NOT NULL,
    versione      VARCHAR(10)       NOT NULL DEFAULT '',   -- versione del GIOCO (quella del motore sta in burraco_motori)

    -- Chi era seduto dove. Ogni numero e' un burraco_motori.id.
    -- NULL non e' "non lo so", ha un significato preciso e diverso per sedia:
    --   motore_noi      NULL online, dove al posto nostro gioca una persona;
    --                   valorizzato solo nelle prove offline motore-contro-motore
    --   motore_compagno NULL in 1v1, dove il compagno non esiste
    --   motore_avv2     NULL in 1v1, stessa ragione
    motore_noi      SMALLINT UNSIGNED DEFAULT NULL,
    motore_compagno SMALLINT UNSIGNED DEFAULT NULL,
    motore_avv1     SMALLINT UNSIGNED DEFAULT NULL,
    motore_avv2     SMALLINT UNSIGNED DEFAULT NULL,

    -- Il seme del mazzo. Serve al confronto appaiato: due motori che giocano le
    -- STESSE smazzate si confrontano su qualche centinaio di mani invece che su
    -- qualche migliaio, perche' sparisce il rumore della fortuna nelle carte.
    -- NULL quando il mazzo e' stato mescolato davvero (cioe' online).
    --
    -- Il seme vale come identita' del mazzo SOLO a parita' di `versione`: mescola
    -- un mazzo costruito in un ordine fisso, e il giorno in cui quell'ordine
    -- cambiasse lo stesso numero darebbe una smazzata diversa.
    seme          BIGINT UNSIGNED   DEFAULT NULL,

    -- Chi ha dato le carte. Non e' un dettaglio di colore: chi comincia la mano
    -- e' quello DOPO il mazziere, e cominciare per primi non e' neutro. Senza
    -- questa colonna una differenza fra due motori potrebbe essere solo una
    -- differenza di chi partiva, e a posteriori non si distingue piu'.
    --
    -- E' l'indice del posto al tavolo, nell'ordine in cui il gioco crea i
    -- giocatori (creaGiocatori in burraco-game.js), che NON e' l'ordine in cui
    -- sono elencate le sedie qui sopra:
    --   0 = noi (bottom)   1 = avv1 (left)   2 = compagno (top)   3 = avv2 (right)
    -- In 1v1 esistono solo 0 e 1.
    --
    -- Cosi' com'e' risponde a due domande invece che a una: il mazziere e' il
    -- numero stesso, e chi ha iniziato e' (mazziere + 1) MOD 4 in 2v2, MOD 2 in
    -- 1v1 - il numero di posti si ricava da `modalita`, non serve una colonna.
    mazziere      TINYINT UNSIGNED  DEFAULT NULL,

    -- Esito
    esito         TINYINT UNSIGNED  NOT NULL,              -- 1 = ha vinto il giocatore
    punti_noi     SMALLINT          NOT NULL,              -- puo' essere negativo (penalita')
    punti_loro    SMALLINT          NOT NULL,
    chiusura      TINYINT           NOT NULL,              -- 1 = chiude il giocatore, -1 = chiudono gli avversari, 0 = mazzo esaurito
    -- Tipi concatenati, un gettone per burraco chiuso, es. 'pulito,sporco'.
    -- Largo 120 e non 20: una squadra puo' chiudere piu' burachi nella stessa
    -- mano, e il caso peggiore non e' quello che sembra — SEI 'semipulito'
    -- fanno 65 caratteri. Sopra il tetto la mano non si tronca, si RIFIUTA con
    -- un 400, e sendBeacon non lo dice a nessuno: la riga sparisce in silenzio.
    -- 120 tiene dieci burachi, oltre il massimo fisico. (Era 60 fino al
    -- 23/08/2026: vedi alter-2026-08-23-burrachi-120.sql, e nota che passare
    -- 255 byte costa una riscrittura della tabella, non un ALTER sul posto.)
    burrachi_noi  VARCHAR(120)      NOT NULL DEFAULT '',
    burrachi_loro VARCHAR(120)      NOT NULL DEFAULT '',
    pozzetto_noi  TINYINT UNSIGNED  NOT NULL,              -- 1 = preso
    pozzetto_loro TINYINT UNSIGNED  NOT NULL,
    durata_s      MEDIUMINT UNSIGNED NOT NULL,

    creato_il     DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_mano (mano_id),
    KEY idx_creato (creato_il),              -- serve alla purga dei 24 mesi
    KEY idx_braccio (braccio, creato_il),    -- il confronto A/B/C
    KEY idx_giocatore (giocatore_id)         -- raggruppamento per browser
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Sulle quattro sedie NON c'e' un indice, ed e' una scelta. Misurato su 100.000
-- righe, raggruppare per una colonna non indicizzata costa 50 ms: e' una query
-- che si fa a fine giornata, non a ogni partita, e ogni indice costerebbe 37-58
-- byte per riga per sempre. Se un giorno una query dara' davvero fastidio, la
-- si cronometra e si decide allora.
--
-- Nemmeno chiavi esterne verso burraco_motori. La coerenza la garantisce
-- l'endpoint (scrive l'id solo dopo averlo ottenuto dalla tabella dei motori),
-- mentre un vincolo vero renderebbe fragile il giro CSV -> LOAD DATA -> PC, che
-- carica le tabelle in ordine arbitrario e vuole poterle svuotare a piacere.


-- ----------------------------------------------------------------------------
-- LA VISTA COMODA
-- ----------------------------------------------------------------------------
-- Le mani con accanto i nomi dei motori invece dei numeri. Aprila in HeidiSQL
-- come fosse una tabella: e' li' per non dover riscrivere quattro LEFT JOIN
-- ogni volta che si vuole guardare i dati.
--
-- ATTENZIONE: `SELECT p.*` viene espanso QUI, adesso, nell'elenco delle colonne
-- che esistono oggi. Se un giorno si aggiunge una colonna a burraco_partite,
-- questa vista continuera' a non mostrarla finche' non la si ricrea.

CREATE OR REPLACE VIEW burraco_mani AS
SELECT p.*,
       COALESCE(NULLIF(mn.nome,  ''), mn.firma)  AS chi_noi,
       COALESCE(NULLIF(mc.nome,  ''), mc.firma)  AS chi_compagno,
       COALESCE(NULLIF(ma1.nome, ''), ma1.firma) AS chi_avv1,
       COALESCE(NULLIF(ma2.nome, ''), ma2.firma) AS chi_avv2
FROM burraco_partite p
LEFT JOIN burraco_motori mn  ON mn.id  = p.motore_noi
LEFT JOIN burraco_motori mc  ON mc.id  = p.motore_compagno
LEFT JOIN burraco_motori ma1 ON ma1.id = p.motore_avv1
LEFT JOIN burraco_motori ma2 ON ma2.id = p.motore_avv2;


-- ----------------------------------------------------------------------------
-- MIGRAZIONE DA UNA TABELLA GIA' ESISTENTE
-- ----------------------------------------------------------------------------
-- Se burraco_partite c'e' gia' con lo schema vecchio, il CREATE qui sopra non
-- fa niente (e' IF NOT EXISTS). Le colonne nuove si aggiungono cosi'. Sono
-- tutte in fondo e tutte DEFAULT NULL, quindi MySQL le mette con
-- ALGORITHM=INSTANT: e' un cambio di metadati, non tocca le righe, e su
-- 100.000 righe e' stato misurato in 48 millisecondi.
--
--   ALTER TABLE burraco_partite
--     ADD COLUMN motore_noi      SMALLINT UNSIGNED DEFAULT NULL,
--     ADD COLUMN motore_compagno SMALLINT UNSIGNED DEFAULT NULL,
--     ADD COLUMN motore_avv1     SMALLINT UNSIGNED DEFAULT NULL,
--     ADD COLUMN motore_avv2     SMALLINT UNSIGNED DEFAULT NULL,
--     ADD COLUMN seme            BIGINT   UNSIGNED DEFAULT NULL,
--     ADD COLUMN mazziere        TINYINT  UNSIGNED DEFAULT NULL,
--     ALGORITHM=INSTANT;
--
-- (Le righe vecchie restano con le sedie a NULL: sono mani giocate quando la
-- domanda "con quale motore?" non aveva ancora una risposta registrata.)
