<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (isset($data['deals'])) {
    $file_path = __DIR__ . '/newdeals_aliexpress.json';
    
    $output = [
        "count" => count($data['deals']),
        "deals" => $data['deals']
    ];
    
    // Scrittura atomica per evitare che il frontend legga un file parziale
    $temp_file = $file_path . '.tmp';
    file_put_contents($temp_file, json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    
    // Tentativo di rename con retry su Windows
    $success = false;
    for ($i = 0; $i < 5; $i++) {
        if (@rename($temp_file, $file_path)) {
            $success = true;
            break;
        }
        usleep(100000); // 100ms
    }
    
    if ($success) {
        echo json_encode(["status" => "success", "message" => "Modifiche salvate con successo in newdeals_aliexpress.json."]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Impossibile aggiornare newdeals_aliexpress.json (file bloccato)."]);
    }
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Dati non validi o mancanti."]);
}
?>
