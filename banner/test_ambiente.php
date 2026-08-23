<?php
// ==========================================
// TEST AMBIENTE SERVER - diagnostica standalone
// Compatibile PHP 5.2+ : nessuna sintassi moderna qui dentro,
// cosi' questo file gira ANCHE se il server e' vecchio.
// Caricare in /banner/ e aprire da browser. CANCELLARE DOPO L'USO.
// ==========================================

header('Content-Type: text/html; charset=utf-8');
ini_set('display_errors', 1);
error_reporting(E_ALL);

function riga($etichetta, $valore, $esito) {
    // $esito: 'ok', 'ko', 'warn', oppure '' per neutro
    $colori = array('ok' => '#0a0', 'ko' => '#c00', 'warn' => '#c80', '' => '#333');
    $col = isset($colori[$esito]) ? $colori[$esito] : '#333';
    echo '<tr><td style="padding:6px 12px;border-bottom:1px solid #ddd">' . $etichetta . '</td>';
    echo '<td style="padding:6px 12px;border-bottom:1px solid #ddd;color:' . $col . ';font-weight:bold">' . $valore . '</td></tr>';
}

echo '<html><head><title>Test ambiente</title></head><body style="font-family:sans-serif;max-width:900px;margin:20px auto">';
echo '<h1>Diagnostica ambiente server</h1>';
echo '<table style="border-collapse:collapse;width:100%">';

// ------------------------------------------
// 1. VERSIONE PHP  (la domanda principale)
// ------------------------------------------
$ver = phpversion();
$ver_ok = version_compare($ver, '7.0.0', '>=');
riga('Versione PHP', $ver, $ver_ok ? 'ok' : 'ko');
riga('Supporta operatore <code>??</code> e <code>Throwable</code> (serve PHP 7+)',
     $ver_ok ? 'SI' : 'NO &rarr; e\' QUESTA la causa dell\'errore 500',
     $ver_ok ? 'ok' : 'ko');
riga('SAPI', php_sapi_name(), '');

// ------------------------------------------
// 2. ESTENSIONI NECESSARIE
// ------------------------------------------
$curl_ok = function_exists('curl_init');
riga('Estensione cURL', $curl_ok ? 'attiva' : 'ASSENTE', $curl_ok ? 'ok' : 'ko');
riga('Estensione JSON', function_exists('json_decode') ? 'attiva' : 'ASSENTE',
     function_exists('json_decode') ? 'ok' : 'ko');
riga('Funzione md5', function_exists('md5') ? 'attiva' : 'ASSENTE',
     function_exists('md5') ? 'ok' : 'ko');

// ------------------------------------------
// 3. LIMITI DI ESECUZIONE
// ------------------------------------------
riga('max_execution_time', ini_get('max_execution_time') . ' s', '');
$stl = function_exists('set_time_limit') && !in_array('set_time_limit', array_map('trim', explode(',', ini_get('disable_functions'))));
riga('set_time_limit() utilizzabile', $stl ? 'SI' : 'NO (disabilitata)', $stl ? 'ok' : 'warn');
riga('memory_limit', ini_get('memory_limit'), '');
$df = ini_get('disable_functions');
riga('disable_functions', $df ? htmlspecialchars($df) : '(nessuna)', $df ? 'warn' : 'ok');

// ------------------------------------------
// 4. PERMESSI DI SCRITTURA NELLA CARTELLA
// ------------------------------------------
riga('Cartella dello script', htmlspecialchars(__DIR__), '');
$dir_w = is_writable(__DIR__);
riga('Cartella scrivibile', $dir_w ? 'SI' : 'NO', $dir_w ? 'ok' : 'ko');

// prova reale di scrittura + rename (lo script usa la scrittura atomica)
$prova = __DIR__ . '/__prova_scrittura.tmp';
$scritto = @file_put_contents($prova, 'test');
if ($scritto !== false) {
    $prova2 = __DIR__ . '/__prova_scrittura2.tmp';
    $rin = @rename($prova, $prova2);
    riga('Scrittura file riuscita', 'SI (' . $scritto . ' byte)', 'ok');
    riga('rename() riuscita (serve per salvataggio atomico)', $rin ? 'SI' : 'NO', $rin ? 'ok' : 'ko');
    @unlink($rin ? $prova2 : $prova);
} else {
    riga('Scrittura file riuscita', 'NO', 'ko');
    riga('rename()', 'non testata', 'warn');
}

// ------------------------------------------
// 5. FILE ATTESI DALLO SCRIPT DI SINCRONIZZAZIONE
// ------------------------------------------
$attesi = array(
    'config.php'                 => true,   // true = obbligatorio
    'newdeals.json'              => true,
    'phpmailer/PHPMailer.php'    => false,
    'phpmailer/SMTP.php'         => false,
    'phpmailer/Exception.php'    => false
);
foreach ($attesi as $f => $obbl) {
    $p = __DIR__ . '/' . $f;
    if (file_exists($p)) {
        riga('File ' . $f, 'presente (' . filesize($p) . ' byte)', 'ok');
    } else {
        riga('File ' . $f, 'MANCANTE', $obbl ? 'ko' : 'warn');
    }
}

// stato del log, se c'e'
$logf = __DIR__ . '/sync_log.txt';
if (file_exists($logf)) {
    riga('sync_log.txt scrivibile', is_writable($logf) ? 'SI' : 'NO', is_writable($logf) ? 'ok' : 'ko');
}

// ------------------------------------------
// 6. CONTENUTO DI newdeals.json
// ------------------------------------------
$fj = __DIR__ . '/newdeals.json';
if (file_exists($fj)) {
    $raw = @file_get_contents($fj);
    $dati = json_decode($raw, true);
    if ($dati === null) {
        riga('newdeals.json valido', 'NO - JSON malformato', 'ko');
    } else if (!isset($dati['deals'])) {
        riga('newdeals.json valido', 'NO - manca la chiave "deals"', 'ko');
    } else {
        $n_amz = 0; $n_ali = 0; $n_altro = 0;
        foreach ($dati['deals'] as $d) {
            $store = isset($d['store']) ? $d['store'] : 'amazon';
            if ($store === 'aliexpress' && !empty($d['product_id'])) { $n_ali++; }
            else if (!empty($d['asin'])) { $n_amz++; }
            else { $n_altro++; }
        }
        riga('newdeals.json valido', 'SI - ' . count($dati['deals']) . ' deal totali', 'ok');
        riga('&nbsp;&nbsp;di cui Amazon (con asin)', $n_amz, $n_amz ? 'ok' : 'warn');
        riga('&nbsp;&nbsp;di cui AliExpress (store+product_id)', $n_ali, $n_ali ? 'ok' : 'warn');
        riga('&nbsp;&nbsp;scartati (ne\' asin ne\' product_id)', $n_altro, $n_altro ? 'warn' : 'ok');
    }
}

// ------------------------------------------
// 7. VARIABILI DI config.php
// ------------------------------------------
if (file_exists(__DIR__ . '/config.php')) {
    include __DIR__ . '/config.php';
    $vars = array('CLIENT_ID', 'CLIENT_SECRET', 'PARTNER_TAG',
                  'ALI_APP_KEY', 'ALI_APP_SECRET', 'ALI_TRACKING_ID',
                  'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS',
                  'REPORT_EMAIL_TO', 'REPORT_EMAIL_FROM');
    foreach ($vars as $v) {
        $presente = isset($$v) && $$v !== '';
        // non stampo mai il valore delle credenziali, solo se ci sono
        riga('config.php: $' . $v, $presente ? 'valorizzata' : 'VUOTA o assente', $presente ? 'ok' : 'ko');
    }
    riga('config.php: $ENABLE_AMAZON', isset($ENABLE_AMAZON) ? ($ENABLE_AMAZON ? 'true' : 'false') : 'non definita', '');
    riga('config.php: $ENABLE_ALIEXPRESS', isset($ENABLE_ALIEXPRESS) ? ($ENABLE_ALIEXPRESS ? 'true' : 'false') : 'non definita', '');
}

// ------------------------------------------
// 8. CONNETTIVITA' USCENTE (senza credenziali)
// ------------------------------------------
if ($curl_ok) {
    $endpoint = array(
        'api.amazon.co.uk (token OAuth)'  => 'https://api.amazon.co.uk/auth/o2/token',
        'creatorsapi.amazon (catalogo)'   => 'https://creatorsapi.amazon/catalog/v1/getItems',
        'api-sg.aliexpress.com (Ali)'     => 'https://api-sg.aliexpress.com/sync'
    );
    foreach ($endpoint as $nome => $url) {
        $c = curl_init($url);
        curl_setopt($c, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($c, CURLOPT_TIMEOUT, 10);
        curl_setopt($c, CURLOPT_NOBODY, true);
        $t0 = microtime(true);
        curl_exec($c);
        $ms = round((microtime(true) - $t0) * 1000);
        $code = curl_getinfo($c, CURLINFO_HTTP_CODE);
        $err = curl_error($c);
        // qualsiasi risposta HTTP va bene: significa che l'host e' raggiungibile.
        // Un 400/403/405 e' normale su un endpoint POST interrogato senza dati.
        if ($err) {
            riga('Raggiungibile: ' . $nome, 'NO - ' . htmlspecialchars($err), 'ko');
        } else {
            riga('Raggiungibile: ' . $nome, 'SI - HTTP ' . $code . ' in ' . $ms . ' ms', 'ok');
        }
    }
}

echo '</table>';

// ------------------------------------------
// VERDETTO
// ------------------------------------------
echo '<h2>Verdetto</h2>';
if (!$ver_ok) {
    echo '<p style="background:#fee;border-left:4px solid #c00;padding:12px">';
    echo '<b>Trovata la causa.</b> Il server gira su PHP ' . $ver . '. ';
    echo 'Il nuovo <code>aggiorna_offerte.php</code> usa l\'operatore <code>??</code> e <code>catch (\\Throwable)</code>, ';
    echo 'introdotti in PHP 7.0: su questa versione il file non viene nemmeno interpretato e il server risponde 500. ';
    echo 'Due strade: alzare la versione PHP dal pannello di controllo, oppure riscrivere quelle righe in sintassi compatibile.';
    echo '</p>';
} else {
    echo '<p style="background:#efe;border-left:4px solid #0a0;padding:12px">';
    echo 'PHP ' . $ver . ' supporta la sintassi usata nel nuovo script, quindi il 500 <b>non</b> dipende dalla versione. ';
    echo 'Controlla le righe in rosso qui sopra; se sono tutte verdi la causa va cercata nel log errori PHP del pannello di controllo.';
    echo '</p>';
}

echo '<p style="color:#c00"><b>Ricordati di cancellare questo file dal server dopo la diagnosi.</b></p>';
echo '</body></html>';
?>
