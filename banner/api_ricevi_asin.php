<?php
// Consenti richieste CORS dall'estensione Chrome
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (isset($data['asin'])) {
    $asin = $data['asin'];
    $message = isset($data['message']) ? $data['message'] : '';
    
    // Percorso assoluto alla cartella banner del tuo progetto
    $file_path = 'C:/Users/Luciano/OneDrive/backup Documents/websites/lucianomanenti.com/banner/miei_asin.json';
    
    $current_data = [];
    if (file_exists($file_path)) {
        $json_content = file_get_contents($file_path);
        $current_data = json_decode($json_content, true) ?: [];
    }
    
    // Aggiungi o sovrascrivi l'ASIN
    $current_data[$asin] = [
        "messaggio_custom" => $message,
        "data_aggiunta" => date('Y-m-d H:i:s')
    ];
    
    file_put_contents($file_path, json_encode($current_data, JSON_PRETTY_PRINT));
    
    echo json_encode(["status" => "success", "message" => "ASIN $asin salvato con successo."]);
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "ASIN mancante."]);
}
?>
