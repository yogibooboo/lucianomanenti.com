<?php
// ==========================================
// SCRIPT AGGIORNAMENTO OFFERTE AMAZON
// ==========================================

set_time_limit(0); // Evita il timeout del server se ci sono centinaia di prodotti

$TEST_MODE = false; // Ora usiamo le vere API

require_once 'config.php';

$MARKETPLACE = "www.amazon.it";
$TOKEN_ENDPOINT = "https://api.amazon.co.uk/auth/o2/token"; // Endpoint per l'Europa
$API_ENDPOINT = "https://creatorsapi.amazon/catalog/v1/getItems";

$FILE_JSON = __DIR__ . '/newdeals.json';
$LOG_FILE = __DIR__ . '/sync_log.txt';

// Funzione per scrivere nel file di log e stampare a video
function log_msg($msg) {
    global $LOG_FILE;
    $timestamp = date('Y-m-d H:i:s');
    $line = "[$timestamp] $msg\n";
    file_put_contents($LOG_FILE, $line, FILE_APPEND);
    // Stampa anche a video se chiamato da browser/cli
    echo $line;
}

// Svuota il file di log all'inizio di ogni esecuzione
file_put_contents($LOG_FILE, "");

// ==========================================
// ESECUZIONE
// ==========================================

log_msg("=== INIZIO SINCRONIZZAZIONE AMAZON ===");

// 1. Leggi il database attuale
$input_data = [];
$stored_deals = []; // Mantiene il deal completo precedente per fallback in caso di errori API
if (file_exists($FILE_JSON)) {
    $json = file_get_contents($FILE_JSON);
    $parsed = json_decode($json, true) ?: [];
    if (isset($parsed['deals'])) {
        foreach ($parsed['deals'] as $deal) {
            $asin = $deal['asin'];
            $stored_deals[$asin] = $deal;
            $input_data[$asin] = [
                'messaggio_custom' => isset($deal['custom_message']) ? $deal['custom_message'] : '',
                'data_aggiunta' => isset($deal['date_added']) ? $deal['date_added'] : date('d/m/Y H:i:s'),
                'active_images' => isset($deal['active_images']) ? $deal['active_images'] : [],
                'custom_title' => isset($deal['title']) ? $deal['title'] : '',
                'weight' => isset($deal['weight']) ? (int)$deal['weight'] : 5
            ];
        }
    }
}

if (empty($input_data)) {
    log_msg("Nessun ASIN trovato in $FILE_JSON. Interruzione.");
    die();
}

$asin_list = array_map('strval', array_keys($input_data));
$final_deals = [];
$counter = 1;
date_default_timezone_set('Europe/Rome');
$timestamp_aggiornamento = date('d F Y \a\l\l\e H:i');

log_msg("Trovati " . count($asin_list) . " ASIN da aggiornare.");

// --- OTTIENI IL TOKEN OAUTH 2.0 ---
$token_payload = json_encode([
    "grant_type" => "client_credentials",
    "client_id" => $CLIENT_ID,
    "client_secret" => $CLIENT_SECRET,
    "scope" => "creatorsapi::default"
]);

$ch = curl_init($TOKEN_ENDPOINT);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $token_payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$token_response = curl_exec($ch);
$token_http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$token_curl_error = curl_error($ch);
curl_close($ch);

if ($token_http_code != 200) {
    log_msg("ERRORE: Impossibile ottenere il Token. HTTP Code: $token_http_code. Risposta: $token_response");
    if ($token_curl_error) log_msg("cURL Error: $token_curl_error");
    die();
}

$token_data = json_decode($token_response, true);
if (!isset($token_data['access_token'])) {
    log_msg("ERRORE: Token non presente nel payload di risposta.");
    die();
}
$access_token = $token_data['access_token'];
log_msg("Token OAuth 2.0 ottenuto con successo.");

// 2. Dividiamo gli ASIN in blocchi da 10 (limite API Amazon)
$chunks = array_chunk($asin_list, 10);

$chunk_index = 0;
foreach ($chunks as $chunk) {
    $chunk_index++;
    
    // Pausa di 1.5 secondi tra le chiamate per prevenire limiti di frequenza
    if ($chunk_index > 1) {
        log_msg("Pausa di 1.5 secondi per prevenire limiti API...");
        usleep(1500000);
    }
    
    // --- CHIAMATA API GET ITEMS ---
    $api_payload = json_encode([
        "itemIds" => $chunk,
        "itemIdType" => "ASIN",
        "marketplace" => $MARKETPLACE,
        "partnerTag" => $PARTNER_TAG,
        "resources" => [
            "images.primary.large",
            "images.variants.large",
            "itemInfo.title",
            "offersV2.listings.price"
        ]
    ]);

    log_msg("Elaborazione Blocco $chunk_index/" . count($chunks) . " (" . implode(',', $chunk) . ")...");

    $retry_count = 0;
    $max_retries = 3;
    $api_success = false;
    $api_response = '';
    $api_http_code = 0;
    $api_curl_error = '';

    while ($retry_count < $max_retries && !$api_success) {
        $ch2 = curl_init($API_ENDPOINT);
        curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch2, CURLOPT_POST, true);
        curl_setopt($ch2, CURLOPT_POSTFIELDS, $api_payload);
        curl_setopt($ch2, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer " . $access_token,
            "Content-Type: application/json",
            "x-marketplace: " . $MARKETPLACE
        ]);

        $api_response = curl_exec($ch2);
        $api_http_code = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
        $api_curl_error = curl_error($ch2);
        curl_close($ch2);

        if ($api_http_code == 429) {
            $retry_count++;
            $wait_time = $retry_count * 2; // Attesa progressiva: 2s, 4s, 6s...
            log_msg("Rilevato HTTP 429 (Rate Limit) su Blocco $chunk_index. Tentativo di riprovare $retry_count/$max_retries dopo $wait_time secondi...");
            sleep($wait_time);
        } else {
            $api_success = true;
        }
    }

    $found_asins_in_chunk = [];

    if ($api_http_code != 200) {
        log_msg("ERRORE API persistente su Blocco $chunk_index: HTTP $api_http_code. Uso i dati precedenti come fallback.");
        if ($api_curl_error) log_msg("cURL Error: $api_curl_error");
        log_msg("Risposta: $api_response");

        // Fallback: recupera i dati precedenti per evitare di perdere/invalidare i deal
        foreach ($chunk as $asin) {
            if (isset($stored_deals[$asin])) {
                $deal = $stored_deals[$asin];
                $deal['id'] = str_pad($counter, 2, "0", STR_PAD_LEFT);
                $deal['active'] = false; // Disattiva a seguito di errore aggiornamento
                $deal['expiry'] = "Errore aggiornamento il $timestamp_aggiornamento";
                $final_deals[] = $deal;
                $counter++;
                log_msg("ASIN $asin: Ripristinato da dati memorizzati precedenti come non attivo (fallback).");
            } else {
                $final_deals[] = [
                    "id" => str_pad($counter, 2, "0", STR_PAD_LEFT),
                    "asin" => $asin,
                    "title" => "⚠️ Errore di sincronizzazione (Nuovo ASIN)",
                    "link" => "https://www.amazon.it/dp/$asin?tag=$PARTNER_TAG",
                    "img" => "https://dummyimage.com/240x240/222222/ff0000.png&text=Errore",
                    "badge" => "",
                    "price" => "Errore",
                    "custom_message" => isset($input_data[$asin]['messaggio_custom']) ? $input_data[$asin]['messaggio_custom'] : '',
                    "weight" => isset($input_data[$asin]['weight']) ? $input_data[$asin]['weight'] : 5,
                    "date_added" => isset($input_data[$asin]['data_aggiunta']) ? $input_data[$asin]['data_aggiunta'] : '',
                    "expiry" => "Errore sincronizzazione il $timestamp_aggiornamento",
                    "active" => false
                ];
                $counter++;
                log_msg("ASIN $asin: Nuovo ASIN senza dati precedenti. Creato banner di errore.");
            }
        }
    } else {
        log_msg("Risposta API OK su Blocco $chunk_index.");
        $api_data = json_decode($api_response, true);
        
        // 3. Elaborazione dei risultati
        if (isset($api_data['itemsResult']['items'])) {
            foreach ($api_data['itemsResult']['items'] as $item) {
                $asin = $item['asin'];
                $found_asins_in_chunk[] = $asin;
                
                $msg_custom = isset($input_data[$asin]['messaggio_custom']) ? trim($input_data[$asin]['messaggio_custom']) : '';
                $data_aggiunta = isset($input_data[$asin]['data_aggiunta']) ? $input_data[$asin]['data_aggiunta'] : '';
                $stored_active_images = isset($input_data[$asin]['active_images']) ? $input_data[$asin]['active_images'] : null;
                
                $amazon_title = isset($item['itemInfo']['title']['displayValue']) ? $item['itemInfo']['title']['displayValue'] : "Prodotto Amazon";
                $stored_title = isset($input_data[$asin]['custom_title']) ? trim($input_data[$asin]['custom_title']) : '';
                $is_placeholder = ($stored_title === 'In elaborazione...' || $stored_title === '⚠️ Prodotto Rimosso o Non Valido');
                $title = (!empty($stored_title) && !$is_placeholder) ? $stored_title : $amazon_title;
                
                $primary_image = isset($item['images']['primary']['large']['url']) ? $item['images']['primary']['large']['url'] : "https://m.media-amazon.com/images/I/61QrgD6QgYL._SL1500_.jpg";
                
                // Raccogli tutte le immagini
                $all_images = [$primary_image];
                if (isset($item['images']['variants'])) {
                    foreach ($item['images']['variants'] as $variant) {
                        if (isset($variant['large']['url'])) {
                            $all_images[] = $variant['large']['url'];
                        }
                    }
                }
                
                // Imposta immagini attive
                $active_images = [];
                if ($stored_active_images !== null && is_array($stored_active_images)) {
                    // Filtra solo le immagini che esistono ancora su Amazon
                    foreach ($stored_active_images as $img_url) {
                        if (in_array($img_url, $all_images)) {
                            $active_images[] = $img_url;
                        }
                    }
                }
                if (empty($active_images)) {
                    $active_images = [$primary_image]; // Fallback di sicurezza
                }
                
                $link = isset($item['detailPageURL']) ? $item['detailPageURL'] : "https://www.amazon.it/dp/$asin";
                
                // Estrazione Prezzo e Sconto
                $badge = "";
                $price_display = "";
                $is_available = true;
                
                if (!isset($item['detailPageURL'])) {
                    // Per sicurezza, se Amazon non fornisce il link, disabilitiamo il banner
                    $is_available = false;
                    $price_display = "Link Assente";
                } else if (isset($item['offersV2']['listings'][0]['price'])) {
                    $price_data = $item['offersV2']['listings'][0]['price'];
                    
                    if (isset($price_data['money']['displayAmount'])) {
                        $price_display = $price_data['money']['displayAmount'];
                    }
                    
                    if (isset($price_data['savings']['percentage'])) {
                        $sconto_perc = $price_data['savings']['percentage'];
                        if ($sconto_perc > 0) {
                            $badge = "Sconto $sconto_perc%";
                        }
                    }
                } else {
                    // Nessun prezzo trovato (es. esaurito)
                    $price_display = "Non Dispon.";
                    $is_available = false;
                }
                
                $final_deals[] = [
                    "id" => str_pad($counter, 2, "0", STR_PAD_LEFT),
                    "asin" => $asin,
                    "title" => $title,
                    "link" => $link,
                    "img" => $primary_image, // legacy field per retrocompatibilità
                    "all_images" => $all_images,
                    "active_images" => $active_images,
                    "badge" => $badge,
                    "price" => $price_display,
                    "custom_message" => $msg_custom,
                    "weight" => isset($input_data[$asin]['weight']) ? $input_data[$asin]['weight'] : 5,
                    "date_added" => $data_aggiunta,
                    "expiry" => "Prezzo aggiornato al $timestamp_aggiornamento",
                    "active" => $is_available
                ];
                $counter++;
            }
        }

        // Gestione degli ASIN non trovati / rimossi da Amazon (SOLO per risposte con successo)
        foreach ($chunk as $requested_asin) {
            if (!in_array($requested_asin, $found_asins_in_chunk)) {
                $msg_custom = isset($input_data[$requested_asin]['messaggio_custom']) ? trim($input_data[$requested_asin]['messaggio_custom']) : '';
                $data_aggiunta = isset($input_data[$requested_asin]['data_aggiunta']) ? $input_data[$requested_asin]['data_aggiunta'] : '';
                
                $final_deals[] = [
                    "id" => str_pad($counter, 2, "0", STR_PAD_LEFT),
                    "asin" => $requested_asin,
                    "title" => "⚠️ Prodotto Rimosso o Non Valido",
                    "link" => "https://www.amazon.it/dp/$requested_asin?tag=$PARTNER_TAG",
                    "img" => "https://dummyimage.com/240x240/222222/ff0000.png&text=Non+Trovato",
                    "badge" => "",
                    "price" => "Errore",
                    "custom_message" => $msg_custom,
                    "weight" => isset($input_data[$requested_asin]['weight']) ? $input_data[$requested_asin]['weight'] : 5,
                    "date_added" => $data_aggiunta,
                    "expiry" => "Errore sincronizzazione il $timestamp_aggiornamento",
                    "active" => false
                ];
                $counter++;
                log_msg("ASIN $requested_asin: Non trovato nel catalogo Amazon (segnato come inattivo).");
            }
        }
    }
}

// 4. Salva tutto nel newdeals.json per l'anteprima
$output_array = [
    "count" => count($final_deals),
    "deals" => $final_deals
];

// Scrittura atomica per evitare file parziali
$temp_file = $FILE_JSON . '.tmp';
file_put_contents($temp_file, json_encode($output_array, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
rename($temp_file, $FILE_JSON);

log_msg("Aggiornamento REALE completato con successo! Generati " . count($final_deals) . " banner in $FILE_JSON.");

// ==========================================
// INVIO REPORT VIA EMAIL (Solo su Server Remoto)
// ==========================================

$is_local = (strpos(__DIR__, 'Local Sites') !== false) || (isset($_SERVER['SERVER_NAME']) && $_SERVER['SERVER_NAME'] === 'itinerari.local');

if (!$is_local && !empty($REPORT_EMAIL_TO) && !empty($REPORT_EMAIL_FROM)) {
    $log_content = file_get_contents($LOG_FILE);
    $has_errors = (stripos($log_content, 'ERRORE') !== false);
    
    if ($has_errors || !$SEND_REPORT_ONLY_ON_ERROR) {
        $subject = $has_errors ? "⚠️ ERRORE Sincronizzazione Amazon" : "✅ Sincronizzazione Amazon Completata";
        
        require_once __DIR__ . '/phpmailer/Exception.php';
        require_once __DIR__ . '/phpmailer/PHPMailer.php';
        require_once __DIR__ . '/phpmailer/SMTP.php';
        
        $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
        
        try {
            $mail->isSMTP();
            $mail->Host       = $SMTP_HOST;
            $mail->SMTPAuth   = true;
            $mail->Username   = $SMTP_USER;
            $mail->Password   = $SMTP_PASS;
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
            $mail->Port       = 465;

            $mail->setFrom($REPORT_EMAIL_FROM, 'Sistema Sincronizzazione');
            $mail->addAddress($REPORT_EMAIL_TO);

            $mail->isHTML(false);
            $mail->CharSet = 'UTF-8';
            $mail->Subject = $subject;
            $mail->Body    = $log_content;

            $mail->send();
            log_msg("Report diagnostico inviato via SMTP a $REPORT_EMAIL_TO");
        } catch (Exception $e) {
            log_msg("Fallito l'invio del report diagnostico via SMTP. Errore: {$mail->ErrorInfo}");
        }
    } else {
        log_msg("Nessun errore rilevato: email non inviata (SEND_REPORT_ONLY_ON_ERROR è attivo).");
    }
} else if ($is_local) {
    log_msg("Ambiente LOCALE rilevato: invio email disabilitato per evitare errori di connessione.");
}

?>