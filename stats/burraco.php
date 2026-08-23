<?php
// Endpoint statistiche burraco: riceve una mano conclusa e la scrive.
// Non riceve ne' scrive dati identificativi: giocatore_id e' un valore
// casuale generato dal browser, l'IP non viene registrato da nessuna parte.
// Il consenso e' verificato lato client (finalita' publisher 1 e 10): qui
// non arriva nulla se manca, e comunque nulla di riconducibile a una persona.
//
// Oltre alla mano, il client dichiara CHI L'HA GIOCATA: per ogni sedia occupata
// da un automa manda la versione del codice e i parametri che distinguono
// quella configurazione. Qui quelle descrizioni non finiscono nella riga della mano -
// verrebbero ricopiate identiche centomila volte - ma vengono ridotte a una
// firma e depositate in burraco_motori, che ne tiene una copia sola. La mano
// porta solo quattro numerini da 2 byte. Vedi schema.sql.

// Su quale database si scrive - in casa quello di Local, online quello di
// Aruba - lo decide comune.php in base a quale file di configurazione esiste.
// Qui dentro non c'e' nessuna differenza fra le due situazioni, ed e' il punto.
require_once __DIR__ . '/comune.php';

// Per quanto si tengono le mani. L'informativa non dichiara una cifra: dichiara
// il criterio ("per il tempo strettamente necessario a confrontare gli algoritmi
// di gioco"), e questa costante e' il modo in cui quel criterio viene attuato.
// Il numero si puo' quindi cambiare senza toccare l'informativa.
const MESI_STORICO  = 24;
// La mano da sola stava in poche centinaia di byte. Adesso puo' portarsi
// dietro la descrizione di quattro motori, e ognuna ha il suo tetto stretto
// qui sotto (MAX_BYTE_PARAMETRI): 4 KiB e' comodo per il caso peggiore vero e
// resta stretto abbastanza da non essere un invito a riempire il database.
const MAX_BYTE_BODY      = 4096;
const MAX_BYTE_PARAMETRI = 800;   // per motore, dopo la normalizzazione
const MAX_PARAMETRI      = 40;    // quanti coefficienti al massimo per motore

header('Content-Type: application/json; charset=utf-8');

function esci($codice, $messaggio) {
    http_response_code($codice);
    echo json_encode(['ok' => false, 'errore' => $messaggio]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') esci(405, 'metodo');

// Tetto alla dimensione: prima di leggere, non dopo.
$lunghezza = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($lunghezza <= 0 || $lunghezza > MAX_BYTE_BODY) esci(413, 'dimensione');

$grezzo = file_get_contents('php://input', false, null, 0, MAX_BYTE_BODY + 1);
if ($grezzo === false || strlen($grezzo) > MAX_BYTE_BODY) esci(413, 'dimensione');

$dati = json_decode($grezzo, true);
if (!is_array($dati)) esci(400, 'json');

// ---- Validazione campo per campo -------------------------------------------
// Niente passa in tabella senza essere stato controllato qui: cio' che non
// corrisponde viene rifiutato, non corretto in silenzio.

function id_breve($v) {
    return (is_string($v) && preg_match('/^[a-z0-9]{6,20}$/', $v)) ? $v : null;
}
function intero($v, $min, $max) {
    if (!is_int($v) && !(is_string($v) && preg_match('/^-?\d+$/', $v))) return null;
    $n = (int)$v;
    return ($n >= $min && $n <= $max) ? $n : null;
}
// Il seme e' l'unico numero che puo' non stare in un intero di PHP, e non e'
// un caso di scuola: i semi dei mazzi ripetibili sono a 32 bit SENZA segno
// (l'LCG chiude con >>> 0), quindi quasi meta' supera 2.147.483.647. Su un PHP
// a 32 bit - quello di Local - json_decode li consegna come float, is_int()
// dice di no e intero() li rifiuta: la mano se ne andrebbe con un 400 che il
// browser non vede, perche' sendBeacon non riporta niente.
//
// Quindi il seme non passa da (int): si controlla che sia fatto di sole cifre
// e si consegna a MySQL come TESTO, che lo mette in BIGINT senza perdere una
// cifra qualunque sia la macchina. Il confronto col tetto e' fra stringhe -
// prima la lunghezza, poi l'ordine alfabetico - proprio per non tornare a
// passare da un numero.
function intero_grande($v, $max) {
    if (is_int($v))         $s = (string)$v;
    elseif (is_float($v))   $s = (is_finite($v) && $v >= 0 && floor($v) === $v)
                                 ? number_format($v, 0, '', '') : null;
    elseif (is_string($v))  $s = $v;
    else                    $s = null;
    if ($s === null || !preg_match('/^\d{1,20}$/', $s)) return null;
    $s = ltrim($s, '0');
    if ($s === '') $s = '0';
    $m = (string)$max;
    if (strlen($s) > strlen($m) || (strlen($s) === strlen($m) && strcmp($s, $m) > 0)) return null;
    return $s;
}
// Il limite deve restare uguale a quello della colonna: piu' stretto qui
// significherebbe rifiutare mani legittime, piu' largo un troncamento
// silenzioso al momento della scrittura.
//
// Allargato da 60 a 120 il 23/08/2026 (vedi alter-2026-08-23-burrachi-120.sql).
// 60 era stato dimensionato su due burachi; il massimo vero e' piu' alto, sei
// 'semipulito' fanno 65 caratteri. Una mano oltre il tetto non veniva
// troncata: veniva rifiutata con un 400, e sendBeacon non lo dice a nessuno.
function elenco_burrachi($v) {
    if ($v === null || $v === '') return '';
    if (!is_string($v) || strlen($v) > 120) return null;
    foreach (explode(',', $v) as $t) {
        if (!in_array($t, ['pulito', 'semipulito', 'sporco'], true)) return null;
    }
    return $v;
}

$mano_id = id_breve($dati['mano_id'] ?? null);
if ($mano_id === null) esci(400, 'mano_id');

$campi = [
    'mano_id'       => $mano_id,
    'giocatore_id'  => isset($dati['giocatore_id']) ? id_breve($dati['giocatore_id']) : null,
    'torneo_id'     => isset($dati['torneo_id'])    ? id_breve($dati['torneo_id'])    : null,
    'mano_num'      => intero($dati['mano_num']   ?? 1, 1, 999),
    'modalita'      => in_array($dati['modalita'] ?? '', ['1v1', '2v2'], true) ? $dati['modalita'] : null,
    // A = nessuno modificato, B = avversari modificati, C = compagno modificato.
    // La lista deve restare uguale all'ENUM della colonna: un valore in piu' qui
    // sarebbe un errore SQL a ogni mano, uno in meno un rifiuto silenzioso di
    // tutto un braccio - e chi manda con sendBeacon non vede la risposta.
    'braccio'       => in_array($dati['braccio']  ?? '', ['A', 'B', 'C'], true) ? $dati['braccio']  : null,
    // Versione del GIOCO. Quella del motore non sta qui: sta in burraco_motori,
    // perche' adesso puo' essere diversa da una sedia all'altra.
    // I tre ?? devono esserci tutti e tre: il primo copriva solo is_string(),
    // e con la chiave assente strlen() sbraitava due warning. Chi gioca manda
    // sempre la versione, quindi non e' mai successo online — ma se succedesse
    // con display_errors acceso i warning uscirebbero PRIMA del JSON, e allora
    // http_response_code() dentro esci() non potrebbe piu' cambiare niente:
    // un rifiuto verrebbe spedito con un 200 addosso.
    'versione'      => (is_string($dati['versione'] ?? '') && strlen($dati['versione'] ?? '') <= 10) ? ($dati['versione'] ?? '') : null,
    'esito'         => intero($dati['esito']      ?? null, 0, 1),
    'punti_noi'     => intero($dati['punti_noi']  ?? null, -32000, 32000),
    'punti_loro'    => intero($dati['punti_loro'] ?? null, -32000, 32000),
    'chiusura'      => intero($dati['chiusura']   ?? null, -1, 1),
    'burrachi_noi'  => elenco_burrachi($dati['burrachi_noi']  ?? ''),
    'burrachi_loro' => elenco_burrachi($dati['burrachi_loro'] ?? ''),
    'pozzetto_noi'  => intero($dati['pozzetto_noi']  ?? null, 0, 1),
    'pozzetto_loro' => intero($dati['pozzetto_loro'] ?? null, 0, 1),
    'durata_s'      => intero($dati['durata_s']      ?? null, 0, 86400),
];

// giocatore_id e torneo_id possono legittimamente essere NULL, gli altri no.
foreach ($campi as $nome => $valore) {
    if ($valore === null && $nome !== 'giocatore_id' && $nome !== 'torneo_id') esci(400, $nome);
}

// Il seme del mazzo: c'e' solo nelle prove offline a mazzi ripetibili.
// Il tetto e' 2^53-1, il piu' grande intero che JavaScript sa maneggiare senza
// arrotondarlo: oltre quello il client manderebbe un numero diverso da quello
// che ha usato per mescolare, che e' peggio del non averlo. E' scritto come
// TESTO perche' su un PHP a 32 bit questa cifra e' gia' un float, e passarla
// come numero rovinerebbe proprio il confronto che deve proteggerla.
$campi['seme'] = isset($dati['seme']) && $dati['seme'] !== null
    ? intero_grande($dati['seme'], '9007199254740991')
    : null;
if (isset($dati['seme']) && $dati['seme'] !== null && $campi['seme'] === null) esci(400, 'seme');

// Il mazziere: indice del posto al tavolo, 0-3 (vedi schema.sql per la mappa).
// Manca solo nelle mani raccolte prima che questa colonna esistesse, quindi il
// NULL si accetta ma un valore fuori scala no - meglio un rifiuto rumoroso che
// una colonna che sembra piena e non lo e'.
$campi['mazziere'] = isset($dati['mazziere']) && $dati['mazziere'] !== null
    ? intero($dati['mazziere'], 0, 3)
    : null;
if (isset($dati['mazziere']) && $dati['mazziere'] !== null && $campi['mazziere'] === null) esci(400, 'mazziere');
// In 1v1 i posti sono due: un mazziere 2 o 3 vorrebbe dire che il client ha
// mandato l'indice di una sedia che in quella partita non esiste.
if ($campi['modalita'] === '1v1' && $campi['mazziere'] !== null && $campi['mazziere'] > 1) esci(400, 'mazziere');

// ---- I motori ---------------------------------------------------------------
// Il client manda, per ogni sedia occupata da un automa:
//   {"v": "10.2", "p": {"parsimoniaMatte": 8, "premioTris": 12}}
// dove "p" contiene SOLO cio' che differisce dalla tabella di base. Un
// coefficiente lasciato al valore di serie NON compare: e' l'assenza della
// chiave a dire "quello non l'ho toccato", non un null. Una sedia vuota (il
// posto nostro quando gioca una persona, il compagno in 1v1) e' assente
// oppure null.
//
// "p" vuoto o assente vuol dire "la tabella di base cosi' com'e'": e' quello
// che altrove si chiamerebbe il motore standard, e non ha bisogno di un nome.

const SEDIE = ['noi', 'compagno', 'avv1', 'avv2'];

// Due configurazioni identiche devono produrre la stessa firma anche se il
// client ha elencato i parametri in ordine diverso: le chiavi si ordinano
// prima di serializzare. I parametri sono volutamente PIATTI - nomi e valori
// scalari, niente oggetti annidati - perche' cosi' ogni parametro ha un
// percorso JSON di un pezzo solo ($.nome) ed e' interrogabile senza acrobazie.
// "Coefficiente non modificato" si dice TOGLIENDO la chiave, non mettendola a
// null: {"parsimoniaMatte": null} e {} sono la stessa configurazione, e se
// passassero tutti e due nascerebbero due firme per una cosa sola. Il null
// quindi non e' un valore ammesso - e' un errore di chi lo manda.
function normalizza_parametri($p) {
    if (!is_array($p) || $p === []) return null;         // niente parametri: e' lo standard nudo
    if (count($p) > MAX_PARAMETRI) return false;
    $out = [];
    foreach ($p as $k => $v) {
        if (!is_string($k) || !preg_match('/^[A-Za-z_][A-Za-z0-9_.\-]{0,39}$/', $k)) return false;
        if (is_string($v)) {
            if (strlen($v) > 40) return false;
        } elseif (!is_int($v) && !is_float($v) && !is_bool($v)) {
            return false;                                // niente null, niente array, niente oggetti
        }
        $out[$k] = $v;
    }
    ksort($out);
    return $out;
}

// Da quello che ha mandato il client alla riga che andra' (semmai) in tabella.
// Restituisce null per sedia vuota, false se c'e' qualcosa che non va.
function descrivi_motore($m) {
    if ($m === null || $m === []) return null;
    if (!is_array($m)) return false;

    // La versione identifica il CODICE, i parametri identificano i numeri: due
    // assi, e insieme dicono tutto. Non c'e' un terzo campo "tipo" perche' non
    // aggiungerebbe niente (vedi la nota in schema.sql).
    $versione = $m['v'] ?? '';
    if (!is_string($versione) || strlen($versione) > 20) return false;

    $par = normalizza_parametri($m['p'] ?? null);
    if ($par === false) return false;

    $json = $par === null ? null : json_encode($par, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json !== null && strlen($json) > MAX_BYTE_PARAMETRI) return false;

    // L'identita' e' il contenuto. Nessuno deve ricordarsi di registrare un
    // motore prima di usarlo: si registra da solo la prima volta che gioca, e
    // due prove fatte a mesi di distanza con la stessa configurazione ricadono
    // sulla stessa riga da sole.
    return [
        'firma'     => md5($versione . '|' . ($json ?? '')),
        'versione'  => $versione,
        'parametri' => $json,
    ];
}

$motori = $dati['motori'] ?? [];
if (!is_array($motori)) esci(400, 'motori');

$descrizioni = [];
foreach (SEDIE as $sedia) {
    $d = descrivi_motore($motori[$sedia] ?? null);
    if ($d === false) esci(400, 'motore_' . $sedia);
    $descrizioni[$sedia] = $d;                   // null = sedia vuota
}

// ---- Scrittura --------------------------------------------------------------

$cfg = stats_configurazione();
if ($cfg === null) esci(500, 'config');

// Cerca la configurazione, e se non c'e' la deposita. Il costo e' una SELECT su
// una chiave unica di una tabella da qualche decina di righe: MySQL se la tiene
// in memoria e non tocca il disco.
function id_motore(PDO $pdo, array $d) {
    static $cercato = null, $inserisci = null;
    if ($cercato === null) {
        $cercato   = $pdo->prepare('SELECT id FROM burraco_motori WHERE firma = ?');
        $inserisci = $pdo->prepare('INSERT INTO burraco_motori (firma, versione, parametri)
                                    VALUES (?, ?, ?)');
    }

    $cercato->execute([$d['firma']]);
    $id = $cercato->fetchColumn();
    if ($id !== false) return (int)$id;

    try {
        $inserisci->execute([$d['firma'], $d['versione'], $d['parametri']]);
        return (int)$pdo->lastInsertId();
    } catch (PDOException $e) {
        // Due partite finite nello stesso istante con un motore mai visto: la
        // chiave unica ne ha lasciata passare una sola. L'altra rilegge l'id di
        // quella invece di fallire, che e' il senso di avere la chiave unica.
        $cercato->execute([$d['firma']]);
        $id = $cercato->fetchColumn();
        if ($id === false) throw $e;
        return (int)$id;
    }
}

try {
    $pdo = new PDO(
        "mysql:host={$cfg['host']};port={$cfg['porta']};dbname={$cfg['db']};charset=utf8mb4",
        $cfg['user'],
        $cfg['pass'],
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    foreach (SEDIE as $sedia) {
        $campi['motore_' . $sedia] = $descrizioni[$sedia] === null
            ? null
            : id_motore($pdo, $descrizioni[$sedia]);
    }

    // INSERT IGNORE: un doppio invio della stessa mano non crea una riga in piu'
    // (mano_id e' UNIQUE). Non e' un caso teorico: basta un reload a meta' invio.
    $sql = 'INSERT IGNORE INTO burraco_partite
            (mano_id, giocatore_id, torneo_id, mano_num, modalita, braccio, versione,
             motore_noi, motore_compagno, motore_avv1, motore_avv2, seme, mazziere,
             esito, punti_noi, punti_loro, chiusura, burrachi_noi, burrachi_loro,
             pozzetto_noi, pozzetto_loro, durata_s)
            VALUES (:mano_id, :giocatore_id, :torneo_id, :mano_num, :modalita, :braccio, :versione,
                    :motore_noi, :motore_compagno, :motore_avv1, :motore_avv2, :seme, :mazziere,
                    :esito, :punti_noi, :punti_loro, :chiusura, :burrachi_noi, :burrachi_loro,
                    :pozzetto_noi, :pozzetto_loro, :durata_s)';
    $st = $pdo->prepare($sql);
    $st->execute($campi);

    // Il contatore si muove solo se la mano e' entrata davvero: contare anche i
    // doppi invii vorrebbe dire gonfiare proprio il numero che si guarda per
    // sapere quanti dati si hanno su un motore. E si muove di UNO per mano, non
    // per sedia: in 2v2 lo stesso motore siede spesso in due posti.
    $ids = array_values(array_unique(array_filter([
        $campi['motore_noi'], $campi['motore_compagno'],
        $campi['motore_avv1'], $campi['motore_avv2'],
    ], fn($v) => $v !== null)));
    if ($st->rowCount() > 0 && $ids) {
        $pdo->prepare('UPDATE burraco_motori SET mani = mani + 1, ultima_volta = NOW()
                       WHERE id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')')
            ->execute($ids);
    }

    // Purga dei dati scaduti senza cron: la paga circa una richiesta su 200.
    // I motori non si purgano: sono una manciata di righe e senza di loro le
    // mani superstiti diventerebbero illeggibili.
    if (random_int(1, 200) === 1) {
        $pdo->exec('DELETE FROM burraco_partite
                    WHERE creato_il < NOW() - INTERVAL ' . MESI_STORICO . ' MONTH');
    }
} catch (Throwable $e) {
    // Il messaggio del driver puo' contenere host e nome del database: non esce di qui.
    error_log('stats burraco: ' . $e->getMessage());
    esci(500, 'db');
}

echo json_encode(['ok' => true]);
