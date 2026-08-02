<?php
/*
 * Pubblica newdeals.json su lucianomanenti.com via FTP.
 *
 * Sequenza (la stessa che si farebbe a mano, ma senza passaggi dimenticati):
 *   1. valida il JSON locale;
 *   2. lo copia nella cartella OneDrive, come fa "Copia su lucianomanenti",
 *      cosi' la copia di lavoro resta allineata a quello che va online;
 *   3. lo carica in FTP su un nome temporaneo e solo a trasferimento
 *      riuscito lo rinomina: se la linea cade a meta' upload il sito
 *      continua a servire il file precedente, mai uno troncato.
 */

header('Content-Type: application/json');

// Le credenziali FTP non devono uscire da qui: l'endpoint gira solo in locale.
$is_local = (strpos(__DIR__, 'Local Sites') !== false)
         || (isset($_SERVER['SERVER_NAME']) && $_SERVER['SERVER_NAME'] === 'itinerari.local');

if (!$is_local) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Azione consentita solo in ambiente locale."]);
    exit();
}

require_once __DIR__ . '/config.php';

function fine($ok, $msg, $code = 200) {
    if (!$ok) http_response_code($code);
    echo json_encode(["status" => $ok ? "success" : "error", "message" => $msg]);
    exit();
}

$source_file  = __DIR__ . '/newdeals.json';
$onedrive_file = 'C:/Users/Luciano/OneDrive/backup Documents/websites/lucianomanenti.com/banner/newdeals.json';

if (!file_exists($source_file)) {
    fine(false, "File newdeals.json non trovato in locale.", 404);
}

if (empty($FTP_USER) || empty($FTP_PASS)) {
    fine(false, "Credenziali FTP mancanti: compila \$FTP_USER e \$FTP_PASS in config.php.", 500);
}

/* --- 1. Validazione ------------------------------------------------------
   Meglio accorgersi qui che il file e' rotto, piuttosto che pubblicare un
   JSON illeggibile e ritrovarsi il sito senza banner. */
$contenuto = file_get_contents($source_file);
$data = json_decode($contenuto, true);

if ($data === null || !isset($data['deals']) || !is_array($data['deals'])) {
    fine(false, "newdeals.json non e' valido o non contiene la lista 'deals': pubblicazione annullata.", 500);
}
if (count($data['deals']) === 0) {
    fine(false, "newdeals.json non contiene nessun banner: pubblicazione annullata per sicurezza.", 500);
}
$n_banner = count($data['deals']);

/* --- 2. Copia in OneDrive ------------------------------------------------ */
$dest_dir = dirname($onedrive_file);
if (!is_dir($dest_dir)) {
    @mkdir($dest_dir, 0777, true);
}
$copia_ok = @copy($source_file, $onedrive_file);

/* --- 3. Upload FTP ------------------------------------------------------- */
$conn = $FTP_SSL
      ? @ftp_ssl_connect($FTP_HOST, 21, 20)
      : @ftp_connect($FTP_HOST, 21, 20);

if (!$conn) {
    fine(false, "Impossibile connettersi a {$FTP_HOST}" .
                ($FTP_SSL ? " in FTPS (prova a impostare \$FTP_SSL = false in config.php)." : "."), 502);
}

if (!@ftp_login($conn, $FTP_USER, $FTP_PASS)) {
    ftp_close($conn);
    fine(false, "Login FTP rifiutato: controlla utente e password in config.php.", 502);
}

// Senza passiva la connessione dati resta appesa dietro a un router domestico.
if ($FTP_PASV) @ftp_pasv($conn, true);

if (!empty($FTP_DIR) && !@ftp_chdir($conn, $FTP_DIR)) {
    ftp_close($conn);
    fine(false, "Cartella remota '{$FTP_DIR}' non trovata sul server.", 502);
}

$remoto = 'newdeals.json';
$temp   = 'newdeals.json.upload';   // pubblicazione atomica: vedi commento in testa

if (!@ftp_put($conn, $temp, $source_file, FTP_BINARY)) {
    @ftp_delete($conn, $temp);
    ftp_close($conn);
    fine(false, "Trasferimento FTP fallito: il file online e' rimasto quello precedente.", 502);
}

// Molti server FTP rifiutano il rename se la destinazione esiste gia'.
@ftp_delete($conn, $remoto);

if (!@ftp_rename($conn, $temp, $remoto)) {
    @ftp_delete($conn, $temp);
    ftp_close($conn);
    fine(false, "File caricato ma rinomina fallita: newdeals.json online NON e' stato aggiornato.", 502);
}

$dim = @ftp_size($conn, $remoto);
ftp_close($conn);

$msg = "✅ Pubblicati {$n_banner} banner su lucianomanenti.com";
if ($dim > 0) $msg .= " (" . round($dim / 1024, 1) . " KB)";
$msg .= $copia_ok ? " e copiati in OneDrive." : ", ma la copia in OneDrive non e' riuscita.";

fine(true, $msg);
