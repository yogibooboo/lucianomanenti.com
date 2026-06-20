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
var AMAZON_BANNERS_ENABLED = false;  // set to false to disable Amazon banners globally
var AMAZON_BANNERS_RIGHT = true;   // if true, Amazon banners load on right sidebar only
var AMAZON_FALLBACK_ON_SHIELD = true; // se true, Amazon subentra a sinistra quando AdSense viene bloccato dallo scudo
var AMAZON_USE_NEW_DEALS = true;      // se true, usa newdeals.json e i pesi. Se false, usa il deals.json tradizionale
var AMAZON_DEALS_PULSE_THRESHOLD = 35; // Soglia di sconto oltre la quale il badge pulsa (default 35%)
var ENABLE_BANNER_ON_FINISH = true;   // se true, abilita il banner di fine partita (AdSense o Amazon)
var ENABLE_ADSENSE_ON_FINISH = true;  // se true, usa AdSense sul finish (se condizioni ok); altrimenti Amazon
var ADSENSE_FINISH_SCALE_THRESHOLD = 1.0; // gameScale minimo per usare AdSense sul finish (sotto soglia → Amazon)
// ─────────────────────────────────────────────────────────────────────────────

// ─── ADSENSE CONFIG & SHIELD ─────────────────────────────────────────────────
// NOTA PER L'UTENTE: Durante il bando di 29 giorni, imposta ADSENSE_GLOBAL_ENABLED = false.
// Al termine, rimettilo a true. Lo Shield ti proteggerà automaticamente dai click futuri.
var ADSENSE_GLOBAL_ENABLED = true;  // Interruttore di sicurezza principale
var ADSENSE_ONLY_LEFT = true;       // Se true, AdSense carica solo a sinistra

// Controllo attivazione blocco annunci su richiesta
var adsDisabled = localStorage.getItem('ads_disabled') === '1';
if (adsDisabled) {
    AMAZON_BANNERS_ENABLED = false;
    AMAZON_BANNERS_RIGHT = false;
    ENABLE_BANNER_ON_FINISH = false;
    ADSENSE_GLOBAL_ENABLED = false;
}

var ADSENSE_SHIELD_DURATION = 20 * 60 * 1000; // 20 minuti di blocco dopo un click
var _isMouseOverAdSense = false;

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

// Global detector for focus-blur (click proxy)
window.addEventListener('blur', function () {
    if (_isMouseOverAdSense && !isAdSenseShieldActive() && !devMode) {
        activateAdSenseShield(true);
    }
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
            '.amazon-badge-pulse { animation: amazonPulseAnim 1s infinite !important; }';
        document.head.appendChild(styleEl);
    }

    sidebarRight.style.display = 'none';

    var getAmazonRichHtml = function (deal, amazonGenericLink, amazonGenericImg, side) {
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
        
        var headerText = (AMAZON_USE_NEW_DEALS && deal.custom_message) ? deal.custom_message : 'Offerta a Tempo';
        var badgeText = deal.badge || 'OFFERTA A TEMPO';
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
                badgeHtml = '<span class="amazon-badge' + pulseClass + '">' + deal.badge + '</span>';
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
                '<span style="display:inline-block;background:#cc0c39;color:#fff;padding:4px 10px;border-radius:4px;font-size:13px;font-weight:bold;">' + badgeText + '</span>' +
                '</div>';
        }

        // Struttura a due strati con animazione
        return '<a href="' + amazonGenericLink + '" target="_blank" rel="sponsored noopener" style="display:block;width:100%;height:100%;text-decoration:none;color:inherit;position:relative;overflow:hidden;background:#131921;"' + imagesAttr + '>' +
            // STRATO 1: Versione Ricca
            '<div style="position:absolute;top:0;left:0;width:300px;height:600px;display:flex;flex-direction:column;box-sizing:border-box;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;animation: amazonFadeRich' + animSuffix + ' ' + duration + ' infinite; transition: opacity 1s ease-in-out;">' +
            '<div style="background:#cc0c39;color:#fff;padding:12px;text-align:center;font-weight:bold;font-size:14px;text-transform:uppercase;">' + headerText + '</div>' +
            '<div style="width:100%;height:260px;background:#fff;display:flex;justify-content:center;align-items:center;padding:0;box-sizing:border-box;">' +
            '<img src="' + firstImg + '" class="amazon-banner-img amazon-rich-img" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Offerte Amazon">' +
            '</div>' +
            '<div style="padding:15px 24px 0;flex-grow:1;display:flex;flex-direction:column;text-align:center;color:#fff;justify-content:center;min-height:0;">' +
            '<div style="font-size:16px;font-weight:600;margin-bottom:0;line-height:1.4;display:-webkit-box;-webkit-line-clamp:6;overflow:hidden;">' + deal.title + '</div>' +
            '</div>' +
            priceAndBadgeHtml +
            '<div style="padding:0 24px 0;">' +
            '<div style="display:block;background:linear-gradient(180deg,#ff9900 0%,#e68a00 100%);color:#000;padding:16px;border-radius:30px;font-weight:bold;text-align:center;">Vedi offerta su Amazon.it</div>' +
            '</div>' +
            '<div style="font-size:12px;color:#64748b;text-align:center;padding:8px 10px 8px;line-height:1.2;">Come affiliato Amazon,<br>guadagno dagli acquisti idonei.</div>' +
            '</div>' +
            // STRATO 2: Versione Semplice (Immagine Ingrandita + Info)
            '<div style="position:absolute;top:0;left:0;width:300px;height:600px;display:flex;flex-direction:column;box-sizing:border-box;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;animation: amazonFadeSimple' + animSuffix + ' ' + duration + ' infinite; transition: opacity 1s ease-in-out; background:#131921;">' +
            '<div style="background:#cc0c39;color:#fff;padding:12px;text-align:center;font-weight:bold;font-size:14px;text-transform:uppercase;">' + headerText + '</div>' +
            '<div style="width:100%;flex-grow:1;background:#fff;display:flex;justify-content:center;align-items:center;padding:0;box-sizing:border-box;min-height:0;">' +
            '<img src="' + secondImg + '" class="amazon-banner-img amazon-simple-img" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Offerte Amazon">' +
            '</div>' +
            '<div style="padding:15px 24px 5px;display:flex;flex-direction:column;text-align:center;color:#fff;">' +
            priceAndBadgeHtml +
            '</div>' +
            '<div style="padding:0 24px 0;">' +
            '<div style="display:block;background:linear-gradient(180deg,#ff9900 0%,#e68a00 100%);color:#000;padding:16px;border-radius:30px;font-weight:bold;text-align:center;">Vedi offerta su Amazon.it</div>' +
            '</div>' +
            '<div style="font-size:12px;color:#64748b;text-align:center;padding:8px 10px 8px;line-height:1.2;">Come affiliato Amazon,<br>guadagno dagli acquisti idonei.</div>' +
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
                'onmouseenter="window._isMouseOverAdSense = true;" ' +
                'onmouseleave="window._isMouseOverAdSense = false;" ' +
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
            banner.onmouseleave = function () { window._isMouseOverAdSense = false; };
        }

        // --- Amazon Banner Impression + Click Tracking ---
        if (amazonGeneric && !window.showBannerDimensions) {
            var startTime = Date.now();
            var pagePath = window.location.pathname.split('/').pop() || 'index.html';
            var dealId = 'generic';
            if (window._amazonDeal600 && window._amazonDeal600.title) {
                var titleText = window._amazonDeal600.title;
                dealId = titleText.length > 60 ? titleText.substring(0, 60) + '...' : titleText;
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
                adjustLayout();
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

    // Rimuovi vecchio banner se esistente
    var oldBanner = modal.querySelector('.finish-banner');
    if (oldBanner) {
        console.log('[setupAmazonFinishBanner] Removing old banner from modal ' + formId);
        oldBanner.remove();
    }

    if (useAdSense || (devMode && ENABLE_ADSENSE_ON_FINISH && window.gameConfig && window.gameConfig.adsenseActive)) {
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
            ins.setAttribute('onmouseenter', 'window._isMouseOverAdSense = true;');
            ins.setAttribute('onmouseleave', 'window._isMouseOverAdSense = false;');
            adContainer.appendChild(ins);
            modal.appendChild(adContainer);
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            console.log('AdSense Push (Finish): Slot 6538837230 in ' + formId + ' (' + bannerWidth + 'x' + bannerHeight + ')');
            
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
        var imgUrl = (deal.active_images && deal.active_images.length > 0) ? deal.active_images[0] : (deal.img || 'banner/galleryamazon300x250.jpg');
        var linkUrl = deal.link || 'view_gallery.html';
        var titleText = deal.title || 'generic';
        var dealId = titleText.length > 60 ? titleText.substring(0, 60) + '...' : titleText;

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
            badgeSpan.className = 'amazon-badge' + pulseClass;
            badgeSpan.style.cssText = 'font-size: ' + badgeFontSize + '; padding: 2px 6px;';
            badgeSpan.textContent = deal.badge;
            priceAndBadgeRow.appendChild(badgeSpan);
        }
        contentDiv.appendChild(priceAndBadgeRow);

        var ctaDiv = document.createElement('div');
        var ctaPadding = isSmallBanner ? '4px' : '8px';
        var ctaMarginBottom = isSmallBanner ? '4px' : '8px';
        var ctaFontSize = isSmallBanner ? '10px' : '11px';
        ctaDiv.style.cssText = 'display: block; width: 100%; box-sizing: border-box; background: linear-gradient(180deg, #ff9900 0%, #e68a00 100%); color: #000; padding: ' + ctaPadding + '; border-radius: 20px; font-weight: bold; text-align: center; font-size: ' + ctaFontSize + '; margin-top: 0; margin-bottom: ' + ctaMarginBottom + ';';
        ctaDiv.textContent = isEnglish ? 'View offer on Amazon.it' : 'Vedi offerta su Amazon.it';
        contentDiv.appendChild(ctaDiv);

        var disclaimerDiv = document.createElement('div');
        disclaimerDiv.style.cssText = 'font-size: 9px; color: #94a3b8; line-height: 1.1; text-align: center; margin-top: 4px;';
        disclaimerDiv.innerHTML = 'Come affiliato Amazon,<br>guadagno dagli acquisti idonei.';
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
                gtag('event', 'Amazon_Banner_Impression', {
                    'event_category': 'Affiliate',
                    'amazon_deal_id': dealId + '_finish',
                    'format': 'finish',
                    'asin': deal.asin || '',
                    'page_location': window.location.href,
                    'game_scale': window.gameScale !== undefined ? Math.round(window.gameScale * 100) / 100 : null,
                    'viewport_w': window.innerWidth,
                    'viewport_h': window.innerHeight,
                    'device_pixel_ratio': window.devicePixelRatio || 1,
                    'non_interaction': true
                });
            }
            console.log('GA Tracked (Finish): Amazon_Banner_Impression | ' + dealId);
        }

        // Tracciamento Google Analytics - Click
        var startTime = Date.now();
        aLink.onclick = function () {
            var exposureSeconds = Math.round((Date.now() - startTime) / 1000);
            if (typeof gtag === 'function') {
                gtag('event', 'Amazon_Banner_Click', {
                    'event_category': 'Affiliate',
                    'amazon_deal_id': dealId + '_finish',
                    'format': 'finish',
                    'asin': deal.asin || '',
                    'tempo_esposizione': exposureSeconds,
                    'page_location': window.location.href,
                    'game_scale': window.gameScale !== undefined ? Math.round(window.gameScale * 100) / 100 : null,
                    'viewport_w': window.innerWidth,
                    'viewport_h': window.innerHeight,
                    'device_pixel_ratio': window.devicePixelRatio || 1,
                    'non_interaction': false
                });
            }
        };
    }

    if (typeof options.onSetupButtons === 'function') {
        options.onSetupButtons(modal);
    }
}



