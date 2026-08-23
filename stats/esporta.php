<?php
// ============================================================================
// ESPORTAZIONE DELLE TABELLE IN CSV
// ============================================================================
// Aruba non lascia entrare nessuno sulla porta 3306 dall'esterno: l'unico modo
// per avere i dati sul PC e' farseli passare da qui, via HTTP.
//
// Non e' un pannello e non esegue query arbitrarie: sputa fuori le righe, punto.
// Cosi' non c'e' niente da bucare - nessuna stringa dell'utente finisce mai
// dentro una query.
//
// USO
//   esporta.php?k=CHIAVE                    le mani (burraco_partite)
//   esporta.php?k=CHIAVE&t=motori           i motori (burraco_motori)
//   esporta.php?k=CHIAVE&da=2026-08-01      solo da quella data in poi
//   esporta.php?k=CHIAVE&da=...&a=...       intervallo
//   esporta.php?k=CHIAVE&conta=1            solo quante righe sono, senza scaricarle
//   &sep=;                                  separatore punto e virgola (Excel italiano)
//   &bom=1                                  firma UTF-8 in testa (Excel la vuole per gli accenti)
//
// Servono TUTTI E DUE i file: nelle mani i motori sono quattro numeri, e senza
// la tabella dei motori quei numeri non vogliono dire niente. La tabella dei
// motori si scarica sempre intera (sono poche decine di righe) anche quando si
// esporta un intervallo di date, altrimenti a un sottoinsieme di mani
// mancherebbe proprio la riga che spiega chi le ha giocate.
// ============================================================================

require_once __DIR__ . '/comune.php';
$cfg = stats_configurazione();
if ($cfg === null) { http_response_code(500); exit('config'); }

// Chiave dedicata, diversa da quella della sonda: questo file resta online.
$attesa = (string)($cfg['chiave_export'] ?? '');
if ($attesa === '' || !hash_equals($attesa, (string)($_GET['k'] ?? ''))) {
    http_response_code(403);
    exit('no');
}

// Il nome della tabella non arriva mai da fuori: fuori arriva un'etichetta, e
// se non e' una di queste due non se ne fa niente.
$TABELLE  = ['partite' => 'burraco_partite', 'motori' => 'burraco_motori'];
$etichetta = (string)($_GET['t'] ?? 'partite');
if (!isset($TABELLE[$etichetta])) { http_response_code(400); exit('tabella'); }
$tabella = $TABELLE[$etichetta];

// Le date arrivano da fuori, quindi non entrano nella query come testo:
// vengono ricostruite da zero e passate come parametri.
function data_valida($v) {
    if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) return null;
    [$a, $m, $g] = array_map('intval', explode('-', $v));
    return checkdate($m, $g, $a) ? sprintf('%04d-%02d-%02d', $a, $m, $g) : null;
}

$da = isset($_GET['da']) ? data_valida($_GET['da']) : null;
$a  = isset($_GET['a'])  ? data_valida($_GET['a'])  : null;

$dove = [];
$par  = [];
if ($etichetta === 'partite') {
    if ($da !== null) { $dove[] = 'creato_il >= ?'; $par[] = $da . ' 00:00:00'; }
    if ($a  !== null) { $dove[] = 'creato_il <= ?'; $par[] = $a  . ' 23:59:59'; }
}
$clausola = $dove ? ' WHERE ' . implode(' AND ', $dove) : '';

try {
    $pdo = new PDO(
        "mysql:host={$cfg['host']};port={$cfg['porta']};dbname={$cfg['db']};charset=utf8mb4",
        $cfg['user'], $cfg['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (Throwable $e) {
    error_log('esporta burraco: ' . $e->getMessage());
    http_response_code(500);
    exit('db');
}

// Conteggio: utile per sapere prima quanto si sta per scaricare.
if (!empty($_GET['conta'])) {
    header('Content-Type: text/plain; charset=utf-8');
    $st = $pdo->prepare("SELECT COUNT(*) FROM `$tabella`" . $clausola);
    $st->execute($par);
    echo $st->fetchColumn(), " righe\n";
    exit;
}

// L'elenco delle colonne lo chiede al database invece di tenerselo scritto.
// Un elenco fisso qui dentro sarebbe la trappola perfetta: si aggiunge una
// colonna alla tabella, l'esportazione continua a funzionare senza un lamento
// e quella colonna semplicemente non arriva mai sul PC.
$colonne = array_column($pdo->query("SHOW COLUMNS FROM `$tabella`")->fetchAll(), 'Field');
if (!$colonne) { http_response_code(500); exit('colonne'); }

$sep = (isset($_GET['sep']) && $_GET['sep'] === ';') ? ';' : ',';

$nome = $tabella . '_' . date('Ymd_His') . '.csv';
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $nome . '"');
header('Cache-Control: no-store');

// Righe a una a una invece che tutte in memoria: con qualche centinaia di
// migliaia di record la differenza fra funzionare e non funzionare e' questa.
$pdo->setAttribute(PDO::MYSQL_ATTR_USE_BUFFERED_QUERY, false);

$out = fopen('php://output', 'w');
if (!empty($_GET['bom'])) fwrite($out, "\xEF\xBB\xBF");

// Il quinto argomento vuoto disattiva l'escape con la barra rovescia: il CSV
// esce con le sole virgolette raddoppiate, che e' quello che si aspetta il
// LOAD DATA ... ESCAPED BY '' dall'altra parte. Conta per la colonna JSON dei
// motori, che di barre rovesce ne puo' contenere.
fputcsv($out, $colonne, $sep, '"', '');

$st = $pdo->prepare('SELECT `' . implode('`,`', $colonne) . "` FROM `$tabella`"
                    . $clausola . ' ORDER BY id');
$st->execute($par);
while ($r = $st->fetch()) {
    // NULL diventa stringa vuota. Chi rilegge non deve indovinare quali colonne
    // possono mancare: se lo fa dire dallo schema (vedi importa-locale.php).
    fputcsv($out, array_map(function ($v) { return $v === null ? '' : $v; }, $r), $sep, '"', '');
}
fclose($out);
