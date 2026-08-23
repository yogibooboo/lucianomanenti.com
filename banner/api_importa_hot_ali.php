<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

$input = file_get_contents('php://input');
$data = json_decode($input, true) ?: [];

$limit = isset($data['limit']) ? min(100, max(1, (int)$data['limit'])) : 10;
$category = isset($data['category']) ? trim($data['category']) : 'all';
$keywords = isset($data['keywords']) ? trim($data['keywords']) : '';
$min_discount = isset($data['min_discount']) ? (int)$data['min_discount'] : 0;
$min_price = isset($data['min_price']) && is_numeric($data['min_price']) ? (float)$data['min_price'] : 3.00;
$max_price = isset($data['max_price']) && is_numeric($data['max_price']) ? (float)$data['max_price'] : 0;
$custom_msg = isset($data['custom_message']) && !empty(trim($data['custom_message'])) ? trim($data['custom_message']) : 'SUPER OFFERTA ALIEXPRESS!';
$weight = isset($data['weight']) ? min(10, max(1, (int)$data['weight'])) : 5;

function generateAliSignature($params, $appSecret) {
    ksort($params);
    $signString = '';
    foreach ($params as $k => $v) {
        if (is_scalar($v) && $v !== '' && $v !== null) $signString .= $k . $v;
    }
    return strtoupper(md5($appSecret . $signString . $appSecret));
}

function generateAliShortLink($source_url, $appKey, $appSecret, $trackingId) {
    if (empty($source_url)) return $source_url;
    $params = [
        'method' => 'aliexpress.affiliate.link.generate',
        'app_key' => $appKey,
        'sign_method' => 'md5',
        'timestamp' => date('Y-m-d H:i:s'),
        'format' => 'json',
        'v' => '2.0',
        'promotion_link_type' => '0',
        'source_values' => $source_url,
        'tracking_id' => $trackingId
    ];
    $params['sign'] = generateAliSignature($params, $appSecret);

    $ch = curl_init('https://api-sg.aliexpress.com/sync');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded;charset=utf-8']);
    $api_response = curl_exec($ch);

    if ($api_response && ($api_data = json_decode($api_response, true))) {
        $links = $api_data['aliexpress_affiliate_link_generate_response']['resp_result']['result']['promotion_links']['promotion_link'] ?? [];
        if (isset($links[0]['promotion_link']) && !empty($links[0]['promotion_link'])) {
            return $links[0]['promotion_link'];
        }
    }
    return $source_url;
}

$forbidden_terms = ['cover', 'custodia', 'pellicola', 'vetro temperato', 'silicone case', 'phone case', 'screen protector', 'strap', 'cinturino'];

$deals_file = __DIR__ . '/newdeals.json';
$ali_ids_file = __DIR__ . '/miei_product_ids_ali.json';

// I prodotti importati NON entrano in newdeals.json: sono candidati da
// esaminare uno per uno e sostano qui finche' non vengono approvati.
// Tenerli in un file separato garantisce che una pubblicazione FTP non possa
// mandarli online per sbaglio.
$pending_file = __DIR__ . '/pending_ali.json';
// Product id gia' rifiutati: non vanno riproposti a ogni importazione.
$scartati_file = __DIR__ . '/scartati_ali.json';

$deals_data = file_exists($deals_file) ? (json_decode(file_get_contents($deals_file), true) ?: ["count" => 0, "deals" => []]) : ["count" => 0, "deals" => []];
$ali_ids_data = file_exists($ali_ids_file) ? (json_decode(file_get_contents($ali_ids_file), true) ?: []) : [];
$pending_data = file_exists($pending_file) ? (json_decode(file_get_contents($pending_file), true) ?: ["pending" => []]) : ["pending" => []];
if (!isset($pending_data['pending']) || !is_array($pending_data['pending'])) $pending_data['pending'] = array();
$scartati_data = file_exists($scartati_file) ? (json_decode(file_get_contents($scartati_file), true) ?: []) : [];

// Un product id gia' presente in uno qualsiasi dei tre insiemi non va
// riproposto: sarebbe un doppione, un candidato duplicato o un gia' rifiutato.
$existing_pids = [];
foreach ($deals_data['deals'] as $d) {
    if (isset($d['product_id'])) $existing_pids[] = (string)$d['product_id'];
}
foreach ($pending_data['pending'] as $p) {
    if (isset($p['product_id'])) $existing_pids[] = (string)$p['product_id'];
}
foreach (array_keys($scartati_data) as $pid_scartato) {
    $existing_pids[] = (string)$pid_scartato;
}

// Mappatura delle Categorie Standard AliExpress
$category_queries = [
    'electronics' => ['auricolari wireless', 'cassa bluetooth', 'caricatore wireless', 'smartwatch', 'proiettore led'],
    'auto'        => ['dash cam auto', 'compressore portatile', 'aspirapolvere auto', 'supporto smartphone auto', 'starter batteria auto'],
    'home'        => ['lampada led', 'proiettore led', 'utensili multifunzione', 'umidificatore aria', 'robot aspirapolvere'],
    'tech'        => ['mouse wireless', 'tastiera meccanica', 'hub usb c', 'tappetino mouse gaming', 'webcam hd'],
    'watches'     => ['orologio uomo quarzo', 'orologio automatico', 'orologio sportivo impermeabile'],
    'sports'      => ['zaino impermeabile', 'luce bicicletta', 'accessori campeggio', 'borraccia termica'],
    'toys'        => ['dronino con fotocamera', 'macchina radiocomandata', 'modellismo'],
    'beauty'      => ['massaggiatore cervicale', 'spazzolino elettrico', 'asciugacapelli professionale']
];

if (!empty($keywords)) {
    $search_queries = [$keywords];
} else if ($category !== 'all' && isset($category_queries[$category])) {
    $search_queries = $category_queries[$category];
} else {
    // Tutte le Categorie (mix bilanciato)
    $search_queries = [
        'auricolari wireless', 'aspirapolvere auto', 'cassa bluetooth', 
        'compressore portatile', 'proiettore led', 'zaino impermeabile', 
        'utensili multifunzione', 'dash cam auto', 'lampada scrivania', 
        'mouse wireless', 'orologio uomo'
    ];
}

$per_query_limit = !empty($keywords) ? $limit : max(1, ceil($limit / count($search_queries)));

$imported_count = 0;
date_default_timezone_set('Europe/Rome');
$timestamp_aggiornamento = date('d F Y \a\l\l\e H:i');

foreach ($search_queries as $query) {
    if ($imported_count >= $limit) break;
    
    $query_count = 0;
    
    for ($page = 1; $page <= 2; $page++) {
        if ($imported_count >= $limit || $query_count >= $per_query_limit) break;
        
        $params = [
            'method' => 'aliexpress.affiliate.hotproduct.query',
            'app_key' => $ALI_APP_KEY,
            'sign_method' => 'md5',
            'timestamp' => date('Y-m-d H:i:s'),
            'format' => 'json',
            'v' => '2.0',
            'target_currency' => 'EUR',
            'target_language' => 'IT',
            'ship_to_country' => 'IT',
            'tracking_id' => $ALI_TRACKING_ID,
            'page_no' => $page,
            'page_size' => 30,
            'keywords' => $query
        ];

        if ($min_price > 0) $params['min_sale_price'] = (string)($min_price * 100);
        if ($max_price > 0) $params['max_sale_price'] = (string)($max_price * 100);

        $params['sign'] = generateAliSignature($params, $ALI_APP_SECRET);

        $ch = curl_init('https://api-sg.aliexpress.com/sync');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded;charset=utf-8']);
        $api_response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($http_code != 200 || !($api_data = json_decode($api_response, true))) {
            continue;
        }

        $products_resp = $api_data['aliexpress_affiliate_hotproduct_query_response']['resp_result']['result']['products']['product']
            ?? $api_data['aliexpress_affiliate_hotproduct_query_response']['result']['products']['product']
            ?? [];

        if (empty($products_resp)) continue;
        if (isset($products_resp['product_id'])) $products_resp = [$products_resp];

        foreach ($products_resp as $item) {
            if ($imported_count >= $limit || $query_count >= $per_query_limit) break;
            
            $pid = (string)($item['product_id'] ?? '');
            if (!$pid || in_array($pid, $existing_pids)) continue;
            
            $title = $item['product_title'] ?? "Prodotto AliExpress";
            
            // Filtro esclusione cover/pellicole/cinturini
            $is_forbidden = false;
            foreach ($forbidden_terms as $bad_word) {
                if (stripos($title, $bad_word) !== false) {
                    $is_forbidden = true;
                    break;
                }
            }
            if ($is_forbidden) continue;
            
            $sale_price = (float)($item['target_sale_price'] ?? 0);
            $orig_price = (float)($item['target_original_price'] ?? 0);
            
            $disc_perc = 0;
            if (!empty($item['discount'])) {
                $disc_perc = (int)preg_replace('/[^0-9]/', '', $item['discount']);
            } else if ($orig_price > $sale_price && $orig_price > 0) {
                $disc_perc = round((($orig_price - $sale_price) / $orig_price) * 100);
            }
            
            if ($min_discount > 0 && $disc_perc < $min_discount) continue;
            
            $primary_image = $item['product_main_image_url'] ?? "https://dummyimage.com/240x240/e61919/ffffff.png&text=AliExpress";
            $all_images = [$primary_image];
            if (isset($item['product_small_image_urls']['string'])) {
                $small_imgs = is_array($item['product_small_image_urls']['string']) ? $item['product_small_image_urls']['string'] : [$item['product_small_image_urls']['string']];
                foreach ($small_imgs as $simg) {
                    if ($simg && !in_array($simg, $all_images)) $all_images[] = $simg;
                }
            }
            
            $raw_link = $item['promotion_link'] ?? "https://it.aliexpress.com/item/$pid.html";
            $link = generateAliShortLink($raw_link, $ALI_APP_KEY, $ALI_APP_SECRET, $ALI_TRACKING_ID);
            // Prefisso "da" come in aggiorna_offerte.php e api_ricevi_comune.php:
            // il prezzo API AliExpress e' un minimo, non quello che si paga.
            // Senza, il banner cambierebbe aspetto al primo refresh dei prezzi.
            $price_display = $sale_price > 0 ? 'da ' . number_format($sale_price, 2, ',', '.') . " €" : "Vedi Offerta";
            $badge = $disc_perc > 0 ? "Sconto $disc_perc%" : "";
            
            // Nessun "id" qui: e' posizionale in newdeals.json e verrebbe
            // comunque riassegnato all'approvazione. Lo si evita per non
            // lasciarne in giro di scaduti.
            $new_deal = [
                "store" => "aliexpress",
                "product_id" => $pid,
                "title" => $title,
                "link" => $link,
                "img" => $primary_image,
                "all_images" => $all_images,
                "active_images" => [$primary_image],
                "badge" => $badge,
                "price" => $price_display,
                "custom_message" => $custom_msg,
                "weight" => $weight,
                "date_added" => date('d/m/Y H:i:s'),
                "expiry" => "Prezzo aggiornato al $timestamp_aggiornamento",
                "active" => true
            ];
            
            // In attesa di revisione, non ancora in catalogo. miei_product_ids_ali.json
            // viene aggiornato solo all'approvazione, non qui: un candidato
            // scartato non deve lasciare tracce.
            $pending_data['pending'][] = $new_deal;
            $existing_pids[] = $pid;
            $imported_count++;
            $query_count++;
        }
    }
}

if ($imported_count === 0) {
    echo json_encode(["status" => "warning", "message" => "Nessun nuovo prodotto trovato per i filtri specificati.", "count" => 0]);
    exit();
}

// Scrittura atomica: newdeals.json non viene toccato affatto.
$pending_data['count'] = count($pending_data['pending']);
$temp_file = $pending_file . '.tmp';
file_put_contents($temp_file, json_encode($pending_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
if (file_exists($pending_file)) @unlink($pending_file);
rename($temp_file, $pending_file);

echo json_encode([
    "status" => "success",
    "message" => "$imported_count prodotti in attesa di revisione. Aprili con il filtro \"In attesa\" per approvarli o scartarli.",
    "imported_count" => $imported_count,
    "pending_count" => count($pending_data['pending']),
    "total_deals" => count($deals_data['deals'])
]);
?>
