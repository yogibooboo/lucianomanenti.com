<?php
// ============================================================================
// IMPORTAZIONE DEI CSV NEL MYSQL LOCALE - SI USA DA RIGA DI COMANDO
// ============================================================================
// Aruba non lascia entrare nessuno sulla porta 3306, quindi i dati arrivano
// sul PC per posta ordinaria: esporta.php produce un CSV, questo lo ricarica
// nel MySQL che Local tiene gia' acceso. Da li' in poi HeidiSQL (o qualunque
// altro client) interroga in locale, senza limiti e senza rischi.
//
// I file da portare a casa sono DUE - le mani e i motori - e vanno passati
// tutti e due, in un colpo solo o uno alla volta: quale tabella riempire lo
// capisce da se' guardando l'intestazione del CSV.
//
// USO
//   php importa-locale.php D:\Downloads\burraco_motori_*.csv D:\Downloads\burraco_partite_*.csv
//
// OPZIONI
//   --db=nome        database di destinazione (predefinito: burraco_stats)
//   --porta=10005    porta del MySQL di Local
//   --host= --user= --pass=
//   --aggiungi       non svuota le tabelle prima (predefinito: le sostituisce)
//
// Il php.exe di Local non ha pdo_mysql attivo: va acceso al volo.
//   & "<...>\php.exe" -d extension_dir="<...>\ext" -d extension=php_pdo_mysql.dll ...
// ============================================================================

// Questo file non ha niente da fare su un server web: se ci finisce, tace.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once __DIR__ . '/comune.php';

// Di serie riempie `burraco_stats`, che e' la copia dei dati VERI scaricati da
// Aruba. Le prove stanno in `burraco_locale` (vedi prepara-locale.php): sono
// due database diversi apposta, per non confondere una misura con una prova.
$opz = [
    'db' => 'burraco_stats', 'host' => '127.0.0.1', 'porta' => '10005',
    'user' => 'root', 'pass' => 'root', 'aggiungi' => false,
];
$file = [];
foreach (array_slice($argv, 1) as $a) {
    if ($a === '--aggiungi')                        { $opz['aggiungi'] = true; }
    elseif (preg_match('/^--(\w+)=(.*)$/', $a, $m)) { $opz[$m[1]] = $m[2]; }
    else                                            { $file[] = $a; }
}

if (!$file) { fwrite(STDERR, "Serve il percorso di almeno un CSV.\n"); exit(1); }
foreach ($file as $f) {
    if (!is_file($f)) { fwrite(STDERR, "Non trovo $f\n"); exit(1); }
}
$schema = __DIR__ . '/schema.sql';
if (!is_file($schema)) { fwrite(STDERR, "Manca schema.sql qui accanto.\n"); exit(1); }

// LOAD DATA LOCAL INFILE va abilitato sul client PRIMA di connettersi.
$pdo = new PDO(
    "mysql:host={$opz['host']};port={$opz['porta']};charset=utf8mb4",
    $opz['user'], $opz['pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
     PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
     PDO::MYSQL_ATTR_LOCAL_INFILE => true]
);

$pdo->exec("CREATE DATABASE IF NOT EXISTS `{$opz['db']}`
            DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
$pdo->exec("USE `{$opz['db']}`");
stats_applica_schema($pdo, $schema);

// Il server deve accettare i caricamenti dal client: in MySQL 8 e' spento di
// serie. In locale siamo root, quindi si accende; altrove si ripiega sotto.
try { $pdo->exec('SET GLOBAL local_infile = 1'); } catch (Throwable $e) { /* si vedra' */ }

foreach ($file as $csv) importa($pdo, $csv, $opz['aggiungi']);

printf("\nDatabase '%s' su %s:%s - puntaci HeidiSQL.\n", $opz['db'], $opz['host'], $opz['porta']);
printf("La vista `burraco_mani` mostra le mani con i nomi dei motori al posto dei numeri.\n");

// ---------------------------------------------------------------------------

// Quale tabella riempie questo CSV? Lo dice l'intestazione, non il nome del
// file: i nomi dei file cambiano a ogni scaricamento, le colonne no.
function riconosci(array $intestazione) {
    if (in_array('mano_id', $intestazione, true)) return 'burraco_partite';
    if (in_array('firma',   $intestazione, true)) return 'burraco_motori';
    return null;
}

function intestazione_di($csv) {
    $f = fopen($csv, 'r');
    $i = fgetcsv($f, 0, ';', '"', '');
    fclose($f);
    if (!$i) return [];
    // Il BOM si attacca al primo nome di colonna e lo rende irriconoscibile.
    $i[0] = preg_replace('/^\xEF\xBB\xBF/', '', $i[0]);
    return $i;
}

function importa(PDO $pdo, $csv, $aggiungi) {
    $intestazione = intestazione_di($csv);
    $tabella = riconosci($intestazione);
    if ($tabella === null) {
        fwrite(STDERR, "Non riconosco " . basename($csv) . ": l'intestazione non e' ne' quella delle mani ne' quella dei motori.\n");
        return;
    }

    // Quali colonne esistono davvero e quali ammettono NULL: la risposta arriva
    // dallo schema, non da un elenco scritto qui dentro che il giorno in cui si
    // aggiunge una colonna diventerebbe vecchio senza dare segno di vita.
    $ammette_null = [];
    foreach ($pdo->query("SHOW COLUMNS FROM `$tabella`")->fetchAll() as $c) {
        $ammette_null[$c['Field']] = ($c['Null'] === 'YES');
    }

    $ignote = array_diff($intestazione, array_keys($ammette_null));
    if ($ignote) {
        fwrite(STDERR, "In " . basename($csv) . " ci sono colonne che la tabella non ha: "
                     . implode(', ', $ignote) . ". Aggiorna schema.sql.\n");
        return;
    }
    $mancanti = array_diff(array_keys($ammette_null), $intestazione);
    if ($mancanti) {
        echo "Avviso: il CSV non porta ", implode(', ', $mancanti),
             " - resteranno al valore predefinito.\n";
    }

    if (!$aggiungi) {
        $pdo->exec("TRUNCATE TABLE `$tabella`");
        echo "Svuotata $tabella: il CSV e' un'esportazione completa, si sostituisce.\n";
    }

    echo "Importo ", basename($csv), " (", number_format(filesize($csv) / 1048576, 1),
         " MiB) in $tabella...\n";
    $t0 = microtime(true);

    // Le colonne che ammettono NULL passano da una variabile: nel CSV il NULL e'
    // diventato stringa vuota, e NULLIF lo rimette com'era. Le altre no, perche'
    // li' la stringa vuota e' un valore legittimo (burrachi_noi, nome, versione).
    $elenco = [];
    $set    = [];
    foreach ($intestazione as $col) {
        if ($ammette_null[$col]) {
            $elenco[] = "@$col";
            $set[]    = "`$col` = NULLIF(@$col, '')";
        } else {
            $elenco[] = "`$col`";
        }
    }

    // ESCAPED BY '' perche' il CSV arriva da fputcsv, che protegge le virgolette
    // raddoppiandole e non usa mai la barra rovescia. Senza questo, le barre
    // dentro il JSON dei motori verrebbero mangiate.
    $sql = "LOAD DATA LOCAL INFILE " . $pdo->quote(str_replace('\\', '/', $csv)) . "
            INTO TABLE `$tabella`
            CHARACTER SET utf8mb4
            FIELDS TERMINATED BY ';' ENCLOSED BY '\"' ESCAPED BY ''
            LINES TERMINATED BY '\\n'
            IGNORE 1 LINES
            (" . implode(', ', $elenco) . ")"
          . ($set ? "\n            SET " . implode(",\n                ", $set) : '');

    try {
        $caricate = $pdo->exec($sql);
    } catch (Throwable $e) {
        echo "LOAD DATA non disponibile (", $e->getMessage(), ")\n";
        echo "Ripiego sull'inserimento a blocchi: piu' lento ma non chiede permessi.\n";
        $caricate = a_blocchi($pdo, $csv, $tabella, $intestazione, $ammette_null);
    }

    $sec = microtime(true) - $t0;

    // Le statistiche di InnoDB restano ferme fino a 24 ore: senza questo,
    // HeidiSQL mostrerebbe una tabella grande zero. Vale anche in locale.
    $pdo->query("ANALYZE TABLE `$tabella`")->fetchAll();

    $righe = (int)$pdo->query("SELECT COUNT(*) FROM `$tabella`")->fetchColumn();
    printf("Fatte %s righe in %s s (%s righe/s). In tabella adesso: %s.\n\n",
        number_format((int)$caricate), number_format($sec, 1),
        number_format($sec > 0 ? $caricate / $sec : 0), number_format($righe));
}

function a_blocchi(PDO $pdo, $csv, $tabella, array $intestazione, array $ammette_null) {
    $f = fopen($csv, 'r');
    fgetcsv($f, 0, ';', '"', '');                       // l'intestazione l'abbiamo gia'

    $segnaposto = '(' . implode(',', array_fill(0, count($intestazione), '?')) . ')';
    $sql_base = "INSERT INTO `$tabella` (`" . implode('`,`', $intestazione) . '`) VALUES ';

    $n = 0; $valori = []; $par = [];
    $pdo->beginTransaction();
    while (($r = fgetcsv($f, 0, ';', '"', '')) !== false) {
        if (count($r) !== count($intestazione)) continue;
        $valori[] = $segnaposto;
        // Stesso trattamento del ramo veloce, colonna per colonna invece che a
        // posizioni fisse: vuoto vale NULL solo dove la colonna lo ammette.
        foreach ($intestazione as $i => $col) {
            $par[] = ($ammette_null[$col] && $r[$i] === '') ? null : $r[$i];
        }
        if (count($valori) >= 500) {
            $pdo->prepare($sql_base . implode(',', $valori))->execute($par);
            $n += count($valori); $valori = []; $par = [];
        }
    }
    if ($valori) {
        $pdo->prepare($sql_base . implode(',', $valori))->execute($par);
        $n += count($valori);
    }
    $pdo->commit();
    fclose($f);
    return $n;
}
