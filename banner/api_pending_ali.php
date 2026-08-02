<?php
/**
 * Gestione dei candidati AliExpress in attesa di revisione.
 *
 * I prodotti importati da api_importa_hot_ali.php non entrano subito in
 * newdeals.json: sostano in pending_ali.json finche' non vengono esaminati
 * uno per uno. Cosi' una pubblicazione FTP non puo' mandarli online per
 * sbaglio, e nessuna delle parti che leggono newdeals.json (il sito, il
 * refresh prezzi, i conteggi della galleria) deve sapere della loro esistenza.
 *
 * Azioni:
 *   lista    -> restituisce i candidati in attesa
 *   approva  -> sposta un candidato in newdeals.json (con l'id ricalcolato)
 *   scarta   -> lo rimuove e ne memorizza il product_id, per non riproporlo
 *   svuota   -> scarta in blocco tutti i candidati rimasti
 */

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$deals_file    = __DIR__ . '/newdeals.json';
$pending_file  = __DIR__ . '/pending_ali.json';
$scartati_file = __DIR__ . '/scartati_ali.json';
$ali_ids_file  = __DIR__ . '/miei_product_ids_ali.json';

/**
 * Scrittura atomica con retry: su Windows il rename fallisce se il file e'
 * momentaneamente aperto da un altro processo (stessa logica di
 * api_salva_deals.php).
 */
function scrivi_json_atomico($percorso, $dati) {
    $temp = $percorso . '.tmp';
    if (file_put_contents($temp, json_encode($dati, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) === false) {
        return false;
    }
    for ($i = 0; $i < 5; $i++) {
        if (@rename($temp, $percorso)) return true;
        // Alcuni filesystem rifiutano il rename su file esistente.
        if (file_exists($percorso) && @unlink($percorso) && @rename($temp, $percorso)) return true;
        usleep(100000);
    }
    @unlink($temp);
    return false;
}

function leggi_json($percorso, $default) {
    if (!file_exists($percorso)) return $default;
    $d = json_decode(file_get_contents($percorso), true);
    return is_array($d) ? $d : $default;
}

function errore($messaggio, $codice = 400) {
    http_response_code($codice);
    echo json_encode(array("status" => "error", "message" => $messaggio));
    exit();
}

$input  = json_decode(file_get_contents('php://input'), true) ?: array();
$azione = isset($input['azione']) ? $input['azione'] : 'lista';

$pending_data = leggi_json($pending_file, array("count" => 0, "pending" => array()));
if (!isset($pending_data['pending']) || !is_array($pending_data['pending'])) {
    $pending_data['pending'] = array();
}

// ---------------------------------------------------------------- lista
if ($azione === 'lista') {
    echo json_encode(array(
        "status"  => "success",
        "count"   => count($pending_data['pending']),
        "pending" => array_values($pending_data['pending'])
    ));
    exit();
}

// Le azioni che seguono operano su un candidato identificato dal product_id.
$pid = isset($input['product_id']) ? (string)$input['product_id'] : '';

if ($azione === 'approva' || $azione === 'scarta') {
    if ($pid === '') errore("product_id mancante.");
}

// Posizione del candidato nella lista d'attesa.
$indice = -1;
foreach ($pending_data['pending'] as $i => $p) {
    if (isset($p['product_id']) && (string)$p['product_id'] === $pid) {
        $indice = $i;
        break;
    }
}

// -------------------------------------------------------------- approva
if ($azione === 'approva') {
    if ($indice < 0) errore("Candidato $pid non piu' in attesa: forse gia' approvato o scartato.");

    $deal = $pending_data['pending'][$indice];

    // Le modifiche fatte in fase di revisione (titolo, testo rosso, peso)
    // arrivano dal client e sovrascrivono i valori importati.
    if (isset($input['title'])          && trim($input['title']) !== '')  $deal['title'] = trim($input['title']);
    if (isset($input['custom_message']))                                  $deal['custom_message'] = trim($input['custom_message']);
    if (isset($input['weight']))                                          $deal['weight'] = min(10, max(1, (int)$input['weight']));
    if (isset($input['active_images']) && is_array($input['active_images']) && count($input['active_images'])) {
        $deal['active_images'] = array_values($input['active_images']);
    }

    $deals_data = leggi_json($deals_file, array("count" => 0, "deals" => array()));
    if (!isset($deals_data['deals']) || !is_array($deals_data['deals'])) {
        errore("newdeals.json illeggibile: approvazione annullata per non sovrascriverlo.", 500);
    }

    // Difesa contro il doppio invio: se il prodotto e' gia' in catalogo lo si
    // toglie soltanto dalla lista d'attesa, senza duplicarlo.
    $gia_presente = false;
    foreach ($deals_data['deals'] as $d) {
        if (isset($d['product_id']) && (string)$d['product_id'] === $pid) { $gia_presente = true; break; }
    }

    if (!$gia_presente) {
        // L'id e' posizionale: si assegna ora, in coda al catalogo.
        $deal['id'] = str_pad(count($deals_data['deals']) + 1, 2, "0", STR_PAD_LEFT);

        // Prezzo e sconto di riferimento, come per ogni altro inserimento
        // (vedi calcola_riferimento in lib_api.php): senza, il prodotto
        // resterebbe escluso dal rilevamento delle variazioni.
        if (!isset($deal['ref_price']) && isset($deal['price'])) {
            $p = preg_replace('/^\s*da\s+/iu', '', trim((string)$deal['price']));
            if ($p !== '' && stripos($p, 'Errore') === false && stripos($p, 'Vedi') === false) {
                $deal['ref_price'] = $p;
                $deal['ref_badge'] = isset($deal['badge']) ? $deal['badge'] : '';
                $deal['ref_date']  = date('d/m/Y H:i:s');
            }
        }

        $deals_data['deals'][] = $deal;
        $deals_data['count'] = count($deals_data['deals']);

        if (!scrivi_json_atomico($deals_file, $deals_data)) {
            errore("Impossibile scrivere newdeals.json: il candidato resta in attesa.", 500);
        }

        // Solo ora il prodotto e' davvero nostro: si registra il messaggio
        // personalizzato, come fa l'inserimento singolo.
        $ali_ids = leggi_json($ali_ids_file, array());
        $ali_ids[$pid] = array(
            "messaggio_custom" => isset($deal['custom_message']) ? $deal['custom_message'] : '',
            "data_aggiunta"    => date('Y-m-d H:i:s')
        );
        scrivi_json_atomico($ali_ids_file, $ali_ids);
    }

    // newdeals.json e' gia' salvato: se la rimozione dalla lista d'attesa
    // fallisse, il controllo "gia_presente" evita comunque il duplicato.
    array_splice($pending_data['pending'], $indice, 1);
    $pending_data['count'] = count($pending_data['pending']);
    scrivi_json_atomico($pending_file, $pending_data);

    echo json_encode(array(
        "status"        => "success",
        "message"       => $gia_presente ? "Prodotto gia' in catalogo: rimosso dalla lista d'attesa." : "Prodotto approvato e aggiunto al catalogo.",
        "pending_count" => count($pending_data['pending']),
        "total_deals"   => count($deals_data['deals'])
    ));
    exit();
}

// --------------------------------------------------------------- scarta
if ($azione === 'scarta') {
    if ($indice < 0) errore("Candidato $pid non piu' in attesa.");

    $titolo = isset($pending_data['pending'][$indice]['title']) ? $pending_data['pending'][$indice]['title'] : '';
    array_splice($pending_data['pending'], $indice, 1);
    $pending_data['count'] = count($pending_data['pending']);

    // Memoria degli scarti: le importazioni successive saltano questi id,
    // altrimenti gli stessi prodotti tornerebbero a ogni giro.
    $scartati = leggi_json($scartati_file, array());
    $scartati[$pid] = array(
        "titolo" => mb_substr($titolo, 0, 120),
        "data"   => date('d/m/Y H:i:s')
    );

    if (!scrivi_json_atomico($pending_file, $pending_data)) {
        errore("Impossibile aggiornare la lista d'attesa.", 500);
    }
    scrivi_json_atomico($scartati_file, $scartati);

    echo json_encode(array(
        "status"        => "success",
        "message"       => "Candidato scartato: non verra' piu' riproposto.",
        "pending_count" => count($pending_data['pending']),
        "scartati_count" => count($scartati)
    ));
    exit();
}

// --------------------------------------------------------------- svuota
if ($azione === 'svuota') {
    $quanti = count($pending_data['pending']);
    $scartati = leggi_json($scartati_file, array());

    foreach ($pending_data['pending'] as $p) {
        if (!isset($p['product_id'])) continue;
        $scartati[(string)$p['product_id']] = array(
            "titolo" => mb_substr(isset($p['title']) ? $p['title'] : '', 0, 120),
            "data"   => date('d/m/Y H:i:s')
        );
    }

    $pending_data['pending'] = array();
    $pending_data['count'] = 0;

    if (!scrivi_json_atomico($pending_file, $pending_data)) {
        errore("Impossibile svuotare la lista d'attesa.", 500);
    }
    scrivi_json_atomico($scartati_file, $scartati);

    echo json_encode(array(
        "status"        => "success",
        "message"       => "$quanti candidati scartati.",
        "pending_count" => 0
    ));
    exit();
}

errore("Azione '$azione' non riconosciuta.");
?>
