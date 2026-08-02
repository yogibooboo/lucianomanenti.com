<?php
// ==========================================
// SCRIPT AGGIORNAMENTO OFFERTE UNIFICATO (AMAZON & ALIEXPRESS)
// Fonte di verità: newdeals.json
// ==========================================

// Sotto cron (CLI) l'output non lo legge nessuno: gli errori a video sporcherebbero
// solo la mail di sistema. Da browser invece servono. Gli errori restano comunque
// registrati nel log PHP del server in entrambi i casi.
$IS_CLI = (php_sapi_name() === 'cli' || php_sapi_name() === 'cli-server' || !isset($_SERVER['REQUEST_METHOD']));
ini_set('display_errors', $IS_CLI ? '0' : '1');
ini_set('display_startup_errors', $IS_CLI ? '0' : '1');
ini_set('log_errors', '1');
error_reporting(E_ALL);

set_time_limit(0);

// ==========================================
// OUTPUT IN TEMPO REALE
// Perche' il progresso si veda mentre lo script gira e non solo alla fine,
// vanno disattivati tutti i livelli di buffering: quello di PHP
// (output_buffering), la compressione zlib, e quello dei proxy/nginx davanti
// a PHP-FPM (che accumulano la risposta finche' non e' completa).
// ==========================================
@ini_set('zlib.output_compression', '0');
@ini_set('implicit_flush', '1');
@ini_set('output_buffering', '0');
while (ob_get_level() > 0) { @ob_end_flush(); }
ob_implicit_flush(true);

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('X-Accel-Buffering: no'); // disattiva il buffering di nginx

// Alcuni proxy iniziano a inoltrare solo dopo un primo blocco di dati:
// questo riempitivo sblocca lo streaming da subito.
echo str_repeat(' ', 4096) . "\n";
@flush();

require_once __DIR__ . '/config.php';

$ENABLE_AMAZON = isset($ENABLE_AMAZON) ? $ENABLE_AMAZON : true;
$ENABLE_ALIEXPRESS = isset($ENABLE_ALIEXPRESS) ? $ENABLE_ALIEXPRESS : true;

$MARKETPLACE = "www.amazon.it";
$TOKEN_ENDPOINT = "https://api.amazon.co.uk/auth/o2/token"; // Endpoint per l'Europa
$API_ENDPOINT = "https://creatorsapi.amazon/catalog/v1/getItems";

$FILE_JSON = __DIR__ . '/newdeals.json';
$LOG_FILE = __DIR__ . '/sync_log.txt';

date_default_timezone_set('Europe/Rome');
$timestamp_aggiornamento = date('d F Y \a\l\l\e H:i');

// Funzione per scrivere nel file di log e stampare a video
// $msg      : riga completa, sempre scritta nel file di log
// $msg_video : versione ridotta mostrata a video (se omessa si usa $msg;
//              se vale false la riga finisce solo nel file di log)
function log_msg($msg, $msg_video = null) {
    global $LOG_FILE;
    $timestamp = date('Y-m-d H:i:s');
    @file_put_contents($LOG_FILE, "[$timestamp] $msg\n", FILE_APPEND);

    if ($msg_video === false) return; // solo file, niente output a video
    $video = ($msg_video === null) ? $msg : $msg_video;

    // Le righe di errore vengono evidenziate anche a video, non solo nel log.
    $is_err = (stripos($video, 'ERRORE') !== false);
    $stile = $is_err ? ' style="color:#c00;font-weight:bold"' : '';
    echo '<div' . $stile . '>[' . $timestamp . '] ' . htmlspecialchars($video, ENT_QUOTES) . "</div>\n";

    if (ob_get_level() > 0) @ob_flush();
    @flush();
}

// Svuota il file di log all'inizio di ogni esecuzione
file_put_contents($LOG_FILE, "");

// generateAliSignature, generateAliShortLink, aliDettagliProdotti, amazonToken
// e amazonDettagliProdotti vivono in lib_api.php, condivise con gli endpoint di
// inserimento singolo (api_ricevi_*.php). Vanno mantenute in un punto solo.
require_once __DIR__ . '/lib_api.php';

// ==========================================
// ESECUZIONE
// ==========================================

log_msg("=== INIZIO SINCRONIZZAZIONE UNIFICATA (AMAZON & ALIEXPRESS) ===");

// 1. Leggi il database attuale
$input_data_amazon = [];
$input_data_ali = [];
$stored_deals_amazon = [];
$stored_deals_ali = [];

if (file_exists($FILE_JSON)) {
    $json = file_get_contents($FILE_JSON);
    $parsed = json_decode($json, true) ?: [];
    if (isset($parsed['deals'])) {
        foreach ($parsed['deals'] as $deal) {
            $store = isset($deal['store']) ? $deal['store'] : 'amazon';
            if ($store === 'aliexpress' && !empty($deal['product_id'])) {
                $pid = (string)$deal['product_id'];
                $stored_deals_ali[$pid] = $deal;
                $input_data_ali[$pid] = $deal;
            } else if (!empty($deal['asin'])) {
                $asin = (string)$deal['asin'];
                $stored_deals_amazon[$asin] = $deal;
                $input_data_amazon[$asin] = [
                    'messaggio_custom' => isset($deal['custom_message']) ? $deal['custom_message'] : '',
                    'data_aggiunta' => isset($deal['date_added']) ? $deal['date_added'] : date('d/m/Y H:i:s'),
                    'active_images' => isset($deal['active_images']) ? $deal['active_images'] : [],
                    'custom_title' => isset($deal['user_custom_title']) ? $deal['user_custom_title'] : '',
                    'weight' => isset($deal['weight']) ? (int)$deal['weight'] : 5
                ];
            }
        }
    }
}

$totale_input = count($input_data_amazon) + count($input_data_ali);
if ($totale_input === 0) {
    log_msg("ERRORE: nessun prodotto valido trovato in $FILE_JSON (file assente, illeggibile o malformato). Interruzione senza sovrascrivere il file.");
    die();
}
log_msg("Letti $totale_input prodotti da $FILE_JSON (" . count($input_data_amazon) . " Amazon, " . count($input_data_ali) . " AliExpress).");

$final_deals = [];
$counter = 1;
$blocchi_falliti = 0; // conteggio dei blocchi API andati in errore, per il riepilogo finale

// ==========================================
// SEZIONE 1: SINCRONIZZAZIONE AMAZON
// ==========================================
if ($ENABLE_AMAZON && !empty($input_data_amazon)) {
    $asin_list = array_map('strval', array_keys($input_data_amazon));
    log_msg("--- Elaborazione Prodotti Amazon ---");
    log_msg("Trovati " . count($asin_list) . " ASIN Amazon da aggiornare.");

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
    } else {
        $token_data = json_decode($token_response, true);
        if (!isset($token_data['access_token'])) {
            log_msg("ERRORE: Token non presente nel payload di risposta.");
        } else {
            $access_token = $token_data['access_token'];
            log_msg("Token OAuth 2.0 ottenuto con successo.");

            // 2. Dividiamo gli ASIN in blocchi da 10 (limite API Amazon)
            $chunks = array_chunk($asin_list, 10);
            $chunk_index = 0;

            foreach ($chunks as $chunk) {
                $chunk_index++;
                
                // Pausa di 1.5 secondi tra le chiamate per prevenire limiti di frequenza
                if ($chunk_index > 1) {
                    usleep(1500000); // pausa anti rate-limit, non loggata per non sporcare l'output
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

                log_msg("Elaborazione Blocco Amazon $chunk_index/" . count($chunks) . " (" . implode(',', $chunk) . ")...",
                        "Amazon: blocco $chunk_index di " . count($chunks) . " (" . count($chunk) . " prodotti)...");

                $retry_count = 0;
                $max_retries = 3;
                $api_success = false;
                $api_response = '';
                $api_http_code = 0;
                $api_curl_error = '';

                while ($retry_count < $max_retries && !$api_success) {
                    $ch2 = curl_init($API_ENDPOINT);
                    curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch2, CURLOPT_TIMEOUT, 30);
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
                    $blocchi_falliti++;
                    log_msg("ERRORE API persistente su Blocco Amazon $chunk_index: HTTP $api_http_code. Uso i dati precedenti come fallback.");
                    if ($api_curl_error) log_msg("cURL Error: $api_curl_error");
                    log_msg("Risposta: $api_response");

                    // Fallback: recupera i dati precedenti per evitare di perdere/invalidare i deal
                    foreach ($chunk as $asin) {
                        if (isset($stored_deals_amazon[$asin])) {
                            $deal = $stored_deals_amazon[$asin];
                            $deal['id'] = str_pad($counter, 2, "0", STR_PAD_LEFT);
                            $deal['active'] = false; // Disattiva a seguito di errore aggiornamento
                            $deal['expiry'] = "Errore aggiornamento il $timestamp_aggiornamento";
                            $final_deals[] = $deal;
                            $counter++;
                            log_msg("ASIN $asin: Ripristinato da dati memorizzati precedenti come non attivo (fallback).");
                        }
                    }
                } else {
                    log_msg("Risposta API OK su Blocco Amazon $chunk_index.", false);
                    $api_data = json_decode($api_response, true);
                    
                    // 3. Elaborazione dei risultati
                    if (isset($api_data['itemsResult']['items'])) {
                        foreach ($api_data['itemsResult']['items'] as $item) {
                            $asin = $item['asin'];
                            $found_asins_in_chunk[] = $asin;
                            $stored = isset($stored_deals_amazon[$asin]) ? $stored_deals_amazon[$asin] : [];
                            
                            $msg_custom = isset($input_data_amazon[$asin]['messaggio_custom']) ? trim($input_data_amazon[$asin]['messaggio_custom']) : '';
                            $data_aggiunta = isset($input_data_amazon[$asin]['data_aggiunta']) ? $input_data_amazon[$asin]['data_aggiunta'] : '';
                            $stored_active_images = isset($input_data_amazon[$asin]['active_images']) ? $input_data_amazon[$asin]['active_images'] : null;
                            
                            $amazon_title = isset($item['itemInfo']['title']['displayValue']) ? $item['itemInfo']['title']['displayValue'] : "Prodotto Amazon";
                            $stored_title = isset($input_data_amazon[$asin]['custom_title']) ? trim($input_data_amazon[$asin]['custom_title']) : '';
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
                                $price_display = "Non Dispon.";
                                $is_available = false;
                            }
                            
                            $final_deals[] = array_merge([
                                "id" => str_pad($counter, 2, "0", STR_PAD_LEFT),
                                "store" => "amazon",
                                "asin" => $asin,
                                "title" => $title,
                                "link" => $link,
                                "img" => $primary_image,
                                "all_images" => $all_images,
                                "active_images" => $active_images,
                                "badge" => $badge,
                                "price" => $price_display,
                                "custom_message" => $msg_custom,
                                "weight" => isset($input_data_amazon[$asin]['weight']) ? $input_data_amazon[$asin]['weight'] : 5,
                                "date_added" => $data_aggiunta,
                                "expiry" => "Prezzo aggiornato al $timestamp_aggiornamento",
                                "active" => $is_available
                            // Prezzo di riferimento: fissato al primo rilevamento valido
                            // e poi conservato, per misurare le variazioni nel tempo.
                            ], calcola_riferimento($stored, $price_display, $badge));
                            $counter++;
                        }
                    }

                    // Gestione degli ASIN non trovati / rimossi da Amazon
                    foreach ($chunk as $requested_asin) {
                        if (!in_array($requested_asin, $found_asins_in_chunk)) {
                            $msg_custom = isset($input_data_amazon[$requested_asin]['messaggio_custom']) ? trim($input_data_amazon[$requested_asin]['messaggio_custom']) : '';
                            $data_aggiunta = isset($input_data_amazon[$requested_asin]['data_aggiunta']) ? $input_data_amazon[$requested_asin]['data_aggiunta'] : '';
                            
                            // Il riferimento va conservato anche qui: un errore
                            // temporaneo dell'API non deve cancellare lo storico
                            // del prezzo. calcola_riferimento() con "Errore" non
                            // ne crea uno nuovo, ma mantiene quello gia' fissato.
                            $stored_ko = isset($stored_deals_amazon[$requested_asin]) ? $stored_deals_amazon[$requested_asin] : [];

                            $final_deals[] = array_merge([
                                "id" => str_pad($counter, 2, "0", STR_PAD_LEFT),
                                "store" => "amazon",
                                "asin" => $requested_asin,
                                "title" => "⚠️ Prodotto Rimosso o Non Valido",
                                "link" => "https://www.amazon.it/dp/$requested_asin?tag=$PARTNER_TAG",
                                "img" => "https://dummyimage.com/240x240/222222/ff0000.png&text=Non+Trovato",
                                "badge" => "",
                                "price" => "Errore",
                                "custom_message" => $msg_custom,
                                "weight" => isset($input_data_amazon[$requested_asin]['weight']) ? $input_data_amazon[$requested_asin]['weight'] : 5,
                                "date_added" => $data_aggiunta,
                                "expiry" => "Errore sincronizzazione il $timestamp_aggiornamento",
                                "active" => false
                            ], calcola_riferimento($stored_ko, "Errore", ""));
                            $counter++;
                        }
                    }
                }
            }
        }
    }
}

// ==========================================
// SEZIONE 2: SINCRONIZZAZIONE ALIEXPRESS
// ==========================================
if ($ENABLE_ALIEXPRESS && !empty($input_data_ali)) {
    $ali_pids = array_keys($input_data_ali);
    log_msg("--- Elaborazione Prodotti AliExpress ---");
    log_msg("Trovati " . count($ali_pids) . " Product ID AliExpress da aggiornare.");

    $ali_chunks = array_chunk($ali_pids, 10);
    $ali_chunk_index = 0;

    foreach ($ali_chunks as $chunk) {
        $ali_chunk_index++;

        // Pausa tra le chiamate per prevenire limiti di frequenza (come nel ramo Amazon).
        // A regime ogni blocco fa una sola chiamata: gli short-link sono gia'
        // memorizzati e vengono riusati (vedi il controllo su '/e/_' piu' sotto).
        if ($ali_chunk_index > 1) {
            usleep(1500000); // pausa anti rate-limit, non loggata per non sporcare l'output
        }

        log_msg("Elaborazione Blocco AliExpress $ali_chunk_index/" . count($ali_chunks) . " (" . count($chunk) . " prodotti: " . implode(',', $chunk) . ")...",
                "AliExpress: blocco $ali_chunk_index di " . count($ali_chunks) . " (" . count($chunk) . " prodotti)...");

        // Ciclo di retry: AliExpress risponde HTTP 200 anche quando rifiuta la
        // chiamata per frequenza eccessiva (code=ApiCallLimit), con un ban di
        // pochi secondi. In quel caso conviene attendere e riprovare, come gia'
        // fa il ramo Amazon sull'HTTP 429.
        $ali_retry = 0;
        $ali_max_retries = 6; // 5 ritentativi effettivi, vedi backoff sotto
        $api_data = null;
        $api_response = '';
        $http_code = 0;
        $ali_curl_error = '';

        while ($ali_retry < $ali_max_retries) {
            // I parametri (e la firma) vanno rigenerati a ogni tentativo:
            // il timestamp fa parte della firma e non puo' essere riutilizzato.
            $params = [
                'method' => 'aliexpress.affiliate.productdetail.get',
                'app_key' => $ALI_APP_KEY,
                'sign_method' => 'md5',
                'timestamp' => date('Y-m-d H:i:s'),
                'format' => 'json',
                'v' => '2.0',
                'product_ids' => implode(',', $chunk),
                'target_currency' => 'EUR',
                'target_language' => 'IT',
                'ship_to_country' => 'IT',
                'tracking_id' => $ALI_TRACKING_ID
            ];
            $params['sign'] = generateAliSignature($params, $ALI_APP_SECRET);

            $ch = curl_init('https://api-sg.aliexpress.com/sync');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded;charset=utf-8']);
            $api_response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $ali_curl_error = curl_error($ch);
            curl_close($ch);

            $api_data = ($api_response !== false) ? json_decode($api_response, true) : null;

            // Riprova solo sul limite di frequenza; ogni altro esito e' definitivo.
            $is_rate_limit = (isset($api_data['error_response']['code'])
                && strpos((string)$api_data['error_response']['code'], 'ApiCallLimit') !== false);

            if ($is_rate_limit && $ali_retry < $ali_max_retries - 1) {
                $ali_retry++;
                // Backoff esponenziale: 5s, 10s, 20s, 40s, 60s (~135s in totale).
                // Il vecchio schema lineare (3s+6s = 9s) era troppo corto per far
                // scorrere la finestra del limite: il blocco falliva davvero e i
                // suoi prodotti venivano marcati inattivi dal fallback.
                $attesa = min(60, 5 * pow(2, $ali_retry - 1));
                log_msg("Limite di frequenza AliExpress su Blocco $ali_chunk_index. Tentativo $ali_retry/" . ($ali_max_retries - 1) . " tra $attesa secondi...");
                sleep($attesa);
                continue;
            }
            break;
        }

        // Diagnostica esplicita: senza questa, un fallimento del blocco restava invisibile
        if ($http_code != 200) {
            log_msg("ERRORE API su Blocco AliExpress $ali_chunk_index: HTTP $http_code.");
            if ($ali_curl_error) log_msg("cURL Error: $ali_curl_error");
            log_msg("Risposta: " . substr((string)$api_response, 0, 500));
        } else if ($api_data === null) {
            log_msg("ERRORE su Blocco AliExpress $ali_chunk_index: risposta non decodificabile come JSON.");
            log_msg("Risposta: " . substr((string)$api_response, 0, 500));
        } else if (isset($api_data['error_response'])) {
            // AliExpress restituisce HTTP 200 anche sugli errori applicativi (firma, rate limit, permessi)
            $err = $api_data['error_response'];
            $err_code = isset($err['code']) ? $err['code'] : '?';
            $err_msg = isset($err['msg']) ? $err['msg'] : '';
            $err_sub = isset($err['sub_msg']) ? $err['sub_msg'] : '';
            log_msg("ERRORE applicativo AliExpress su Blocco $ali_chunk_index: code=$err_code $err_msg $err_sub");
        }

        $found_pids = [];
        if ($http_code == 200 && $api_data) {
            if (isset($api_data['aliexpress_affiliate_productdetail_get_response']['resp_result']['result']['products']['product'])) {
                $products_resp = $api_data['aliexpress_affiliate_productdetail_get_response']['resp_result']['result']['products']['product'];
            } else if (isset($api_data['aliexpress_affiliate_productdetail_get_response']['result']['products']['product'])) {
                $products_resp = $api_data['aliexpress_affiliate_productdetail_get_response']['result']['products']['product'];
            } else {
                $products_resp = [];
            }

            if (!empty($products_resp)) {
                if (isset($products_resp['product_id'])) $products_resp = [$products_resp];

                foreach ($products_resp as $item) {
                    $pid = isset($item['product_id']) ? (string)$item['product_id'] : '';
                    if (!$pid) continue;
                    $found_pids[] = $pid;
                    $stored = isset($stored_deals_ali[$pid]) ? $stored_deals_ali[$pid] : [];

                    $ali_title = isset($item['product_title']) ? $item['product_title'] : "Prodotto AliExpress";
                    $user_custom_title = isset($stored['user_custom_title']) ? trim($stored['user_custom_title']) : '';
                    $title = !empty($user_custom_title) ? $user_custom_title : $ali_title;

                    $primary_image = isset($item['product_main_image_url'])
                        ? $item['product_main_image_url']
                        : (isset($stored['img']) ? $stored['img'] : "");
                    $all_images = [$primary_image];
                    if (isset($item['product_small_image_urls']['string'])) {
                        $small_imgs = is_array($item['product_small_image_urls']['string']) ? $item['product_small_image_urls']['string'] : [$item['product_small_image_urls']['string']];
                        foreach ($small_imgs as $simg) {
                            if ($simg && !in_array($simg, $all_images)) $all_images[] = $simg;
                        }
                    }

                    $stored_active = isset($stored['active_images']) ? $stored['active_images'] : null;
                    $active_images = [];
                    if ($stored_active !== null && is_array($stored_active)) {
                        foreach ($stored_active as $img_url) {
                            if (in_array($img_url, $all_images)) $active_images[] = $img_url;
                        }
                    }
                    if (empty($active_images)) $active_images = [$primary_image];

                    // I link brevi /e/_ sono permanenti: se ne esiste gia' uno
                    // memorizzato lo si riusa, evitando una chiamata API per
                    // prodotto a ogni sincronizzazione. Il promotion_link che
                    // arriva dall'API e' sempre in formato lungo, quindi senza
                    // questo controllo l'accorciamento verrebbe rifatto ogni volta.
                    $stored_link = isset($stored['link']) ? $stored['link'] : '';
                    if (strpos($stored_link, '/e/_') !== false) {
                        $link = $stored_link;
                    } else {
                        $raw_link = isset($item['promotion_link'])
                            ? $item['promotion_link']
                            : (!empty($stored_link) ? $stored_link : "https://it.aliexpress.com/item/$pid.html");
                        if (strpos($raw_link, '/e/_') === false) {
                            $link = generateAliShortLink($raw_link, $ALI_APP_KEY, $ALI_APP_SECRET, $ALI_TRACKING_ID);
                        } else {
                            $link = $raw_link;
                        }
                    }
                    $sale_price = isset($item['target_sale_price']) ? (float)$item['target_sale_price'] : 0;
                    $orig_price = isset($item['target_original_price']) ? (float)$item['target_original_price'] : 0;

                    // Prefisso "da": il prezzo AliExpress via API e' sistematicamente
                    // piu' basso di quello che paga il visitatore (sconto affiliato ~3%,
                    // cambio EUR/USD applicato dall'API, spedizione mai inclusa). Non
                    // esiste un campo con il prezzo reale, quindi si dichiara come minimo.
                    // Il prefisso NON va applicato ad Amazon, dove il prezzo e' esatto.
                    $price_display = $sale_price > 0 ? "da " . number_format($sale_price, 2, ',', '.') . " €" : (isset($stored['price']) ? $stored['price'] : "Vedi Offerta");
                    $badge = isset($stored['badge']) ? $stored['badge'] : "";
                    if (!empty($item['discount'])) {
                        $badge = "Sconto " . trim($item['discount']);
                    } else if ($orig_price > $sale_price && $orig_price > 0) {
                        $perc = round((($orig_price - $sale_price) / $orig_price) * 100);
                        if ($perc > 0) $badge = "Sconto $perc%";
                    }

                    $final_deals[] = array_merge([
                        "id" => str_pad($counter, 2, "0", STR_PAD_LEFT),
                        "store" => "aliexpress",
                        "product_id" => $pid,
                        "title" => $title,
                        "link" => $link,
                        "img" => $primary_image,
                        "all_images" => $all_images,
                        "active_images" => $active_images,
                        "badge" => $badge,
                        "price" => $price_display,
                        "custom_message" => isset($stored['custom_message']) ? $stored['custom_message'] : 'Offerta AliExpress!',
                        "weight" => isset($stored['weight']) ? (int)$stored['weight'] : 5,
                        "date_added" => isset($stored['date_added']) ? $stored['date_added'] : date('d/m/Y H:i:s'),
                        "expiry" => "Prezzo aggiornato al $timestamp_aggiornamento",
                        // L'API ha restituito il prodotto: e' disponibile. Non si eredita
                        // lo stato precedente, altrimenti un deal disattivato da un errore
                        // temporaneo resterebbe inattivo per sempre.
                        "active" => true
                    // Prezzo di riferimento: vedi calcola_riferimento() in lib_api.php.
                    ], calcola_riferimento($stored, $price_display, $badge));
                    $counter++;
                }
            }

        }

        // Gestione dei prodotti non restituiti dall'API.
        // Fuori dal blocco di successo: cosi' copre sia il caso "chiamata OK ma
        // prodotto assente dal catalogo" sia il caso "chiamata fallita del tutto".
        // In entrambi i casi il deal viene ricopiato ma marcato inattivo, per non
        // lasciare online un prezzo che non e' stato verificato.
        $blocco_fallito = ($http_code != 200 || !$api_data || isset($api_data['error_response']));
        if ($blocco_fallito) $blocchi_falliti++;

        foreach ($chunk as $req_pid) {
            if (!in_array($req_pid, $found_pids)) {
                if (isset($stored_deals_ali[$req_pid])) {
                    $deal = $stored_deals_ali[$req_pid];
                    $deal['id'] = str_pad($counter, 2, "0", STR_PAD_LEFT);
                    $deal['active'] = false;
                    if ($blocco_fallito) {
                        $deal['expiry'] = "Errore aggiornamento il $timestamp_aggiornamento";
                        log_msg("Product ID $req_pid: blocco fallito, ripristinato da dati precedenti come non attivo (fallback).");
                    } else {
                        $deal['expiry'] = "Non piu' disponibile al $timestamp_aggiornamento";
                        log_msg("Product ID $req_pid: non trovato nel catalogo AliExpress (segnato come inattivo).");
                    }
                    $final_deals[] = $deal;
                    $counter++;
                } else {
                    $final_deals[] = [
                        "id" => str_pad($counter, 2, "0", STR_PAD_LEFT),
                        "store" => "aliexpress",
                        "product_id" => $req_pid,
                        "title" => "⚠️ Prodotto Rimosso o Non Valido",
                        "link" => "https://it.aliexpress.com/item/$req_pid.html",
                        "img" => "https://dummyimage.com/240x240/222222/ff0000.png&text=Non+Trovato",
                        "badge" => "",
                        "price" => "Errore",
                        "custom_message" => "",
                        "weight" => 5,
                        "date_added" => date('d/m/Y H:i:s'),
                        "expiry" => "Errore sincronizzazione il $timestamp_aggiornamento",
                        "active" => false
                    ];
                    $counter++;
                    log_msg("Product ID $req_pid: nuovo prodotto senza dati precedenti e non trovato. Creato banner di errore.");
                }
            }
        }
    }
}

// ==========================================
// RIEPILOGO: quanti deal sono stati REALMENTE aggiornati in questo giro.
// Il solo conteggio totale non basta, perche' i deal ripristinati dal fallback
// lo gonfiano mascherando i blocchi falliti.
// ==========================================
$aggiornati = 0;
$non_aggiornati = 0;
foreach ($final_deals as $d) {
    $exp = isset($d['expiry']) ? $d['expiry'] : '';
    if (strpos($exp, "aggiornato al $timestamp_aggiornamento") !== false) {
        $aggiornati++;
    } else {
        $non_aggiornati++;
    }
}
log_msg("--- RIEPILOGO ---");
log_msg("Deal totali: " . count($final_deals) . " | aggiornati ora: $aggiornati | non aggiornati: $non_aggiornati");
if ($blocchi_falliti > 0) {
    log_msg("ERRORE: $blocchi_falliti blocchi API sono falliti. I prodotti coinvolti sono stati marcati inattivi.");
}

// 4. Salva tutto nel newdeals.json per l'anteprima

// Rete di sicurezza: non sovrascrivere mai il file con meno prodotti di quanti
// ne sono stati letti. Se succede significa che una sezione e' fallita in modo
// non gestito, e sovrascrivere farebbe perdere i banner definitivamente.
if (count($final_deals) < $totale_input) {
    log_msg("ERRORE: generati solo " . count($final_deals) . " banner a fronte di $totale_input prodotti letti. File NON sovrascritto per sicurezza.");
    $backup_file = $FILE_JSON . '.parziale';
    @file_put_contents($backup_file, json_encode(["count" => count($final_deals), "deals" => $final_deals], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    log_msg("Il risultato parziale e' stato salvato in $backup_file per ispezione.");
} else {
    $output_array = [
        "count" => count($final_deals),
        "deals" => $final_deals
    ];

    // Scrittura atomica per evitare file parziali
    $temp_file = $FILE_JSON . '.tmp';
    $scritti = @file_put_contents($temp_file, json_encode($output_array, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    if ($scritti === false) {
        log_msg("ERRORE: impossibile scrivere il file temporaneo $temp_file. File originale lasciato intatto.");
    } else if (!@rename($temp_file, $FILE_JSON)) {
        log_msg("ERRORE: impossibile rinominare $temp_file in $FILE_JSON. File originale lasciato intatto.");
    } else if ($blocchi_falliti > 0 || $non_aggiornati > 0) {
        // Il file e' stato scritto, ma la sincronizzazione non e' andata a buon fine
        // per tutti i prodotti: non va dichiarato un successo pieno.
        log_msg("Aggiornamento completato PARZIALMENTE: $aggiornati banner aggiornati, $non_aggiornati non aggiornati (marcati inattivi). File salvato in $FILE_JSON.");
    } else {
        log_msg("Aggiornamento REALE completato con successo! Generati " . count($final_deals) . " banner in $FILE_JSON.");
    }
}

// ==========================================
// INVIO REPORT VIA EMAIL (Solo su Server Remoto)
// ==========================================

$is_local = (strpos(__DIR__, 'Local Sites') !== false) || (isset($_SERVER['SERVER_NAME']) && $_SERVER['SERVER_NAME'] === 'itinerari.local');

if (!$is_local && !empty($REPORT_EMAIL_TO) && !empty($REPORT_EMAIL_FROM)) {
    $log_content = file_get_contents($LOG_FILE);
    // Non ci si affida alla sola ricerca della parola "ERRORE" nel log: i contatori
    // sono la fonte attendibile dell'esito reale della sincronizzazione.
    $has_errors = (stripos($log_content, 'ERRORE') !== false) || $blocchi_falliti > 0 || $non_aggiornati > 0;

    if ($has_errors || !$SEND_REPORT_ONLY_ON_ERROR) {
        if ($blocchi_falliti > 0 || $non_aggiornati > 0) {
            $subject = "⚠️ Sincronizzazione Offerte PARZIALE ($non_aggiornati non aggiornati)";
        } else if ($has_errors) {
            $subject = "⚠️ ERRORE Sincronizzazione Offerte";
        } else {
            $subject = "✅ Sincronizzazione Offerte Completata ($aggiornati banner)";
        }
        
        if (file_exists(__DIR__ . '/phpmailer/Exception.php')) {
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
            } catch (\Exception $e) {
                log_msg("Fallito l'invio del report diagnostico via SMTP. Errore: " . $mail->ErrorInfo);
            }
        } else {
            log_msg("ATTENZIONE: PHPMailer non trovato in /phpmailer: report email non inviato.");
        }
    } else {
        log_msg("Nessun errore rilevato: email non inviata (SEND_REPORT_ONLY_ON_ERROR è attivo).");
    }
} else if ($is_local) {
    log_msg("Ambiente LOCALE rilevato: invio email disabilitato per evitare errori di connessione.");
}

?>