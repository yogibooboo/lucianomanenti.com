// woowoo2 - i binari disegnati dal codice, non ritagliati da un'immagine.
//
// IL NUMERO DELLA PIASTRELLA E' LA GEOMETRIA. In `woowoo2-codici.js' sta
// scritto che il 13 collega est-ovest oppure ovest-sud; qui quella riga
// diventa un disegno. Non c'e' nessuna tabella di figure di mezzo: si prende
// la rotta, si costruisce la linea di mezzeria, e sopra quella linea si
// stendono massicciata, traversine e rotaie.
//
// Serve a due cose:
//   1. il gioco non ha piu' bisogno di un atlante disegnato a mano per i
//      binari (prato, ponte, stazioni e paesaggio restano immagini);
//   2. uno scambio puo' MUOVERSI. Fra i due stati di uno scambio c'e' un
//      lato in comune - la punta - e parametrizzando le due rotte dalla punta
//      con la stessa u si passa dall'una all'altra interpolando: a u = 0 i due
//      punti coincidono, percio' il binario resta incernierato sulla punta e
//      si apre a ventaglio verso il fondo. L'incrocio non ha una punta in
//      comune e li' si gira: un dritto solo, imperniato al centro, che fa un
//      quarto di giro.
//
// La massicciata non si muove mai: si disegna l'unione delle due rotte e resta
// ferma. Sono rotaie e traversine che si spostano, e questo tiene la casella
// leggibile come scambio durante tutto il movimento.

window.W2BINARI = (function () {
    'use strict';

    var C = 64;          // lato della piastrella disegnata
    var R = C / 2;       // raggio della curva: passa per i punti di mezzo dei lati
    var DURATA = 180;    // millisecondi di commutazione
    var PASSI = 12;      // fotogrammi distinti del movimento (si tengono in cassetto)
    var PONTE = 7;       // l'unico codice con una rotta che NON disegniamo qui

    // Quali lati toccano le sei rotte. Serve a trovare il lato in comune fra
    // i due stati di uno scambio, cioe' la punta.
    var ESTREMI = {
        EO: ['O', 'E'], NS: ['N', 'S'], NE: ['N', 'E'],
        NO: ['N', 'O'], ES: ['E', 'S'], SO: ['O', 'S']
    };

    // La mezzeria, con u da 0 a 1. I dritti sono segmenti, le curve quarti di
    // cerchio di raggio 32 centrati sullo spigolo: cosi' partono e arrivano
    // esattamente sul punto di mezzo del lato, perpendicolari al bordo, e due
    // caselle accostate combaciano senza gradino.
    function puntoRotta(rot, u) {
        var a;
        if (rot === 'EO') return [u * C, R];
        if (rot === 'NS') return [R, u * C];
        if (rot === 'NE') { a = Math.PI - u * Math.PI / 2; return [C + R * Math.cos(a), R * Math.sin(a)]; }
        if (rot === 'NO') { a = u * Math.PI / 2; return [R * Math.cos(a), R * Math.sin(a)]; }
        if (rot === 'ES') { a = -Math.PI / 2 - u * Math.PI / 2; return [C + R * Math.cos(a), C + R * Math.sin(a)]; }
        if (rot === 'SO') { a = -Math.PI / 2 + u * Math.PI / 2; return [R * Math.cos(a), C + R * Math.sin(a)]; }
        return [0, 0];
    }

    // ---- misure e colori -------------------------------------------------
    // I tre grigi della ghiaia sono misurati sulle piastrelle vecchie, non
    // scelti a occhio: spalla al sole (127,114,104), piano in cima
    // (109,98,89), spalla in ombra (97,91,87).
    // Stanno in un oggetto solo e si leggono a ogni disegno, cosi' si possono
    // tarare da fuori con `taratura()' senza ricaricare la pagina.
    var M = {
        fascia: 19,       // larghezza della massicciata
        gauge: 9.5,       // da mezzeria a mezzeria di rotaia
        rotaia: 1.5,      // larghezza di una rotaia
        bordo: 0.6,       // di quanto il filo scuro sborda dalla rotaia
        travL: 17,        // lunghezza di una traversina
        travW: 2.1,       // spessore di una traversina
        passo: 5.6,       // distanza fra una traversina e l'altra
        sassi: 1050,      // quanti sassi per piastrella
        sassoMin: 1.1,    // il sasso piu' piccolo, in pixel
        sassoMax: 3.3,    // il sasso piu' grosso
        sassoVelo: 0.35,  // quanto si vede il sasso piu' smorto
        sassoVar: 0.07,   // e quanto in piu' si vede il piu' acceso
        mortoVelo: 0.35   // quanto si vede il ramo scollegato dello scambio
    };

    // Una sorgente sola per tutto il tabellone, da nord-est (y positivo = sud).
    // E' in coordinate schermo, non della piastrella: percio' l'ombra combacia
    // anche ai giunti fra due caselle.
    var SOLE = [0.7071, -0.7071];

    // Le tre tinte sono tenute distanti in chiarezza, non in colore: la ghiaia
    // sta in alto, il legno in mezzo, la rotaia in fondo. Cosi' il binario si
    // legge a colpo d'occhio anche su uno sfondo qualunque.
    var GHIAIA_BORDO = '#5a534d';
    var GHIAIA_OMBRA = '#7d756e';
    var GHIAIA_CORPO = '#8d8176';
    var GHIAIA_SOLE = '#9e9185';
    var LEGNO = '#4e3127';
    var LEGNO_SOLE = '#6b4634';
    var SASSO_CHIARO = '#e9e0d3';
    var SASSO_SCURO = '#3f3831';
    var ACCIAIO = '#3e2d24';
    var ACCIAIO_SCURO = '#1a1210';

    // ---- geometria -------------------------------------------------------

    // La linea di mezzeria. Con una rotta sola e' quella rotta; con due e' la
    // via di mezzo, pesata da p. `rev' serve a far partire tutt'e due dalla
    // punta: se non si parte dalla punta il ventaglio si apre dalla parte
    // sbagliata e il binario si stacca dal bordo.
    function poli(rotA, revA, rotB, revB, p, n) {
        var pts = [], i, u, a, b;
        n = n || 48;
        for (i = 0; i <= n; i++) {
            u = i / n;
            a = puntoRotta(rotA, revA ? 1 - u : u);
            if (!rotB) { pts.push([a[0], a[1]]); continue; }
            b = puntoRotta(rotB, revB ? 1 - u : u);
            pts.push([a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p]);
        }
        return pts;
    }

    // Tabella delle distanze cumulate: serve per spaziare le traversine lungo
    // la linea VERA. Misurando invece su u il passo verrebbe piu' stretto in
    // curva che sul dritto, ed e' il difetto che aveva il disegno vecchio.
    function misura(pts) {
        var d = [0], i, dx, dy;
        for (i = 1; i < pts.length; i++) {
            dx = pts[i][0] - pts[i - 1][0]; dy = pts[i][1] - pts[i - 1][1];
            d.push(d[i - 1] + Math.sqrt(dx * dx + dy * dy));
        }
        return d;
    }

    // Punto e tangente a distanza s dall'inizio.
    function a_distanza(pts, d, s) {
        var i = 1, w, dx, dy, L;
        while (i < d.length - 1 && d[i] < s) i++;
        L = d[i] - d[i - 1] || 1;
        w = (s - d[i - 1]) / L;
        dx = pts[i][0] - pts[i - 1][0]; dy = pts[i][1] - pts[i - 1][1];
        return {
            x: pts[i - 1][0] + dx * w, y: pts[i - 1][1] + dy * w,
            tx: dx / L, ty: dy / L
        };
    }

    // Il giro dell'incrocio. Un segmento lungo 64 che passa per il centro di
    // un quadrato di 64 ci sta a qualunque angolo: al massimo le punte
    // arrivano agli spigoli, percio' non serve ritagliare niente.
    function gira(pts, ang) {
        var co = Math.cos(ang), si = Math.sin(ang), m = C / 2, out = [], i, x, y;
        for (i = 0; i < pts.length; i++) {
            x = pts[i][0] - m; y = pts[i][1] - m;
            out.push([m + x * co - y * si, m + x * si + y * co]);
        }
        return out;
    }

    function traccia(g, pts) {
        var i;
        g.beginPath();
        g.moveTo(pts[0][0], pts[0][1]);
        for (i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    }

    // ---- i tre strati ----------------------------------------------------

    // Numeri a caso ma sempre gli stessi: il seme e' il codice della
    // piastrella, percio' i sassi non ballano da un fotogramma all'altro
    // mentre lo scambio si muove, e due codici diversi non hanno la stessa
    // ghiaia. Due caselle uguali accostate si ripetono, come gia' faceva
    // l'atlante: una piastrella sola per codice.
    function dado(seme) {
        var s = (seme * 2654435761 + 1013904223) & 0x7fffffff;
        return function () {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };
    }

    // I sassi vanno SOPRA la ghiaia gia' stesa e solo dove c'e': con
    // 'source-atop' il disegno viene ritagliato da quello che sta sotto,
    // quindi non serve costruire a parte la sagoma della massicciata.
    // Sono chiari o scuri e semitrasparenti, non di una tinta loro: cosi'
    // schiariscono o scuriscono la banda su cui cadono e il rilievo delle
    // quattro passate resta.
    function sassi(g, seme) {
        var r = dado(seme), i, w, h;
        g.save();
        g.globalCompositeOperation = 'source-atop';
        for (i = 0; i < M.sassi; i++) {
            w = M.sassoMin + r() * (M.sassoMax - M.sassoMin);
            h = w * (0.55 + r() * 0.5);
            g.save();
            g.translate(r() * C, r() * C);
            g.rotate(r() * Math.PI);
            g.globalAlpha = M.sassoVelo + r() * M.sassoVar;
            g.fillStyle = (r() < 0.5) ? SASSO_CHIARO : SASSO_SCURO;
            g.beginPath();
            g.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
            g.fill();
            g.restore();
        }
        g.restore();
    }

    // Quattro passate su TUTTE le rotte, non una rotta per volta: cosi' dove
    // due rami si sovrappongono non resta la cucitura del bordo scuro di uno
    // in mezzo al corpo dell'altro.
    function massicciata(g, elenco, seme) {
        function passata(col, largh, dx, dy) {
            var j;
            g.save();
            if (dx || dy) g.translate(dx, dy);
            g.strokeStyle = col; g.lineWidth = largh;
            for (j = 0; j < elenco.length; j++) { traccia(g, elenco[j]); g.stroke(); }
            g.restore();
        }
        g.lineCap = 'butt'; g.lineJoin = 'round';
        passata(GHIAIA_BORDO, M.fascia, 0, 0);               // il bordo, tutto intorno
        passata(GHIAIA_OMBRA, M.fascia - 1.6, 0, 0);         // la scarpata in ombra
        // La stessa fascia spostata di un pelo verso il sole: quello che
        // avanza da una parte e' la scarpata illuminata, quello che resta
        // scoperto dall'altra e' l'ombra.
        passata(GHIAIA_SOLE, M.fascia - 3.4, SOLE[0] * 1.5, SOLE[1] * 1.5);
        passata(GHIAIA_CORPO, M.fascia - 8, 0, 0);           // il piano in cima
        sassi(g, seme);
    }

    // Rettangoli veri, non trapezi: si va nel punto, si gira come la tangente
    // e si disegna. In curva vengono a raggiera, come nella realta'.
    // Il mezzo passo iniziale lascia mezzo vuoto a ogni capo, cosi' due
    // caselle accostate ne fanno uno intero e i giunti non si notano.
    function traversine(g, pts) {
        var d = misura(pts), L = d[d.length - 1];
        var n = Math.max(3, Math.round(L / M.passo)), passo = L / n, i, q;
        for (i = 0; i < n; i++) {
            q = a_distanza(pts, d, (i + 0.5) * passo);
            g.save();
            g.translate(q.x, q.y);
            g.rotate(Math.atan2(q.ty, q.tx));
            g.fillStyle = LEGNO;
            g.fillRect(-M.travW / 2, -M.travL / 2, M.travW, M.travL);
            g.fillStyle = LEGNO_SOLE;
            g.fillRect(-M.travW / 2, -M.travL / 2, M.travW * 0.45, M.travL);
            g.restore();
        }
    }

    // Le due rotaie: la mezzeria scostata di meta' scartamento lungo la
    // normale, con un filo scuro sotto che fa da spessore.
    function rotaie(g, pts) {
        var d = misura(pts), L = d[d.length - 1];
        var lati = [-M.gauge / 2, M.gauge / 2], k, s, q, p1, passi = 40, i;
        for (k = 0; k < 2; k++) {
            p1 = [];
            for (i = 0; i <= passi; i++) {
                s = L * i / passi;
                q = a_distanza(pts, d, s);
                p1.push([q.x - q.ty * lati[k], q.y + q.tx * lati[k]]);
            }
            g.lineCap = 'butt';
            g.strokeStyle = ACCIAIO_SCURO; g.lineWidth = M.rotaia + M.bordo * 2;
            traccia(g, p1); g.stroke();
            g.strokeStyle = ACCIAIO; g.lineWidth = M.rotaia;
            traccia(g, p1); g.stroke();
        }
    }

    // Il semaforo: palo e lente, verde nello stato 0 e rosso nell'altro.
    // Sta di fianco al binario, dalla parte dove non passa nessuno.
    function lampada(g, verso, stato) {
        var px, py;
        if (verso === 'EO') { px = 51.5; py = 11.5; }
        else { px = 53.5; py = 51.5; }
        g.fillStyle = '#262a2d';
        g.fillRect(px - 1.5, py, 3, 9);
        g.beginPath(); g.arc(px, py, 4.2, 0, Math.PI * 2);
        g.fillStyle = '#1a1c1e'; g.fill();
        g.beginPath(); g.arc(px, py, 2.8, 0, Math.PI * 2);
        g.fillStyle = stato ? '#e2372a' : '#38d45f'; g.fill();
    }

    // ---- la casella intera -----------------------------------------------

    // p = 0 e' il primo stato, p = 1 il secondo, in mezzo c'e' il movimento.
    // `stato' serve solo al semaforo, che non si muove ma cambia colore.
    function disegnaCella(g, cod, p, stato) {
        var D = window.W2DATI;
        var rotte = D && D.rotta[cod], A, B, revA, revB, cond, pa, pb, pm, i;
        g.clearRect(0, 0, C, C);
        if (!rotte) return;

        // binario fisso, e il semaforo che gli sta accanto
        if (rotte.length === 1 || rotte[0] === rotte[1]) {
            pa = poli(rotte[0], false, null, false, 0);
            massicciata(g, [pa], cod); traversine(g, pa); rotaie(g, pa);
            if (rotte.length > 1) lampada(g, rotte[0], stato);
            return;
        }

        A = rotte[0]; B = rotte[1];
        cond = null;
        for (i = 0; i < 2; i++) {
            if (ESTREMI[B].indexOf(ESTREMI[A][i]) >= 0) cond = ESTREMI[A][i];
        }
        pa = poli(A, false, null, false, 0);
        pb = poli(B, false, null, false, 0);

        // incrocio: niente punta in comune, le due rotte si tagliano nel
        // centro. Resta ferma la croce di ghiaia e gira un binario solo.
        if (!cond) {
            massicciata(g, [pa, pb], cod);
            pm = gira(pa, p * Math.PI / 2);
            traversine(g, pm);
            rotaie(g, pm);
            return;
        }

        // scambio: si parte sempre dalla punta
        revA = (ESTREMI[A][0] !== cond);
        revB = (ESTREMI[B][0] !== cond);

        massicciata(g, [pa, pb], cod);            // la ghiaia non si muove mai

        // Il ramo scollegato. Nel dischetto non c'e': quando lo scambio sta da
        // una parte, dall'altra resta solo ghiaia, e dove va il binario lo si
        // capisce solo guardando bene. Tracciato appena, invece, la casella
        // dice da sola che li' c'e' un bivio. Sta sotto al binario buono, e
        // quando lo scambio si muove i due si scambiano il velo: a p = 0 e'
        // acceso A e si intravede B, a p = 1 il contrario.
        if (M.mortoVelo > 0) {
            g.save();
            g.globalAlpha = M.mortoVelo * p;
            rotaie(g, pa);
            g.globalAlpha = M.mortoVelo * (1 - p);
            rotaie(g, pb);
            g.restore();
        }

        pm = poli(A, revA, B, revB, p, 48);
        traversine(g, pm);
        rotaie(g, pm);
    }

    // Il raccordo della stazione: lo spezzone di binario che dal bordo della
    // casella arriva al fabbricato. Torna una tela sua invece di disegnare
    // dove gli si dice, e il motivo e' dentro `sassi()': la ghiaia si sparge
    // in `source-atop', cioe' solo dove c'e' gia' colore. Su una piastrella
    // piena come quella della stazione finirebbe addosso a tutto il
    // fabbricato. Su una tela vuota, invece, resta dov'e' la massicciata.
    // `lungo' e' quanto entra il binario, contato dal bordo della bocca.
    function raccordo(verso, lungo) {
        var rot = (verso === 'E' || verso === 'O') ? 'EO' : 'NS';
        var c = document.createElement('canvas');
        c.width = c.height = C;
        var g = c.getContext('2d');
        var pts = poli(rot, false, null, false, 0);
        massicciata(g, [pts], 0); traversine(g, pts); rotaie(g, pts);

        // Via la meta' che entrerebbe nel fabbricato: resta la striscia
        // attaccata al lato da cui arriva il treno.
        g.globalCompositeOperation = 'destination-in';
        g.fillStyle = '#000';
        if (verso === 'E') g.fillRect(C - lungo, 0, lungo, C);
        else if (verso === 'O') g.fillRect(0, 0, lungo, C);
        else if (verso === 'S') g.fillRect(0, C - lungo, C, lungo);
        else g.fillRect(0, 0, C, lungo);
        return c;
    }

    // ---- quello che usa il gioco -----------------------------------------

    // Rifa' l'atlante: si copia il PNG com'e' e si ridisegnano sopra le
    // colonne dei binari. Prato, ponte, stazioni e paesaggio restano quelli
    // dell'immagine. Un canvas e' una sorgente valida per drawImage esattamente
    // come un <img>, percio' chi lo usa non si accorge del cambio.
    function rifaiAtlante(img, cella) {
        var D = window.W2DATI;
        var larg = img.naturalWidth || img.width;
        var alt = img.naturalHeight || img.height;
        var c = document.createElement('canvas');
        c.width = larg; c.height = alt;
        var g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        if (!D || !D.rotta) return c;
        Object.keys(D.rotta).forEach(function (k) {
            var cod = +k, st, x, y;
            if (cod === PONTE) return;
            for (st = 0; st < 2; st++) {
                x = cod * cella; y = st * cella;
                if (x + cella > larg || y + cella > alt) continue;
                g.save();
                g.beginPath(); g.rect(x, y, cella, cella); g.clip();
                g.translate(x, y);
                if (cella !== C) g.scale(cella / C, cella / C);
                disegnaCella(g, cod, st, st);
                g.restore();
            }
        });
        return c;
    }

    // Un fotogramma del movimento, tenuto in cassetto. Il primo scambio di
    // una partita disegna, dal secondo in poi si pescano i fotogrammi pronti:
    // sono "frame prerenderizzati" che non costano ne' un file in piu' ne'
    // una decisione in anticipo.
    var cassetto = {};
    function cella(cod, p) {
        var n = Math.round(Math.max(0, Math.min(1, p)) * PASSI);
        var k = cod + '|' + n;
        if (cassetto[k]) return cassetto[k];
        var c = document.createElement('canvas');
        c.width = c.height = C;
        disegnaCella(c.getContext('2d'), cod, n / PASSI, n * 2 >= PASSI ? 1 : 0);
        cassetto[k] = c;
        return c;
    }

    // Cambia una o piu' misure e butta via i fotogrammi gia' disegnati, che
    // sono stati fatti con quelle di prima. Serve a tarare dal vivo; i numeri
    // buoni poi si scrivono qui sopra.
    function taratura(nuove) {
        if (nuove) Object.keys(nuove).forEach(function (k) { M[k] = nuove[k]; });
        cassetto = {};
        return M;
    }

    return {
        CELLA: C,
        misure: M,
        taratura: taratura,
        DURATA: DURATA,
        PASSI: PASSI,
        rifaiAtlante: rifaiAtlante,
        raccordo: raccordo,
        cella: cella,
        disegnaCella: disegnaCella
    };
})();
