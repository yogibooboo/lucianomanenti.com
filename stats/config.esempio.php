<?php
// MODELLO. Il file vero si chiama stats-config.php e non sta nel repository
// (.gitignore lo esclude): contiene la password del database.
//
// DOVE METTERLO
// Chi lo cerca e' comune.php, che prova in quest'ordine e si ferma al primo
// file che restituisce un array (stats_candidati()):
//
//   1. stats/stats-config.locale.php   la configurazione di casa - c'e' gia',
//                                      e si tira indietro da sola quando il
//                                      sito non e' servito da un host locale
//   2. ../../stats-config.php          due cartelle sopra: fuori dal webroot,
//   3. ../stats-config.php             una sopra
//   4. stats/stats-config.php          accanto agli script
//
// Fuori dal webroot sarebbe meglio, ma su Aruba non c'e' una cartella sopra
// raggiungibile via FTP: si usa la quarta posizione, come fa banner/config.php,
// e la protegge il .htaccess di questa cartella (che serve al caso in cui il
// server smetta di interpretare il PHP e lo consegni come testo).
//
// Un file che restituisce null significa "non tocca a me" e la ricerca prosegue:
// e' il motivo per cui una copia locale caricata per sbaglio non fa danni.

return [
    'host'  => '31.11.38.30', // hostname dopo l'aggiornamento a MySQL 8 del 20/08/2026
    'db'    => '',            // uno dei cinque, es. Sql824778_2
    'user'  => 'Sql824778',
    'pass'  => '',
    'porta' => 3306,

    // Chiave della pagina di prova: inventane una qualsiasi.
    // Serve solo finche' prova-db.php resta online, poi si cancella il file.
    'chiave_prova' => '',

    // Chiave di esporta.php, che invece resta online: tienila diversa dall'altra
    // e piu' lunga, perche' e' l'unica cosa fra un estraneo e tutti i dati.
    'chiave_export' => '',
];
