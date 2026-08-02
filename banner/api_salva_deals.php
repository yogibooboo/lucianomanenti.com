<?php
header('Content-Type: application/json');

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (isset($data['deals'])) {
    $file_path = __DIR__ . '/newdeals.json';
    
    $output = [
        "count" => count($data['deals']),
        "deals" => $data['deals']
    ];
    
    $temp_file = $file_path . '.tmp';
    file_put_contents($temp_file, json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    
    $success = false;
    for ($i = 0; $i < 5; $i++) {
        if (@rename($temp_file, $file_path)) {
            $success = true;
            break;
        }
        usleep(100000);
    }
    
    if ($success) {
        echo json_encode(["status" => "success", "message" => "Modifiche salvate."]);
    } else {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => "Impossibile aggiornare newdeals.json."]);
    }
} else {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Dati non validi o mancanti."]);
}
?>
