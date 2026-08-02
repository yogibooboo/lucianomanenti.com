<?php
// Riceve un deal dall'aggiunta manuale di newgallery.html: lo store viene
// dedotto dal formato dell'ID. Accetta anche i payload dell'estensione
// (chiavi 'asin' / 'product_id') per compatibilita'.
require_once __DIR__ . '/api_ricevi_comune.php';

$payload = leggi_payload();

$raw_id = '';
$store_atteso = null;

if (isset($payload['asin']) && trim($payload['asin']) !== '') {
    $raw_id = $payload['asin'];
    $store_atteso = 'amazon';
} else if (isset($payload['product_id']) && trim($payload['product_id']) !== '') {
    $raw_id = $payload['product_id'];
    $store_atteso = 'aliexpress';
} else if (isset($payload['id'])) {
    // Aggiunta manuale: un solo campo, lo store si deduce dal formato.
    $raw_id = $payload['id'];
}

$messaggio = isset($payload['message']) ? trim($payload['message']) : '';

ricevi_deal($raw_id, $messaggio, $store_atteso);
