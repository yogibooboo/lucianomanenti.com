-- ============================================================================
-- 22/08/2026 — TERZO BRACCIO
-- ============================================================================
-- QUESTO VA ESEGUITO SUL SERVER **PRIMA** DI CARICARE IL GIOCO NUOVO.
--
-- Il gioco comincia a mandare braccio='C' (compagno modificato). Se la colonna
-- e' ancora ENUM('A','B'), stats/burraco.php rifiuta quelle mani con un 400 e
-- un terzo dei dati sparisce SENZA CHE SI VEDA: le mani partono con
-- sendBeacon, che non riporta ne' l'esito ne' l'errore. E' esattamente il
-- guasto in cui siamo cascati in locale il 21/08 col PHP a 32 bit.
--
-- Ordine giusto: prima questo, poi i file del gioco. Al contrario si perdono
-- solo mani; in questo ordine non si perde niente, perche' finche' il gioco
-- vecchio e' online non esiste nessun braccio 'C' da rifiutare.
--
-- Si esegue da phpMyAdmin di Aruba sul database delle statistiche.

-- Aggiungere un valore IN FONDO alla lista di un ENUM non tocca i dati gia'
-- scritti: 'A' resta 'A' e 'B' resta 'B'. Se il server non accettasse
-- ALGORITHM=INSTANT, togliere la riga e rilanciare: la tabella e' piccola e
-- una riscrittura non e' un problema.
ALTER TABLE burraco_partite
    MODIFY COLUMN braccio ENUM('A','B','C') NOT NULL
    COMMENT 'A=nessuno modificato, B=avversari modificati, C=compagno modificato',
    ALGORITHM=INSTANT;

-- Controllo: deve rispondere enum('A','B','C').
SHOW COLUMNS FROM burraco_partite LIKE 'braccio';
