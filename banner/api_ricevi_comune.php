<?php
// ==========================================
// LOGICA COMUNE DI RICEZIONE DEAL
//
// Usata da:
//   - api_ricevi_asin.php    (estensione Chrome, ramo Amazon)
//   - api_ricevi_ali_id.php  (estensione Chrome, ramo AliExpress)
//   - api_ricevi_deal.php    (newgallery.html, aggiunta manuale)
//
// Flusso: si scrive un segnaposto in newdeals.json, poi si esegue
// aggiorna_offerte.php che lo completa con titolo, prezzo e immagini reali.
// Il chiamante attende qualche secondo e ottiene il banner gia' pronto.
// ==========================================

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// L'estensione gira su origine chrome-extension://: richiesta cross-origin.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Il preflight del browser va chiuso subito, senza toccare il file.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function rispondi($status, $message, $extra = array()) {
    $out = array_merge(array('status' => $status, 'message' => $message), $extra);
    echo json_encode($out, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Estrae il payload JSON inviato dal chiamante. */
function leggi_payload() {
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        rispondi('error', "Nessun dato ricevuto.");
    }
    $payload = json_decode($raw, true);
    if (!is_array($payload)) {
        rispondi('error', "Payload non valido (JSON atteso).");
    }
    return $payload;
}

/**
 * Riconosce lo store dall'ID e lo valida.
 * ASIN Amazon: 10 caratteri alfanumerici. Product ID AliExpress: 11-20 cifre.
 * Il campo e' editabile a mano sia nel popup sia in newgallery, quindi un
 * errore di battitura va intercettato qui e non scoperto come "prodotto non
 * trovato" al prossimo aggiornamento.
 *
 * @return array array($store, $id_normalizzato)
 */
function riconosci_store($raw_id, $store_atteso = null) {
    $raw_id = trim($raw_id);

    if ($raw_id === '') {
        rispondi('error', "ID prodotto mancante.");
    }

    $pare_ali = (bool)preg_match('/^\d{11,20}$/', $raw_id);
    $pare_amz = (bool)preg_match('/^[A-Za-z0-9]{10}$/', $raw_id);

    // Un ASIN puo' essere composto da sole cifre (es. i codici ISBN dei libri):
    // in quel caso ha esattamente 10 caratteri e non ricade nel range AliExpress.
    if ($store_atteso === 'aliexpress') {
        if (!$pare_ali) {
            rispondi('error', "Product ID AliExpress non valido: '$raw_id'. Deve essere di 11-20 cifre.");
        }
        return array('aliexpress', $raw_id);
    }
    if ($store_atteso === 'amazon') {
        if (!$pare_amz) {
            rispondi('error', "ASIN Amazon non valido: '$raw_id'. Deve essere di 10 caratteri alfanumerici.");
        }
        return array('amazon', strtoupper($raw_id));
    }

    // Nessuno store indicato (aggiunta manuale da newgallery): si deduce.
    if ($pare_ali) return array('aliexpress', $raw_id);
    if ($pare_amz) return array('amazon', strtoupper($raw_id));

    rispondi('error', "ID non riconosciuto: '$raw_id'. Attesi 10 caratteri (ASIN Amazon) o 11-20 cifre (Product ID AliExpress).");
}

/**
 * Scrive il segnaposto in newdeals.json e restituisce l'esito.
 * Non chiama le API: quelle le interroga sincronizza() subito dopo.
 *
 * @return array array('id' => ..., 'duplicato' => bool, 'totale' => int)
 */
function salva_segnaposto($store, $id_prodotto, $messaggio) {
    $file = __DIR__ . '/newdeals.json';

    if (!file_exists($file)) {
        rispondi('error', "newdeals.json non trovato in " . __DIR__);
    }
    if (!is_writable($file)) {
        rispondi('error', "newdeals.json non e' scrivibile: controlla i permessi.");
    }

    // Lock esclusivo su tutta la sequenza leggi-modifica-scrivi: senza, due
    // salvataggi ravvicinati possono perdere un deal.
    $fp = fopen($file, 'r+');
    if (!$fp) {
        rispondi('error', "Impossibile aprire newdeals.json.");
    }
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        rispondi('error', "Impossibile bloccare newdeals.json (un altro processo lo sta usando).");
    }

    $contenuto = stream_get_contents($fp);
    $data = json_decode($contenuto, true);

    // Se il JSON e' illeggibile ci si ferma: rigenerarlo da zero, come faceva la
    // versione precedente, cancellerebbe tutti i deal esistenti.
    if (!is_array($data) || !isset($data['deals']) || !is_array($data['deals'])) {
        flock($fp, LOCK_UN);
        fclose($fp);
        rispondi('error', "newdeals.json e' malformato: salvataggio annullato per non perdere i deal esistenti.");
    }

    $campo_id = ($store === 'aliexpress') ? 'product_id' : 'asin';

    // Duplicato: si aggiorna il messaggio invece di creare un secondo record.
    foreach ($data['deals'] as $i => $deal) {
        $store_deal = isset($deal['store']) ? $deal['store'] : 'amazon';
        $valore = isset($deal[$campo_id]) ? (string)$deal[$campo_id] : '';
        if ($store_deal === $store && strcasecmp($valore, $id_prodotto) === 0) {
            $modificato = false;
            if ($messaggio !== '') {
                $data['deals'][$i]['custom_message'] = $messaggio;
                $modificato = true;
            }
            if ($modificato) scrivi_json($fp, $data);
            $id_esistente = $data['deals'][$i]['id'];
            flock($fp, LOCK_UN);
            fclose($fp);
            return array('id' => $id_esistente, 'duplicato' => true, 'totale' => count($data['deals']));
        }
    }

    // Nuovo ID progressivo: il MASSIMO esistente + 1, non il conteggio.
    // Col conteggio, dopo aver cancellato un deal il nuovo ID collide con uno gia' in uso.
    $max = 0;
    foreach ($data['deals'] as $deal) {
        if (isset($deal['id']) && (int)$deal['id'] > $max) $max = (int)$deal['id'];
    }
    $nuovo_num = $max + 1;
    // Padding a 2 cifre sotto il 100, per coerenza con i record esistenti ("01".."99").
    $nuovo_id = ($nuovo_num < 100) ? str_pad($nuovo_num, 2, '0', STR_PAD_LEFT) : (string)$nuovo_num;

    $placeholder = ($store === 'aliexpress')
        ? 'https://dummyimage.com/300x200/ff4747/ffffff.png&text=In+Elaborazione...'
        : 'https://dummyimage.com/300x200/ff9900/ffffff.png&text=In+Elaborazione...';

    $link_base = ($store === 'aliexpress')
        ? "https://it.aliexpress.com/item/$id_prodotto.html"
        : "https://www.amazon.it/dp/$id_prodotto";

    $nuovo = array(
        'id'             => $nuovo_id,
        'store'          => $store,
        $campo_id        => $id_prodotto,
        'title'          => 'In elaborazione...',
        'link'           => $link_base,
        'img'            => $placeholder,
        'all_images'     => array($placeholder),
        'active_images'  => array($placeholder),
        'badge'          => 'In corso',
        'price'          => '...',
        'custom_message' => $messaggio,
        'weight'         => 5,
        // Formato coerente con i record esistenti e con quello che si aspetta
        // aggiorna_offerte.php quando preserva date_added.
        'date_added'     => date('d/m/Y H:i:s'),
        'expiry'         => 'Aggiornamento in corso...',
        'active'         => true
    );

    $data['deals'][] = $nuovo;
    $data['count'] = count($data['deals']);

    scrivi_json($fp, $data);
    flock($fp, LOCK_UN);
    fclose($fp);

    return array('id' => $nuovo_id, 'duplicato' => false, 'totale' => $data['count']);
}

/** Riscrive il file gia' aperto e bloccato, senza rilasciare il lock. */
function scrivi_json($fp, $data) {
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) {
        flock($fp, LOCK_UN);
        fclose($fp);
        rispondi('error', "Errore di codifica JSON: salvataggio annullato.");
    }
    rewind($fp);
    ftruncate($fp, 0);
    fwrite($fp, $json);
    fflush($fp);
}

/**
 * Completa il segnaposto interrogando le API per il SOLO prodotto inserito.
 * Non si esegue aggiorna_offerte.php: quello rielaborerebbe tutti i 158 deal
 * (~40 secondi) e azzererebbe sync_log.txt a ogni inserimento.
 *
 * @return array array('ok' => bool, 'errore' => string)
 */
function sincronizza($store, $id_prodotto) {
    require_once __DIR__ . '/lib_api.php';

    $cfg = __DIR__ . '/config.php';
    if (!file_exists($cfg)) {
        return array('ok' => false, 'errore' => 'config.php non trovato');
    }
    require $cfg;

    $campi = ($store === 'aliexpress')
        ? dati_da_aliexpress($id_prodotto, $ALI_APP_KEY, $ALI_APP_SECRET, $ALI_TRACKING_ID)
        : dati_da_amazon($id_prodotto, $CLIENT_ID, $CLIENT_SECRET, $PARTNER_TAG,
                         AMZ_TOKEN_ENDPOINT, AMZ_API_ENDPOINT, AMZ_MARKETPLACE);

    if ($campi['errore'] !== '') {
        return array('ok' => false, 'errore' => $campi['errore']);
    }

    aggiorna_record($store, $id_prodotto, $campi['dati']);
    return array('ok' => true, 'errore' => '');
}

/** Recupera titolo, prezzo, immagini e link affiliato di un prodotto AliExpress. */
function dati_da_aliexpress($pid, $appKey, $appSecret, $trackingId) {
    $esito = aliDettagliProdotti(array($pid), $appKey, $appSecret, $trackingId, 'inserimento');
    if ($esito['errore'] !== '') {
        return array('dati' => array(), 'errore' => $esito['errore']);
    }
    if (empty($esito['prodotti'])) {
        // L'API risponde senza errore ma con elenco vuoto anche quando il
        // prodotto esiste: succede se non e' affiliabile o non e' disponibile
        // per il Paese impostato. E' il caso piu' frequente, quindi lo si dice.
        return array('dati' => array(), 'errore' => "prodotto $pid non restituito dall'API "
            . "(di solito significa che non e' affiliabile o non e' disponibile per l'Italia)");
    }

    $item = $esito['prodotti'][0];

    $primary = isset($item['product_main_image_url']) ? $item['product_main_image_url'] : '';
    $immagini = array();
    if ($primary !== '') $immagini[] = $primary;
    if (isset($item['product_small_image_urls']['string'])) {
        $small = is_array($item['product_small_image_urls']['string'])
            ? $item['product_small_image_urls']['string']
            : array($item['product_small_image_urls']['string']);
        foreach ($small as $u) {
            if ($u !== '' && !in_array($u, $immagini)) $immagini[] = $u;
        }
    }
    if (empty($immagini)) $immagini = array('');

    $raw_link = isset($item['promotion_link']) && $item['promotion_link'] !== ''
        ? $item['promotion_link']
        : "https://it.aliexpress.com/item/$pid.html";
    $link = (strpos($raw_link, '/e/_') === false)
        ? generateAliShortLink($raw_link, $appKey, $appSecret, $trackingId)
        : $raw_link;

    $sale = isset($item['target_sale_price']) ? (float)$item['target_sale_price'] : 0;
    $orig = isset($item['target_original_price']) ? (float)$item['target_original_price'] : 0;
    // Prefisso "da", coerente con aggiorna_offerte.php: il prezzo API AliExpress
    // e' un minimo teorico, non quello che il visitatore paga davvero.
    $prezzo = $sale > 0 ? 'da ' . number_format($sale, 2, ',', '.') . ' €' : 'Vedi Offerta';

    // Se l'API non fornisce lo sconto, lo si ricava dai due prezzi.
    $badge = '';
    if (!empty($item['discount'])) {
        $badge = 'Sconto ' . trim($item['discount']);
    } else if ($orig > $sale && $orig > 0) {
        $perc = round((($orig - $sale) / $orig) * 100);
        if ($perc > 0) $badge = "Sconto $perc%";
    }

    return array('errore' => '', 'dati' => array(
        'title' => isset($item['product_title']) ? $item['product_title'] : 'Prodotto AliExpress',
        'link' => $link,
        'img' => $primary,
        'all_images' => $immagini,
        // Solo la prima immagine attiva: le altre restano in all_images e si
        // possono attivare a mano da newgallery. Coerente con Amazon.
        'active_images' => array_slice($immagini, 0, 1),
        'badge' => $badge,
        'price' => $prezzo
    ));
}

/** Recupera titolo, prezzo, immagini e link affiliato di un prodotto Amazon. */
function dati_da_amazon($asin, $clientId, $clientSecret, $partnerTag, $tokenEndpoint, $apiEndpoint, $marketplace) {
    $tok = amazonToken($clientId, $clientSecret, $tokenEndpoint);
    if ($tok['errore'] !== '') {
        return array('dati' => array(), 'errore' => 'token Amazon: ' . $tok['errore']);
    }

    $esito = amazonDettagliProdotti(array($asin), $tok['token'], $partnerTag, $apiEndpoint, $marketplace);
    if ($esito['errore'] !== '') {
        return array('dati' => array(), 'errore' => $esito['errore']);
    }
    if (empty($esito['prodotti'])) {
        return array('dati' => array(), 'errore' => "ASIN $asin non trovato su Amazon");
    }

    $item = $esito['prodotti'][0];

    $primary = isset($item['images']['primary']['large']['url']) ? $item['images']['primary']['large']['url'] : '';
    $immagini = array();
    if ($primary !== '') $immagini[] = $primary;
    if (isset($item['images']['variants'])) {
        foreach ($item['images']['variants'] as $v) {
            if (isset($v['large']['url']) && !in_array($v['large']['url'], $immagini)) {
                $immagini[] = $v['large']['url'];
            }
        }
    }
    if (empty($immagini)) $immagini = array('');

    // Senza detailPageURL il prodotto non e' acquistabile: si segnala il prezzo
    // come non disponibile invece di inventare un link.
    $disponibile = isset($item['detailPageURL']);
    $link = $disponibile ? $item['detailPageURL'] : "https://www.amazon.it/dp/$asin";

    $prezzo = '';
    $badge = '';
    if (!$disponibile) {
        $prezzo = 'Link Assente';
    } else if (isset($item['offersV2']['listings'][0]['price'])) {
        $price_data = $item['offersV2']['listings'][0]['price'];
        if (isset($price_data['money']['displayAmount'])) {
            $prezzo = $price_data['money']['displayAmount'];
        }
        if (isset($price_data['savings']['percentage']) && $price_data['savings']['percentage'] > 0) {
            $badge = 'Sconto ' . $price_data['savings']['percentage'] . '%';
        }
    } else {
        $prezzo = 'Non Dispon.';
    }

    return array('errore' => '', 'dati' => array(
        'title' => isset($item['itemInfo']['title']['displayValue']) ? $item['itemInfo']['title']['displayValue'] : 'Prodotto Amazon',
        'link' => $link,
        'img' => $primary,
        'all_images' => $immagini,
        'active_images' => array_slice($immagini, 0, 1),
        'badge' => $badge,
        'price' => $prezzo,
        'active' => $disponibile
    ));
}

/** Scrive i campi recuperati sul record gia' presente, sotto lock. */
function aggiorna_record($store, $id_prodotto, $campi) {
    $file = __DIR__ . '/newdeals.json';
    $fp = fopen($file, 'r+');
    if (!$fp) return false;
    if (!flock($fp, LOCK_EX)) { fclose($fp); return false; }

    $data = json_decode(stream_get_contents($fp), true);
    if (!is_array($data) || !isset($data['deals'])) {
        flock($fp, LOCK_UN);
        fclose($fp);
        return false;
    }

    $campo_id = ($store === 'aliexpress') ? 'product_id' : 'asin';
    foreach ($data['deals'] as $i => $deal) {
        $valore = isset($deal[$campo_id]) ? (string)$deal[$campo_id] : '';
        if (strcasecmp($valore, $id_prodotto) === 0) {
            foreach ($campi as $k => $v) {
                $data['deals'][$i][$k] = $v;
            }
            $data['deals'][$i]['expiry'] = 'Prezzo aggiornato al ' . date('d F Y \a\l\l\e H:i');

            // Prezzo di riferimento fissato gia' all'inserimento: cosi' un
            // prodotto appena aggiunto ha subito il suo termine di paragone,
            // senza aspettare il primo aggiornamento massivo.
            // La guardia serve perche' lib_api.php lo include sincronizza(),
            // unico chiamante attuale: se un domani qualcuno invocasse
            // aggiorna_record() da solo, si salta il riferimento invece di
            // interrompere il salvataggio con un fatal error.
            $ref = function_exists('calcola_riferimento') ? calcola_riferimento(
                $deal,
                isset($campi['price']) ? $campi['price'] : '',
                isset($campi['badge']) ? $campi['badge'] : ''
            ) : array();
            foreach ($ref as $k => $v) {
                $data['deals'][$i][$k] = $v;
            }
            break;
        }
    }

    scrivi_json($fp, $data);
    flock($fp, LOCK_UN);
    fclose($fp);
    return true;
}

/**
 * Toglie dal JSON un record appena inserito. Serve quando l'arricchimento
 * fallisce: senza questa rimozione il segnaposto resterebbe per sempre in
 * "In elaborazione...", perche' nessun aggiornamento successivo puo'
 * recuperarlo (es. prodotto non affiliabile o non disponibile in Italia).
 *
 * Per sicurezza rimuove solo se il record e' ancora un segnaposto: se nel
 * frattempo un aggiornamento completo lo avesse popolato, va lasciato stare.
 */
function rimuovi_segnaposto($store, $id_prodotto) {
    $file = __DIR__ . '/newdeals.json';
    $fp = fopen($file, 'r+');
    if (!$fp) return false;
    if (!flock($fp, LOCK_EX)) { fclose($fp); return false; }

    $data = json_decode(stream_get_contents($fp), true);
    if (!is_array($data) || !isset($data['deals'])) {
        flock($fp, LOCK_UN);
        fclose($fp);
        return false;
    }

    $campo_id = ($store === 'aliexpress') ? 'product_id' : 'asin';
    $rimosso = false;
    $residui = array();
    foreach ($data['deals'] as $deal) {
        $valore = isset($deal[$campo_id]) ? (string)$deal[$campo_id] : '';
        $titolo = isset($deal['title']) ? $deal['title'] : '';
        if (!$rimosso && strcasecmp($valore, $id_prodotto) === 0 && $titolo === 'In elaborazione...') {
            $rimosso = true;
            continue; // non lo si ricopia: e' la rimozione
        }
        $residui[] = $deal;
    }

    if ($rimosso) {
        $data['deals'] = $residui;
        $data['count'] = count($residui);
        scrivi_json($fp, $data);
    }

    flock($fp, LOCK_UN);
    fclose($fp);
    return $rimosso;
}

/**
 * Sequenza completa: valida, salva il segnaposto, sincronizza, risponde.
 * E' il punto d'ingresso unico dei tre endpoint.
 */
function ricevi_deal($raw_id, $messaggio, $store_atteso = null) {
    list($store, $id) = riconosci_store($raw_id, $store_atteso);

    $esito = salva_segnaposto($store, $id, $messaggio);

    if ($esito['duplicato']) {
        rispondi('success', "Prodotto gia' presente (ID interno " . $esito['id'] . "): "
            . ($messaggio !== '' ? "messaggio aggiornato." : "nessuna modifica."),
            array('id' => $esito['id'], 'store' => $store, 'duplicato' => true));
    }

    $sync = sincronizza($store, $id);

    if ($sync['ok']) {
        rispondi('success', "Prodotto $id ($store) salvato e aggiornato. ID interno " . $esito['id'] . ".",
            array('id' => $esito['id'], 'store' => $store, 'aggiornato' => true, 'totale' => $esito['totale']));
    }

    // Arricchimento fallito: si toglie il segnaposto, altrimenti resterebbe
    // per sempre in "In elaborazione..." (tipico dei prodotti non affiliabili
    // o non disponibili per l'Italia, che nessun aggiornamento recuperera').
    // Si risponde 'error' e non 'success': cosi' il popup dell'estensione
    // mostra il motivo invece di chiudersi come se fosse andato tutto bene.
    $tolto = rimuovi_segnaposto($store, $id);

    rispondi('error', "Prodotto $id ($store) non aggiunto: " . $sync['errore']
        . ($tolto ? '' : " (attenzione: il segnaposto e' rimasto in elenco, va rimosso a mano)"),
        array('store' => $store, 'aggiornato' => false,
              'errore_api' => $sync['errore'], 'segnaposto_rimosso' => $tolto));
}
