<?php
header('Content-Type: application/json');

$onedrive_file = 'C:/Users/Luciano/OneDrive/backup Documents/websites/lucianomanenti.com/banner/newdeals.json';
$local_file = __DIR__ . '/newdeals.json';

if (!file_exists($onedrive_file)) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "File di backup lucianomanenti.com non trovato in OneDrive."]);
    exit();
}

$json_content = file_get_contents($onedrive_file);
$data = json_decode($json_content, true);

if (!$data || !isset($data['deals'])) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Formato dati non valido nel file di backup."]);
    exit();
}

// Scrittura atomica nel file locale
$temp_file = $local_file . '.tmp';
file_put_contents($temp_file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

if (@rename($temp_file, $local_file)) {
    echo json_encode([
        "status" => "success",
        "message" => "Ripristinati " . count($data['deals']) . " banner pubblicati da lucianomanenti.com con successo!",
        "count" => count($data['deals'])
    ]);
} else {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Impossibile aggiornare il file locale newdeals.json."]);
}
?>
