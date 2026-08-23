<?php
// ============================================================================
// QUELLO CHE SERVE A PIU' DI UNO SCRIPT DI stats/
// ============================================================================
// Qui dentro c'e' una decisione sola, ma e' quella che conta: SU QUALE
// DATABASE SI SCRIVE.
//
// Non la prende una variabile d'ambiente, non la prende un "if" sparso nel
// codice, e soprattutto non la prende una riga da cambiare a mano prima di
// caricare i file - che e' il modo classico di svegliarsi con le prove finite
// dentro il database vero. La prende QUALE FILE DI CONFIGURAZIONE ESISTE, e i
// file sono diversi sulle due macchine perche' quello locale non si carica.
//
// L'ordine va dal piu' specifico al piu' generale:
//   1. stats-config.locale.php   in casa, e SOLO in casa
//   2. ../../stats-config.php    sopra al webroot, se lo spazio lo permette
//   3. ../stats-config.php
//   4. ./stats-config.php        accanto agli script, protetto da .htaccess
//
// Un file di configurazione puo' restituire `null` invece dell'elenco: vuol
// dire "non tocca a me", e si passa al successivo. E' cosi' che quello locale
// resta innocuo anche se per sbaglio finisse su Aruba.
// ============================================================================

function stats_candidati() {
    return [
        __DIR__ . '/stats-config.locale.php',
        __DIR__ . '/../../stats-config.php',
        __DIR__ . '/../stats-config.php',
        __DIR__ . '/stats-config.php',
    ];
}

function stats_configurazione() {
    foreach (stats_candidati() as $percorso) {
        if (!is_file($percorso)) continue;
        $cfg = require $percorso;
        if (is_array($cfg)) return $cfg;
    }
    return null;
}

// Vero quando gira sul PC e non sul server. Serve al file di configurazione
// locale per riconoscere dove si trova.
function stats_siamo_in_casa() {
    // Da riga di comando si e' sempre in casa: sul sito non c'e' niente che
    // lanci PHP dalla shell, nemmeno un cron.
    if (PHP_SAPI === 'cli') return true;

    $host = strtolower((string)($_SERVER['SERVER_NAME'] ?? $_SERVER['HTTP_HOST'] ?? ''));
    $host = preg_replace('/:\d+$/', '', $host);          // via la porta
    if (in_array($host, ['localhost', '127.0.0.1', '::1', '[::1]'], true)) return true;

    // I nomi che si danno i siti finti: itinerari.local di Local, e le altre
    // due terminazioni riservate proprio a questo (RFC 6761 e 2606).
    return (bool)preg_match('/\.(local|localhost|test)$/', $host);
}

// Stende uno schema .sql su una connessione aperta. PDO manderebbe il file al
// server tutto insieme, ma poi si tiene appeso il risultato di ogni comando
// dopo il primo e la query successiva muore con "unbuffered queries active".
// Quindi si spezza a monte: via i commenti, poi un comando alla volta.
// (Nessuna stringa dello schema contiene "--", altrimenti questo taglio
// mangerebbe anche quella.)
function stats_applica_schema(PDO $pdo, $percorso) {
    $sql = preg_replace('/--[^\n]*/', '', file_get_contents($percorso));
    $n = 0;
    foreach (explode(';', $sql) as $comando) {
        if (trim($comando) === '') continue;
        $pdo->exec($comando);
        $n++;
    }
    return $n;
}
