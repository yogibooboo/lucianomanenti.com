<?php
header('Content-Type: application/json');

$is_local = (strpos(__DIR__, 'Local Sites') !== false) || (isset($_SERVER['SERVER_NAME']) && $_SERVER['SERVER_NAME'] === 'itinerari.local');

if (!$is_local) {
    http_response_code(403);
    echo json_encode(["status" => "error", "message" => "Azione consentita solo in ambiente locale."]);
    exit();
}

$source_file = __DIR__ . '/newdeals.json';
$dest_file = 'C:/Users/Luciano/OneDrive/backup Documents/websites/lucianomanenti.com/banner/newdeals.json';

if (!file_exists($source_file)) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "File newdeals.json non trovato in locale."]);
    exit();
}

$dest_dir = dirname($dest_file);
if (!is_dir($dest_dir)) {
    @mkdir($dest_dir, 0777, true);
}

$success = copy($source_file, $dest_file);



if ($success) {
    echo json_encode(["status" => "success", "message" => "File unificato newdeals.json copiato con successo su lucianomanenti.com (OneDrive)!"]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Errore durante la copia del file."]);
}
?>
