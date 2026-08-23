<?php
// Pagina di prova del database. USA E GETTA: quando i controlli sono verdi,
// cancellala dal server. Non fa parte della raccolta statistiche.
//
// Si apre con  https://www.lucianomanenti.com/stats/prova-db.php?k=LA_TUA_CHIAVE
// dove la chiave e' quella scritta in stats-config.php (voce 'chiave_prova').
//
// Verifica in ordine: che il config sia dove ci si aspetta, che PHP riesca ad
// autenticarsi su MySQL 8, che l'utente possa creare una tabella, scrivere,
// rileggere e cancellare. Se passa tutto, l'endpoint vero non puo' fallire
// per ragioni di ambiente.

// Il config non ha un posto fisso: non sappiamo ancora com'e' disposto lo
// spazio su Aruba, cioe' se sopra al webroot ci sia una cartella raggiungibile
// via FTP. Si prova nell'ordine dal piu' sicuro al meno sicuro; la pagina
// stampa quale ha trovato, e quella diventa la CONFIG_PATH di burraco.php.
$CANDIDATI = [
    __DIR__ . '/../../stats-config.php',  // due livelli sopra: fuori dal webroot
    __DIR__ . '/../stats-config.php',     // un livello sopra
    __DIR__ . '/stats-config.php',        // accanto allo script, ultima scelta
];

header('Content-Type: text/html; charset=utf-8');
echo '<!doctype html><meta charset="utf-8"><title>Prova database</title>';
echo '<style>body{font:15px/1.5 system-ui,sans-serif;max-width:700px;margin:40px auto;padding:0 16px}'
   . '.ok{color:#0a7a2f}.ko{color:#b00020}code{background:#f2f2f2;padding:1px 4px;border-radius:3px}'
   . 'li{margin:4px 0}</style><h1>Prova database</h1><ul>';

$passi = [];
function esito($ok, $testo, $dettaglio = '') {
    printf('<li class="%s">%s %s%s</li>', $ok ? 'ok' : 'ko', $ok ? '&#10003;' : '&#10007;',
        htmlspecialchars($testo), $dettaglio ? ' &mdash; <code>' . htmlspecialchars($dettaglio) . '</code>' : '');
    if (!$ok) { echo '</ul><p class="ko"><strong>Fermato qui.</strong></p>'; exit; }
}

// 0. Disposizione delle cartelle. Va stampata PRIMA di tutto: se il config non
//    si trova, e' questo elenco a dire dove andava messo.
$radice = $_SERVER['DOCUMENT_ROOT'] ?? '';
printf('<li>Cartella dello script: <code>%s</code></li>', htmlspecialchars(__DIR__));
printf('<li>Webroot: <code>%s</code></li>', htmlspecialchars($radice ?: 'non dichiarata'));
if ($radice) {
    $sopra = dirname($radice);
    printf('<li>Sopra al webroot: <code>%s</code> &mdash; %s</li>', htmlspecialchars($sopra),
        is_dir($sopra) ? (is_readable($sopra) ? 'esiste ed e&#39; leggibile' : 'esiste ma non e&#39; leggibile')
                       : 'non accessibile da PHP');
}

// 1. Il config: dove sta davvero?
$trovato = null;
foreach ($CANDIDATI as $c) {
    printf('<li>%s <code>%s</code></li>', is_file($c) ? '&#10003; c&#39;e&#39;' : '&nbsp;&nbsp;manca',
        htmlspecialchars($c));
    if ($trovato === null && is_file($c)) $trovato = $c;
}
esito($trovato !== null, 'File di configurazione trovato', (string)$trovato);
$cfg = require $trovato;
esito(is_array($cfg) && !empty($cfg['db']) && !empty($cfg['pass']), 'Configurazione compilata');

// 2. Chiave giusta? (evita che la pagina resti aperta a chiunque)
if (empty($cfg['chiave_prova']) || ($_GET['k'] ?? '') !== $cfg['chiave_prova']) {
    esito(false, 'Chiave mancante o errata: aggiungi ?k=... alla URL');
}

// 3. Connessione: qui casca l'autenticazione caching_sha2 dei PHP vecchi.
try {
    $pdo = new PDO(
        "mysql:host={$cfg['host']};port={$cfg['porta']};dbname={$cfg['db']};charset=utf8mb4",
        $cfg['user'], $cfg['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]
    );
    esito(true, 'Connessione riuscita', 'PHP ' . PHP_VERSION);
} catch (Throwable $e) {
    esito(false, 'Connessione fallita', $e->getMessage());
}

esito(true, 'Versione del server', $pdo->query('SELECT VERSION()')->fetchColumn());

// 4. Creazione tabella: verifica che l'utente abbia i permessi, non solo l'accesso.
try {
    $pdo->exec('CREATE TABLE IF NOT EXISTS prova_connessione (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        nota VARCHAR(50) NOT NULL,
        creato_il DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
    esito(true, 'Creazione tabella consentita');
} catch (Throwable $e) {
    esito(false, 'Creazione tabella rifiutata', $e->getMessage());
}

// 5. Scrittura con parametri, come fara' l'endpoint vero.
$st = $pdo->prepare('INSERT INTO prova_connessione (nota) VALUES (?)');
$st->execute(['prova ' . date('H:i:s')]);
esito(true, 'Scrittura riuscita', 'id ' . $pdo->lastInsertId());

// 6. Rilettura.
$righe = $pdo->query('SELECT id, nota, creato_il FROM prova_connessione ORDER BY id DESC LIMIT 5')
             ->fetchAll(PDO::FETCH_ASSOC);
esito(count($righe) > 0, 'Rilettura riuscita', count($righe) . ' righe piu' . "\xE2\x80\x99" . ' recenti');

// 7. Accenti e caratteri fuori ASCII: se qui si vedono i punti interrogativi,
//    la collazione non e' quella che crediamo.
$st = $pdo->prepare('INSERT INTO prova_connessione (nota) VALUES (?)');
$st->execute(['àèìòù §-€ 汉']);
$tornato = $pdo->query('SELECT nota FROM prova_connessione ORDER BY id DESC LIMIT 1')->fetchColumn();
esito($tornato === 'àèìòù §-€ 汉', 'Caratteri accentati integri', $tornato);

echo '</ul><h2>Ultime righe</h2><ul>';
foreach ($righe as $r) {
    printf('<li>#%d &mdash; %s &mdash; %s</li>', $r['id'],
        htmlspecialchars($r['nota']), $r['creato_il']);
}
echo '</ul>';

// 8. Pulizia, solo se richiesta esplicitamente.
if (($_GET['azione'] ?? '') === 'pulisci') {
    $pdo->exec('DROP TABLE prova_connessione');
    echo '<p class="ok">&#10003; Tabella <code>prova_connessione</code> eliminata.</p>';
} else {
    echo '<p>Per eliminare la tabella di prova aggiungi <code>&amp;azione=pulisci</code> alla URL.</p>';
}

echo '<p><strong>Quando hai finito, cancella questo file dal server.</strong></p>';
