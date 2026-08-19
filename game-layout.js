// ─── AMBIENTE E DEBUG ────────────────────────────────────────────────────────
var devMode = localStorage.getItem('dev_mode') === '1';
window.showBannerDimensions = false;
window._leftPopulated = false;  // Sigillo colonna sinistra
window._rightPopulated = false; // Sigillo colonna destra
window._amazonDealsList = []; // Array dei deal validi caricati
window._amazonBannerShownInSidebar = false; // Flag per verificare se mostrato a lato
window._amazonDealsImpressionTracked = {}; // Tracciamento impression per ID deal

// ─── API REGISTRAZIONE LISTENER RESIZE (GAME-AGNOSTIC) ─────────────────────
window._layoutResizeListeners = window._layoutResizeListeners || [];
window.registerLayoutResizeListener = function (callback) {
    if (typeof callback === 'function') {
        window._layoutResizeListeners.push(callback);
        // Sincronizza immediatamente se il layout è già pronto
        var campogioco = document.getElementById('campogioco');
        if (campogioco && window.gameScale !== undefined) {
            var rect = campogioco.getBoundingClientRect();
            callback(rect.left, rect.top, window.gameScale);
        }
    }
};

// ─── AMAZON BANNER CONFIG ───────────────────────────────────────────────────
var AMAZON_BANNERS_ENABLED = false;  // se false, disabilita Amazon a sinistra (ma non a destra se AMAZON_BANNERS_RIGHT = true)
var AMAZON_BANNERS_RIGHT = true;   // se true, carica Amazon a destra indipendentemente da AMAZON_BANNERS_ENABLED
var AMAZON_FALLBACK_ON_SHIELD = true; // se true, Amazon subentra a sinistra quando AdSense viene bloccato dallo scudo
var AMAZON_USE_NEW_DEALS = true;      // se true, usa newdeals.json e i pesi. Se false, usa il deals.json tradizionale
var AMAZON_DEALS_PULSE_THRESHOLD = 35; // Soglia di sconto oltre la quale il badge pulsa (default 35%)
var ENABLE_BANNER_ON_FINISH = true;   // se true, abilita il banner di fine partita (AdSense o Amazon)
var ENABLE_ADSENSE_ON_FINISH = true;  // se true, usa AdSense sul finish (se condizioni ok); altrimenti Amazon
var ADSENSE_FINISH_SCALE_THRESHOLD = 1.0; // gameScale minimo per usare AdSense sul finish (sotto soglia → Amazon)

// ─── INTERSTITIAL CONFIG ─────────────────────────────────────────────────────
var ENABLE_INTERSTITIAL = true;                   // abilita il banner interstitial
var INTERSTITIAL_MIN_SESSION_MINUTES = 10;        // minuti di sessione prima della prima esposizione
var INTERSTITIAL_COOLDOWN_MINUTES = 30;           // minuti tra un'esposizione e la successiva
var INTERSTITIAL_CLOSE_DELAY_SECONDS = 2;        // secondi prima che appaia il pulsante X

// ─── TEST A/B VIEWABILITY: sizing interstitial (2026-08-06) ──────────────────
// Esperimento per capire cosa determina la bassa Active View (~41%) sull'inter-
// stitial. Ipotesi in verifica: viewability ≈ tempo-su-schermo, NON geometria del
// contenitore (il report risoluzioni conferma che il 99% degli utenti vede il box
// 970×250 pieno, non compresso). Lo slot FLEXIBLE lascia campo libero ad AdSense
// dentro adArea (display:block, 100%×100%, format=auto) → replica il comportamento
// pre-ban ma con un box reale (niente ins 0×0 = "interstitial nero").
// Slot SEPARATO apposta: (a) statistiche pulite prima/dopo nel report AdSense;
// (b) non re-inizializza l'ottimizzatore dello slot fisso maturo (reduce dai ban).
var USE_FLEXIBLE_INTERSTITIAL   = true;          // true = slot auto-responsive; false = 970×250 fisso attuale
var INTERSTITIAL_SLOT_FIXED     = '7155310138';   // slot storico, dimensioni esplicite
var INTERSTITIAL_SLOT_FLEXIBLE  = '5075879034';   // slot "interflex" (Display responsivo), test viewability
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// ─── ADSENSE CONFIG & SHIELD ─────────────────────────────────────────────────
// NOTA PER L'UTENTE: Durante il bando di 29 giorni, imposta ADSENSE_GLOBAL_ENABLED = false e AMAZON_BANNERS_ENABLED = true; 
// Al termine, imposta ADSENSE_GLOBAL_ENABLED = true AMAZON_BANNERS_ENABLED = false;  Lo Shield ti proteggerà automaticamente dai click futuri.
var ADSENSE_GLOBAL_ENABLED = true;  // Interruttore di sicurezza principale
var ADSENSE_ONLY_LEFT = true;       // Se true, AdSense carica solo a sinistra

// Controllo attivazione blocco annunci su richiesta
var adsDisabled = localStorage.getItem('ads_disabled') === '1';
if (adsDisabled) {
    AMAZON_BANNERS_ENABLED = false;
    AMAZON_BANNERS_RIGHT = false;
    ENABLE_BANNER_ON_FINISH = false;
    ENABLE_INTERSTITIAL = false;
    ADSENSE_GLOBAL_ENABLED = false;
}

var ADSENSE_SHIELD_DURATION = 70 * 60 * 1000; // 70 minuti di blocco dopo un click
var _isMouseOverAdSense = false;

// ─── TELEMETRIA SCALA (GA4) ──────────────────────────────────────────────────
// gameScale = min(clientW/1024, clientH/750): quanto il campo di gioco (fisso
// 1024x750) è rimpicciolito per stare nella finestra. È la SOLA grandezza di
// "spazio" su cui il codice decide (soglia finish, famiglie sidebar); il
// devicePixelRatio è ininfluente per la logica (solo densità schermo/zoom) e
// resta loggato a parte solo come dato descrittivo. Qui esponiamo due campi:
//  - game_scale  : valore numerico preciso (per medie/distribuzioni/soglie future)
//  - scale_bucket: fascia categorica (per segmentare comodamente in GA4). Taglio
//    a 1.0 = soglia del fallback finish (ADSENSE_FINISH_SCALE_THRESHOLD), così la
//    fascia '≥1' isola le sessioni che usano davvero AdSense sul finish.
function _scaleTelemetry() {
    var s = window.gameScale;
    if (s === undefined || s === null) return { game_scale: null, scale_bucket: 'unknown' };
    var bucket = s < 0.6 ? '<0.6' : (s < 0.8 ? '0.6-0.8' : (s < 1 ? '0.8-1' : '≥1'));
    return { game_scale: Math.round(s * 100) / 100, scale_bucket: bucket };
}

// ─── INTERSTITIAL RELOAD INTERCEPT ───────────────────────────────────────────
// Monkey-patch di location.reload: se l'interstitial è abilitato e dovuto,
// scrive il flag e poi esegue il reload originale.
// I game code chiamano location.reload() normalmente — nessuna modifica necessaria.
// window.waitForInterstitial(callback): i game code chiamano questa funzione
// invece di init() direttamente — se il flag è presente aspetta l'interstitial.
(function () {
    var _origReload = location.reload.bind(location);

    window.reloadWithInterstitial = function () {
        if (ENABLE_INTERSTITIAL) {
            localStorage.setItem('_interstitial_pending', '1');
        }
        _origReload();
    };

    // Monkey-patch location.reload
    try {
        Object.defineProperty(location, 'reload', {
            configurable: true,
            writable: true,
            value: function () {
                window.reloadWithInterstitial();
            }
        });
    } catch (e) {
        // Su alcuni browser non è sovrascrivibile — reload avviene normalmente senza interstitial
    }

    // I game code chiamano questa funzione al posto di init() diretto
    window.waitForInterstitial = function (callback) {
        var pending = localStorage.getItem('_interstitial_pending') === '1';
        localStorage.removeItem('_interstitial_pending'); // cancella SUBITO, incondizionatamente
        if (pending) {
            // Mostra subito l'interstitial — non aspetta l'XHR.
            // Se i deals non sono ancora pronti, showInterstitialIfDue userà il placeholder/AdSense.
            // Il callback XHR non deve più mostrare l'interstitial (flag già consumato).
            showInterstitialIfDue(callback);
        } else {
            callback();
        }
    };
})();
// ─────────────────────────────────────────────────────────────────────────────

function getInternalUserId() {
    var id = localStorage.getItem('internal_user_id');
    if (!id) {
        id = 'USR_' + Math.random().toString(36).substr(2, 9).toUpperCase();
        localStorage.setItem('internal_user_id', id);
    }
    return id;
}

function isAdSenseShieldActive() {
    var shieldUntil = localStorage.getItem('adsense_shield_until');
    if (!shieldUntil) return false;
    return Date.now() < parseInt(shieldUntil);
}

function activateAdSenseShield(isReal) {
    var until = Date.now() + ADSENSE_SHIELD_DURATION;
    localStorage.setItem('adsense_shield_until', until);

    // Invio evento a Google Analytics
    if (typeof gtag === 'function') {
        gtag('event', 'adsense_click_detected', {
            'event_category': 'AdSense_Shield',
            'event_label': isReal ? 'Real_Click' : 'Simulated_Click',
            'internal_user_id': getInternalUserId(),
            'version': window.scriptVersion || 'unknown',
            'transport_type': 'beacon'
        });
    }

    console.log('%c[AdSense Shield] PROTEZIONE ATTIVATA per 24h (' + (isReal ? 'REAL' : 'SIM') + ')', 'background: #cc0c39; color: white; font-weight: bold; padding: 2px 5px;');
    if (typeof adjustLayout === 'function') adjustLayout();
}

function resetAdSenseShield() {
    localStorage.removeItem('adsense_shield_until');
    console.log('[AdSense Shield] Protezione resettata.');
    if (typeof adjustLayout === 'function') adjustLayout();
}

// ─── SENSORI HOVER CENTRALIZZATI (con debounce anti-race) ────────────────────
// Gli <ins> AdSense chiamano window._onAdEnter / window._onAdLeave invece di
// azzerare _isMouseOverAdSense inline. Il mouseleave NON azzera subito: programma
// l'azzeramento tra ADSENSE_LEAVE_DEBOUNCE_MS. Così, se un click reale sull'ad
// emette mouseleave immediatamente prima del blur (nuova scheda), la variabile
// è ancora true quando arriva il blur e lo shield scatta correttamente.
var ADSENSE_LEAVE_DEBOUNCE_MS = 200;
window._adLeaveTimer = null;

window._onAdEnter = function () {
    if (window._adLeaveTimer) { clearTimeout(window._adLeaveTimer); window._adLeaveTimer = null; }
    window._isMouseOverAdSense = true;
};

window._onAdLeave = function () {
    if (window._adLeaveTimer) clearTimeout(window._adLeaveTimer);
    window._adLeaveTimer = setTimeout(function () {
        window._isMouseOverAdSense = false;
        window._adLeaveTimer = null;
    }, ADSENSE_LEAVE_DEBOUNCE_MS);
};

// Trigger comune: mouse era sull'ad + la finestra/scheda ha perso primo piano.
// Guardia identica (_isMouseOverAdSense) per entrambi gli eventi → nessun falso
// positivo su Alt+Tab / cambio scheda quando il mouse NON è sull'annuncio.
function _maybeActivateShieldFromLeave() {
    if (_isMouseOverAdSense && !isAdSenseShieldActive() && !devMode) {
        activateAdSenseShield(true);
    }
}

// Global detector for focus-blur (click proxy)
window.addEventListener('blur', _maybeActivateShieldFromLeave);

// Seconda rete: la scheda passa in background (es. l'ad ha aperto una nuova tab).
// Copre i casi in cui blur arriva tardi o non arriva. Stessa guardia del blur.
document.addEventListener('visibilitychange', function () {
    if (document.hidden) _maybeActivateShieldFromLeave();
});

// ─── TASTIERA E COMANDI ──────────────────────────────────────────────────────
document.addEventListener('keydown', function (event) {
    var key = event.key.toLowerCase();

    // Ctrl+Alt+S: Toggle Info/Stats Badge (Non-persistent)
    if (event.ctrlKey && event.altKey && key === 's') {
        event.preventDefault();
        window.showBannerDimensions = !window.showBannerDimensions;
        adjustLayout();
        console.log('Toggled debug badge. Active:', window.showBannerDimensions);
    }

    // Ctrl+Alt+Q: Toggle Dev Mode (Persistent in LocalStorage)
    if (event.ctrlKey && event.altKey && (key === 'q' || event.code === 'KeyQ')) {
        event.preventDefault();
        var isDev = localStorage.getItem('dev_mode') === '1';
        localStorage.setItem('dev_mode', isDev ? '0' : '1');
        console.log('[AdSense Shield] Toggled Dev Mode: ' + (isDev ? 'OFF' : 'ON'));
        location.reload();
    }
});
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

// Function to get version from the script tag and store it globally
function getAndStoreScriptVersion() {
    var scriptTag = document.currentScript;
    if (scriptTag && scriptTag.src) {
        var match = scriptTag.src.match(/[?&]v=([^&]+)/);
        if (match) {
            window.scriptVersion = match[1];
            return;
        }
    }
    window.scriptVersion = 'unknown'; // fallback
}

// Call the function to set the version on script load
getAndStoreScriptVersion();

// Global function to store language preference and allow the navigation to proceed
window.setLanguage = function (lang) {
    localStorage.setItem('userLanguage', lang);
    console.log('Language preference saved:', lang);
};

// Funzione per inviare un evento Google Analytics per un banner
function sendAnalyticsEvent(bannerElement, triggerType) {
    if (typeof gtag === 'function') {
        var width = bannerElement.style.width;
        var height = bannerElement.style.height;
        var dimensions = width && height ? width + 'x' + height : 'unknown_dimensions';

        // Use prefix from config or default
        var prefix = (window.gameConfig && window.gameConfig.gaPrefix) || '';
        var eventName = prefix + 'simulated_banner_impression';

        gtag('event', eventName, {
            'event_category': 'Banner_Simulation',
            'event_label': dimensions,
            'trigger_type': triggerType,
            'version': window.scriptVersion || 'unknown',
            'non_interaction': true
        });
        console.log('GA Evento Inviato: ' + eventName + ' - ' + dimensions + ' - Trigger: ' + triggerType + ' - Version: ' + window.scriptVersion);
    } else {
        console.warn('Funzione gtag non trovata. Google Analytics potrebbe non essere inizializzato.');
    }
}

// Funzione per tracciare tutti i banner visibili
function trackVisibleBanners(triggerType) {
    var visibleBanners = document.querySelectorAll('.ad-banner');
    for (var i = 0; i < visibleBanners.length; i++) {
        var banner = visibleBanners[i];
        if (banner.offsetWidth > 0 && banner.offsetHeight > 0) {
            sendAnalyticsEvent(banner, triggerType);
        }
    }
}
function injectLegalLinks() {
    if (window.gameConfig && window.gameConfig.hideLegalFooter) return;
    var footer = document.getElementById('game-legal-links');
    if (!footer) {
        footer = document.createElement('div');
        footer.id = 'game-legal-links';
        footer.style.cssText = 'position: fixed; bottom: 10px; right: 10px; font-size: 11px; font-family: sans-serif; z-index: 10000; color: rgba(255,255,255,0.6); pointer-events: auto; text-align: right; line-height: 1.4;';

        var langSuffix = (window.currentLang === 'en') ? '-en.html' : '.html';
        var homeUrl = (window.currentLang === 'en') ? 'index-en.html' : 'index.html';
        var aboutMeUrl = 'aboutme' + langSuffix;
        var privacyUrl = 'privacy' + langSuffix;
        var homeLabel = (window.currentLang === 'en') ? 'Home' : 'Home'; // Same for both
        var aboutMeLabel = (window.currentLang === 'en') ? 'About Me' : 'Chi Sono';
        var privacyLabel = (window.currentLang === 'en') ? 'Privacy Policy' : 'Privacy Policy';

        footer.innerHTML = '<div style="margin-bottom: 2px;">' +
            '<a href="' + homeUrl + '" style="color: inherit; text-decoration: none;">' + homeLabel + '</a>' +
            '<span style="margin: 0 6px; opacity: 0.5;">•</span>' +
            '<a href="' + aboutMeUrl + '" style="color: inherit; text-decoration: none;">' + aboutMeLabel + '</a>' +
            '</div>' +
            '<div>' +
            '<a href="' + privacyUrl + '" style="color: inherit; text-decoration: none;">' + privacyLabel + '</a>' +
            '</div>';
        document.body.appendChild(footer);

        // Add hover effect
        footer.onmouseover = function () { this.style.color = 'rgba(255,255,255,0.9)'; };
        footer.onmouseout = function () { this.style.color = 'rgba(255,255,255,0.6)'; };
    }
}

// ─── INTERSTITIAL ────────────────────────────────────────────────────────────
function showInterstitialIfDue(onClose) {
    if (!ENABLE_INTERSTITIAL) { if (onClose) onClose(); return; }
    if (window._blockAutoInterstitial) { if (onClose) onClose(); return; }
    // Esclusioni rimosse: entrambe le versioni del burraco (IT e EN) girano ora
    // sulla stessa base e gestiscono l'interstitial via waitForInterstitial,
    // consumando il flag _interstitial_pending.

    var now = Date.now();

    // Sessione: inizia al primo caricamento, si azzera dopo 60 minuti di inattività
    var SESSION_RESET_MINUTES = 60;
    var sessionStart = parseInt(localStorage.getItem('_interstitial_session_start') || '0', 10);
    var lastActivity = parseInt(localStorage.getItem('_interstitial_last_activity') || '0', 10);
    if (!sessionStart || (lastActivity > 0 && (now - lastActivity) > SESSION_RESET_MINUTES * 60000)) {
        sessionStart = now;
        localStorage.setItem('_interstitial_session_start', sessionStart);
    }
    localStorage.setItem('_interstitial_last_activity', now);

    var sessionMinutes = (now - sessionStart) / 60000;
    if (sessionMinutes < INTERSTITIAL_MIN_SESSION_MINUTES) { if (onClose) onClose(); return; }

    var lastShown = parseInt(localStorage.getItem('_interstitial_last_shown') || '0', 10);
    var cooldownMinutes = (now - lastShown) / 60000;
    if (lastShown > 0 && cooldownMinutes < INTERSTITIAL_COOLDOWN_MINUTES) { if (onClose) onClose(); return; }

    localStorage.setItem('_interstitial_last_shown', now);

    // Crea overlay — usa pixel reali per compatibilità con giochi a body fisso (es. Machiavelli)
    var _vw = window.innerWidth;
    var _vh = window.innerHeight;
    var overlay = document.createElement('div');
    overlay.id = 'interstitial-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:' + _vw + 'px;height:' + _vh + 'px;background:#000;z-index:999999;';

    // Area annuncio — occupa lo spazio sopra il footer, con una banda morta di
    // sicurezza (gap) prima del footer: la policy AdSense raccomanda distanza tra
    // gli ad e i pulsanti (close/navigazione) per evitare clic accidentali.
    // La fascia inferiore ospita l'hub di navigazione (CONTINUA al centro, link ai
    // giochi + musica ai lati) e SCALA con gameScale: se l'utente gioca su un campo
    // piccolo, banda e pulsanti sono proporzionati al gioco (aspetto uniforme al
    // resize). Clamp per non scendere sotto una taglia leggibile/cliccabile.
    var _uiScale = (window.gameScale !== undefined && window.gameScale > 0) ? window.gameScale : 1;
    if (_uiScale > 1) _uiScale = 1;
    if (_uiScale < 0.65) _uiScale = 0.65;
    var _footerH = Math.round(240 * _uiScale); // altezza banda scalata col gioco
    var _adSafetyGap = Math.round(40 * _uiScale); // banda morta ad↔fascia, scalata
    var adArea = document.createElement('div');
    adArea.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:' + (_footerH + _adSafetyGap) + 'px;overflow:hidden;display:flex;align-items:center;justify-content:center;';

    // ─── DIMENSIONI UNITÀ AD — calcolate UNA volta, condivise sim+reale ───────
    // Prima erano ricalcolate solo nel ramo reale, mentre la simulazione devMode
    // usava un riquadro giallo hardcoded 970x250; così la sim NON rispecchiava la
    // geometria vera (su schermi bassi _adBoxH si comprime, ma il giallo restava
    // 250). Ora il box è unico: la simulazione diventa uno SPECCHIO geometrico
    // fedele dell'ins reale e mostra a occhio, ridimensionando la finestra, quando
    // il box fisso 970x250 si comprime o sfora dentro adArea (overflow:hidden).
    // adsbygoogle.js misura l'ins al push(): un ins 'inline-block' senza width/
    // height misura 0x0 (il flex-container non lo stira) → richiesta 0x0 → AdSense
    // non serve NULLA → interstitial nero. Per questo le dimensioni sono esplicite.
    var _adBoxW = Math.max(120, Math.min(970, _vw - 40));
    var _adBoxH = Math.max(50, Math.min(250, _vh - _footerH - _adSafetyGap - 40));

    // Simulazione (devMode) del creative AdSense: solo quando lo scudo NON è
    // attivo. Con scudo attivo AdSense non verrebbe servito, quindi lasciamo
    // proseguire al ramo reale sotto (useAdSense=false → fallback Amazon), così
    // la simulazione rispecchia esattamente il comportamento di sidebar/finish.
    if (devMode && !isAdSenseShieldActive()) {
        // In devMode rendo VISIBILE il bordo di adArea, così si vede il "vuoto"
        // (la cornice nera inerte) attorno all'unità ad: adArea è il contenitore
        // di layout, l'ad reale ne occupa solo la porzione _adBoxW x _adBoxH
        // centrata. Diagnostica pura, mai in produzione.
        adArea.style.outline = '2px dotted #3af';
        adArea.style.outlineOffset = '-2px';
        // Finto creative AdSense alle STESSE dimensioni dell'ins reale
        // (_adBoxW x _adBoxH), NON più 970x250 hardcoded → specchio geometrico.
        var adPlaceholder = document.createElement('div');
        adPlaceholder.style.cssText = 'width:' + _adBoxW + 'px;height:' + _adBoxH + 'px;background:#222;border:2px dashed #ffee00;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:15px;text-align:center;cursor:pointer;overflow:hidden;';
        adPlaceholder.innerHTML =
            '<span style="color:#ffee00;font-weight:bold;font-size:16px;">SIMULAZIONE ADSENSE INTERSTITIAL</span>' +
            '<span style="font-size:13px;color:#4af;margin-top:8px;font-family:monospace;">unità ad: ' + _adBoxW + ' × ' + _adBoxH + ' px</span>' +
            '<span style="font-size:11px;color:#888;margin-top:2px;font-family:monospace;">adArea: ' + '~' + (_vw) + ' × ' + (_vh - _footerH - _adSafetyGap) + ' px (riquadro azzurro)</span>' +
            '<span style="font-size:12px;color:#aaa;margin-top:10px;">Clicca per simulare un clic e attivare lo scudo 24h</span>';
        adPlaceholder.setAttribute('onmouseenter', 'window._onAdEnter();');
        adPlaceholder.setAttribute('onmouseleave', 'window._onAdLeave();');
        adPlaceholder.onclick = function () {
            if (confirm("Vuoi simulare un clic su AdSense?\n\nQuesto attiverà lo scudo per 24 ore e nasconderà gli annunci reali (mostrando solo Amazon).")) {
                activateAdSenseShield(false);
            }
        };
        adArea.appendChild(adPlaceholder);
    } else {
        var isEnglish = (window.currentLang === 'en');
        var useAdSense = ENABLE_ADSENSE_ON_FINISH &&
                         ADSENSE_GLOBAL_ENABLED &&
                         !isAdSenseShieldActive() &&
                         window.gameConfig && window.gameConfig.adsenseActive;

        if (useAdSense) {
            // Dimensioni ESPLICITE (vedi commento _adBoxW/_adBoxH sopra): il flex
            // di adArea (align/justify center) tiene l'ins centrato.
            var ins = document.createElement('ins');
            ins.className = 'adsbygoogle';
            ins.setAttribute('data-ad-client', 'ca-pub-9335537153013492');
            if (USE_FLEXIBLE_INTERSTITIAL) {
                // Campo libero dentro adArea: l'ins riempie tutto il contenitore
                // (100%×100%, no 0×0) e AdSense sceglie il creativo migliore via
                // format=auto. Nessun tetto: su desktop grandi il creativo può
                // arrivare a piena adArea. È il "lascia fare ad AdSense" pre-ban.
                // ins come flex-container: AdSense riscrive l'altezza al formato
                // servito (visto in DOM: height:100%→280px) e inserisce un wrapper
                // interno più stretto (es. 1200px) ancorato a sinistra; display:flex
                // + center centra QUEL wrapper dentro l'ins largo 100% → creativo
                // centrato orizzontalmente senza restringere l'ins (test flessibile
                // intatto). Da riverificare in DOM: non è garantito che AdSense
                // preservi display:flex quando riscrive lo style dell'ins.
                ins.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;';
                ins.setAttribute('data-ad-slot', INTERSTITIAL_SLOT_FLEXIBLE);
                ins.setAttribute('data-ad-format', 'auto');
                ins.setAttribute('data-full-width-responsive', 'false');
            } else {
                // Dimensioni ESPLICITE (vedi commento _adBoxW/_adBoxH sopra): il flex
                // di adArea (align/justify center) tiene l'ins centrato.
                // Niente data-ad-format: con dimensioni fisse sarebbe contraddittorio
                // ('auto' serve al responsive che si adatta al contenitore). E' la
                // stessa configurazione degli slot sidebar e finish, che funzionano.
                ins.style.cssText = 'display:inline-block;width:' + _adBoxW + 'px;height:' + _adBoxH + 'px;';
                ins.setAttribute('data-ad-slot', INTERSTITIAL_SLOT_FIXED);
                ins.setAttribute('data-full-width-responsive', 'false');
            }
            ins.setAttribute('onmouseenter', 'window._onAdEnter();');
            ins.setAttribute('onmouseleave', 'window._onAdLeave();');
            adArea.appendChild(ins);
            // push() viene chiamato dopo body.appendChild(overlay) più sotto
            if (typeof gtag === 'function') {
                gtag('event', 'AdSense_Interstitial_Impression', Object.assign({
                    'event_category': 'AdSense',
                    'page_location': window.location.href,
                    'viewport_w': window.innerWidth,
                    'viewport_h': window.innerHeight,
                    'device_pixel_ratio': window.devicePixelRatio || 1,
                    'sizing_mode': USE_FLEXIBLE_INTERSTITIAL ? 'flexible' : 'fixed',
                    'non_interaction': true
                }, _scaleTelemetry()));
            }
        } else {
            // Fallback Amazon — struttura identica a setupAmazonFinishBanner
            var deal = selectWeightedAmazonDeal(window._amazonDealsList) || window._amazonDeal600;
            if (deal) {
                // Il deal puo' essere AliExpress: selectWeightedAmazonDeal pesca da
                // tutto newdeals.json senza filtrare lo store. Pulsante e disclaimer
                // vanno quindi scelti sul singolo prodotto, non dati per Amazon.
                var isAliInter = (deal.store === 'aliexpress');
                var imgUrl = (deal.active_images && deal.active_images.length > 0) ? deal.active_images[0] : (deal.img || 'banner/galleryamazon300x250.jpg');
                var linkUrl = deal.link || 'view_gallery.html';
                var titleText = deal.title || 'generic';
                // Prefisso ALI- per distinguere i prodotti AliExpress nei report
                // GA4: il troncamento resta a 60 caratteri sul solo titolo.
                var dealId = (titleText.length > 60 ? titleText.substring(0, 60) + '...' : titleText);
                if (isAliInter) dealId = 'ALI-' + dealId;

                var viewH = window.innerHeight;
                // Riempi l'area disponibile sopra il footer + banda di sicurezza
                // (stessa geometria dell'adArea, allineata a _footerH/_adSafetyGap).
                var bannerH = viewH - _footerH - _adSafetyGap;
                var infoColW = 260;
                var bannerW = Math.min(window.innerWidth, 1200);
                var imgColW = bannerW - infoColW - 4;

                var aLink = document.createElement('a');
                aLink.href = linkUrl;
                aLink.target = '_blank';
                aLink.rel = 'sponsored noopener';
                aLink.style.cssText = 'display:flex;width:' + bannerW + 'px;height:' + bannerH + 'px;text-decoration:none;border-radius:0;overflow:hidden;background:#fff;box-sizing:border-box;';

                // Colonna info
                var infoCol = document.createElement('div');
                infoCol.style.cssText = 'width:' + infoColW + 'px;height:100%;background:#131921;color:#fff;display:flex;flex-direction:column;box-sizing:border-box;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;';

                var headerDiv = document.createElement('div');
                var headerText = (AMAZON_USE_NEW_DEALS && deal.custom_message) ? deal.custom_message : (isEnglish ? 'LIMITED TIME DEAL' : 'OFFERTA A TEMPO');
                headerDiv.style.cssText = 'background:#cc0c39;color:#fff;padding:12px;text-align:center;font-weight:bold;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;box-sizing:border-box;width:100%;';
                headerDiv.textContent = headerText;
                infoCol.appendChild(headerDiv);

                var contentDiv = document.createElement('div');
                contentDiv.style.cssText = 'padding:16px;display:flex;flex-direction:column;flex-grow:1;min-height:0;box-sizing:border-box;';

                var descDiv = document.createElement('div');
                descDiv.style.cssText = 'font-size:15px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;margin-bottom:12px;font-weight:500;text-align:center;';
                descDiv.textContent = deal.title || '';
                contentDiv.appendChild(descDiv);

                var priceRow = document.createElement('div');
                priceRow.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:10px;margin-top:auto;margin-bottom:12px;';

                if (deal.price && deal.price.trim() !== '') {
                    var priceSpan = document.createElement('span');
                    priceSpan.style.cssText = 'font-size:28px;font-weight:bold;color:#ff5252;';
                    priceSpan.textContent = deal.price;
                    priceRow.appendChild(priceSpan);
                }

                if (deal.badge && deal.badge.trim() !== '') {
                    var match = deal.badge.match(/(\d+)%/);
                    var isHighDiscount = match && parseInt(match[1], 10) > AMAZON_DEALS_PULSE_THRESHOLD;
                    var badgeSpan = document.createElement('span');
                    badgeSpan.className = 'amazon-badge' + (isAliInter ? ' ali-badge' : '') + (isHighDiscount ? ' amazon-badge-pulse' : '');
                    badgeSpan.style.cssText = 'font-size:14px;padding:4px 10px;';
                    badgeSpan.textContent = deal.badge;
                    priceRow.appendChild(badgeSpan);
                }
                contentDiv.appendChild(priceRow);

                var ctaDiv = document.createElement('div');
                var ctaBg = isAliInter ? 'background:linear-gradient(180deg,#ff4747 0%,#d62828 100%);color:#fff;' : 'background:linear-gradient(180deg,#ff9900 0%,#e68a00 100%);color:#000;';
                ctaDiv.style.cssText = 'display:block;width:100%;box-sizing:border-box;' + ctaBg + 'padding:12px;border-radius:20px;font-weight:bold;text-align:center;font-size:14px;margin-bottom:10px;';
                if (isAliInter) {
                    ctaDiv.textContent = isEnglish ? 'View offer on AliExpress' : 'Vedi offerta su AliExpress';
                } else {
                    ctaDiv.textContent = isEnglish ? 'View offer on Amazon.it' : 'Vedi offerta su Amazon.it';
                }
                contentDiv.appendChild(ctaDiv);

                var disclaimerDiv = document.createElement('div');
                disclaimerDiv.style.cssText = 'font-size:10px;color:#94a3b8;line-height:1.2;text-align:center;';
                if (isAliInter) {
                    disclaimerDiv.innerHTML = isEnglish ? 'As an AliExpress affiliate,<br>I earn from qualifying purchases.' : 'In qualit&agrave; di affiliato AliExpress,<br>guadagno dagli acquisti idonei.';
                } else {
                    disclaimerDiv.innerHTML = isEnglish ? 'As an Amazon affiliate,<br>I earn from qualifying purchases.' : 'Come affiliato Amazon,<br>guadagno dagli acquisti idonei.';
                }
                contentDiv.appendChild(disclaimerDiv);

                infoCol.appendChild(contentDiv);

                // Colonna immagine
                var imgCol = document.createElement('div');
                imgCol.style.cssText = 'width:' + imgColW + 'px;height:100%;background:#fff;display:flex;justify-content:center;align-items:center;padding:10px;box-sizing:border-box;';

                var img = document.createElement('img');
                img.src = imgUrl;
                img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;';
                img.alt = 'Amazon Deal';
                imgCol.appendChild(img);

                aLink.appendChild(infoCol);
                aLink.appendChild(imgCol);
                adArea.appendChild(aLink);

                // GA4 impression
                var startTime = Date.now();
                if (!window._amazonDealsImpressionTracked[deal.id]) {
                    window._amazonDealsImpressionTracked[deal.id] = true;
                    if (typeof gtag === 'function') {
                        gtag('event', 'Amazon_Banner_Impression', Object.assign({
                            'event_category': 'Affiliate',
                            'amazon_deal_id': dealId,
                            'format': 'interstitial',
                            'asin': deal.asin || '',
                            'page_location': window.location.href,
                            'non_interaction': true
                        }, _scaleTelemetry()));
                    }
                }

                // GA4 click
                aLink.onclick = function () {
                    var exposureSeconds = Math.round((Date.now() - startTime) / 1000);
                    if (typeof gtag === 'function') {
                        gtag('event', 'Amazon_Banner_Click', Object.assign({
                            'event_category': 'Affiliate',
                            'amazon_deal_id': dealId,
                            'format': 'interstitial',
                            'asin': deal.asin || '',
                            'tempo_esposizione': exposureSeconds,
                            'page_location': window.location.href,
                            'non_interaction': false
                        }, _scaleTelemetry()));
                    }
                };
            }
        }
    }

    // Banda inferiore — alta _footerH: hub di navigazione (link reali ai giochi +
    // musica su due colonne) + pulsante CONTINUA grande + riga note. Serve sia come
    // alternativa esplicita al clic sull'ad (riduce i clic accidentali), sia per la
    // conformità AdSense: l'interstitial NON è "pagina dedicata all'annuncio" ma una
    // transizione con "obvious game play links".
    var _isEn = (window.currentLang === 'en');
    var _suffix = _isEn ? '-en.html' : '.html';

    // Tutte le misure del footer sono moltiplicate per _uiScale (derivato da
    // gameScale, clampato) così banda e pulsanti restano proporzionati al campo di
    // gioco e l'aspetto è uniforme al resize della finestra. Helper di comodo:
    var _px = function (n) { return Math.round(n * _uiScale) + 'px'; };

    // Helper: crea un link-pulsante di navigazione a un gioco/pagina (in griglia).
    var makeNavLink = function (label, href) {
        var a = document.createElement('a');
        a.href = href;
        a.textContent = label;
        a.style.cssText = 'display:block;background:#2d5a3d;color:#fff;text-decoration:none;padding:' + _px(6) + ' ' + _px(10) + ';border-radius:' + _px(5) + ';font-size:' + _px(13) + ';font-family:sans-serif;border:1px solid #3d7a52;white-space:nowrap;text-align:center;';
        a.onmouseover = function () { this.style.background = '#3d7a52'; };
        a.onmouseout = function () { this.style.background = '#2d5a3d'; };
        return a;
    };

    // Titolo di colonna (giallo).
    var makeColTitle = function (text, marginTop) {
        var t = document.createElement('div');
        t.style.cssText = 'color:#ffee00;font-weight:bold;font-size:' + _px(12) + ';font-family:sans-serif;margin:' + _px(marginTop || 0) + ' 0 ' + _px(4) + ';text-transform:uppercase;letter-spacing:0.5px;text-align:center;';
        t.textContent = text;
        return t;
    };

    var footer = document.createElement('div');
    footer.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:' + _footerH + 'px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:' + _px(8) + ';padding:' + _px(10) + ' ' + _px(20) + ';box-sizing:border-box;background:#1a1a1a;border-top:1px solid #333;';

    // ─── Riga principale: [carte] · [CONTINUA rosso] · [altri+musica] ───
    // I gruppi di link stanno AI LATI, il pulsante CONTINUA al CENTRO (non sopra
    // né sotto i link) — così il tasto di uscita è ben separato dall'area ad e dai
    // link di navigazione, e centrale/prominente.
    var mainRow = document.createElement('div');
    mainRow.style.cssText = 'display:flex;gap:' + _px(24) + ';justify-content:center;align-items:center;width:100%;max-width:' + _px(1180) + ';flex-wrap:nowrap;';

    // ── Colonna SINISTRA — Giochi di Carte (griglia 2 colonne) ──
    var colCards = document.createElement('div');
    colCards.style.cssText = 'flex:0 1 auto;';
    colCards.appendChild(makeColTitle(_isEn ? 'Card Games' : 'Giochi di Carte'));
    var gridCards = document.createElement('div');
    gridCards.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:' + _px(5) + ';';
    var cardGames = [
        ['Scala 40', 'scala40'], ['Burraco', 'burraco'], ['Scopa', 'scopa'],
        ['Machiavelli', 'machiavelli'], ['Gin Rummy', 'rummy'], ['Spider', 'spider'],
        ['Klondike', 'klondike'], ['Briscola', 'briscola']
    ];
    cardGames.forEach(function (g) { gridCards.appendChild(makeNavLink(g[0], g[1] + _suffix)); });
    colCards.appendChild(gridCards);

    // ── Colonna CENTRALE — pulsante CONTINUA (rosso, grande) + riga note sotto ──
    var colCenter = document.createElement('div');
    colCenter.style.cssText = 'flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:' + _px(10) + ';padding:0 ' + _px(10) + ';';

    var btnClose = document.createElement('button');
    var _continua = _isEn ? '✓ CONTINUE' : '✓ CONTINUA';
    btnClose.textContent = _continua;
    btnClose.style.cssText = 'background:#cc3333;border:none;color:#fff;padding:' + _px(18) + ' ' + _px(56) + ';border-radius:' + _px(8) + ';cursor:pointer;font-size:' + _px(28) + ';font-weight:bold;font-family:sans-serif;box-shadow:0 3px 10px rgba(0,0,0,0.4);white-space:nowrap;';
    btnClose.onmouseover = function () { if (!this.disabled) this.style.background = '#e04444'; };
    btnClose.onmouseout = function () { if (!this.disabled) this.style.background = '#cc3333'; };

    // Chiusura interstitial (idempotente): rimuove overlay + listener resize e
    // richiama onClose una sola volta. Usata sia da CONTINUA che dall'auto-chiusura
    // al resize (l'overlay è costruito con le misure di gameScale al momento
    // dell'apertura e non si riadatta live: al resize lo chiudiamo, equivale a
    // premere CONTINUA — policy-safe, nessun ad servito viene mascherato).
    var _closed = false;
    var closeInterstitial = function () {
        if (_closed) return;
        _closed = true;
        window.removeEventListener('resize', closeInterstitial);
        overlay.remove();
        if (onClose) onClose();
    };
    btnClose.onclick = closeInterstitial;
    window.addEventListener('resize', closeInterstitial);

    if (INTERSTITIAL_CLOSE_DELAY_SECONDS > 0) {
        btnClose.disabled = true;
        btnClose.style.opacity = '0.4';
        var remaining = INTERSTITIAL_CLOSE_DELAY_SECONDS;
        btnClose.textContent = _continua + ' (' + remaining + ')';
        var timer = setInterval(function () {
            remaining--;
            if (remaining <= 0) {
                clearInterval(timer);
                btnClose.disabled = false;
                btnClose.style.opacity = '1';
                btnClose.textContent = _continua;
            } else {
                btnClose.textContent = _continua + ' (' + remaining + ')';
            }
        }, 1000);
    }

    // Riga note (sotto CONTINUA): scritta pubblicità + "Perché la pubblicità?"
    var noteRow = document.createElement('div');
    noteRow.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:' + _px(10) + ';flex-wrap:wrap;';

    var label = document.createElement('span');
    label.style.cssText = 'color:#888;font-family:sans-serif;font-size:' + _px(12) + ';text-align:center;';
    label.textContent = (_isEn ? 'Experimental ad — shown at most every ' : 'Pubblicità sperimentale — compare al massimo ogni ') + INTERSTITIAL_COOLDOWN_MINUTES + (_isEn ? ' minutes' : ' minuti');

    var btnPerche = document.createElement('button');
    btnPerche.textContent = _isEn ? 'Why ads?' : 'Perché la pubblicità?';
    btnPerche.style.cssText = 'background:transparent;border:1px solid #555;color:#aaa;padding:' + _px(3) + ' ' + _px(9) + ';border-radius:' + _px(4) + ';cursor:pointer;font-size:' + _px(12) + ';font-family:sans-serif;white-space:nowrap;';
    btnPerche.onclick = function () {
        var lang = _isEn ? 'aboutme-en.html' : 'aboutme.html';
        window.open(lang + '#pubblicita', '_blank');
    };

    noteRow.appendChild(label);
    noteRow.appendChild(btnPerche);

    colCenter.appendChild(btnClose);
    colCenter.appendChild(noteRow);

    // ── Colonna DESTRA — Altri Giochi + Musica (due griglie) ──
    var colOther = document.createElement('div');
    colOther.style.cssText = 'flex:0 1 auto;';
    colOther.appendChild(makeColTitle(_isEn ? 'Other Games' : 'Altri Giochi'));
    var gridOther = document.createElement('div');
    gridOther.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:' + _px(5) + ';';
    // Quattro voci riempiono la griglia 2x2: con tre restava un buco accanto a
    // Scacchi. In inglese "Nine Men's Morris" per esteso e' troppo lungo per il
    // pulsante (nowrap allargherebbe la colonna): si usa "Morris", che e' la
    // parola distintiva del gioco, mentre "Mill" in inglese significa anche
    // mulino ad acqua e in un elenco di giochi non si riconoscerebbe.
    var otherGames = [['Sudoku', 'sudoku'],
                      [_isEn ? 'Checkers' : 'Dama', 'dama'],
                      [_isEn ? 'Chess' : 'Scacchi', 'scacchi'],
                      [_isEn ? 'Morris' : 'Mulino', 'mulino']];
    otherGames.forEach(function (g) { gridOther.appendChild(makeNavLink(g[0], g[1] + _suffix)); });
    colOther.appendChild(gridOther);

    colOther.appendChild(makeColTitle(_isEn ? 'Music' : 'Musica', 8));
    var gridMusic = document.createElement('div');
    gridMusic.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:' + _px(5) + ';';
    var musicPages = [
        ['🎵 ' + (_isEn ? 'Intervals' : 'Intervalli'), 'musica/intervalli/' + (_isEn ? 'index-en.html' : '')],
        ['🎹 ' + (_isEn ? 'Chords' : 'Accordi'), 'musica/accordi/' + (_isEn ? 'index-en.html' : '')],
        ['🎶 ' + (_isEn ? 'Scales' : 'Scale'), 'musica/scale/' + (_isEn ? 'index-en.html' : '')],
        ['⏱️ ' + (_isEn ? 'Metronome' : 'Metronomo'), 'metronome' + _suffix]
    ];
    musicPages.forEach(function (g) { gridMusic.appendChild(makeNavLink(g[0], g[1])); });
    colOther.appendChild(gridMusic);

    mainRow.appendChild(colCards);
    mainRow.appendChild(colCenter);
    mainRow.appendChild(colOther);

    footer.appendChild(mainRow);
    overlay.appendChild(adArea);
    overlay.appendChild(footer);
    // Se il body ha transform (es. Machiavelli scala il body), position:fixed si ancora al body
    // invece che al viewport — in quel caso appendiamo all'elemento html per uscire dallo stacking context
    var bodyTransform = getComputedStyle(document.body).transform;
    var hasBodyTransform = bodyTransform && bodyTransform !== 'none';
    var overlayParent = hasBodyTransform ? document.documentElement : document.body;
    overlayParent.appendChild(overlay);
    // ─── RICHIESTA DELL'AD (delay + velo anti-primo-click) ───────────────────
    // RIPRISTINATO (2026-08-05, stessa data della rimozione): la rimozione del
    // ritardo aveva prodotto, nell'ora successiva alla pubblicazione, un CTR
    // interstitial sull'ora ~1,1-1,3% (click passati 3→6→7) contro la baseline
    // ~0,34% del giorno prima. Segnale debole in assoluto (pochi click) ma nella
    // direzione temuta e, dato lo storico di 3 ban per "click multipli", non
    // accettabile da rischiare: ripristinato subito. Il ritardo di ~600ms + velo
    // nero coprono l'area ad finché il layout è "armato", così un eventuale click
    // residuo del giocatore all'apertura non cade su un ad già servito e
    // cliccabile. La push parte SOLO dopo il timeout, contestualmente alla
    // rimozione del velo. Rivalutare la rimozione solo con un dato stabile su più
    // giorni, eventualmente con un ritardo più corto invece che a 0.
    //
    // 2026-08-10: ridotto 600→100ms, NON azzerato. Il precedente del 5 agosto
    // resta valido come monito, ma le condizioni sono cambiate: allora
    // INTERSTITIAL_CLOSE_DELAY_SECONDS era 0 e il clic residuo del giocatore
    // trovava CONTINUA subito attivo; oggi è 2, quindi il pulsante è disabilitato
    // per i primi 2s e il clic residuo non ha bersaglio. Il velo a 100ms resta
    // come seconda difesa (pointer-events:auto intercetta il clic sull'area ad,
    // non è solo visivo). Dati che motivano il test: viewability 70% (>= 69,3%
    // pre-ban), CTR 0,39-0,41% stabile su due giorni pieni, RPM 0,75-0,82 cioè
    // ~5x le altre unità.
    //
    // 2026-08-13, ESITO su tre giorni pieni a 100ms (11-12 ago):
    //   600ms:  9 ago 1723 impr / 7 click / CTR 0,41% / RPM 0,75
    //          10 ago 1038 impr / 4 click / CTR 0,39% / RPM 0,82
    //   100ms: 11 ago 2235 impr / 15 click / CTR 0,67% / RPM 0,83
    //          12 ago 2296 impr / 14 click / CTR 0,61% / RPM 0,85
    // Il CTR si è assestato ~1,5x il regime a 600ms, l'RPM è invariato (0,85 vs
    // 0,82, dentro il rumore: 9 e 10 ago differivano già del 9% a parametri
    // uguali). CTR che sale del 50% senza che salga il ricavo = click che non
    // convertono, cioè la firma del clic accidentale. Le altre unità nello
    // stesso report stanno a 0,07-0,23%. La soglia di rollback originaria
    // (CTR orario > 1%) è stata toccata l'11 ago; decisione consapevole di
    // Luciano il 13 ago: TENERE 100ms per ora, accettando il rischio.
    // Se si riapre il tema, il rollback a 600ms non richiede altri dati: la
    // domanda "i 100ms pagano?" ha già risposto no. Rimettere 600ms se
    // compaiono avvisi di traffico non valido o se il CTR giornaliero supera
    // l'1%. Storico: 3 ban per "click multipli".
    var ADSENSE_INTERSTITIAL_ARM_DELAY_MS = 100;
    var _insInterstitial = overlay.querySelector('ins.adsbygoogle');
    if (_insInterstitial) {
        // Velo nero opaco sopra l'area ad (adArea è position:relative/absolute
        // container con overflow:hidden): copre il creative finché non è "armato".
        var _adVeil = document.createElement('div');
        _adVeil.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;' +
            'background:#000;z-index:5;pointer-events:auto;';
        adArea.appendChild(_adVeil);
        setTimeout(function () {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            if (_adVeil && _adVeil.parentNode) _adVeil.parentNode.removeChild(_adVeil);
        }, ADSENSE_INTERSTITIAL_ARM_DELAY_MS);
    }
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── DEBUG INTERSTITIAL (Ctrl+Alt+P) ─────────────────────────────────────────
(function () {
    document.addEventListener('keydown', function (e) {
        if (!e.ctrlKey || !e.altKey || e.key !== 'p') return;
        e.preventDefault();

        var existing = document.getElementById('_interstitial_debug_panel');
        if (existing) { existing.remove(); return; }

        var now = Date.now();
        var session = parseInt(localStorage.getItem('_interstitial_session_start') || '0', 10);
        var last = parseInt(localStorage.getItem('_interstitial_last_shown') || '0', 10);
        var pending = localStorage.getItem('_interstitial_pending');
        var sessionMin = session ? ((now - session) / 60000).toFixed(1) : null;
        var lastMin = last ? ((now - last) / 60000).toFixed(1) : null;
        var sessionOk = session && ((now - session) / 60000) >= INTERSTITIAL_MIN_SESSION_MINUTES;
        var cooldownOk = !last || ((now - last) / 60000) >= INTERSTITIAL_COOLDOWN_MINUTES;
        var pronto = ENABLE_INTERSTITIAL && sessionOk && cooldownOk;

        function row(label, value, ok) {
            var col = ok === true ? '#6f6' : ok === false ? '#f66' : '#ccc';
            return '<tr><td style="padding:2px 12px 2px 0;color:#999;white-space:nowrap">' + label + '</td>' +
                   '<td style="color:' + col + ';font-weight:bold">' + value + '</td></tr>';
        }

        var panel = document.createElement('div');
        panel.id = '_interstitial_debug_panel';
        panel.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(0,0,0,0.9);border:1px solid #555;border-radius:8px;padding:14px;z-index:9999999;font-family:monospace;font-size:12px;min-width:280px;';

        var html = '<div style="color:#e8d870;font-weight:bold;margin-bottom:8px">Interstitial Debug <span style="color:#555;font-size:10px">Ctrl+Alt+P per chiudere</span></div>';
        html += '<table style="border-collapse:collapse;width:100%">';
        html += row('ENABLE_INTERSTITIAL', ENABLE_INTERSTITIAL, ENABLE_INTERSTITIAL);
        html += row('devMode', devMode, null);
        html += row('pending', pending || 'no', null);
        html += row('inizio sessione', session ? new Date(session).toLocaleTimeString() : 'nessuna', !!session);
        html += row('durata sessione', sessionMin !== null ? sessionMin + ' min' : '—', sessionOk);
        html += row('minimo richiesto', INTERSTITIAL_MIN_SESSION_MINUTES + ' min', null);
        html += row('ultima visualizz.', last ? new Date(last).toLocaleTimeString() : 'mai', null);
        html += row('tempo trascorso', lastMin !== null ? lastMin + ' min' : '—', cooldownOk);
        html += row('cooldown richiesto', INTERSTITIAL_COOLDOWN_MINUTES + ' min', null);
        html += row('▶ PRONTO?', pronto ? 'SÌ' : 'NO', pronto);
        html += '</table>';
        html += '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">';
        html += '<button id="_idbtn_now" style="flex:1;background:#2a6a4a;color:#fff;border:none;border-radius:4px;padding:6px;cursor:pointer;font-size:11px">Forza ora</button>';
        html += '<button id="_idbtn_force" style="flex:1;background:#2a6a2a;color:#fff;border:none;border-radius:4px;padding:6px;cursor:pointer;font-size:11px">Forza prossima</button>';
        html += '<button id="_idbtn_reset" style="flex:1;background:#6a2a2a;color:#fff;border:none;border-radius:4px;padding:6px;cursor:pointer;font-size:11px">Reset tutto</button>';
        html += '<button id="_idbtn_close" style="background:#333;color:#aaa;border:none;border-radius:4px;padding:6px 10px;cursor:pointer;font-size:11px">✕</button>';
        html += '</div>';

        panel.innerHTML = html;
        document.body.appendChild(panel);

        document.getElementById('_idbtn_now').onclick = function () {
            // Imposta sessione a 20 minuti fa e azzera cooldown → interstitial pronto subito
            var ago20 = Date.now() - 20 * 60000;
            localStorage.setItem('_interstitial_session_start', ago20);
            localStorage.setItem('_interstitial_last_activity', ago20);
            localStorage.removeItem('_interstitial_last_shown');
            panel.remove();
        };
        document.getElementById('_idbtn_force').onclick = function () {
            localStorage.removeItem('_interstitial_last_shown');
            panel.remove();
        };
        document.getElementById('_idbtn_reset').onclick = function () {
            localStorage.removeItem('_interstitial_last_shown');
            localStorage.removeItem('_interstitial_session_start');
            localStorage.removeItem('_interstitial_last_activity');
            localStorage.removeItem('_interstitial_pending');
            panel.remove();
        };
        document.getElementById('_idbtn_close').onclick = function () { panel.remove(); };
    });
})();
// ─────────────────────────────────────────────────────────────────────────────

function adjustLayout() {
    // Badge STATISTICHE & SHIELD
    if (window.showBannerDimensions) {
        var badge = document.getElementById('debug-mode-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'debug-mode-badge';
            badge.style.cssText = 'position:fixed; top:10px; left:10px; background:rgba(0,0,0,0.85); color:#0f0; padding:12px; font-family:monospace; font-size:12px; z-index:99999; border:1px solid #0f0; pointer-events:auto; line-height:1.6; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.5);';
            document.body.appendChild(badge);
        }
        var modeStr = devMode ? '<span style="color:#ffee00">DEV MODE (Persistent)</span>' : '<span style="color:#00ff00">PRODUCTION</span>';
        var shieldStatus = isAdSenseShieldActive() ? '<span style="color:#ff4444; font-weight:bold;">ATTIVO (AdSense Bloccato)</span>' : '<span style="color:#888">Inattivo (AdSense Libero)</span>';
        var adsenseGlobalStatus = (typeof ADSENSE_GLOBAL_ENABLED !== 'undefined' && ADSENSE_GLOBAL_ENABLED) ? '<span style="color:#00ff00">Abilitato</span>' : '<span style="color:#ff4444">DISABILITATO (Bando)</span>';

        var remaining = '';
        if (isAdSenseShieldActive()) {
            var diff = parseInt(localStorage.getItem('adsense_shield_until')) - Date.now();
            var hours = Math.floor(diff / (1000 * 60 * 60));
            var mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            remaining = '<br>⏳ Scade tra: ' + hours + 'h ' + mins + 'm';
        }

        badge.innerHTML = '<strong>' + modeStr + '</strong><br>' +
            'AdSense Globale: ' + adsenseGlobalStatus + '<br>' +
            'AdSense Shield: ' + shieldStatus + remaining +
            '<br><hr style="border:0; border-top:1px solid #444; margin:8px 0;">' +
            '<button onclick="resetAdSenseShield()" style="cursor:pointer; font-size:10px; background:#333; color:#fff; border:1px solid #555; padding:2px 6px; border-radius:3px;">Reset Shield</button> ' +
            '<span style="font-size:9px; color:#777; margin-left:5px;">Ctrl+Alt+S per chiudere</span>';
    } else {
        var badge = document.getElementById('debug-mode-badge');
        if (badge) badge.remove();
    }

    // Badge DEV MODE persistente (piccolo indicatore in basso)
    if (devMode && document.body) {
        var _lowBadge = document.getElementById('dev-mode-badge-small');
        if (!_lowBadge) {
            _lowBadge = document.createElement('div');
            _lowBadge.id = 'dev-mode-badge-small';
            _lowBadge.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:99999;background:#c00;color:#fff;font-size:11px;font-weight:bold;padding:3px 7px;border-radius:4px;opacity:0.6;';
            _lowBadge.textContent = 'DEV';
            document.body.appendChild(_lowBadge);
        }
    } else {
        var _lowBadge = document.getElementById('dev-mode-badge-small');
        if (_lowBadge) _lowBadge.remove();
    }
    injectLegalLinks();
    var gameWidth = 1024;
    var gameHeight = 750;
    // [INIZIO FIX SURFACE PRO / DPI ALTO]
    // Usiamo document.documentElement.clientWidth/Height perché su schermi High-DPI (Surface) 
    // con zoom, window.innerWidth può restituire valori inconsistenti.
    var viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    var viewportHeight = document.documentElement.clientHeight || window.innerHeight;

    var windowWidth = viewportWidth;
    var windowHeight = viewportHeight;
    // [FINE FIX SURFACE PRO]

    var campogioco = document.getElementById('campogioco');
    var sidebarLeft = document.getElementById('sidebar-left');
    var sidebarRight = document.getElementById('sidebar-right');

    if (!campogioco || !sidebarLeft || !sidebarRight) return;

    var scaleX = windowWidth / gameWidth;
    var scaleY = windowHeight / gameHeight;
    var scale = Math.min(scaleX, scaleY);

    window.gameScale = scale;

    var totalExtraWidth = windowWidth - (gameWidth * scale);
    var layoutMode = 'none';
    if (totalExtraWidth >= 600) {
        layoutMode = 'dual';
    } else if (totalExtraWidth >= 160) {
        layoutMode = 'single-left';
    }

    // Calculate desired visual center
    var cx = windowWidth / 2;
    var cy = windowHeight / 2;
    if (layoutMode === 'single-left') {
        cx = windowWidth - ((gameWidth * scale) / 2);
    }

    // Position the layout box so its center aligns with the desired visual center.
    // Since transform scales from the center, this will perfectly position the game.
    campogioco.style.top = Math.round(cy - (gameHeight / 2)) + 'px';
    campogioco.style.left = Math.round(cx - (gameWidth / 2)) + 'px';

    // Explicitly reset margins to avoid interference from previous versions
    campogioco.style.marginTop = '0px';
    campogioco.style.marginLeft = '0px';

    campogioco.style.transform = 'scale(' + scale + ')';
    // Backwards compatibility for older browsers
    campogioco.style.msTransform = 'scale(' + scale + ')';
    campogioco.style.webkitTransform = 'scale(' + scale + ')';

    if (window._layoutResizeListeners) {
        var rect = campogioco.getBoundingClientRect();
        for (var i = 0; i < window._layoutResizeListeners.length; i++) {
            window._layoutResizeListeners[i](rect.left, rect.top, scale);
        }
    }

    if (!document.getElementById('adsense-fallback-style')) {
        var styleEl = document.createElement('style');
        styleEl.id = 'adsense-fallback-style';
        styleEl.innerHTML =
            'ins.adsbygoogle { pointer-events: none; } ' +
            'ins.adsbygoogle iframe { pointer-events: auto; } ' +
            'ins.adsbygoogle[data-ad-status="unfilled"] { display: none !important; pointer-events: none !important; } ' +
            /* 30s Cycle (Right: 20s Rich + 10s Simple) */
            '@keyframes amazonFadeRich30 { 0%, 63% { opacity: 1; visibility: visible; } 70%, 93% { opacity: 0; visibility: hidden; } 100% { opacity: 1; visibility: visible; } } ' +
            '@keyframes amazonFadeSimple30 { 0%, 63% { opacity: 0; visibility: hidden; } 70%, 93% { opacity: 1; visibility: visible; } 100% { opacity: 0; visibility: hidden; } } ' +
            /* 25s Cycle (Left: 15s Rich + 10s Simple) */
            '@keyframes amazonFadeRich25 { 0%, 56% { opacity: 1; visibility: visible; } 64%, 92% { opacity: 0; visibility: hidden; } 100% { opacity: 1; visibility: visible; } } ' +
            '@keyframes amazonFadeSimple25 { 0%, 56% { opacity: 0; visibility: hidden; } 64%, 92% { opacity: 1; visibility: visible; } 100% { opacity: 0; visibility: hidden; } } ' +
            /* Badge Styling & Pulsing Animation */
            '.amazon-badge { display: inline-block; background: #e47911; color: white; padding: 4px 10px; font-weight: bold; border-radius: 4px; font-size: 14px; transition: transform 0.3s ease; } ' +
            '@keyframes amazonPulseAnim { ' +
            '0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7); background: #e47911; } ' +
            '50% { transform: scale(1.15); box-shadow: 0 0 15px 5px rgba(255, 0, 0, 0.5); background: #ff0000; } ' +
            '100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); background: #e47911; } ' +
            '} ' +
            '.amazon-badge-pulse { animation: amazonPulseAnim 1s infinite !important; } ' +
            /* Badge AliExpress: la classe era gia' applicata dal codice ma non era
               mai stata definita, percio' i badge AliExpress restavano arancione
               Amazon. !important perche' i keyframes del pulse reimpostano il
               background a ogni passaggio. */
            '.ali-badge { background: #e62e04 !important; } ' +
            /* Bagliore pulsante per il promo Sudoku nella sidebar */
            '.sudoku-promo-btn { animation: sudokuPromoGlow 1.8s infinite; } ' +
            '@keyframes sudokuPromoGlow { ' +
            '0%, 100% { box-shadow: 0 4px 8px rgba(0,0,0,0.3); } ' +
            '50% { box-shadow: 0 0 16px 5px rgba(255,215,0,0.75); } ' +
            '}';
        document.head.appendChild(styleEl);
    }

    sidebarRight.style.display = 'none';

    var getAmazonRichHtml = function (deal, amazonGenericLink, amazonGenericImg, side) {
        var isMusicBanner = amazonGenericLink && amazonGenericLink.indexOf('musica') !== -1;
        if (isMusicBanner) {
            // Pulsantiera dello slot 300x250, identica nelle due colonne (prima la
            // destra mostrava solo l'immagine statica della gallery Amazon).
            // Da sei pulsanti in griglia 2x3 si e' passati a tre righe piene: con
            // tre voci la griglia a due colonne lasciava mezza riga vuota, mentre
            // a piena larghezza (262px) le etichette stanno su una riga sola.
            // Con la quarta voce (Campo Minato) l'altezza e' scesa da 60 a 52: lo
            // spazio utile in verticale e' 230 (250 meno i due padding da 10) e
            // quattro righe da 60 ne vorrebbero 240. A 52 il totale e' 208 e i 22
            // che restano bastano allo space-evenly per staccarle. Se un giorno
            // si aggiunge una quinta voce, qui non ci sta piu': o si torna alla
            // griglia a due colonne o si sceglie cosa togliere.
            var en = (window.currentLang === 'en');
            var newLabel = en ? 'NEW' : 'NUOVO';
            var stileRiga = 'display:flex;align-items:center;justify-content:center;gap:8px;width:262px;height:52px;border-radius:9px;color:#ffffff;font-size:15px;font-weight:bold;text-align:center;text-decoration:none;position:relative;transition:transform 0.2s;cursor:pointer;box-sizing:border-box;line-height:1.25;box-shadow:0 3px 6px rgba(0,0,0,0.3);';
            var hover = ' onmouseover="this.style.transform=\'scale(1.03)\';this.style.filter=\'brightness(1.15)\';" onmouseout="this.style.transform=\'scale(1)\';this.style.filter=\'none\';"';
            var badgeSmall = '<span class="amazon-badge amazon-badge-pulse" style="position:absolute;top:-7px;right:-5px;font-size:9px;padding:1px 5px;">' + newLabel + '</span>';

            // Offerte: porta sempre alla vetrina interna (nuova scheda), non al
            // deal del giorno, e nomina entrambi gli store perche' view_gallery
            // li raccoglie tutti e due. Il gradiente unisce l'arancio Amazon al
            // rosso AliExpress proprio perche' il pulsante vale per entrambi.
            var offerteTesto = en ? 'Amazon / AliExpress Deals' : 'Offerte Amazon / AliExpress';
            var offerteBg = 'background:linear-gradient(180deg,#e47911 0%,#e62e04 100%);border:2px solid #ffd18c;';

            var promoLink = en ? '/calcolo-en.html' : '/calcolo.html';
            var promoTesto = en ? 'CROSS FIGURE Luciano' : 'CALCOLO ENIGMATICO';

            // Campo Minato tiene il badge "nuovo" come Calcolo Enigmatico: sono
            // i due arrivi recenti e li si vuole segnalare entrambi.
            var minatoLink = en ? '/minato-en.html' : '/minato.html';
            var minatoTesto = en ? 'MINESWEEPER Luciano' : 'CAMPO MINATO';

            return '<div style="display:flex;flex-direction:column;justify-content:space-evenly;align-items:center;width:300px;height:250px;padding:10px;box-sizing:border-box;background:linear-gradient(135deg, #14532d, #022c22);border:3px solid #ffdb4d;border-radius:12px;box-shadow:inset 0 0 20px rgba(0,0,0,0.6), 0 4px 15px rgba(0,0,0,0.5);font-family:\'Outfit\',\'Open Sans\',sans-serif;z-index:100;overflow:hidden;">' +
                '<a href="' + promoLink + '" target="_self" class="sudoku-promo-btn" style="' + stileRiga + 'background:linear-gradient(180deg,#b91c1c 0%,#991b1b 100%);border:2px solid #ffd700;"' + hover + '>' +
                badgeSmall + '🔢<span style="color:#ffd700;">' + promoTesto + '</span>' +
                '</a>' +
                // Verde scuro col bordo chiaro, gli stessi colori del campo di
                // gioco: e' il modo piu' rapido per far riconoscere il gioco a
                // chi ci e' gia' stato, e non ripete il rosso di Calcolo qui
                // sopra ne' il blu della musica qui sotto.
                '<a href="' + minatoLink + '" target="_self" class="sudoku-promo-btn" style="' + stileRiga + 'background:linear-gradient(180deg,#15803d 0%,#14532d 100%);border:2px solid #ffd700;"' + hover + '>' +
                badgeSmall + '💣<span style="color:#ffd700;">' + minatoTesto + '</span>' +
                '</a>' +
                '<a href="' + amazonGenericLink + '" target="_self" style="' + stileRiga + 'background:linear-gradient(180deg,#1d4ed8 0%,#1e40af 100%);border:2px solid #60a5fa;"' + hover + '>' +
                '🎵<span style="color:#ffd700;">Music Ear Training</span>' +
                '</a>' +
                '<a href="view_gallery.html" target="_blank" rel="noopener" style="' + stileRiga + offerteBg + '"' + hover + '>' +
                '🛒<span style="color:#ffd700;">' + offerteTesto + '</span>' +
                '</a>' +
                '</div>';
        }

        if (!deal) {
            return '<a href="' + amazonGenericLink + '" target="_blank" rel="noopener" style="display:block;width:100%;height:100%;"><img src="' + amazonGenericImg + '" style="width:100%;height:100%;object-fit:cover;" alt="Offerte Amazon"></a>';
        }

        if (!AMAZON_USE_NEW_DEALS) {
            var badgeText = deal.badge || 'OFFERTA A TEMPO';
            var expiryText = deal.expiry || '';
            var imgUrl = deal.img || amazonGenericImg;
            var animSuffix = (side === 'left') ? '25' : '30';
            var duration = (side === 'left') ? '25s' : '30s';

            return '<a href="' + amazonGenericLink + '" target="_blank" rel="sponsored noopener" style="display:block;width:100%;height:100%;text-decoration:none;color:inherit;position:relative;overflow:hidden;background:#131921;">' +
                // STRATO 1: Versione Ricca
                '<div style="position:absolute;top:0;left:0;width:300px;height:600px;display:flex;flex-direction:column;box-sizing:border-box;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;animation: amazonFadeRich' + animSuffix + ' ' + duration + ' infinite; transition: opacity 1s ease-in-out;">' +
                '<div style="background:#cc0c39;color:#fff;padding:12px;text-align:center;font-weight:bold;font-size:14px;text-transform:uppercase;">Offerta a Tempo</div>' +
                '<div style="width:100%;height:200px;background:#fff;display:flex;justify-content:center;align-items:center;padding:10px;box-sizing:border-box;">' +
                '<img src="' + imgUrl + '" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Offerte Amazon">' +
                '</div>' +
                '<div style="padding:15px 24px;flex-grow:1;display:flex;flex-direction:column;text-align:center;color:#fff;">' +
                '<div style="font-size:16px;font-weight:600;margin-bottom:15px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden;">' + deal.title + '</div>' +
                '<div>' +
                '<span style="display:inline-block;background:#cc0c39;color:#fff;padding:4px 10px;border-radius:4px;font-size:13px;font-weight:bold;margin-bottom:12px;">' + badgeText + '</span>' +
                (expiryText ? '<div style="font-size:13px;color:#94a3b8;font-style:italic;">' + expiryText + '</div>' : '') +
                '</div>' +
                '</div>' +
                '<div style="padding:0 24px 20px;">' +
                '<div style="display:block;background:linear-gradient(180deg,#ff9900 0%,#e68a00 100%);color:#000;padding:16px;border-radius:30px;font-weight:bold;text-align:center;">Vedi offerta su Amazon.it</div>' +
                '</div>' +
                '<div style="font-size:10px;color:#64748b;text-align:center;padding:10px;line-height:1.2;">Disponibile su Amazon.it<br><span style="font-size:9px;opacity:0.7;">Come affiliato Amazon, guadagno dagli acquisti idonei.</span></div>' +
                '</div>' +
                // STRATO 2: Versione Semplice (Solo Immagine)
                '<div style="position:absolute;top:0;left:0;width:300px;height:600px;animation: amazonFadeSimple' + animSuffix + ' ' + duration + ' infinite; transition: opacity 1s ease-in-out; background:#fff; display:flex; align-items:center; justify-content:center;">' +
                '<img src="' + imgUrl + '" style="width:100%;height:100%;object-fit:contain;" alt="Offerta Amazon">' +
                '<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.7);color:#fff;padding:15px;text-align:center;font-weight:bold;font-size:14px;">SCOPRI DI PIÙ SU AMAZON</div>' +
                '</div>' +
                '</a>';
        }
        
        var isAli = (deal && deal.store === 'aliexpress');
        var targetLink = (deal && deal.link) ? deal.link : amazonGenericLink;
        var headerText = (AMAZON_USE_NEW_DEALS && deal.custom_message) ? deal.custom_message : (isAli ? 'OFFERTA ALIEXPRESS' : 'Offerta a Tempo');
        var badgeText = deal.badge || (isAli ? 'OFFERTA ALIEXPRESS' : 'OFFERTA A TEMPO');
        var expiryText = deal.expiry || '';
        
        var firstImg = (AMAZON_USE_NEW_DEALS && deal.active_images && deal.active_images.length > 0) ? deal.active_images[0] : (deal.img || amazonGenericImg);
        var secondImg = firstImg;
        var imagesAttr = '';
        if (AMAZON_USE_NEW_DEALS && deal.active_images && deal.active_images.length > 0) {
            imagesAttr = ' data-images="' + deal.active_images.join(',') + '" data-side="' + side + '" data-rich-index="0" data-simple-index="0" data-anim-start="' + new Date().getTime() + '"';
        }

        // Tempi differenziati: 25s a sinistra (15+10), 30s a destra (20+10)
        var animSuffix = (side === 'left') ? '25' : '30';
        var duration = (side === 'left') ? '25s' : '30s';

        var priceAndBadgeHtml = '';
        var expiryTitleAttr = (expiryText ? ' title="' + expiryText + '"' : '');

        var ctaBtnText = isAli ? 'Vedi offerta su AliExpress' : 'Vedi offerta su Amazon.it';
        var ctaBtnStyle = isAli ? 'background:linear-gradient(180deg,#ff4747 0%,#d62828 100%);color:#fff;' : 'background:linear-gradient(180deg,#ff9900 0%,#e68a00 100%);color:#000;';
        var disclaimerText = isAli ? 'Disponibile su AliExpress<br><span style="font-size: 9px; opacity: 0.7;">In qualità di affiliato AliExpress, guadagno dagli acquisti idonei.</span>' : 'Come affiliato Amazon,<br>guadagno dagli acquisti idonei.';
        var headerBg = isAli ? '#d62828' : '#cc0c39';
        var themeBg = isAli ? '#18181b' : '#131921';

        if (AMAZON_USE_NEW_DEALS) {
            var priceHtml = (deal.price && deal.price.trim() !== '') ? '<span style="font-size:28px; font-weight:bold; color:#ff5252; margin:0;">' + deal.price + '</span>' : '';
            var badgeHtml = '';
            if (deal.badge && deal.badge.trim() !== '') {
                var isHighDiscount = false;
                var match = deal.badge.match(/(\d+)%/);
                if (match && parseInt(match[1], 10) > AMAZON_DEALS_PULSE_THRESHOLD) {
                    isHighDiscount = true;
                }
                var pulseClass = isHighDiscount ? ' amazon-badge-pulse' : '';
                var aliBadgeClass = isAli ? ' ali-badge' : '';
                badgeHtml = '<span class="amazon-badge' + aliBadgeClass + pulseClass + '">' + deal.badge + '</span>';
            }
            if (priceHtml || badgeHtml) {
                var gapStyle = (priceHtml && badgeHtml) ? ' gap:10px;' : '';
                priceAndBadgeHtml = '<div style="display:flex; justify-content:center; align-items:center;' + gapStyle + ' margin-bottom:8px;"' + expiryTitleAttr + '>' +
                    priceHtml +
                    badgeHtml +
                    '</div>';
            }
        } else {
            priceAndBadgeHtml = '<div style="margin-bottom:12px;"' + expiryTitleAttr + '>' +
                '<span style="display:inline-block;background:' + headerBg + ';color:#fff;padding:4px 10px;border-radius:4px;font-size:13px;font-weight:bold;">' + badgeText + '</span>' +
                '</div>';
        }

        // Struttura a due strati con animazione
        return '<a href="' + targetLink + '" target="_blank" rel="sponsored noopener" style="display:block;width:100%;height:100%;text-decoration:none;color:inherit;position:relative;overflow:hidden;background:' + themeBg + ';"' + imagesAttr + '>' +
            // STRATO 1: Versione Ricca
            '<div style="position:absolute;top:0;left:0;width:300px;height:600px;display:flex;flex-direction:column;box-sizing:border-box;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;animation: amazonFadeRich' + animSuffix + ' ' + duration + ' infinite; transition: opacity 1s ease-in-out;">' +
            '<div style="background:' + headerBg + ';color:#fff;padding:12px;text-align:center;font-weight:bold;font-size:14px;text-transform:uppercase;">' + headerText + '</div>' +
            '<div style="width:100%;height:260px;background:#fff;display:flex;justify-content:center;align-items:center;padding:0;box-sizing:border-box;">' +
            '<img src="' + firstImg + '" class="amazon-banner-img amazon-rich-img" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Offerta">' +
            '</div>' +
            '<div style="padding:15px 24px 0;flex-grow:1;display:flex;flex-direction:column;text-align:center;color:#fff;justify-content:center;min-height:0;">' +
            '<div style="font-size:16px;font-weight:600;margin-bottom:0;line-height:1.4;display:-webkit-box;-webkit-line-clamp:6;overflow:hidden;">' + deal.title + '</div>' +
            '</div>' +
            priceAndBadgeHtml +
            '<div style="padding:0 24px 0;">' +
            '<div style="display:block;' + ctaBtnStyle + 'padding:16px;border-radius:30px;font-weight:bold;text-align:center;">' + ctaBtnText + '</div>' +
            '</div>' +
            '<div style="font-size:12px;color:#64748b;text-align:center;padding:8px 10px 8px;line-height:1.2;">' + disclaimerText + '</div>' +
            '</div>' +
            // STRATO 2: Versione Semplice (Immagine Ingrandita + Info)
            '<div style="position:absolute;top:0;left:0;width:300px;height:600px;display:flex;flex-direction:column;box-sizing:border-box;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;animation: amazonFadeSimple' + animSuffix + ' ' + duration + ' infinite; transition: opacity 1s ease-in-out; background:' + themeBg + ';">' +
            '<div style="background:' + headerBg + ';color:#fff;padding:12px;text-align:center;font-weight:bold;font-size:14px;text-transform:uppercase;">' + headerText + '</div>' +
            '<div style="width:100%;flex-grow:1;background:#fff;display:flex;justify-content:center;align-items:center;padding:0;box-sizing:border-box;min-height:0;">' +
            '<img src="' + secondImg + '" class="amazon-banner-img amazon-simple-img" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Offerta">' +
            '</div>' +
            '<div style="padding:15px 24px 5px;display:flex;flex-direction:column;text-align:center;color:#fff;">' +
            priceAndBadgeHtml +
            '</div>' +
            '<div style="padding:0 24px 0;">' +
            '<div style="display:block;' + ctaBtnStyle + 'padding:16px;border-radius:30px;font-weight:bold;text-align:center;">' + ctaBtnText + '</div>' +
            '</div>' +
            '<div style="font-size:12px;color:#64748b;text-align:center;padding:8px 10px 8px;line-height:1.2;">' + disclaimerText + '</div>' +
            '</div>' +
            '</a>';
    };

    var createBanner = function (width, height, side, isFirst) {
        var adsenseActive = ADSENSE_GLOBAL_ENABLED && !devMode && !isAdSenseShieldActive() && window.gameConfig && window.gameConfig.adsenseActive;
        // In dev_mode su giochi con AdSense, disabilita anche i message banner (verrebbero creati al posto di AdSense)
        var isMessageBanner = isFirst && width >= 160 && !(devMode && window.gameConfig && window.gameConfig.adsenseActive);
        var slotId = null;
        var amazonBannerUrl = null;
        var amazonGeneric = false;
        var amazonGenericImg = '/banner/offerteamazon2.jpg';
        var amazonGenericLink = 'https://www.amazon.it/deals?&linkCode=ll2&tag=lucianomane0f-21&linkId=d542031952a47db9f26b8cc6c38762cb&ref_=as_li_ss_tl';

        var amazonEnabled = AMAZON_BANNERS_ENABLED || (AMAZON_BANNERS_RIGHT && side === 'right');
        if (AMAZON_FALLBACK_ON_SHIELD && side === 'left' && isAdSenseShieldActive()) {
            amazonEnabled = true;
        }
        if (amazonEnabled && width === 300 && height === 600) {
            // Se il fetch è ancora in corso (null), non mostrare niente — verrà chiamato adjustLayout al termine
            if (!slotId && window._amazonDeal600 === null) return null;
            window._amazonBannerShownInSidebar = true;
            amazonGeneric = true;
            // Se è disponibile un deal specifico dal JSON, usa quello
            if (window._amazonDeal600) {
                amazonGenericImg = (AMAZON_USE_NEW_DEALS && window._amazonDeal600.active_images && window._amazonDeal600.active_images.length > 0) ? window._amazonDeal600.active_images[0] : window._amazonDeal600.img;
                amazonGenericLink = window._amazonDeal600.link;
            }
        } else if (amazonEnabled && width === 300 && height === 250) {
            amazonGeneric = true;
            amazonGenericImg = (window.currentLang === 'en') ? '/banner/provamusica-en.jpg' : '/banner/provamusica.jpg';
            amazonGenericLink = (window.currentLang === 'en') ? '/musica/index-en.html' : '/musica/';
        }

        // Map fixed sizes to provided AdSense Slot IDs
        if (adsenseActive && window.gameConfig.adsenseSlots) {
            var key = width + 'x' + height;
            slotId = window.gameConfig.adsenseSlots[key];
        }

        // When ADSENSE_ONLY_LEFT is true, suppress AdSense on the right sidebar
        // but still allow the banner element to be created (for the dark background)
        // In dev mode non creare placeholder dark inutili
        var adsenseSuppressed = !devMode && ADSENSE_ONLY_LEFT && side === 'right';
        if (adsenseSuppressed) {
            slotId = null;
        }

        // If AdSense is active for this game, we skip the message banner in the top slot
        // to give full priority to the ad units.
        // Exception: when AdSense is suppressed on right (ADSENSE_ONLY_LEFT), still create the banner.
        var isAdSenseSimulation = devMode && window.gameConfig && window.gameConfig.adsenseActive && (!ADSENSE_ONLY_LEFT || side === 'left');
        if (!window.showBannerDimensions && !isMessageBanner && !slotId && !amazonBannerUrl && !amazonGeneric && !adsenseSuppressed && !isAdSenseSimulation) {
            return null;
        }

        var bannerId = 'ad-' + side + '-' + width + 'x' + height + '-' + (isFirst ? 'top' : 'bottom');
        var existingBanner = document.getElementById(bannerId);

        if (existingBanner) {
            // In dev mode rimuovi banner AdSense già cachati e ricrea da zero
            if (devMode) existingBanner.remove();
            else return existingBanner;
        }

        var banner = document.createElement('div');
        banner.id = bannerId;
        banner.className = 'ad-banner';
        banner.style.position = 'relative'; // Required for absolute children
        banner.style.width = width + 'px';
        banner.style.height = height + 'px';

        if (adsenseSuppressed && !amazonBannerUrl && !amazonGeneric && !window.showBannerDimensions) {
            // Right sidebar placeholder: dark background from .ad-banner CSS, no AdSense request, no Amazon
            return banner;
        }

        if (slotId && !window.showBannerDimensions) {
            var caPub = window.gameConfig.adsenseClient || 'ca-pub-9335537153013492';
            var html = '';

            // Inject Amazon Fallback BEHIND AdSense for Backfill
            if (amazonGeneric) {
                var deal = (width === 300 && height === 600) ? window._amazonDeal600 : null;
                html += '<div style="position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;">' + getAmazonRichHtml(deal, amazonGenericLink, amazonGenericImg, side) + '</div>';
            } else if (amazonBannerUrl) {
                html += '<iframe src="' + amazonBannerUrl + '" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; overflow: hidden; z-index: 1;" scrolling="no"></iframe>';
            }

            // Real AdSense Injection Overlays Fallback
            html += '<ins class="adsbygoogle" ' +
                'style="display:inline-block; position: relative; width:' + width + 'px;height:' + height + 'px; z-index: 2;" ' +
                'data-ad-client="' + caPub + '" ' +
                'data-ad-slot="' + slotId + '" ' +
                'onmouseenter="window._onAdEnter();" ' +
                'onmouseleave="window._onAdLeave();" ' +
                'data-adsbygoogle-status="pending"></ins>';

            banner.innerHTML = html;
        } else if (amazonGeneric && !window.showBannerDimensions) {
            // Standalone Amazon Banner
            var deal = (width === 300 && height === 600) ? window._amazonDeal600 : null;
            banner.innerHTML = getAmazonRichHtml(deal, amazonGenericLink, amazonGenericImg, side);
        } else if (amazonBannerUrl && !window.showBannerDimensions) {
            // Standalone Amazon Banner Injection (if AdSense config is missing)
            banner.innerHTML = '<iframe src="' + amazonBannerUrl + '" style="width: 100%; height: 100%; border: none; overflow: hidden;" scrolling="no"></iframe>';
        } else if (isMessageBanner && !window.showBannerDimensions && !adsenseActive) {
            // Legacy Message Banner (only for games without AdSense like Burraco)
            var customStyle = (window.gameConfig && window.gameConfig.bannerStyle) || '';
            var defaultStyle = 'padding: 10px; text-align: left; font-size: 14px; color: white; background-color: green; border: 1px solid #2d5a3d; border-radius: 5px; height: 100%; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; overflow: auto; overflow-wrap: break-word;';
            var style = customStyle || defaultStyle;

            if (window.gameConfig && window.gameConfig.messages) {
                var lang = (side === 'left') ? 'it' : 'en';
                var msgContent = window.gameConfig.messages[lang];
                if (msgContent) {
                    banner.innerHTML = '<div style="' + style + '"><div>' + msgContent + '</div></div>';
                }
            }
        } else {
            // Simulation/Debug Mode
            var isAdSensePotential = (slotId || (window.gameConfig && window.gameConfig.adsenseActive));

            if (devMode && isAdSensePotential && !isAdSenseShieldActive()) {
                // SPECIAL: Clickable Simulation for AdSense Shield testing
                banner.innerHTML = '<div style="width:100%; height:100%; background:#222; border:2px dashed #ffee00; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; box-sizing:border-box; padding:15px; text-align:center;">' +
                    '<span style="color:#ffee00; font-weight:bold; font-size:14px;">SIMULAZIONE ADSENSE</span>' +
                    '<span style="font-size:11px; color:#aaa; margin-top:10px;">Clicca per simulare un clic e attivare lo scudo 24h</span>' +
                    '</div>';
                banner.onclick = function () {
                    if (confirm("Vuoi simulare un clic su AdSense?\n\nQuesto attiverà lo scudo per 24 ore e nasconderà gli annunci reali (mostrando solo Amazon).")) {
                        activateAdSenseShield(false);
                    }
                };
            } else {
                var label = (slotId ? 'AD SLOT: ' + slotId : 'Banner');
                if (isAdSenseShieldActive() && isAdSensePotential) label = 'ADSENSE SHIELDED';

                banner.innerHTML = label + '<br>' + width + 'x' + height;
                banner.style.backgroundColor = 'rgba(128,128,128,0.2)';
                banner.style.border = '1px dashed grey';
                banner.style.display = 'flex';
                banner.style.alignItems = 'center';
                banner.style.justifyContent = 'center';
                banner.style.textAlign = 'center';
            }
        }

        // --- AdSense Shield Sensors ---
        // Il rilevamento chirurgico è gestito direttamente dal tag <ins> (z-index 2).
        // Usiamo il mouseleave del banner come rete di sicurezza globale.
        if (slotId && !isAdSenseShieldActive() && !devMode) {
            banner.onmouseleave = function () { window._onAdLeave(); };
        }

        // --- Amazon Banner Impression + Click Tracking ---
        if (amazonGeneric && !window.showBannerDimensions) {
            var startTime = Date.now();
            var pagePath = window.location.pathname.split('/').pop() || 'index.html';
            var dealId = 'generic';
            if (window._amazonDeal600 && window._amazonDeal600.title) {
                var titleText = window._amazonDeal600.title;
                dealId = titleText.length > 60 ? titleText.substring(0, 60) + '...' : titleText;
                // Prefisso ALI- per separare i due canali nei report GA4.
                if (window._amazonDeal600.store === 'aliexpress') dealId = 'ALI-' + dealId;
            }
            // Impression solo per 300x600 e solo una volta per sessione (flag globale)
            if (width === 300 && height === 600 && !window._amazonImpressionSent[bannerId]) {
                window._amazonImpressionSent[bannerId] = true;
                if (window._amazonDeal600) {
                    window._amazonDealsImpressionTracked[window._amazonDeal600.id] = true;
                }
                if (typeof gtag === 'function') {
                    gtag('event', 'Amazon_Banner_Impression', {
                        'event_category': 'Affiliate',
                        'amazon_deal_id': dealId,
                        'page_location': window.location.href,
                        'non_interaction': true
                    });
                    console.log('GA Tracked: Amazon_Banner_Impression | ' + dealId + ' | ' + width + 'x' + height + ' | on: ' + pagePath);
                }
            }
            var aLink = banner.querySelector('a');
            if (aLink) {
                aLink.addEventListener('click', function () {
                    var exposureSeconds = Math.round((Date.now() - startTime) / 1000);
                    if (typeof gtag === 'function') {
                        gtag('event', 'Amazon_Banner_Click', {
                            'event_category': 'Affiliate',
                            'amazon_deal_id': dealId,
                            'tempo_esposizione': exposureSeconds,
                            'page_location': window.location.href,
                            'non_interaction': false
                        });
                        console.log('GA Tracked: Amazon_Banner_Click | ' + dealId + ' | sec: ' + exposureSeconds + ' | on: ' + pagePath);
                    }
                });
            }
        } else if (amazonBannerUrl && !window.showBannerDimensions) {
            var startTime = Date.now();
            var bannerIdCode = amazonBannerUrl.split('/').pop().replace('.html', '');
            var pagePath = window.location.pathname.split('/').pop() || 'index.html';

            var iframe = banner.querySelector('iframe');
            if (iframe) {
                var attachTracking = function () {
                    try {
                        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        if (!iframeDoc || !iframeDoc.body) return;

                        // Prevent attaching multiple times
                        if (iframeDoc._tracked) return;
                        iframeDoc._tracked = true;

                        iframeDoc.body.addEventListener('click', function () {
                            var exposureSeconds = Math.round((Date.now() - startTime) / 1000);
                            if (typeof gtag === 'function') {
                                gtag('event', 'Amazon_Banner_Click', {
                                    'event_category': 'Affiliate',
                                    'amazon_deal_id': bannerIdCode,
                                    'tempo_esposizione': exposureSeconds,
                                    'page_location': window.location.href, // GA standard
                                    'non_interaction': false
                                });
                                console.log('GA Tracked: Amazon_Banner_Click | ' + bannerIdCode + ' | sec: ' + exposureSeconds + ' | on: ' + pagePath);
                            }
                        }, true); // useCapture to ensure it fires before navigation
                    } catch (e) {
                        console.warn('Amazon iframe click tracking blocked:', e);
                    }
                };

                // Standard load listener:
                // Because the iframe is an orphan node here (not yet appended to the DOM),
                // it hasn't started loading yet. It will begin loading once attached in populateSidebar,
                // securely guaranteeing this 'load' event will fire.
                iframe.addEventListener('load', attachTracking);
            }
        }

        return banner;
    };

    var allAdFormats = [
        { width: 300, height: 600 }, { width: 300, height: 250 }, { width: 300, height: 100 },
        { width: 160, height: 600 }, { width: 160, height: 250 }, { width: 160, height: 160 },
        { width: 120, height: 600 }, { width: 120, height: 240 }
    ];

    var populateSidebar = function (sidebar, availableWidth, sideConfig) {
        // 1. Aspettiamo che il caricamento del deal Amazon sia terminato (true, false o oggetto)
        // prima di fare qualunque cosa, per evitare doppie popolazioni.
        if (window._amazonDeal600 === null) return;

        var sidebarId = sidebar.id; // 'sidebar-left' or 'sidebar-right'

        // 2. SIGILLO PREVENTIVO: Se la colonna è già stata popolata, esci subito.
        // Questo blocca sul nascere le race condition tra DOMContentLoaded e load.
        if (sidebarId === 'sidebar-left' && window._leftPopulated) return;
        if (sidebarId === 'sidebar-right' && window._rightPopulated) return;

        // 3. SIGILLIAMO SUBITO: La porta si chiude ora.
        if (sidebarId === 'sidebar-left') window._leftPopulated = true;
        if (sidebarId === 'sidebar-right') window._rightPopulated = true;

        // 4. PULIZIA: Svuotiamo eventuali residui statici o di inizializzazione
        sidebar.innerHTML = '';

        var currentAvailableHeight = windowHeight;
        var verticalGap = 15;
        var bannerWidthFamily = 0;
        if (availableWidth >= 300) bannerWidthFamily = 300;
        else if (availableWidth >= 160) bannerWidthFamily = 160;
        else if (availableWidth >= 120) bannerWidthFamily = 120;

        if (bannerWidthFamily > 0) {
            var applicableFormats = allAdFormats.filter(function (f) { return f.width === bannerWidthFamily; });
            var visibleCount = 0;
            for (var i = 0; i < applicableFormats.length; i++) {
                var format = applicableFormats[i];
                var isFirst = visibleCount === 0;
                var requiredGap = isFirst ? 0 : verticalGap;

                // Using the mathematical exact height check
                if (currentAvailableHeight >= (format.height + requiredGap)) {
                    var banner = createBanner(format.width, format.height, sideConfig, isFirst);
                    if (banner) {
                        if (!isFirst) banner.style.marginTop = verticalGap + 'px';
                        else banner.style.marginTop = '0px';

                        banner.style.display = 'flex';
                        if (!sidebar.contains(banner)) {
                            sidebar.appendChild(banner);
                        }

                        // TRIGGER ADSENSE ONLY AFTER APPENDACHILD
                        var ins = banner.querySelector('ins[data-adsbygoogle-status="pending"]');
                        if (ins) {
                            ins.removeAttribute('data-adsbygoogle-status');
                            var currentSlot = ins.getAttribute('data-ad-slot');
                            if (window.adsenseShouldNotLoad === true) {
                                console.log('AdSense Push: skipped (adsenseShouldNotLoad=true) for slot ' + currentSlot);
                            } else {
                                try {
                                    console.log('AdSense Push: Slot ' + currentSlot + ' in ' + sidebarId + ' (' + format.width + 'x' + format.height + ')');
                                    (window.adsbygoogle = window.adsbygoogle || []).push({});
                                } catch (e) {
                                    console.error('AdSense push error for ' + sidebarId + ':', e);
                                }
                            }
                        }

                        currentAvailableHeight -= (format.height + requiredGap);
                        visibleCount++;
                    }
                }
            }
        }
    };

    if (layoutMode === 'dual') {
        var sideWidth = totalExtraWidth / 2;
        sidebarLeft.style.width = sideWidth + 'px';
        sidebarRight.style.width = sideWidth + 'px';
        sidebarLeft.style.display = 'flex';
        sidebarRight.style.display = 'flex';
        populateSidebar(sidebarLeft, sideWidth, 'left');
        populateSidebar(sidebarRight, sideWidth, 'right');
    } else if (layoutMode === 'single-left') {
        sidebarLeft.style.width = totalExtraWidth + 'px';
        sidebarLeft.style.display = 'flex';
        populateSidebar(sidebarLeft, totalExtraWidth, 'left');
        // Svuotiamo la destra se non serve più
        sidebarRight.innerHTML = '';
        sidebarRight.style.display = 'none';
    } else {
        // Nessuno spazio: distruzione definitiva di entrambi
        sidebarLeft.innerHTML = '';
        sidebarRight.innerHTML = '';
        sidebarLeft.style.display = 'none';
        sidebarRight.style.display = 'none';
    }
}

// Algoritmo di estrazione casuale pesata o tradizionale per i deal Amazon
function selectWeightedAmazonDeal(validDeals) {
    if (!validDeals || validDeals.length === 0) return null;
    if (AMAZON_USE_NEW_DEALS) {
        var totalWeight = 0;
        var i;
        for (i = 0; i < validDeals.length; i++) {
            var w = typeof validDeals[i].weight !== 'undefined' ? parseInt(validDeals[i].weight, 10) : 5;
            if (isNaN(w) || w < 1) w = 5;
            validDeals[i]._tempWeight = w;
            totalWeight += w;
        }
        
        var r = Math.random() * totalWeight;
        var sum = 0;
        var selectedDeal = validDeals[validDeals.length - 1]; // fallback
        for (i = 0; i < validDeals.length; i++) {
            sum += validDeals[i]._tempWeight;
            if (r <= sum) {
                selectedDeal = validDeals[i];
                break;
            }
        }
        return selectedDeal;
    } else {
        return validDeals[Math.floor(Math.random() * validDeals.length)];
    }
}

// Fetch deals.json or newdeals.json and pick a deal for the 300x600 banner
window._amazonDeal600 = null;
window._amazonImpressionSent = {}; // chiave: bannerId → true se impression già inviata
(function () {
    try {
        var xhr = new XMLHttpRequest();
        var jsonFile = AMAZON_USE_NEW_DEALS ? '/banner/newdeals.json' : '/banner/deals.json';
        xhr.open('GET', jsonFile, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        var data = JSON.parse(xhr.responseText);
                        var deals = data.deals || data; // compatibile anche con array puro
                        var valid = deals.filter(function (d) {
                            return d.link && d.link !== '#' && d.img && d.img !== '' && d.active !== false;
                        });
                        if (valid.length > 0) {
                            window._amazonDealsList = valid;
                            var selected = selectWeightedAmazonDeal(valid);
                            window._amazonDeal600 = selected;
                            if (selected) {
                                if (AMAZON_USE_NEW_DEALS) {
                                    console.log('Amazon deal caricato (pesato):', selected.id, 'con peso:', selected._tempWeight);
                                } else {
                                    console.log('Amazon deal caricato (tradizionale):', selected.id);
                                }
                            }
                        } else {
                            window._amazonDealsList = [];
                            window._amazonDeal600 = false; // nessun deal valido, non aspettare oltre
                        }
                    } catch (e) { window._amazonDeal600 = false; }
                } else {
                    // deals.json non raggiungibile (es. pagina in sottodirectory): procedi senza Amazon
                    window._amazonDealsList = [];
                    window._amazonDeal600 = false;
                }
                var pending = localStorage.getItem('_interstitial_pending') === '1';
                if (ENABLE_INTERSTITIAL && pending) {
                    showInterstitialIfDue(function() { adjustLayout(); });
                } else {
                    adjustLayout();
                    showInterstitialIfDue();
                }
            }
        };
        xhr.send();
    } catch (e) { /* fetch fallito, rimane null */ }
})();

// Support both modern and older browsers for early execution
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', adjustLayout);
} else {
    adjustLayout();
}

// Image rotation logic for Amazon banners with variant images
function initAmazonImageRotator() {
    setInterval(function () {
        var banners = document.querySelectorAll('a[data-images]');
        for (var i = 0; i < banners.length; i++) {
            var banner = banners[i];
            var imagesStr = banner.getAttribute('data-images');
            if (!imagesStr) continue;
            var images = imagesStr.split(',');
            if (images.length <= 1) continue;

            var side = banner.getAttribute('data-side') || 'right';
            var duration = (side === 'left') ? 25 : 30;
            var animStartStr = banner.getAttribute('data-anim-start');
            if (!animStartStr) continue;
            var animStart = parseInt(animStartStr, 10);
            if (isNaN(animStart)) continue;

            var elapsed = (new Date().getTime() - animStart) / 1000;
            var progress = elapsed % duration;

            // Determine current phase
            var phase = -1; // unsafe / transition
            if (duration === 30) {
                if (progress >= 2 && progress < 18) phase = 0; // Rich visible, Simple hidden
                else if (progress >= 22 && progress < 27) phase = 1; // Simple visible, Rich hidden
            } else if (duration === 25) {
                if (progress >= 2 && progress < 13) phase = 0; // Rich visible, Simple hidden
                else if (progress >= 17 && progress < 22) phase = 1; // Simple visible, Rich hidden
            }

            if (phase === -1) continue;

            var lastPhaseStr = banner.getAttribute('data-last-phase');
            var lastPhase = lastPhaseStr ? parseInt(lastPhaseStr, 10) : -1;

            if (phase !== lastPhase) {
                var richIndex = parseInt(banner.getAttribute('data-rich-index') || '0', 10);
                var simpleIndex = parseInt(banner.getAttribute('data-simple-index') || '0', 10);

                if (phase === 0) {
                    // Rich is visible, Simple is hidden.
                    // Set Simple's image to the same as Rich's current index
                    simpleIndex = richIndex;
                    var simpleImg = banner.querySelector('.amazon-simple-img');
                    if (simpleImg) {
                        simpleImg.src = images[simpleIndex];
                    }
                    banner.setAttribute('data-simple-index', simpleIndex);
                } else if (phase === 1) {
                    // Simple is visible, Rich is hidden.
                    // Update Rich's image to the next variant after the current Simple index
                    richIndex = (simpleIndex + 1) % images.length;
                    var richImg = banner.querySelector('.amazon-rich-img');
                    if (richImg) {
                        richImg.src = images[richIndex];
                    }
                    banner.setAttribute('data-rich-index', richIndex);
                }
                banner.setAttribute('data-last-phase', phase);
            }
        }
    }, 1000);
}

window.addEventListener('load', function () {
    adjustLayout();
    trackVisibleBanners('initial_load');
    initAmazonImageRotator();

    var minuteCounter = 0;
    setInterval(function () {
        minuteCounter++;
        trackVisibleBanners('timer_refresh_' + minuteCounter);
    }, 60 * 1000);

});

window.addEventListener('resize', adjustLayout);



// ─── INTEGRATION AMAZON BANNER ON GAME FINISH (GENERIC) ────────────────────
function setupAmazonFinishBanner(formId, options) {
    if (!ENABLE_BANNER_ON_FINISH) {
        console.log('[setupAmazonFinishBanner] Aborted: ENABLE_BANNER_ON_FINISH is false');
        return;
    }

    var modal = document.getElementById(formId);
    if (!modal) {
        console.log('[setupAmazonFinishBanner] Aborted: Modal element not found for ID: ' + formId);
        return;
    }

    options = options || {};

    // 1. Stile Modale
    if (options.modalStyle) {
        for (var prop in options.modalStyle) {
            if (options.modalStyle.hasOwnProperty(prop)) {
                modal.style[prop] = options.modalStyle[prop];
            }
        }
    } else {
        modal.style.overflow = 'visible';
    }

    // 2. Calcolo targetTop
    var targetTop = options.targetTop;
    if (targetTop === undefined) {
        var giocatore = document.getElementById('giocatore');
        if (giocatore) {
            targetTop = giocatore.offsetTop - (modal.offsetHeight || 280) - 5;
        } else {
            var campogioco = document.getElementById('campogioco');
            var campogiocoHeight = campogioco ? (campogioco.offsetHeight || 750) : 750;
            targetTop = campogiocoHeight - (modal.offsetHeight || 280) - 5;
        }
    }
    if (options.applyModalTop !== false) {
        modal.style.top = targetTop + 'px';
    }

    var isEnglish = (window.currentLang === 'en');

    // 3. Scelta AdSense vs Amazon
    var scaleOk = (window.gameScale === undefined || window.gameScale >= ADSENSE_FINISH_SCALE_THRESHOLD);
    var shieldActive = isAdSenseShieldActive();
    var useAdSense = ENABLE_ADSENSE_ON_FINISH &&
                     ADSENSE_GLOBAL_ENABLED &&
                     !devMode &&
                     !shieldActive &&
                     window.gameConfig && window.gameConfig.adsenseActive &&
                     scaleOk;

    console.log('[setupAmazonFinishBanner] Decision logic for ' + formId + ':', {
        useAdSense: useAdSense,
        ENABLE_ADSENSE_ON_FINISH: ENABLE_ADSENSE_ON_FINISH,
        ADSENSE_GLOBAL_ENABLED: ADSENSE_GLOBAL_ENABLED,
        notDevMode: !devMode,
        isAdSenseShieldActive: shieldActive,
        gameConfigActive: !!(window.gameConfig && window.gameConfig.adsenseActive),
        gameScale: window.gameScale,
        scaleOk: scaleOk,
        threshold: ADSENSE_FINISH_SCALE_THRESHOLD
    });

    // 3b. Telemetria "mancata pubblicazione AdSense" (solo in produzione).
    // Quando NON usiamo AdSense pur essendo in produzione (no devMode), registriamo
    // il MOTIVO, così in GA4 possiamo distinguere il fallback voluto (shield/disabled)
    // da quello per finestra troppo piccola (too_small = gameScale < soglia), che è
    // l'unica "occasione persa" su cui potremmo intervenire. Priorità: disabled >
    // shield > too_small (un solo reason, il più "a monte"). NON emesso in devMode
    // (simulazione) né quando AdSense viene effettivamente servito.
    if (!useAdSense && !devMode && typeof gtag === 'function') {
        var _adsOff = !ENABLE_ADSENSE_ON_FINISH || !ADSENSE_GLOBAL_ENABLED ||
                      !(window.gameConfig && window.gameConfig.adsenseActive);
        var _reason = _adsOff ? 'disabled' : (shieldActive ? 'shield' : (!scaleOk ? 'too_small' : 'other'));
        gtag('event', 'AdSense_Finish_Skipped', Object.assign({
            'event_category': 'AdSense',
            'form_id': formId,
            'reason': _reason,
            'page_location': window.location.href,
            'viewport_w': window.innerWidth,
            'viewport_h': window.innerHeight,
            'non_interaction': true
        }, _scaleTelemetry()));
    }

    // Rimuovi vecchio banner se esistente
    var oldBanner = modal.querySelector('.finish-banner');
    if (oldBanner) {
        console.log('[setupAmazonFinishBanner] Removing old banner from modal ' + formId);
        oldBanner.remove();
    }

    if (useAdSense || (devMode && !shieldActive && ENABLE_ADSENSE_ON_FINISH && window.gameConfig && window.gameConfig.adsenseActive)) {
        var adContainer = document.createElement('div');
        adContainer.className = 'finish-banner';

        var bannerHeight = options.bannerHeight !== undefined ? options.bannerHeight : (targetTop - 15);
        if (bannerHeight < 150) bannerHeight = 150;
        var bannerWidth = options.bannerWidth !== undefined ? options.bannerWidth : 700;
        var bannerTopOffset = options.bannerTopOffset !== undefined ? options.bannerTopOffset : (targetTop - 5);
        var leftOffset = options.leftOffset !== undefined ? options.leftOffset : -200;

        adContainer.style.cssText = 'position:absolute; top:-' + bannerTopOffset + 'px; left:' + leftOffset + 'px; width:' + bannerWidth + 'px; height:' + bannerHeight + 'px; z-index:50000; overflow:hidden; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.3);';

        if (devMode) {
            console.log('[setupAmazonFinishBanner] Rendering AdSense simulation (devMode) inside ' + formId);
            adContainer.innerHTML = '<div style="width:100%;height:100%;background:#222;border:2px dashed #ffee00;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;padding:15px;text-align:center;">' +
                '<span style="color:#ffee00;font-weight:bold;font-size:14px;">SIMULAZIONE ADSENSE FINISH</span>' +
                '<span style="font-size:11px;color:#aaa;margin-top:10px;">' + bannerWidth + 'x' + bannerHeight + 'px (interni) | scale: ' + (window.gameScale !== undefined ? window.gameScale.toFixed(2) : 'n/a') + '</span>' +
                '</div>';
        } else {
            console.log('[setupAmazonFinishBanner] Rendering real AdSense banner inside ' + formId + ' and calling push()');
            var ins = document.createElement('ins');
            ins.className = 'adsbygoogle';
            ins.style.cssText = 'display:block;width:' + bannerWidth + 'px;height:' + bannerHeight + 'px;';
            ins.setAttribute('data-ad-client', 'ca-pub-9335537153013492');
            ins.setAttribute('data-ad-slot', '6538837230');
            ins.setAttribute('onmouseenter', 'window._onAdEnter();');
            ins.setAttribute('onmouseleave', 'window._onAdLeave();');
            adContainer.appendChild(ins);
            modal.appendChild(adContainer);
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            console.log('AdSense Push (Finish): Slot 6538837230 in ' + formId + ' (' + bannerWidth + 'x' + bannerHeight + ')');
            if (typeof gtag === 'function') {
                gtag('event', 'AdSense_Banner_Finish_Impression', Object.assign({
                    'event_category': 'AdSense',
                    'form_id': formId,
                    'page_location': window.location.href,
                    'viewport_w': window.innerWidth,
                    'viewport_h': window.innerHeight,
                    'device_pixel_ratio': window.devicePixelRatio || 1,
                    'non_interaction': true
                }, _scaleTelemetry()));
            }
            
            // Diagnostics to check if the ad unit is filled, blocked, or invisible after 2 seconds
            setTimeout(function() {
                var checkedIns = modal.querySelector('.finish-banner ins');
                if (checkedIns) {
                    console.log('[setupAmazonFinishBanner] AdSense element diagnostics (after 2s):', {
                        className: checkedIns.className,
                        width: checkedIns.offsetWidth,
                        height: checkedIns.offsetHeight,
                        display: checkedIns.style.display || getComputedStyle(checkedIns).display,
                        visibility: checkedIns.style.visibility || getComputedStyle(checkedIns).visibility,
                        status: checkedIns.getAttribute('data-ad-status') || 'pending/no-status',
                        hasIframe: checkedIns.getElementsByTagName('iframe').length > 0,
                        iframeCount: checkedIns.getElementsByTagName('iframe').length
                    });
                } else {
                    console.log('[setupAmazonFinishBanner] AdSense element diagnostics (after 2s): ins element not found!');
                }
            }, 2000);
        }

        if (devMode) modal.appendChild(adContainer);

        if (typeof options.onSetupButtons === 'function') options.onSetupButtons(modal);
        return;
    }

    console.log('[setupAmazonFinishBanner] Falling back to Amazon banner for ' + formId);

    // 4. Dimensionamento del Banner Amazon
    var bannerHeight = options.bannerHeight;
    if (bannerHeight === undefined) {
        bannerHeight = targetTop - 15;
        if (bannerHeight < 150) bannerHeight = 150;
    }

    var bannerWidth = options.bannerWidth !== undefined ? options.bannerWidth : 700;
    var infoColWidth = options.infoColWidth !== undefined ? options.infoColWidth : 200;
    var imgColWidth = bannerWidth - infoColWidth - 4;
    if (imgColWidth < 50) imgColWidth = 50;

    var bannerTopOffset = options.bannerTopOffset !== undefined ? options.bannerTopOffset : (targetTop - 5);
    var leftOffset = options.leftOffset !== undefined ? options.leftOffset : -200;

    // (rimozione già gestita sopra con .finish-banner)

    // Selezione del deal
    var deal = null;
    if (window._amazonBannerShownInSidebar && window._amazonDeal600) {
        deal = window._amazonDeal600;
    } else {
        deal = selectWeightedAmazonDeal(window._amazonDealsList) || window._amazonDeal600;
    }

    if (deal) {
        // Come per l'interstitial: il deal proviene da selectWeightedAmazonDeal,
        // che non filtra lo store, quindi puo' essere AliExpress.
        var isAliFinish = (deal.store === 'aliexpress');
        var imgUrl = (deal.active_images && deal.active_images.length > 0) ? deal.active_images[0] : (deal.img || 'banner/galleryamazon300x250.jpg');
        var linkUrl = deal.link || 'view_gallery.html';
        var titleText = deal.title || 'generic';
        var dealId = titleText.length > 60 ? titleText.substring(0, 60) + '...' : titleText;
        // Prefisso ALI- per separare i due canali nei report GA4.
        if (isAliFinish) dealId = 'ALI-' + dealId;

        var aLink = document.createElement('a');
        aLink.className = 'finish-banner amazon-finish-banner';
        aLink.href = linkUrl;
        aLink.target = '_blank';
        aLink.rel = 'sponsored noopener';
        aLink.style.cssText = 'display: flex; width: ' + bannerWidth + 'px; height: ' + bannerHeight + 'px; text-decoration: none; position: absolute; top: -' + bannerTopOffset + 'px; left: ' + leftOffset + 'px; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.3); border: 2px solid #ddd; background: #fff; box-sizing: border-box; z-index: 50000;';

        // 3.1 Colonna info (Sinistra)
        var infoCol = document.createElement('div');
        infoCol.style.cssText = 'width: ' + infoColWidth + 'px; height: 100%; background: #131921; color: #fff; padding: 0; display: flex; flex-direction: column; box-sizing: border-box; text-align: left; border-right: 1px solid #333; font-family: Segoe UI, Roboto, Helvetica, Arial, sans-serif;';

        var headerText = (AMAZON_USE_NEW_DEALS && deal.custom_message) ? deal.custom_message : (isEnglish ? 'LIMITED TIME DEAL' : 'OFFERTA A TEMPO');
        var headerDiv = document.createElement('div');
        headerDiv.style.cssText = 'background: #cc0c39; color: #fff; padding: 8px 12px; text-align: center; font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; box-sizing: border-box; width: 100%;';
        headerDiv.textContent = headerText;
        infoCol.appendChild(headerDiv);

        // Stile testi con o senza modalità banner ridotta
        var isSmallBanner = options.isSmallBanner !== undefined ? options.isSmallBanner : (bannerHeight < 180);
        var contentDiv = document.createElement('div');
        var contentPadding = isSmallBanner ? '6px 8px' : '12px';
        contentDiv.style.cssText = 'padding: ' + contentPadding + '; display: flex; flex-direction: column; flex-grow: 1; min-height: 0; box-sizing: border-box; width: 100%;';

        var descDiv = document.createElement('div');
        var otherElementsHeight = isSmallBanner ? 105 : 145;
        var availableTextHeight = bannerHeight - otherElementsHeight;
        var lineHeight = isSmallBanner ? 14.3 : 15.6;
        var maxLines = Math.floor(availableTextHeight / lineHeight);
        if (maxLines < 1) maxLines = 1;
        var lineClamp = options.lineClamp !== undefined ? options.lineClamp : maxLines;
        var descMargin = isSmallBanner ? '4px' : '8px';
        var descFontSize = isSmallBanner ? '11px' : '12px';
        descDiv.style.cssText = 'font-size: ' + descFontSize + '; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: ' + lineClamp + '; -webkit-box-orient: vertical; margin-bottom: ' + descMargin + '; font-weight: 500; text-align: center;';
        descDiv.textContent = deal.title || '';
        contentDiv.appendChild(descDiv);

        var priceAndBadgeRow = document.createElement('div');
        priceAndBadgeRow.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: auto; margin-bottom: ' + (isSmallBanner ? '4px' : '8px') + '; width: 100%;';
        if (deal.expiry) {
            priceAndBadgeRow.setAttribute('title', deal.expiry);
        }

        var priceSpan = document.createElement('span');
        var priceFontSize = isSmallBanner ? '15px' : '20px';
        priceSpan.style.cssText = 'font-size: ' + priceFontSize + '; font-weight: bold; color: #ff5252;';
        if (deal.price && deal.price.trim() !== '') {
            priceSpan.textContent = deal.price;
            priceAndBadgeRow.appendChild(priceSpan);
        }

        if (deal.badge && deal.badge.trim() !== '') {
            var isHighDiscount = false;
            var match = deal.badge.match(/(\d+)%/);
            if (match && parseInt(match[1], 10) > AMAZON_DEALS_PULSE_THRESHOLD) {
                isHighDiscount = true;
            }
            var pulseClass = isHighDiscount ? ' amazon-badge-pulse' : '';
            var badgeSpan = document.createElement('span');
            var badgeFontSize = isSmallBanner ? '10px' : '11px';
            badgeSpan.className = 'amazon-badge' + (isAliFinish ? ' ali-badge' : '') + pulseClass;
            badgeSpan.style.cssText = 'font-size: ' + badgeFontSize + '; padding: 2px 6px;';
            badgeSpan.textContent = deal.badge;
            priceAndBadgeRow.appendChild(badgeSpan);
        }
        contentDiv.appendChild(priceAndBadgeRow);

        var ctaDiv = document.createElement('div');
        var ctaPadding = isSmallBanner ? '4px' : '8px';
        var ctaMarginBottom = isSmallBanner ? '4px' : '8px';
        var ctaFontSize = isSmallBanner ? '10px' : '11px';
        var ctaBgFinish = isAliFinish ? 'background: linear-gradient(180deg, #ff4747 0%, #d62828 100%); color: #fff;' : 'background: linear-gradient(180deg, #ff9900 0%, #e68a00 100%); color: #000;';
        ctaDiv.style.cssText = 'display: block; width: 100%; box-sizing: border-box; ' + ctaBgFinish + ' padding: ' + ctaPadding + '; border-radius: 20px; font-weight: bold; text-align: center; font-size: ' + ctaFontSize + '; margin-top: 0; margin-bottom: ' + ctaMarginBottom + ';';
        if (isAliFinish) {
            ctaDiv.textContent = isEnglish ? 'View offer on AliExpress' : 'Vedi offerta su AliExpress';
        } else {
            ctaDiv.textContent = isEnglish ? 'View offer on Amazon.it' : 'Vedi offerta su Amazon.it';
        }
        contentDiv.appendChild(ctaDiv);

        var disclaimerDiv = document.createElement('div');
        disclaimerDiv.style.cssText = 'font-size: 9px; color: #94a3b8; line-height: 1.1; text-align: center; margin-top: 4px;';
        disclaimerDiv.innerHTML = isAliFinish
            ? 'In qualit&agrave; di affiliato AliExpress,<br>guadagno dagli acquisti idonei.'
            : 'Come affiliato Amazon,<br>guadagno dagli acquisti idonei.';
        contentDiv.appendChild(disclaimerDiv);

        infoCol.appendChild(contentDiv);

        // 3.2 Colonna immagine (Destra)
        var imgCol = document.createElement('div');
        imgCol.style.cssText = 'width: ' + imgColWidth + 'px; height: 100%; background: #fff; display: flex; justify-content: center; align-items: center; padding: 5px; box-sizing: border-box;';

        var img = document.createElement('img');
        img.src = imgUrl;
        img.style.cssText = 'max-width: 100%; max-height: 100%; object-fit: contain;';
        img.alt = 'Amazon Deal Image';
        imgCol.appendChild(img);

        aLink.appendChild(infoCol);
        aLink.appendChild(imgCol);
        modal.appendChild(aLink);

        // Tracciamento Google Analytics - Impression
        if (!window._amazonDealsImpressionTracked[deal.id]) {
            window._amazonDealsImpressionTracked[deal.id] = true;
            if (typeof gtag === 'function') {
                gtag('event', 'Amazon_Banner_Impression', Object.assign({
                    'event_category': 'Affiliate',
                    'amazon_deal_id': dealId,
                    'format': 'finish',
                    'asin': deal.asin || '',
                    'page_location': window.location.href,
                    'viewport_w': window.innerWidth,
                    'viewport_h': window.innerHeight,
                    'device_pixel_ratio': window.devicePixelRatio || 1,
                    'non_interaction': true
                }, _scaleTelemetry()));
            }
            console.log('GA Tracked (Finish): Amazon_Banner_Impression | ' + dealId);
        }

        // Tracciamento Google Analytics - Click
        var startTime = Date.now();
        aLink.onclick = function () {
            var exposureSeconds = Math.round((Date.now() - startTime) / 1000);
            if (typeof gtag === 'function') {
                gtag('event', 'Amazon_Banner_Click', Object.assign({
                    'event_category': 'Affiliate',
                    'amazon_deal_id': dealId,
                    'format': 'finish',
                    'asin': deal.asin || '',
                    'tempo_esposizione': exposureSeconds,
                    'page_location': window.location.href,
                    'viewport_w': window.innerWidth,
                    'viewport_h': window.innerHeight,
                    'device_pixel_ratio': window.devicePixelRatio || 1,
                    'non_interaction': false
                }, _scaleTelemetry()));
            }
        };
    }

    if (typeof options.onSetupButtons === 'function') {
        options.onSetupButtons(modal);
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// BANNER AFFILIATI ROTANTI (Amazon/AliExpress)
//
// Riempie un riquadro di QUALUNQUE dimensione con un prodotto del catalogo e lo
// ruota nel tempo. Serve alle pagine dove il giocatore resta a lungo (calcolo,
// sudoku): gli slot AdSense NON vanno mai rinfrescati senza gesto utente, i
// link affiliati sì — non c'è impression fatturata né asta da falsare.
//
// Uso tipico, una riga nella pagina ospite:
//     var stop = setupRotatingAffiliateBanner(document.getElementById('box'));
// Opzioni: intervalMs (default 60000), store ('amazon'/'aliexpress') per
// limitare il catalogo a un solo canale.
// ─────────────────────────────────────────────────────────────────────────────

// Il layout si sceglie sul rapporto d'aspetto, non su dimensioni fisse: così un
// solo motore copre 300x250, 300x600, 728x90 e qualunque altra misura futura.
function _rbLayoutPerAspetto(w, h) {
    var r = w / h;
    if (r >= 2.2) return 'orizzontale';   // 728x90, 970x250
    if (r <= 0.62) return 'verticale';    // 300x600, 160x600
    return 'quadrato';                    // 300x250, 250x250, 336x280
}

function _rbPx(n) { return Math.round(n) + 'px'; }

// I titoli del catalogo hanno mediana ~146 caratteri (massimo 290): vanno
// troncati sulle righe disponibili. Il line-clamp da solo non basta, serve
// anche max-height esplicita perché in un contenitore flex il box può
// espandersi lo stesso e spingere fuori prezzo e piede.
function _rbBloccoTesto(testo, fSize, righe) {
    var lh = 1.25;
    return '<div style="font-size:' + _rbPx(fSize) + ';line-height:' + lh + ';' +
        'font-weight:600;max-height:' + _rbPx(fSize * lh * righe) + ';' +
        'display:-webkit-box;-webkit-line-clamp:' + righe + ';' +
        '-webkit-box-orient:vertical;overflow:hidden;word-break:break-word;">' +
        _rbEscape(testo) + '</div>';
}

// I titoli arrivano da JSON esterno e finiscono in innerHTML: vanno neutralizzati
// o un apostrofo/angolare nel titolo romperebbe il markup.
function _rbEscape(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// Disegna un deal dentro il contenitore, adattandosi alle sue dimensioni.
// Esposta come globale: serve anche alla pagina di anteprima banner.
function renderDealInBox(container, deal) {
    var w = container.clientWidth || parseInt(container.style.width, 10) || 300;
    var h = container.clientHeight || parseInt(container.style.height, 10) || 250;
    var layout = _rbLayoutPerAspetto(w, h);
    var isAli = (deal.store === 'aliexpress');

    // Amazon e AliExpress hanno branding e disclaimer diversi: si sceglie sul
    // singolo prodotto, non sullo store prevalente del sito.
    var marchio = isAli ? 'AliExpress' : 'Amazon';
    var coloreMarchio = isAli ? '#e62e04' : '#ff9900';
    var disclaim = isAli ? 'Link affiliato AliExpress' : 'Link affiliato Amazon';

    var base = Math.min(w, h);
    var fTitolo = Math.max(10, Math.min(15, base / 18));
    var fPrezzo = Math.max(13, Math.min(24, base / 11));
    var fMini   = Math.max(8,  Math.min(11, base / 26));

    // Il piede è un elemento reale in fondo alla colonna, non un overlay
    // absolute: occupa spazio invece di coprire il contenuto ed è il primo
    // spazio da sottrarre nei calcoli di altezza.
    var hPiede = Math.round(fMini * 1.9);

    var a = document.createElement('a');
    a.href = deal.link;
    a.target = '_blank';
    a.rel = 'sponsored noopener';
    a.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;' +
        'text-decoration:none;background:#fff;color:#111;box-sizing:border-box;' +
        'overflow:hidden;position:relative;border-radius:6px;';

    var piede = '<div style="flex:0 0 ' + _rbPx(hPiede) + ';height:' + _rbPx(hPiede) + ';' +
        'background:#232f3e;color:#fff;font-size:' + _rbPx(fMini) + ';' +
        'padding:0 6px;display:flex;justify-content:space-between;align-items:center;' +
        'box-sizing:border-box;white-space:nowrap;overflow:hidden;">' +
        '<span style="color:' + coloreMarchio + ';font-weight:700;">' + marchio + '</span>' +
        '<span style="opacity:0.75;">' + disclaim + '</span></div>';

    // Lo sconto sta accanto al prezzo, non in overlay sull'immagine: è
    // un'informazione che si legge insieme al prezzo e come badge flottante
    // finiva per coprire il prodotto.
    var pillolaSconto = deal.badge
        ? '<span style="background:#cc0c39;color:#fff;font-size:' + _rbPx(fMini + 1) + ';' +
          'font-weight:700;padding:2px 6px;border-radius:3px;white-space:nowrap;' +
          'line-height:1.3;">' + _rbEscape(deal.badge) + '</span>'
        : '';

    function bloccoPrezzo(disposizione) {
        var testoPrezzo = '<span style="font-size:' + _rbPx(fPrezzo) + ';font-weight:800;' +
            'color:#B12704;line-height:1.1;white-space:nowrap;">' +
            _rbEscape(deal.price || '') + '</span>';
        if (!pillolaSconto) return '<div>' + testoPrezzo + '</div>';
        if (disposizione === 'sotto') {
            return '<div style="display:flex;flex-direction:column;align-items:flex-start;' +
                'gap:2px;">' + testoPrezzo + pillolaSconto + '</div>';
        }
        return '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
            testoPrezzo + pillolaSconto + '</div>';
    }

    // Altezza ESPLICITA in pixel, mai percentuale, e immagine in contain a
    // width/height 100%: così non può debordare qualunque siano le sue
    // proporzioni native.
    function boxImmagine(larghezza, altezza) {
        return '<div style="width:' + _rbPx(larghezza) + ';height:' + _rbPx(altezza) + ';' +
            'flex:0 0 auto;background:#fff;overflow:hidden;padding:5px;box-sizing:border-box;">' +
            '<img src="' + _rbEscape(deal.img) + '" alt="" style="width:100%;height:100%;' +
            'object-fit:contain;display:block;"></div>';
    }

    if (layout === 'orizzontale') {
        // Immagine quadrata a sinistra, testo a destra. La descrizione c'è
        // sempre, anche a 60px: è quella che dice cosa stai comprando. Sotto i
        // 75px si affianca al prezzo invece di impilarsi, perché in verticale
        // non c'è spazio ma in orizzontale sì.
        var hUtile = h - hPiede;
        var stretto = hUtile < 75;
        var righeTit = hUtile >= 150 ? 3 : 2;
        var testoOriz = _rbBloccoTesto(deal.title,
            stretto ? Math.max(9, fTitolo - 1) : fTitolo, righeTit);

        var corpoOriz = stretto
            ? '<div style="flex:1 1 auto;min-width:0;padding:3px 8px;display:flex;' +
                'align-items:center;gap:10px;">' +
                '<div style="flex:1 1 auto;min-width:0;">' + testoOriz + '</div>' +
                '<div style="flex:0 0 auto;">' + bloccoPrezzo('sotto') + '</div></div>'
            : '<div style="flex:1 1 auto;min-width:0;padding:4px 10px;display:flex;' +
                'flex-direction:column;justify-content:center;gap:5px;">' +
                testoOriz + bloccoPrezzo('riga') + '</div>';

        a.innerHTML = '<div style="display:flex;flex:1 1 auto;min-height:0;">' +
            boxImmagine(hUtile, hUtile) + corpoOriz + '</div>' + piede;

    } else {
        // Colonna (verticale e quadrato): si riserva PRIMA lo spazio del testo,
        // poi l'immagine prende il resto. Al contrario (immagine a percentuale
        // fissa) il blocco testo veniva schiacciato a zero e titolo e prezzo
        // sparivano del tutto.
        var righe = (layout === 'verticale') ? 4 : 2;
        var padV = 10;
        var hRigaPrezzo = Math.ceil(Math.max(fPrezzo * 1.15, (fMini + 1) * 1.9));
        var hTitolo = Math.ceil(fTitolo * 1.25 * righe);
        var hImg = h - hPiede - hTitolo - hRigaPrezzo - padV;

        // Se non ci sta, si tolgono righe al titolo: l'immagine non scende mai
        // sotto il 35% o il banner non comunica più nulla.
        while (hImg < h * 0.35 && righe > 1) {
            righe--;
            hTitolo = Math.ceil(fTitolo * 1.25 * righe);
            hImg = h - hPiede - hTitolo - hRigaPrezzo - padV;
        }
        if (hImg < 30) hImg = 30;

        a.innerHTML = boxImmagine(w, hImg) +
            '<div style="flex:1 1 auto;min-height:0;padding:2px 9px 5px;display:flex;' +
              'flex-direction:column;justify-content:space-between;box-sizing:border-box;' +
              'overflow:hidden;">' +
              _rbBloccoTesto(deal.title, fTitolo, righe) + bloccoPrezzo('riga') +
            '</div>' + piede;
    }

    container.innerHTML = '';
    container.appendChild(a);
    return a;
}

// Avvia il riempimento e la rotazione. Ritorna stop() per fermare il timer:
// senza, resta orfano se la pagina cambia schermata senza ricaricare.
function setupRotatingAffiliateBanner(container, options) {
    options = options || {};
    if (!container) return function () {};

    var intervalMs = options.intervalMs || 60000;
    var storeFiltro = options.store || null;

    var rotazione = 0;
    var dealCorrente = null;
    var timer = null;
    var fermato = false;
    // selectWeightedAmazonDeal è pesata ma senza memoria: su decine di
    // rotazioni ripeterebbe lo stesso prodotto a breve distanza. La coda
    // scarta gli ultimi visti senza rompere la ponderazione per weight.
    var recenti = [];
    var MAX_RECENTI = 8;

    function catalogo() {
        var tutti = window._amazonDealsList || [];
        if (storeFiltro) {
            tutti = tutti.filter(function (d) { return d.store === storeFiltro; });
        }
        return tutti;
    }

    function scegliDeal() {
        var validi = catalogo();
        if (!validi.length) return null;
        var freschi = validi.filter(function (d) {
            return recenti.indexOf(d.id) === -1;
        });
        // Se la coda ha consumato tutto il catalogo (pochi prodotti, sessione
        // lunga) si riparte dall'insieme completo invece di non mostrare nulla.
        if (!freschi.length) { recenti = []; freschi = validi; }
        var scelto = selectWeightedAmazonDeal(freschi);
        if (scelto) {
            recenti.push(scelto.id);
            if (recenti.length > MAX_RECENTI) recenti.shift();
        }
        return scelto;
    }

    // I nomi dei parametri riusano le dimensioni GA4 gia' registrate invece di
    // crearne di nuove: amazon_deal_id e asin sono quelli degli altri banner
    // affiliati, trigger_type quello di simulated_banner_impression. Nei report
    // i due canali finiscono percio' nelle stesse righe; si separano filtrando
    // per nome evento (Rotating_Banner_* contro Amazon_Banner_*).
    // La pagina NON e' un parametro: page_location e' automatica e da' gia' la
    // dimensione "Percorso pagina", che distingue calcolo.html da calcolo-en.html.
    // Lo store non e' un parametro: il prefisso ALI- nell'id lo rende leggibile,
    // come negli altri banner.
    function idDeal(deal) {
        // Stesso troncamento a 60 + '...' degli altri banner: con titoli di
        // mediana ~146 caratteri, tagliare a lunghezze diverse spezzerebbe lo
        // stesso prodotto in due righe distinte nei report.
        var t = deal.title || '';
        var id = t.length > 60 ? t.substring(0, 60) + '...' : t;
        if (deal.store === 'aliexpress') id = 'ALI-' + id;
        return id;
    }

    function inviaEvento(nome, deal, interazione) {
        if (typeof gtag !== 'function' || !deal) return;
        gtag('event', nome, {
            'event_category': 'AffiliateRotating',
            'amazon_deal_id': idDeal(deal),
            'banner_size': container.clientWidth + 'x' + container.clientHeight,
            // Stessa convenzione di trackVisibleBanners: la prima esposizione e'
            // un caricamento, non un rinnovo, quindi i refresh partono da 1.
            'trigger_type': rotazione <= 1 ? 'initial_load' : 'timer_refresh_' + (rotazione - 1),
            'asin': deal.asin || deal.product_id || '',
            'page_location': window.location.href,
            'non_interaction': !interazione
        });
    }

    function mostra() {
        var deal = scegliDeal();
        if (!deal) return;
        dealCorrente = deal;
        rotazione++;
        var link = renderDealInBox(container, deal);
        // mousedown e non click: con target="_blank" il browser puo' interrompere
        // lo script quando apre la scheda e gtag rischia di non partire.
        link.addEventListener('mousedown', function () {
            inviaEvento('Rotating_Banner_Click', dealCorrente, true);
        });
        inviaEvento('Rotating_Banner_Impression', deal, false);
    }

    function avviaTimer() {
        if (timer || fermato) return;
        timer = setInterval(function () {
            // A scheda nascosta non si ruota: sarebbero impression mai viste
            // che sporcano le statistiche.
            if (!document.hidden) mostra();
        }, intervalMs);
    }

    // Il catalogo arriva via XHR asincrona: se non e' ancora pronto si attende
    // invece di lasciare il riquadro vuoto per sempre.
    function avvia() {
        if (fermato) return;
        if (catalogo().length) {
            mostra();
            avviaTimer();
        } else if (window._amazonDeal600 !== false) {
            setTimeout(avvia, 300);   // caricamento in corso
        }
    }
    avvia();

    // Listener dedicato: NON tocca quello dello shield AdSense, che gestisce
    // tutt'altro (rilevamento clic cross-origin).
    function onVisibilita() {
        if (document.hidden) {
            if (timer) { clearInterval(timer); timer = null; }
        } else {
            avviaTimer();
        }
    }
    document.addEventListener('visibilitychange', onVisibilita);

    return function stop() {
        fermato = true;
        if (timer) { clearInterval(timer); timer = null; }
        document.removeEventListener('visibilitychange', onVisibilita);
    };
}



