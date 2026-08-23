<?php
// ============================================================================
// PREPARA IL DATABASE DI PROVA IN CASA - SI USA DA RIGA DI COMANDO
// ============================================================================
// Crea `burraco_locale` nel MySQL di Local e ci stende dentro schema.sql.
// Da fare una volta sola, e ogni volta che lo schema cambia.
//
// USO
//   php prepara-locale.php              crea quel che manca, non tocca i dati
//   php prepara-locale.php --azzera     butta via il database e lo rifa'
//
// --azzera serve dopo un cambio di schema: i CREATE TABLE sono IF NOT EXISTS,
// quindi su una tabella che c'e' gia' non cambiano niente e le colonne nuove
// non comparirebbero mai.
//
// Il php.exe da riga di comando di Local non ha pdo_mysql attivo (quello del
// server web si': lo carica php.ini). Va acceso al volo:
//   & "<...>\php.exe" -d extension_dir="<...>\ext" -d extension=php_pdo_mysql.dll ...
// ============================================================================

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }

require_once __DIR__ . '/comune.php';

$azzera = in_array('--azzera', array_slice($argv, 1), true);

$cfg = stats_configurazione();
if ($cfg === null)          { fwrite(STDERR, "Nessuna configurazione trovata.\n"); exit(1); }
// Da riga di comando stats_siamo_in_casa() e' sempre vero, quindi la prima
// configurazione della fila e' quella locale. Se cosi' non fosse - file
// rinominato, cartella sbagliata - meglio fermarsi che creare tabelle su un
// server vero credendo di essere in casa.
if ($cfg['host'] !== '127.0.0.1' && $cfg['host'] !== 'localhost') {
    fwrite(STDERR, "La configurazione attiva punta a {$cfg['host']}, che non e' casa. Mi fermo.\n");
    exit(1);
}

$schema = __DIR__ . '/schema.sql';
if (!is_file($schema)) { fwrite(STDERR, "Manca schema.sql qui accanto.\n"); exit(1); }

$pdo = new PDO("mysql:host={$cfg['host']};port={$cfg['porta']};charset=utf8mb4",
    $cfg['user'], $cfg['pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);

if ($azzera) {
    $pdo->exec("DROP DATABASE IF EXISTS `{$cfg['db']}`");
    echo "Database {$cfg['db']} buttato via.\n";
}
$pdo->exec("CREATE DATABASE IF NOT EXISTS `{$cfg['db']}`
            DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci");
$pdo->exec("USE `{$cfg['db']}`");

$n = stats_applica_schema($pdo, $schema);
echo "Eseguiti $n comandi di schema.sql su {$cfg['db']} ({$cfg['host']}:{$cfg['porta']}).\n";

foreach ($pdo->query('SHOW FULL TABLES')->fetchAll(PDO::FETCH_NUM) as $r) {
    $quante = $pdo->query("SELECT COUNT(*) FROM `$r[0]`")->fetchColumn();
    printf("  %-18s %-12s %s righe\n", $r[0], strtolower($r[1]), number_format($quante));
}

echo "\nAdesso il gioco servito da itinerari.local scrive qui, senza altre modifiche:\n";
echo "burraco-stats.js chiama '/stats/burraco.php', che e' un percorso relativo.\n";
