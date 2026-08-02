<?php
// Consenti richieste CORS dall'estensione Chrome o da form locali
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (isset($data['product_id']) || isset($data['asin'])) {
    $pid = (string)(isset($data['product_id']) ? $data['product_id'] : $data['asin']);
    $message = isset($data['message']) ? $data['message'] : '';
    
    $file_path = __DIR__ . '/miei_product_ids_ali.json';
    
    $current_data = [];
    if (file_exists($file_path)) {
        $json_content = file_get_contents($file_path);
        $current_data = json_decode($json_content, true) ?: [];
    }
    
    $current_data[$pid] = [
        "messaggio_custom" => $message,
        "data_aggiunta" => date('Y-m-d H:i:s')
    ];
    
    file_put_contents($file_path, json_encode($current_data, JSON_PRETTY_PRINT));
    
    echo json_encode(["status" => "success", "message" => "Product ID AliExpress $pid salvato con successo."]);
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Product ID mancante."]);
}
?>
