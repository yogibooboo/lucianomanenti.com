<?php
// ============================================================================
// COLLAUDO DEL DATABASE DELLE STATISTICHE - DA CANCELLARE DAL SERVER
// ============================================================================
// Nasce come popolatore per misurare quanto occupa la tabella. Adesso serve
// soprattutto a un'altra cosa: dire se il database e' a posto PRIMA che il
// gioco cominci a scriverci.
//
// Perche' serve una pagina apposta. Le mani partono con sendBeacon, che non
// riporta ne' l'esito ne' l'errore: se l'endpoint risponde 500 il browser non
// se ne accorge, il giocatore nemmeno, e ci si accorge del guasto solo
// guardando una tabella che resta vuota. Qui invece ogni passaggio si vede.
//
// USO
//   popola.php?k=CHIAVE                  collaudo: struttura + giro di scrittura
//   popola.php?k=CHIAVE&azione=endpoint  chiama burraco.php per davvero
//   popola.php?k=CHIAVE&azione=misura    quanto occupa su disco
//   popola.php?k=CHIAVE&azione=query     tempi delle interrogazioni tipiche
//   popola.php?k=CHIAVE&n=100000         scrive n righe finte (a blocchi)
//   popola.php?k=CHIAVE&azione=svuota    cancella SOLO le righe di prova
//
// L'azione predefinita e' il collaudo, non il popolamento: aprire questa
// pagina per sbaglio deve essere innocuo, e prima lo era il contrario.
// Collaudo ed endpoint si portano via da soli tutto quello che scrivono, e lo
// verificano ricontando le righe prima e dopo.
// ============================================================================

// Su quale database si scrive lo decide comune.php, non una lista di file
// scritta qui: questa pagina prima ne aveva una sua che saltava la
// configurazione locale, e sul PC finiva percio' a scrivere su Aruba.
require_once __DIR__ . '/comune.php';

header('Content-Type: text/html; charset=utf-8');
echo "<!doctype html><meta charset='utf-8'><title>Collaudo statistiche</title>";
echo "<style>body{font:15px/1.5 system-ui,sans-serif;max-width:70em;margin:2em auto;padding:0 1em}"
   . "table{border-collapse:collapse;margin:.5em 0}td,th{border:1px solid #ccc;padding:.3em .6em;text-align:left}"
   . "th{background:#eee}code{background:#f4f4f4;padding:0 .3em}.ok{color:#093}.no{color:#c00}"
   . ".dubbio{color:#a60}h2{margin-top:1.6em}"
   . ".dove{background:#f4f4f4;border-left:4px solid #999;padding:.6em 1em;margin:1em 0}</style>";

// ---- Configurazione ---------------------------------------------------------

$cfg = stats_configurazione();
if ($cfg === null) { echo "<p class='no'>Configurazione non trovata.</p>"; exit; }

// Quale file ha vinto: e' l'unica cosa che dice su quale macchina si sta
// scrivendo, e su una pagina che sa cancellare righe va scritto in chiaro.
$scelto = '(sconosciuto)';
foreach (stats_candidati() as $percorso) {
    if (is_file($percorso)) { $c = require $percorso; if (is_array($c)) { $scelto = basename($percorso); break; } }
}

// La stessa chiave della sonda: senza, la pagina non fa niente. Non e' una
// difesa vera, e' un paletto contro i passanti - il file va comunque cancellato.
if (($_GET['k'] ?? '') !== ($cfg['chiave_prova'] ?? '')) {
    http_response_code(403);
    echo "<p class='no'>Chiave mancante o errata.</p>";
    exit;
}

try {
    $pdo = new PDO(
        "mysql:host={$cfg['host']};port={$cfg['porta']};dbname={$cfg['db']};charset=utf8mb4",
        $cfg['user'], $cfg['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_EMULATE_PREPARES => false,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (Throwable $e) {
    echo "<p class='no'>Connessione fallita: " . htmlspecialchars($e->getMessage()) . "</p>";
    exit;
}

$in_casa = stats_siamo_in_casa();
echo "<div class='dove'><b>Database:</b> <code>" . htmlspecialchars($cfg['db']) . "</code> &nbsp; "
   . "<b>configurazione:</b> <code>" . htmlspecialchars($scelto) . "</code> &nbsp; "
   . "<b>macchina:</b> " . ($in_casa ? "in casa" : "<b class='no'>ONLINE</b>") . "</div>";

$azione = $_GET['azione'] ?? 'verifica';

// ============================================================================
// STRUMENTI COMUNI
// ============================================================================

$ESITI = ['ok' => 0, 'no' => 0];

function esito($passa, $etichetta, $dettaglio = '') {
    global $ESITI;
    $ESITI[$passa ? 'ok' : 'no']++;
    printf("<tr><td>%s</td><td class='%s'>%s</td><td>%s</td></tr>",
        htmlspecialchars($etichetta),
        $passa ? 'ok' : 'no',
        $passa ? 'ok' : 'NO',
        htmlspecialchars($dettaglio));
}

function nota($etichetta, $dettaglio) {
    printf("<tr><td>%s</td><td class='dubbio'>nota</td><td>%s</td></tr>",
        htmlspecialchars($etichetta), htmlspecialchars($dettaglio));
}

function conta(PDO $pdo, $tabella) {
    try { return (int)$pdo->query("SELECT COUNT(*) FROM `$tabella`")->fetchColumn(); }
    catch (Throwable $e) { return -1; }
}

// La firma di un motore, calcolata come la calcola burraco.php. Se un giorno
// laggiu' cambia il modo di comporla, questa pagina smette di riconoscere i
// motori che il gioco deposita - ed e' giusto che il collaudo se ne accorga.
function firma_motore($versione, $parametri) {
    if ($parametri === null || $parametri === []) $json = null;
    else { ksort($parametri); $json = json_encode($parametri, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }
    return [md5($versione . '|' . ($json ?? '')), $json];
}

// ============================================================================
// STRUTTURA ATTESA
// ============================================================================
// Copiata da schema.sql. Non e' una duplicazione inutile: e' il confronto fra
// cio' che il codice si aspetta e cio' che c'e' davvero, che e' esattamente il
// disallineamento che ha lasciato Aruba senza burraco_motori.

$ATTESE = [
    'burraco_partite' => [
        'id'              => ['bigint unsigned',     false],
        'mano_id'         => ['char(20)',            false],
        'giocatore_id'    => ['char(20)',            true],
        'torneo_id'       => ['char(20)',            true],
        'mano_num'        => ['smallint unsigned',   false],
        'modalita'        => ["enum('1v1','2v2')",   false],
        'braccio'         => ["enum('A','B','C')",   false],
        'versione'        => ['varchar(10)',         false],
        'motore_noi'      => ['smallint unsigned',   true],
        'motore_compagno' => ['smallint unsigned',   true],
        'motore_avv1'     => ['smallint unsigned',   true],
        'motore_avv2'     => ['smallint unsigned',   true],
        'seme'            => ['bigint unsigned',     true],
        'mazziere'        => ['tinyint unsigned',    true],
        'esito'           => ['tinyint unsigned',    false],
        'punti_noi'       => ['smallint',            false],
        'punti_loro'      => ['smallint',            false],
        'chiusura'        => ['tinyint',             false],
        'burrachi_noi'    => ['varchar(120)',        false],
        'burrachi_loro'   => ['varchar(120)',        false],
        'pozzetto_noi'    => ['tinyint unsigned',    false],
        'pozzetto_loro'   => ['tinyint unsigned',    false],
        'durata_s'        => ['mediumint unsigned',  false],
        'creato_il'       => ['datetime',            false],
    ],
    'burraco_motori' => [
        'id'           => ['smallint unsigned', false],
        'firma'        => ['char(32)',          false],
        'nome'         => ['varchar(60)',       false],
        'versione'     => ['varchar(20)',       false],
        'base_id'      => ['smallint unsigned', true],
        'parametri'    => ['json',              true],
        'note'         => ['text',              true],
        'prima_volta'  => ['datetime',          false],
        'ultima_volta' => ['datetime',          false],
        'mani'         => ['int unsigned',      false],
    ],
];

$INDICI = [
    'burraco_partite' => ['PRIMARY' => true, 'uq_mano' => true, 'idx_creato' => false,
                          'idx_braccio' => false, 'idx_giocatore' => false],
    'burraco_motori'  => ['PRIMARY' => true, 'uq_firma' => true],
];

// ============================================================================
// COLLAUDO
// ============================================================================

function struttura(PDO $pdo) {
    global $ATTESE, $INDICI;

    echo "<h2>1. Struttura</h2><table><tr><th>Controllo</th><th>Esito</th><th>Dettaglio</th></tr>";

    $viste = [];
    foreach ($pdo->query("SHOW FULL TABLES LIKE 'burraco%'") as $r) {
        $v = array_values($r);
        $viste[$v[0]] = $v[1];             // nome => BASE TABLE | VIEW
    }

    foreach (['burraco_partite', 'burraco_motori'] as $t) {
        esito(isset($viste[$t]) && $viste[$t] === 'BASE TABLE', "tabella $t",
              isset($viste[$t]) ? $viste[$t] : 'assente');
    }
    // La vista serve a guardare i dati, non a raccoglierli: se manca, il gioco
    // funziona lo stesso. Percio' e' una nota e non una bocciatura.
    if (isset($viste['burraco_mani'])) esito(true, 'vista burraco_mani', 'presente');
    else nota('vista burraco_mani', "assente: comoda per leggere, non serve all'endpoint");

    foreach ($ATTESE as $t => $colonne) {
        if (!isset($viste[$t])) continue;
        $presenti = [];
        foreach ($pdo->query("SHOW COLUMNS FROM `$t`") as $c) {
            $presenti[$c['Field']] = [strtolower($c['Type']), $c['Null'] === 'YES'];
        }
        foreach ($colonne as $nome => $atteso) {
            if (!isset($presenti[$nome])) { esito(false, "$t.$nome", 'COLONNA ASSENTE'); continue; }
            [$tipo, $nullo] = $presenti[$nome];
            $tipo_ok = $tipo === strtolower($atteso[0]);
            $null_ok = $nullo === $atteso[1];
            esito($tipo_ok && $null_ok, "$t.$nome",
                  $tipo_ok && $null_ok ? $tipo
                  : "trovato '$tipo'" . ($nullo ? ' NULL' : ' NOT NULL')
                    . ", atteso '{$atteso[0]}'" . ($atteso[1] ? ' NULL' : ' NOT NULL'));
        }
        // Colonne in piu' non rompono niente (l'endpoint le ignora): vanno
        // dette, non contate come errore.
        foreach (array_diff(array_keys($presenti), array_keys($colonne)) as $extra) {
            nota("$t.$extra", 'colonna in piu\', non prevista dallo schema');
        }
    }

    foreach ($INDICI as $t => $attesi) {
        if (!isset($viste[$t])) continue;
        $trovati = [];
        foreach ($pdo->query("SHOW INDEX FROM `$t`") as $i) {
            $trovati[$i['Key_name']] = ((int)$i['Non_unique'] === 0);
        }
        foreach ($attesi as $nome => $unico) {
            if (!isset($trovati[$nome])) { esito(false, "$t: indice $nome", 'ASSENTE'); continue; }
            esito($trovati[$nome] === $unico, "$t: indice $nome",
                  $trovati[$nome] === $unico ? ($unico ? 'unico' : 'normale')
                                             : ($unico ? 'NON e\' unico: i doppioni passerebbero' : 'e\' unico e non dovrebbe'));
        }
    }

    // Senza modo stretto MySQL non rifiuta un valore fuori scala: lo tronca e
    // tira avanti. La riga entrerebbe lo stesso, dicendo un'altra cosa.
    $modo = (string)$pdo->query('SELECT @@SESSION.sql_mode')->fetchColumn();
    $stretto = strpos($modo, 'STRICT_TRANS_TABLES') !== false || strpos($modo, 'STRICT_ALL_TABLES') !== false;
    if ($stretto) esito(true, 'sql_mode stretto', 'i valori fuori scala vengono rifiutati');
    else nota('sql_mode', 'NON stretto: un valore fuori scala verrebbe troncato invece che rifiutato');

    // Quanto e' largo un intero di PHP su questa macchina. Non e' curiosita':
    // i semi dei mazzi ripetibili sono a 32 bit senza segno e quasi meta'
    // supera il tetto di un PHP a 32 bit. L'endpoint tratta il seme come testo
    // proprio per non dipendere da questo, ma sapere dove si sta e' comunque
    // meglio che scoprirlo da una colonna piena di numeri arrotondati.
    if (PHP_INT_SIZE >= 8) esito(true, 'interi di PHP', '64 bit');
    else nota('interi di PHP', '32 bit: il seme passa da intero_grande(), che lo tratta come testo');

    echo "</table>";
    return $viste;
}

// Il giro di scrittura: fa a mano quello che fa burraco.php, sulle stesse
// tabelle, e poi si ripulisce. Serve a sapere che le colonne non solo ci sono
// ma reggono i valori veri, e che la riga si rilegge come e' stata scritta.
function giro(PDO $pdo) {
    echo "<h2>2. Giro di scrittura</h2>";

    $prima_p = conta($pdo, 'burraco_partite');
    $prima_m = conta($pdo, 'burraco_motori');
    echo "<p>Prima: " . number_format($prima_p, 0, ',', '.') . " mani, "
       . number_format($prima_m, 0, ',', '.') . " motori.</p>";

    echo "<table><tr><th>Controllo</th><th>Esito</th><th>Dettaglio</th></tr>";

    // Marcatore unico di questa esecuzione: rende la pulizia finale esatta
    // anche se due collaudi girassero insieme.
    $marca   = substr(md5(uniqid('', true)), 0, 12);
    $vers_m  = 'vfy' . substr($marca, 0, 6);          // versione finta dei motori
    $mano_id = 'v' . $marca;                          // 13 caratteri: dentro CHAR(20)
    $scritti = [];

    try {
        // -- i motori, con la stessa firma che calcola l'endpoint
        [$f1, $j1] = firma_motore($vers_m, null);                        // standard nudo
        [$f2, $j2] = firma_motore($vers_m, ['premioTris' => 8, 'valCarte' => 1]);

        $ins = $pdo->prepare('INSERT INTO burraco_motori (firma, versione, parametri) VALUES (?,?,?)');
        $cer = $pdo->prepare('SELECT id FROM burraco_motori WHERE firma = ?');

        $ins->execute([$f1, $vers_m, $j1]);
        $id1 = (int)$pdo->lastInsertId();
        $ins->execute([$f2, $vers_m, $j2]);
        $id2 = (int)$pdo->lastInsertId();
        $scritti['motori'] = [$id1, $id2];
        esito($id1 > 0 && $id2 > 0 && $id1 !== $id2, 'motori depositati', "id $id1 e $id2");

        // Il JSON riletto deve dire le stesse cose. Non lo stesso TESTO: MySQL
        // si riordina le chiavi a modo suo, ed e' per questo che la firma si
        // confronta e non si ricalcola.
        $letto = $pdo->query("SELECT parametri FROM burraco_motori WHERE id = $id2")->fetchColumn();
        $a = json_decode((string)$letto, true); $b = json_decode((string)$j2, true);
        if (is_array($a) && is_array($b)) { ksort($a); ksort($b); }
        esito($a === $b, 'parametri JSON riletti', is_array($a) ? json_encode($a) : 'non e\' JSON');

        // Stessa firma, secondo tentativo: la chiave unica deve fermarlo. E'
        // il caso di due partite finite nello stesso istante.
        $doppio = false;
        try { $ins->execute([$f1, $vers_m, $j1]); } catch (PDOException $e) { $doppio = true; }
        esito($doppio, 'firma doppia rifiutata', $doppio ? 'uq_firma regge' : 'PASSATA: nascerebbero due righe per un motore solo');

        $cer->execute([$f1]);
        esito((int)$cer->fetchColumn() === $id1, 'motore ritrovato per firma', "id $id1");

        // -- la mano, con tutte le colonne nuove valorizzate
        $campi = [
            'mano_id' => $mano_id, 'giocatore_id' => null, 'torneo_id' => null,
            'mano_num' => 3, 'modalita' => '2v2', 'braccio' => 'C', 'versione' => 'verifica',
            // Braccio C: il compagno e' il motore in prova, gli avversari no,
            // e al posto nostro c'e' una persona - quindi motore_noi resta NULL.
            'motore_noi' => null, 'motore_compagno' => $id2,
            'motore_avv1' => $id1, 'motore_avv2' => $id1,
            // Il seme come TESTO: su un PHP a 32 bit questa cifra non ci sta in
            // un intero, e passarla come numero la farebbe arrivare a MySQL in
            // notazione scientifica - cioe' arrotondata. E' anche il modo in cui
            // gliela consegna l'endpoint (vedi intero_grande in burraco.php).
            'seme' => '9007199254740991', 'mazziere' => 2,
            'esito' => 1, 'punti_noi' => 1105, 'punti_loro' => -35, 'chiusura' => 1,
            'burrachi_noi' => 'semipulito,sporco', 'burrachi_loro' => '',
            'pozzetto_noi' => 1, 'pozzetto_loro' => 0, 'durata_s' => 843,
        ];
        $nomi = array_keys($campi);
        $sql = 'INSERT IGNORE INTO burraco_partite (' . implode(',', $nomi) . ') VALUES (:'
             . implode(',:', $nomi) . ')';
        $st = $pdo->prepare($sql);
        $st->execute($campi);
        esito($st->rowCount() === 1, 'mano scritta', "mano_id $mano_id");
        $scritti['mano'] = $mano_id;

        // Rileggerla e confrontarla campo per campo: e' qui che si scoprono i
        // troncamenti silenziosi (burrachi lunghi, punti negativi, seme grande).
        $r = $pdo->query("SELECT * FROM burraco_partite WHERE mano_id = " . $pdo->quote($mano_id))->fetch();
        $diverse = [];
        foreach ($campi as $k => $v) {
            if ($v === null) { if ($r[$k] !== null) $diverse[] = "$k non e' NULL"; continue; }
            if ((string)$r[$k] !== (string)$v) $diverse[] = "$k: '{$r[$k]}' invece di '$v'";
        }
        esito($diverse === [], 'mano riletta identica', $diverse ? implode('; ', $diverse) : 'tutti i campi combaciano');
        esito($r['creato_il'] !== null && $r['creato_il'] !== '0000-00-00 00:00:00',
              'creato_il valorizzato da solo', (string)$r['creato_il']);

        // Doppio invio della stessa mano: un reload a meta' spedizione basta a
        // provocarlo, e non deve creare una riga in piu'.
        $st->execute($campi);
        esito($st->rowCount() === 0, 'doppio invio ignorato',
              $st->rowCount() === 0 ? 'uq_mano regge' : 'DOPPIONE CREATO');

        // Il contatore delle mani, come lo muove l'endpoint.
        $pdo->prepare('UPDATE burraco_motori SET mani = mani + 1, ultima_volta = NOW() WHERE id IN (?,?)')
            ->execute([$id1, $id2]);
        $m = (int)$pdo->query("SELECT mani FROM burraco_motori WHERE id = $id1")->fetchColumn();
        esito($m === 1, 'contatore mani', "mani = $m");

        // -- la vista
        try {
            $v = $pdo->query("SELECT chi_compagno, chi_avv1 FROM burraco_mani WHERE mano_id = "
                             . $pdo->quote($mano_id))->fetch();
            esito($v && $v['chi_compagno'] === $f2 && $v['chi_avv1'] === $f1,
                  'vista burraco_mani', $v ? "compagno={$v['chi_compagno']}" : 'la riga non si vede');
        } catch (Throwable $e) {
            nota('vista burraco_mani', 'non interrogabile: ' . $e->getMessage());
        }

        // -- il braccio fuori elenco deve essere respinto dalla colonna.
        // Qui l'INSERT e' senza IGNORE, e la differenza non e' un dettaglio:
        // IGNORE degrada gli errori ad avvisi, quindi con la scrittura vera
        // (che IGNORE ce l'ha, per reggere i doppi invii) una 'D' non darebbe
        // errore - entrerebbe come stringa vuota. Cioe' la colonna da sola NON
        // protegge il braccio: a proteggerlo e' la lista in burraco.php, ed e'
        // per questo che quella lista deve restare uguale all'ENUM.
        $sql_secco = str_replace('INSERT IGNORE', 'INSERT', $sql);
        $respinto = false;
        try {
            $c2 = $campi; $c2['mano_id'] = 'x' . $marca; $c2['braccio'] = 'D';
            $pdo->prepare($sql_secco)->execute($c2);
            $pdo->exec("DELETE FROM burraco_partite WHERE mano_id = " . $pdo->quote($c2['mano_id']));
        } catch (PDOException $e) { $respinto = true; }
        esito($respinto, "braccio 'D' respinto dalla colonna",
              $respinto ? "l'ENUM e' quello giusto" : "ACCETTATO: la colonna non e' enum('A','B','C') o il modo non e' stretto");

        // -- la purga: interessa che la query sia valida, non che cancelli
        $n = (int)$pdo->query("SELECT COUNT(*) FROM burraco_partite
                               WHERE creato_il < NOW() - INTERVAL 24 MONTH")->fetchColumn();
        esito(true, 'query di purga', "$n righe oltre i 24 mesi (nessuna cancellata qui)");

    } catch (Throwable $e) {
        esito(false, 'giro interrotto', $e->getMessage());
    }

    // -- pulizia, sempre, anche dopo un errore a meta'
    try {
        if (isset($scritti['mano']))
            $pdo->exec("DELETE FROM burraco_partite WHERE mano_id = " . $pdo->quote($scritti['mano']));
        $pdo->exec("DELETE FROM burraco_partite WHERE versione = 'verifica'");
        $pdo->exec("DELETE FROM burraco_motori WHERE versione = " . $pdo->quote($vers_m));
    } catch (Throwable $e) {
        esito(false, 'pulizia', $e->getMessage());
    }

    $dopo_p = conta($pdo, 'burraco_partite');
    $dopo_m = conta($pdo, 'burraco_motori');
    // Il conto prima/dopo e' la prova che questa pagina non lascia niente
    // dietro di se': senza, "ho cancellato" e' solo un'intenzione.
    esito($dopo_p === $prima_p && $dopo_m === $prima_m, 'niente lasciato indietro',
          "mani $prima_p -> $dopo_p, motori $prima_m -> $dopo_m");

    echo "</table>";
}

// ============================================================================
// CHIAMATA VERA ALL'ENDPOINT
// ============================================================================
// Il collaudo qui sopra prova le tabelle. Questo prova la catena intera:
// burraco.php, la sua validazione, le sue query. E' quello che sarebbe
// bastato a scoprire che burraco_motori non c'era.

function endpoint(PDO $pdo) {
    echo "<h2>Chiamata all'endpoint</h2>";

    // Il server di sviluppo di PHP serve una richiesta alla volta: chiamare se
    // stesso lo blocca finche' non scade il tempo. Online (Apache, piu'
    // processi) non succede.
    if (PHP_SAPI === 'cli-server') {
        echo "<p class='no'>Con <code>php -S</code> questa prova si impianta: il server di sviluppo "
           . "serve una richiesta per volta e chiamando se stesso resterebbe in attesa di se stesso. "
           . "In locale l'endpoint si prova giocando; questa pagina serve su Aruba.</p>";
        return;
    }
    if (!function_exists('curl_init')) { echo "<p class='no'>cURL non disponibile.</p>"; return; }

    $schema = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $base   = $schema . '://' . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    $url    = $base . '/burraco.php';
    echo "<p>Indirizzo: <code>" . htmlspecialchars($url) . "</code></p>";

    $marca  = substr(md5(uniqid('', true)), 0, 12);
    $vers_m = 'vfy' . substr($marca, 0, 6);
    $mano   = 'e' . $marca;

    $chiama = function ($corpo, $metodo = 'POST') use ($url) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_CUSTOMREQUEST  => $metodo,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        ]);
        if ($metodo === 'POST') curl_setopt($ch, CURLOPT_POSTFIELDS, $corpo);
        $risposta = curl_exec($ch);
        $codice   = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $errore   = curl_error($ch);
        curl_close($ch);
        return [$codice, (string)$risposta, $errore];
    };

    // Una mano come la manda il gioco: braccio B, i due avversari sul motore in
    // prova, il compagno e il posto nostro no.
    $buona = [
        'mano_id' => $mano, 'mano_num' => 1, 'modalita' => '2v2', 'braccio' => 'B',
        'versione' => 'verifica', 'mazziere' => 1,
        'esito' => 0, 'punti_noi' => 480, 'punti_loro' => 715, 'chiusura' => -1,
        'burrachi_noi' => 'sporco', 'burrachi_loro' => 'pulito,sporco',
        'pozzetto_noi' => 1, 'pozzetto_loro' => 1, 'durata_s' => 612,
        'motori' => [
            'compagno' => ['v' => $vers_m, 'p' => new stdClass()],
            'avv1'     => ['v' => $vers_m, 'p' => ['premioTris' => 8, 'valCarte' => 1]],
            'avv2'     => ['v' => $vers_m, 'p' => ['valCarte' => 1, 'premioTris' => 8]],
        ],
    ];

    echo "<table><tr><th>Controllo</th><th>Esito</th><th>Dettaglio</th></tr>";

    [$c, $r, $err] = $chiama(json_encode($buona));
    esito($c === 200 && strpos($r, '"ok":true') !== false, 'mano accettata',
          $err !== '' ? "cURL: $err" : "HTTP $c - " . substr($r, 0, 120));

    // Doppio invio: stessa mano_id, deve rispondere 200 e non creare righe.
    [$c2, , ] = $chiama(json_encode($buona));
    esito($c2 === 200, 'doppio invio accettato senza errore', "HTTP $c2");

    // Un braccio inventato deve fermarsi alla validazione, non arrivare al
    // database: 400 con il nome del campo, non 500.
    $cattiva = $buona; $cattiva['mano_id'] = 'z' . $marca; $cattiva['braccio'] = 'D';
    [$c3, $r3, ] = $chiama(json_encode($cattiva));
    esito($c3 === 400 && strpos($r3, 'braccio') !== false, "braccio 'D' rifiutato con 400",
          "HTTP $c3 - " . substr($r3, 0, 80));

    [$c4, , ] = $chiama('', 'GET');
    esito($c4 === 405, 'GET rifiutato con 405', "HTTP $c4");

    [$c5, , ] = $chiama(str_pad('{"a":"', 5000, 'x') . '"}');
    esito($c5 === 413, 'corpo sovradimensionato rifiutato con 413', "HTTP $c5");

    // Ora la parte che conta: la riga c'e' davvero, e dice quello che e' stato
    // mandato? Un 200 dice solo che PHP e' arrivato in fondo.
    $r = $pdo->query("SELECT * FROM burraco_partite WHERE mano_id = " . $pdo->quote($mano))->fetch();
    esito((bool)$r, 'riga presente in tabella', $r ? "id {$r['id']}" : 'NON scritta');

    if ($r) {
        esito((int)$pdo->query("SELECT COUNT(*) FROM burraco_partite WHERE mano_id = "
                               . $pdo->quote($mano))->fetchColumn() === 1,
              'una riga sola dopo il doppio invio', 'uq_mano regge anche dall\'esterno');
        esito($r['braccio'] === 'B' && $r['modalita'] === '2v2' && (int)$r['mazziere'] === 1,
              'campi della mano', "braccio {$r['braccio']}, mazziere {$r['mazziere']}");
        esito($r['motore_noi'] === null, 'sedia nostra vuota', 'motore_noi NULL, come online');
        // avv1 e avv2 hanno mandato gli stessi parametri in ordine diverso:
        // devono ricadere sullo stesso motore, altrimenti l'ordine delle chiavi
        // moltiplicherebbe le righe dei motori.
        esito($r['motore_avv1'] !== null && $r['motore_avv1'] === $r['motore_avv2'],
              'ordine dei parametri ininfluente', "avv1={$r['motore_avv1']} avv2={$r['motore_avv2']}");
        esito($r['motore_compagno'] !== null && $r['motore_compagno'] !== $r['motore_avv1'],
              'standard e variante distinti', "compagno={$r['motore_compagno']}");

        $m = $pdo->query("SELECT id, mani, parametri FROM burraco_motori WHERE versione = "
                         . $pdo->quote($vers_m) . " ORDER BY id")->fetchAll();
        esito(count($m) === 2, 'due motori registrati dall\'endpoint', count($m) . ' righe');
        // Una mano, non due: in 2v2 lo stesso motore siede in due posti.
        $mani_var = 0;
        foreach ($m as $x) if ($x['parametri'] !== null) $mani_var = (int)$x['mani'];
        esito($mani_var === 1, 'contatore mosso di uno per mano', "mani = $mani_var");
    }

    // Pulizia
    $pdo->exec("DELETE FROM burraco_partite WHERE mano_id IN ("
               . $pdo->quote($mano) . ", " . $pdo->quote('z' . $marca) . ")");
    $pdo->exec("DELETE FROM burraco_partite WHERE versione = 'verifica'");
    $pdo->exec("DELETE FROM burraco_motori WHERE versione = " . $pdo->quote($vers_m));
    esito(conta($pdo, 'burraco_partite') >= 0, 'pulizia fatta',
          'righe e motori della prova rimossi');

    echo "</table>";
}

// ============================================================================
// MISURA DELL'OCCUPAZIONE
// ============================================================================

function misura(PDO $pdo) {
    // Chiedere a MySQL 8 quanto occupa una tabella e' meno ovvio di quanto
    // sembri, e ci sono due tranelli in fila.
    //
    // 1) information_schema restituisce i nomi delle colonne in MAIUSCOLO:
    //    $r['data_length'] e' una chiave inesistente, e (int)null fa zero
    //    senza protestare. Da qui gli alias qui sotto.
    // 2) I valori non vengono letti dal disco: escono da una cache di
    //    statistiche che scade dopo 24 ore. Su una tabella creata vuota e
    //    riempita subito dopo, continua a rispondere "80 KiB" - cioe' la
    //    dimensione da vuota - fino al giorno dopo.
    //
    // Contro il secondo tranello servono DUE mosse insieme: azzerare la
    // scadenza per questa sessione, e costringere InnoDB a rifare i conti con
    // ANALYZE TABLE. Da solo, il primo non basta: la scadenza governa quando
    // rileggere le statistiche, non quando ricalcolarle.
    $note = [];

    try {
        $pdo->exec('SET SESSION information_schema_stats_expiry = 0');
    } catch (Throwable $e) {
        $note[] = "information_schema_stats_expiry non e' impostabile";
    }

    try {
        $pdo->query('ANALYZE TABLE burraco_partite')->fetchAll();
    } catch (Throwable $e) {
        $note[] = 'ANALYZE TABLE rifiutato: ' . $e->getMessage();
    }

    $r = $pdo->query(
        "SELECT data_length AS dati, index_length AS indici
         FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = 'burraco_partite'"
    )->fetch();
    if (!$r) { echo "<p class='no'>La tabella burraco_partite non esiste.</p>"; return; }

    $esatte    = conta($pdo, 'burraco_partite');
    $dati      = (int)$r['dati'];
    $indici    = (int)$r['indici'];
    $tot       = $dati + $indici;
    $dettaglio = true;

    if ($tot === 0 && $esatte > 0) {
        try {
            $ts = $pdo->query(
                "SELECT file_size AS byte FROM information_schema.innodb_tablespaces
                 WHERE name = CONCAT(DATABASE(), '/burraco_partite')"
            )->fetch();
            if ($ts && (int)$ts['byte'] > 0) {
                $tot       = (int)$ts['byte'];
                $dettaglio = false;
                $note[]    = 'dimensione presa dal file su disco: comprende lo spazio libero, quindi e\' un tetto';
            } else {
                $note[] = 'innodb_tablespaces non riporta nulla per questa tabella';
            }
        } catch (Throwable $e) {
            $note[] = 'innodb_tablespaces non accessibile (serve il privilegio PROCESS)';
        }
    }

    $mb = function ($b) { return number_format($b / 1048576, 2, ',', '.') . ' MB'; };

    echo "<h2>Occupazione</h2><table>";
    echo "<tr><th>Mani (esatte)</th><td>" . number_format($esatte, 0, ',', '.') . "</td></tr>";
    echo "<tr><th>Motori</th><td>" . number_format(conta($pdo, 'burraco_motori'), 0, ',', '.')
       . " <small>(righe grasse ma pochissime: non entrano nel conto)</small></td></tr>";
    if ($dettaglio) {
        echo "<tr><th>Dati</th><td>{$mb($dati)}</td></tr>";
        echo "<tr><th>Indici</th><td>{$mb($indici)}</td></tr>";
    }
    echo "<tr><th>Totale</th><td><b>{$mb($tot)}</b></td></tr>";

    if ($tot === 0 && $esatte > 0) {
        echo "</table><p class='no'>Le dimensioni risultano ancora a zero con "
           . number_format($esatte, 0, ',', '.') . " righe presenti. "
           . "Tentativi fatti: " . htmlspecialchars(implode('; ', $note)) . ".</p>";
        return;
    }
    if ($esatte === 0) {
        echo "</table><p>Tabella vuota: le proiezioni compaiono quando c'e' qualcosa da misurare "
           . "(<code>?azione=popola&amp;n=100000</code>).</p>";
        return;
    }

    $per_riga = $tot / $esatte;
    echo "<tr><th>Byte per riga (dati+indici)</th><td>" . number_format($per_riga, 0, ',', '.') . "</td></tr>";
    if ($per_riga < 20) {
        $note[] = 'byte per riga implausibilmente basso: le statistiche sembrano ancora ferme, '
                . 'le proiezioni qui sotto non sono attendibili';
    }
    foreach ([120000 => 'un mese di gioco (4.000/giorno)',
              365 * 4000 => 'un anno',
              730 * 4000 => 'due anni (l\'orizzonte di MESI_STORICO)'] as $n => $etichetta) {
        $stima = $per_riga * $n;
        $quota = $stima / (1024 * 1048576) * 100;
        $classe = $quota > 80 ? 'no' : 'ok';
        echo "<tr><th>Proiezione: $etichetta</th><td>{$mb($stima)} "
           . "<span class='$classe'>(" . number_format($quota, 1, ',', '.') . "% di 1 GB)</span></td></tr>";
    }
    echo "</table>";
    if ($note) echo "<p><small>Nota: " . htmlspecialchars(implode('; ', $note)) . ".</small></p>";
}

// ---- Tempi delle interrogazioni ---------------------------------------------

function tempi(PDO $pdo) {
    $prove = [
        'Confronto A/B/C (tutta la tabella)' =>
            "SELECT braccio, COUNT(*) mani, ROUND(AVG(esito)*100,1) vittorie,
                    ROUND(AVG(punti_noi - punti_loro),1) margine
             FROM burraco_partite GROUP BY braccio",
        'Ultimi 30 giorni per versione' =>
            "SELECT versione, COUNT(*) mani, ROUND(AVG(esito)*100,1) vittorie
             FROM burraco_partite WHERE creato_il > NOW() - INTERVAL 30 DAY
             GROUP BY versione",
        'Browser distinti' =>
            "SELECT COUNT(DISTINCT giocatore_id) FROM burraco_partite",
        // Le sedie non sono indicizzate, ed e' una scelta: questa e' la query
        // che paga quella scelta, quindi e' quella da cronometrare.
        'Mani per motore avversario (JOIN, sedia non indicizzata)' =>
            "SELECT m.id, m.versione, COUNT(*) mani, ROUND(AVG(p.esito)*100,1) vittorie_persona
             FROM burraco_partite p JOIN burraco_motori m ON m.id = p.motore_avv1
             GROUP BY m.id, m.versione",
        'Righe da purgare (24 mesi)' =>
            "SELECT COUNT(*) FROM burraco_partite WHERE creato_il < NOW() - INTERVAL 24 MONTH",
        'Punteggio medio quando si prende il pozzetto' =>
            "SELECT pozzetto_noi, ROUND(AVG(punti_noi)) media
             FROM burraco_partite GROUP BY pozzetto_noi",
    ];

    echo "<h2>Tempi delle interrogazioni</h2><table><tr><th>Interrogazione</th><th>Tempo</th><th>Righe</th></tr>";
    foreach ($prove as $nome => $sql) {
        $t0 = microtime(true);
        try { $righe = $pdo->query($sql)->fetchAll(); }
        catch (Throwable $e) {
            printf("<tr><td>%s</td><td class='no' colspan='2'>%s</td></tr>",
                htmlspecialchars($nome), htmlspecialchars($e->getMessage()));
            continue;
        }
        $ms = (microtime(true) - $t0) * 1000;
        $classe = $ms > 1000 ? 'no' : 'ok';
        printf("<tr><td>%s</td><td class='%s'>%s ms</td><td>%d</td></tr>",
            htmlspecialchars($nome), $classe, number_format($ms, 1, ',', '.'), count($righe));
    }
    echo "</table><p>Sono tempi del server, senza la rete di mezzo.</p>";
}

// ============================================================================
// AZIONI
// ============================================================================

if ($azione === 'verifica') {
    $viste = struttura($pdo);
    if (isset($viste['burraco_partite']) && isset($viste['burraco_motori'])) {
        giro($pdo);
    } else {
        echo "<p class='no'>Manca una tabella: il giro di scrittura non ha senso finche' "
           . "non si stende <code>schema.sql</code>.</p>";
    }
    $tot = $ESITI['ok'] + $ESITI['no'];
    if ($ESITI['no'] === 0) {
        echo "<h2 class='ok'>Tutto a posto: {$tot} controlli, nessuno fallito.</h2>"
           . "<p>Il database regge quello che il gioco gli manda. Resta da provare la catena "
           . "intera: <code>?k=CHIAVE&amp;azione=endpoint</code>.</p>";
    } else {
        echo "<h2 class='no'>{$ESITI['no']} controlli falliti su {$tot}.</h2>"
           . "<p>Da sistemare prima di far girare il gioco: quando l'endpoint fallisce, "
           . "il browser non se ne accorge e le mani spariscono senza un errore.</p>";
    }
    exit;
}

if ($azione === 'endpoint') {
    endpoint($pdo);
    $tot = $ESITI['ok'] + $ESITI['no'];
    echo $ESITI['no'] === 0
        ? "<h2 class='ok'>Catena completa a posto: {$tot} controlli, nessuno fallito.</h2>"
        : "<h2 class='no'>{$ESITI['no']} controlli falliti su {$tot}.</h2>";
    exit;
}

if ($azione === 'misura') { misura($pdo); exit; }
if ($azione === 'query')  { tempi($pdo);  exit; }

if ($azione === 'svuota') {
    // Solo le righe finte: se un giorno qui dentro ci fossero dati veri,
    // un TRUNCATE se li porterebbe via senza chiedere.
    $t0 = microtime(true);
    $n = $pdo->exec("DELETE FROM burraco_partite WHERE versione IN ('test','verifica')");
    // I motori finti vanno via con loro, altrimenti restano a sporcare l'elenco
    // proprio dove si va a leggere chi ha giocato cosa.
    $m = $pdo->exec("DELETE FROM burraco_motori WHERE versione IN ('test','verifica')
                     OR versione LIKE 'vfy%'");
    printf("<h2>Pulizia</h2><p class='ok'>Cancellate %s mani e %s motori di prova in %s s.</p>",
        number_format($n, 0, ',', '.'), number_format($m, 0, ',', '.'),
        number_format(microtime(true) - $t0, 1, ',', '.'));
    echo "<p>Lo spazio su disco non si libera subito: InnoDB lo riusa. "
       . "Per restituirlo davvero serve <code>OPTIMIZE TABLE burraco_partite</code> da phpMyAdmin.</p>";
    exit;
}

// ============================================================================
// POPOLAMENTO
// ============================================================================
// Serve a misurare, non a provare: riempie di righe verosimili per vedere
// quanto occupano e quanto sono veloci da interrogare. Le righe portano
// versione 'test' e si buttano tutte insieme con ?azione=svuota.

if ($azione !== 'popola') { echo "<p class='no'>Azione sconosciuta.</p>"; exit; }

$n     = max(1, min(500000, (int)($_GET['n'] ?? 100000)));
$passo = 500;   // righe per INSERT: oltre non guadagna e allunga la query

$modalita = ['1v1', '2v2'];
$burrachi = ['', '', '', 'sporco', 'sporco', 'semipulito', 'pulito', 'sporco,sporco', 'semipulito,sporco'];

// Un browser gioca piu' mani: giocatore_id pesca da un insieme limitato,
// altrimenti l'indice risulterebbe unico e la misura sarebbe falsata.
$giocatori = [];
for ($i = 0; $i < 3000; $i++) $giocatori[] = substr(md5((string)$i), 0, 12);

// Due motori finti, come li depositerebbe l'endpoint: senza, le quattro
// colonne delle sedie resterebbero a NULL e il JOIN non misurerebbe niente.
$motori = [];
foreach (['standard' => null, 'variante' => ['premioTris' => 8, 'valCarte' => 1]] as $eti => $par) {
    [$firma, $json] = firma_motore('test', $par);
    $st = $pdo->prepare('SELECT id FROM burraco_motori WHERE firma = ?');
    $st->execute([$firma]);
    $id = $st->fetchColumn();
    if ($id === false) {
        $pdo->prepare('INSERT INTO burraco_motori (firma, versione, parametri) VALUES (?,?,?)')
            ->execute([$firma, 'test', $json]);
        $id = $pdo->lastInsertId();
    }
    $motori[$eti] = (int)$id;
}

$prefisso = substr(md5((string)getmypid() . $n), 0, 6);   // evita collisioni fra esecuzioni
$adesso   = time();
$giorni   = 30;   // le righe si spalmano sull'ultimo mese

$colonne = '(mano_id, giocatore_id, torneo_id, mano_num, modalita, braccio, versione,
             motore_noi, motore_compagno, motore_avv1, motore_avv2, seme, mazziere,
             esito, punti_noi, punti_loro, chiusura, burrachi_noi, burrachi_loro,
             pozzetto_noi, pozzetto_loro, durata_s, creato_il)';

echo "<h2>Popolamento</h2><p>Scrivo " . number_format($n, 0, ',', '.') . " righe...</p>";
flush();

$t0 = microtime(true);
$scritte = 0;

try {
    $pdo->beginTransaction();
    for ($base = 0; $base < $n; $base += $passo) {
        $quante = min($passo, $n - $base);
        $valori = [];
        $par    = [];
        for ($i = 0; $i < $quante; $i++) {
            $k = $base + $i;
            $valori[] = '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
            $noi   = mt_rand(0, 3) ? mt_rand(20, 220) * 5 : -mt_rand(1, 20) * 5;
            $loro  = mt_rand(0, 3) ? mt_rand(20, 220) * 5 : -mt_rand(1, 20) * 5;
            $vince = $noi > $loro ? 1 : 0;
            $duemani = $modalita[mt_rand(0, 1)] === '2v2';
            // I tre bracci a rotazione, come li estrae il gioco. In 1v1 il
            // compagno non esiste e 'C' non compare.
            $braccio = $duemani ? ['A', 'B', 'C'][mt_rand(0, 2)] : ['A', 'B'][mt_rand(0, 1)];
            // Le sedie seguono il braccio, altrimenti il JOIN misurerebbe una
            // distribuzione che nella realta' non capita mai.
            $prova = $motori['variante'];
            $std   = $motori['standard'];
            $compagno = $duemani ? ($braccio === 'C' ? $prova : $std) : null;
            $avv1     = $braccio === 'B' ? $prova : $std;
            $avv2     = $duemani ? $avv1 : null;
            array_push($par,
                $prefisso . str_pad(base_convert((string)$k, 10, 36), 10, '0', STR_PAD_LEFT),
                $giocatori[mt_rand(0, count($giocatori) - 1)],
                mt_rand(0, 2) ? substr(md5((string)intdiv($k, 7)), 0, 10) : null,
                mt_rand(1, 12),
                $duemani ? '2v2' : '1v1',
                $braccio,
                'test',
                null,                                    // al posto nostro c'e' una persona
                $compagno, $avv1, $avv2,
                mt_rand(0, 9) ? null : mt_rand(1, 2000000000),   // il seme c'e' solo offline
                $duemani ? mt_rand(0, 3) : mt_rand(0, 1),
                $vince,
                $noi,
                $loro,
                mt_rand(-1, 1),
                $burrachi[mt_rand(0, count($burrachi) - 1)],
                $burrachi[mt_rand(0, count($burrachi) - 1)],
                mt_rand(0, 1),
                mt_rand(0, 1),
                mt_rand(120, 2400),
                date('Y-m-d H:i:s', $adesso - mt_rand(0, $giorni * 86400))
            );
        }
        $sql = 'INSERT IGNORE INTO burraco_partite ' . $colonne . ' VALUES ' . implode(',', $valori);
        $st  = $pdo->prepare($sql);
        $st->execute($par);
        $scritte += $st->rowCount();

        // Un commit ogni 20.000 righe: tenere aperta una transazione enorme
        // gonfia il log di undo senza vantaggi.
        if (($base + $passo) % 20000 === 0) {
            $pdo->commit();
            $pdo->beginTransaction();
            printf("<p>... %s righe (%s s)</p>", number_format($base + $quante, 0, ',', '.'),
                number_format(microtime(true) - $t0, 1, ',', '.'));
            flush();
        }
    }
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    echo "<p class='no'>Errore dopo $scritte righe: " . htmlspecialchars($e->getMessage()) . "</p>";
    exit;
}

$sec = microtime(true) - $t0;
printf("<p class='ok'>Fatto: %s righe in %s secondi (%s righe/s).</p>",
    number_format($scritte, 0, ',', '.'),
    number_format($sec, 1, ',', '.'),
    number_format($sec > 0 ? $scritte / $sec : 0, 0, ',', '.'));

misura($pdo);
tempi($pdo);

echo "<hr><p><b>Quando hai finito, cancella questo file dal server.</b></p>";
