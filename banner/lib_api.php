<?php
// ==========================================
// LIBRERIA CONDIVISA DI ACCESSO ALLE API AMAZON E ALIEXPRESS
//
// Inclusa da:
//   - aggiorna_offerte.php   (sincronizzazione completa, a blocchi)
//   - api_ricevi_comune.php  (inserimento singolo dall'estensione o da newgallery)
//
// Tutte le funzioni sono protette da function_exists: aggiorna_offerte.php
// definiva gia' le due generateAli* e va incluso senza conflitti.
//
// NOTA: le funzioni qui dentro chiamano log_msg() se disponibile. Chi include
// questo file senza definirla ottiene comunque il fallback silenzioso sotto.
// ==========================================

if (!function_exists('log_msg')) {
    function log_msg($msg, $msg_video = null) { /* nessun log configurato */ }
}

// Endpoint Amazon, condivisi da tutti i chiamanti. Sono costanti e non
// credenziali: quelle restano in config.php.
if (!defined('AMZ_MARKETPLACE'))    define('AMZ_MARKETPLACE', 'www.amazon.it');
if (!defined('AMZ_TOKEN_ENDPOINT')) define('AMZ_TOKEN_ENDPOINT', 'https://api.amazon.co.uk/auth/o2/token'); // Europa
if (!defined('AMZ_API_ENDPOINT'))   define('AMZ_API_ENDPOINT', 'https://creatorsapi.amazon/catalog/v1/getItems');

// ==========================================
// PREZZO DI RIFERIMENTO
//
// Campi aggiunti ai record di newdeals.json:
//   ref_price  prezzo (stringa, stesso formato di 'price') al primo rilevamento
//   ref_badge  sconto corrispondente, per confronto
//   ref_date   quando il riferimento e' stato fissato
//
// Sono campi facoltativi: i record che non li hanno funzionano come prima e
// vengono inizializzati al primo aggiornamento utile. Nessun'altra parte del
// sito li legge, quindi la loro presenza non cambia il comportamento dei banner.
// ==========================================

if (!function_exists('prezzo_a_numero')) {
    /**
     * Converte i prezzi memorizzati in un numero confrontabile.
     * I formati in uso sono eterogenei: "23,01 €" (Amazon), "da 2,88 €"
     * (AliExpress), piu' i segnaposto "Errore", "Non Dispon.", "Link Assente".
     *
     * @return float|null null se la stringa non contiene un prezzo
     */
    function prezzo_a_numero($testo) {
        if (!is_string($testo) && !is_numeric($testo)) return null;
        $t = (string)$testo;

        // Si tiene solo cifre, punti e virgole: via "da", "€", spazi unificatori.
        $pulito = preg_replace('/[^0-9,.]/', '', $t);
        if ($pulito === '' || !preg_match('/\d/', $pulito)) return null;

        // Separatore decimale: in "1.234,56" e' la virgola, in "1,234.56" il punto.
        $ultimaVirgola = strrpos($pulito, ',');
        $ultimoPunto   = strrpos($pulito, '.');

        if ($ultimaVirgola !== false && $ultimoPunto !== false) {
            if ($ultimaVirgola > $ultimoPunto) {
                $pulito = str_replace('.', '', $pulito);
                $pulito = str_replace(',', '.', $pulito);
            } else {
                $pulito = str_replace(',', '', $pulito);
            }
        } else if ($ultimaVirgola !== false) {
            // Virgola singola: decimale se separa 1-2 cifre finali ("2,88"),
            // altrimenti migliaia ("1,234").
            $dopo = strlen($pulito) - $ultimaVirgola - 1;
            $pulito = ($dopo <= 2) ? str_replace(',', '.', $pulito) : str_replace(',', '', $pulito);
        } else if ($ultimoPunto !== false) {
            $dopo = strlen($pulito) - $ultimoPunto - 1;
            if ($dopo === 3) $pulito = str_replace('.', '', $pulito);   // "1.234" = migliaia
        }

        if (!is_numeric($pulito)) return null;
        $v = (float)$pulito;
        return ($v > 0) ? $v : null;
    }
}

if (!function_exists('normalizza_prezzo_riferimento')) {
    /**
     * Ripulisce il prezzo prima di memorizzarlo come riferimento.
     *
     * Il prefisso "da" degli articoli AliExpress e' un'aggiunta nostra (il
     * prezzo API e' un minimo teorico), non un dato del prodotto: nel campo
     * 'price' serve al visitatore, ma nel riferimento e' solo rumore, perche'
     * il confronto e' fra due numeri. Si toglie qui, cosi' ref_price resta
     * confrontabile e leggibile allo stesso modo per entrambi gli store.
     */
    function normalizza_prezzo_riferimento($prezzo) {
        $p = trim((string)$prezzo);
        // Solo il "da" iniziale: un "da" dentro il testo non va toccato.
        $p = preg_replace('/^\s*da\s+/iu', '', $p);
        return trim($p);
    }
}

if (!function_exists('calcola_riferimento')) {
    /**
     * Decide i valori ref_* da scrivere sul record aggiornato.
     *
     * Il riferimento si fissa una volta sola, al primo prezzo valido, e da li'
     * non si tocca piu': e' il termine di paragone. Un prezzo non leggibile
     * (prodotto esaurito, errore API) non lo sovrascrive, altrimenti la
     * variazione andrebbe persa proprio quando serve.
     *
     * @param array  $precedente record com'era prima dell'aggiornamento
     * @param string $prezzo_nuovo prezzo appena rilevato
     * @param string $badge_nuovo  sconto appena rilevato
     * @return array campi ref_* da unire al record (vuoto se non applicabile)
     */
    function calcola_riferimento($precedente, $prezzo_nuovo, $badge_nuovo) {
        // Riferimento gia' presente e valido: si conserva immutato.
        if (isset($precedente['ref_price']) && prezzo_a_numero($precedente['ref_price']) !== null) {
            return array(
                // Normalizzato anche qui: ripulisce i riferimenti scritti prima
                // che il prefisso "da" venisse escluso. Il valore numerico non
                // cambia, quindi il termine di paragone resta lo stesso.
                'ref_price' => normalizza_prezzo_riferimento($precedente['ref_price']),
                'ref_badge' => isset($precedente['ref_badge']) ? $precedente['ref_badge'] : '',
                'ref_date'  => isset($precedente['ref_date']) ? $precedente['ref_date'] : ''
            );
        }

        // Primo rilevamento: si fissa solo se il prezzo e' davvero un numero.
        if (prezzo_a_numero($prezzo_nuovo) === null) return array();

        return array(
            // Senza il prefisso "da": vedi normalizza_prezzo_riferimento().
            'ref_price' => normalizza_prezzo_riferimento($prezzo_nuovo),
            'ref_badge' => (string)$badge_nuovo,
            'ref_date'  => date('d/m/Y H:i:s')
        );
    }
}

if (!function_exists('generateAliSignature')) {
    function generateAliSignature($params, $appSecret) {
        ksort($params);
        $signString = '';
        foreach ($params as $k => $v) {
            // La chiave 'sign' non deve mai entrare nel calcolo del proprio hash.
            if ($k === 'sign') continue;
            if (is_scalar($v) && $v !== '' && $v !== null) $signString .= $k . $v;
        }
        return strtoupper(md5($appSecret . $signString . $appSecret));
    }
}

if (!function_exists('aliChiamata')) {
    /**
     * Esegue una chiamata all'endpoint AliExpress con firma e retry sul limite
     * di frequenza. AliExpress risponde HTTP 200 anche sugli errori applicativi,
     * che vanno cercati nella chiave 'error_response'.
     *
     * @return array array('data' => array|null, 'http_code' => int, 'errore' => string)
     */
    function aliChiamata($params, $appSecret, $timeout = 30, $max_tentativi = 6, $etichetta = '') {
        $tentativo = 0;
        $api_data = null;
        $api_response = '';
        $http_code = 0;
        $curl_err = '';

        while ($tentativo < $max_tentativi) {
            // Timestamp e firma vanno rigenerati a ogni tentativo: il timestamp
            // fa parte della firma e non puo' essere riutilizzato.
            $params['timestamp'] = date('Y-m-d H:i:s');
            unset($params['sign']);
            $params['sign'] = generateAliSignature($params, $appSecret);

            $ch = curl_init('https://api-sg.aliexpress.com/sync');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
            curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/x-www-form-urlencoded;charset=utf-8'));
            $api_response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curl_err = curl_error($ch);
            curl_close($ch);

            $api_data = ($api_response !== false) ? json_decode($api_response, true) : null;

            // Si riprova solo sul limite di frequenza; ogni altro esito e' definitivo.
            $is_rate_limit = (isset($api_data['error_response']['code'])
                && strpos((string)$api_data['error_response']['code'], 'ApiCallLimit') !== false);

            if ($is_rate_limit && $tentativo < $max_tentativi - 1) {
                $tentativo++;
                // Backoff esponenziale: 5s, 10s, 20s, 40s, 60s (~135s totali).
                // Il limite AliExpress e' a finestra temporale: attese brevi e
                // lineari (3s+6s) non bastano a farla scorrere e il blocco
                // falliva definitivamente, marcando i prodotti come inattivi.
                $attesa = min(60, 5 * pow(2, $tentativo - 1));
                log_msg("Limite di frequenza AliExpress" . ($etichetta ? " ($etichetta)" : "")
                    . ". Tentativo $tentativo/" . ($max_tentativi - 1) . " tra $attesa secondi...");
                sleep($attesa);
                continue;
            }
            break;
        }

        $errore = '';
        if ($http_code != 200) {
            $errore = "HTTP $http_code" . ($curl_err ? " ($curl_err)" : '');
        } else if ($api_data === null) {
            $errore = "risposta non decodificabile come JSON";
        } else if (isset($api_data['error_response'])) {
            $er = $api_data['error_response'];
            $errore = "code=" . (isset($er['code']) ? $er['code'] : '?')
                . ' ' . (isset($er['msg']) ? $er['msg'] : '')
                . ' ' . (isset($er['sub_msg']) ? $er['sub_msg'] : '');
        }

        return array('data' => $api_data, 'http_code' => $http_code, 'errore' => trim($errore));
    }
}

if (!function_exists('generateAliShortLink')) {
    function generateAliShortLink($source_url, $appKey, $appSecret, $trackingId) {
        if (empty($source_url)) return $source_url;

        // Questa funzione viene chiamata una volta per prodotto: e' la principale
        // sorgente di traffico verso le API ed e' quella che satura il limite di
        // frequenza. Piccola pausa preventiva + retry sul limite.
        usleep(250000); // 250 ms tra una generazione di link e la successiva

        $esito = aliChiamata(array(
            'method' => 'aliexpress.affiliate.link.generate',
            'app_key' => $appKey,
            'sign_method' => 'md5',
            'format' => 'json',
            'v' => '2.0',
            'promotion_link_type' => '0',
            'source_values' => $source_url,
            'tracking_id' => $trackingId
        ), $appSecret, 15, 3, 'generazione link');

        $api_data = $esito['data'];
        if ($api_data) {
            $links = isset($api_data['aliexpress_affiliate_link_generate_response']['resp_result']['result']['promotion_links']['promotion_link'])
                ? $api_data['aliexpress_affiliate_link_generate_response']['resp_result']['result']['promotion_links']['promotion_link']
                : array();
            if (isset($links[0]['promotion_link']) && !empty($links[0]['promotion_link'])) {
                return $links[0]['promotion_link'];
            }
        }

        // Fallback: si restituisce il link di partenza (gia' tracciato dall'API
        // prodotto), quindi l'affiliazione non va persa.
        return $source_url;
    }
}

if (!function_exists('aliDettagliProdotti')) {
    /**
     * Recupera i dettagli di uno o piu' prodotti AliExpress.
     *
     * @param array $product_ids elenco di Product ID
     * @return array array('prodotti' => array, 'errore' => string)
     */
    function aliDettagliProdotti($product_ids, $appKey, $appSecret, $trackingId, $etichetta = '') {
        $esito = aliChiamata(array(
            'method' => 'aliexpress.affiliate.productdetail.get',
            'app_key' => $appKey,
            'sign_method' => 'md5',
            'format' => 'json',
            'v' => '2.0',
            'product_ids' => implode(',', $product_ids),
            'target_currency' => 'EUR',
            'target_language' => 'IT',
            'ship_to_country' => 'IT',
            'tracking_id' => $trackingId
        ), $appSecret, 30, 3, $etichetta);

        if ($esito['errore'] !== '') {
            return array('prodotti' => array(), 'errore' => $esito['errore']);
        }

        $prodotti = isset($esito['data']['aliexpress_affiliate_productdetail_get_response']['resp_result']['result']['products']['product'])
            ? $esito['data']['aliexpress_affiliate_productdetail_get_response']['resp_result']['result']['products']['product']
            : array();

        // Con un solo prodotto l'API puo' restituire l'oggetto invece dell'array.
        if (isset($prodotti['product_id'])) $prodotti = array($prodotti);

        return array('prodotti' => $prodotti, 'errore' => '');
    }
}

if (!function_exists('amazonToken')) {
    /**
     * Ottiene il token OAuth 2.0 per la Creators API.
     * @return array array('token' => string, 'errore' => string)
     */
    function amazonToken($clientId, $clientSecret, $tokenEndpoint) {
        // La Creators API vuole il payload in JSON, non form-urlencoded.
        $ch = curl_init($tokenEndpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 20);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(array(
            'grant_type' => 'client_credentials',
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'scope' => 'creatorsapi::default'
        )));
        curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
        $risposta = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_err = curl_error($ch);
        curl_close($ch);

        if ($risposta === false) {
            return array('token' => '', 'errore' => "connessione fallita: $curl_err");
        }
        $dati = json_decode($risposta, true);
        if (!isset($dati['access_token'])) {
            return array('token' => '', 'errore' => "HTTP $http_code, token assente: " . substr((string)$risposta, 0, 300));
        }
        return array('token' => $dati['access_token'], 'errore' => '');
    }
}

if (!function_exists('amazonDettagliProdotti')) {
    /**
     * Recupera i dettagli di uno o piu' ASIN via Creators API getItems.
     *
     * @return array array('prodotti' => array, 'errore' => string)
     */
    function amazonDettagliProdotti($asins, $token, $partnerTag, $apiEndpoint, $marketplace = 'www.amazon.it') {
        $payload = json_encode(array(
            'itemIds' => array_values($asins),
            'itemIdType' => 'ASIN',
            'marketplace' => $marketplace,
            'partnerTag' => $partnerTag,
            'resources' => array(
                'images.primary.large',
                'images.variants.large',
                'itemInfo.title',
                'offersV2.listings.price'
            )
        ));

        // Retry progressivo sul rate limit, come nel ciclo a blocchi.
        $tentativo = 0;
        $max_tentativi = 3;
        $risposta = false;
        $http_code = 0;
        $curl_err = '';

        while ($tentativo < $max_tentativi) {
            $ch = curl_init($apiEndpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_HTTPHEADER, array(
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
                'x-marketplace: ' . $marketplace
            ));
            $risposta = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curl_err = curl_error($ch);
            curl_close($ch);

            if ($http_code == 429 && $tentativo < $max_tentativi - 1) {
                $tentativo++;
                $attesa = $tentativo * 2; // 2s, 4s
                log_msg("Rilevato HTTP 429 (Rate Limit) Amazon. Tentativo $tentativo/" . ($max_tentativi - 1) . " tra $attesa secondi...");
                sleep($attesa);
                continue;
            }
            break;
        }

        if ($risposta === false) {
            return array('prodotti' => array(), 'errore' => "connessione fallita: $curl_err");
        }
        if ($http_code != 200) {
            return array('prodotti' => array(), 'errore' => "HTTP $http_code: " . substr((string)$risposta, 0, 300));
        }

        $dati = json_decode($risposta, true);
        if (!is_array($dati)) {
            return array('prodotti' => array(), 'errore' => "risposta non decodificabile come JSON");
        }

        $prodotti = isset($dati['itemsResult']['items']) ? $dati['itemsResult']['items'] : array();
        return array('prodotti' => $prodotti, 'errore' => '');
    }
}
