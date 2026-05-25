// ─── AMBIENTE E DEBUG ────────────────────────────────────────────────────────
var devMode = localStorage.getItem('dev_mode') === '1';
window.showBannerDimensions = false;
window._leftPopulated = false;  // Sigillo colonna sinistra
window._rightPopulated = false; // Sigillo colonna destra

// ─── AMAZON BANNER CONFIG ───────────────────────────────────────────────────
var AMAZON_BANNERS_ENABLED = false;  // set to false to disable Amazon banners globally
var AMAZON_BANNERS_RIGHT = true;   // if true, Amazon banners load on right sidebar only
var AMAZON_FALLBACK_ON_SHIELD = true; // se true, Amazon subentra a sinistra quando AdSense viene bloccato dallo scudo
var AMAZON_USE_NEW_DEALS = true;      // se true, usa newdeals.json e i pesi. Se false, usa il deals.json tradizionale
var AMAZON_DEALS_PULSE_THRESHOLD = 35; // Soglia di sconto oltre la quale il badge pulsa (default 35%)
// ─────────────────────────────────────────────────────────────────────────────

// ─── ADSENSE CONFIG & SHIELD ─────────────────────────────────────────────────
// NOTA PER L'UTENTE: Durante il bando di 29 giorni, imposta ADSENSE_GLOBAL_ENABLED = false.
// Al termine, rimettilo a true. Lo Shield ti proteggerà automaticamente dai click futuri.
var ADSENSE_GLOBAL_ENABLED = true;  // Interruttore di sicurezza principale
var ADSENSE_ONLY_LEFT = true;       // Se true, AdSense carica solo a sinistra
var ADSENSE_SHIELD_DURATION = 12 * 60 * 60 * 1000; // 12 ore di blocco dopo un click
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
        footer.style.cssText = 'position: fixed; bottom: 10px; right: 10px; font-size: 12px; font-family: sans-serif; z-index: 10000; color: rgba(255,255,255,0.6); pointer-events: auto;';

        var langSuffix = (window.currentLang === 'en') ? '-en.html' : '.html';
        var homeUrl = (window.currentLang === 'en') ? 'index-en.html' : 'index.html';
        var aboutMeUrl = 'aboutme' + langSuffix;
        var privacyUrl = 'privacy' + langSuffix;
        var homeLabel = (window.currentLang === 'en') ? 'Home' : 'Home'; // Same for both
        var aboutMeLabel = (window.currentLang === 'en') ? 'About Me' : 'Chi Sono';
        var privacyLabel = (window.currentLang === 'en') ? 'Privacy Policy' : 'Privacy Policy';

        footer.innerHTML = '<a href="' + homeUrl + '" style="color: inherit; text-decoration: none; margin-left: 15px;">' + homeLabel + '</a>' +
            '<a href="' + aboutMeUrl + '" style="color: inherit; text-decoration: none; margin-left: 15px;">' + aboutMeLabel + '</a>' +
            '<a href="' + privacyUrl + '" style="color: inherit; text-decoration: none; margin-left: 15px;">' + privacyLabel + '</a>';
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

    if (window.scala) {
        var rect = campogioco.getBoundingClientRect();
        scala.offsetxx = rect.left;
        scala.offsetyy = rect.top;
    }
    if (window.tmidi) {
        var rect = campogioco.getBoundingClientRect();
        tmidi.offsetxx = rect.left;
        tmidi.offsetyy = rect.top;
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
        var amazonGenericImg = 'banner/offerteamazon2.jpg';
        var amazonGenericLink = 'https://www.amazon.it/deals?&linkCode=ll2&tag=lucianomane0f-21&linkId=d542031952a47db9f26b8cc6c38762cb&ref_=as_li_ss_tl';

        var amazonEnabled = AMAZON_BANNERS_ENABLED || (AMAZON_BANNERS_RIGHT && side === 'right');
        if (AMAZON_FALLBACK_ON_SHIELD && side === 'left' && isAdSenseShieldActive()) {
            amazonEnabled = true;
        }
        if (amazonEnabled && width === 300 && height === 600) {
            // Se il fetch è ancora in corso (null), non mostrare niente — verrà chiamato adjustLayout al termine
            if (!slotId && window._amazonDeal600 === null) return null;
            amazonGeneric = true;
            // Se è disponibile un deal specifico dal JSON, usa quello
            if (window._amazonDeal600) {
                amazonGenericImg = (AMAZON_USE_NEW_DEALS && window._amazonDeal600.active_images && window._amazonDeal600.active_images.length > 0) ? window._amazonDeal600.active_images[0] : window._amazonDeal600.img;
                amazonGenericLink = window._amazonDeal600.link;
            }
        } else if (amazonEnabled && width === 300 && height === 250) {
            amazonGeneric = true;
            amazonGenericImg = 'banner/galleryamazon300x250.jpg';
            amazonGenericLink = 'view_gallery.html';
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
            if (width === 300 && height === 600 && !window._amazonImpressionSent[bannerId] && typeof gtag === 'function') {
                window._amazonImpressionSent[bannerId] = true;
                gtag('event', 'Amazon_Banner_Impression', {
                    'event_category': 'Affiliate',
                    'amazon_deal_id': dealId,
                    'page_location': window.location.href,
                    'non_interaction': true
                });
                console.log('GA Tracked: Amazon_Banner_Impression | ' + dealId + ' | ' + width + 'x' + height + ' | on: ' + pagePath);
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

// Fetch deals.json or newdeals.json and pick a deal for the 300x600 banner
window._amazonDeal600 = null;
window._amazonImpressionSent = {}; // chiave: bannerId → true se impression già inviata
(function () {
    try {
        var xhr = new XMLHttpRequest();
        var jsonFile = AMAZON_USE_NEW_DEALS ? 'banner/newdeals.json' : 'banner/deals.json';
        xhr.open('GET', jsonFile, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var deals = data.deals || data; // compatibile anche con array puro
                    var valid = deals.filter(function (d) {
                        return d.link && d.link !== '#' && d.img && d.img !== '' && d.active !== false;
                    });
                    if (valid.length > 0) {
                        if (AMAZON_USE_NEW_DEALS) {
                            // Algoritmo di estrazione casuale pesata (Weighted Randomness)
                            var totalWeight = 0;
                            var i;
                            for (i = 0; i < valid.length; i++) {
                                var w = typeof valid[i].weight !== 'undefined' ? parseInt(valid[i].weight, 10) : 5;
                                if (isNaN(w) || w < 1) w = 5;
                                valid[i]._tempWeight = w;
                                totalWeight += w;
                            }
                            
                            var r = Math.random() * totalWeight;
                            var sum = 0;
                            var selectedDeal = valid[valid.length - 1]; // fallback
                            for (i = 0; i < valid.length; i++) {
                                sum += valid[i]._tempWeight;
                                if (r <= sum) {
                                    selectedDeal = valid[i];
                                    break;
                                }
                            }
                            window._amazonDeal600 = selectedDeal;
                            console.log('Amazon deal caricato (pesato):', window._amazonDeal600.id, 'con peso:', window._amazonDeal600._tempWeight);
                        } else {
                            // Selezione casuale uniforme tradizionale
                            window._amazonDeal600 = valid[Math.floor(Math.random() * valid.length)];
                            console.log('Amazon deal caricato (tradizionale):', window._amazonDeal600.id);
                        }
                    } else {
                        window._amazonDeal600 = false; // nessun deal valido, non aspettare oltre
                    }
                } catch (e) { window._amazonDeal600 = false; }
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

// [INIZIO OPTIMIZATION MODULE]
// Questa sezione migliora drasticamente le prestazioni del gioco, specialmente con molte carte negli scarti.
// Intercetta la funzione di disegno originale (scala.rendicontenitore) e la rende "intelligente":
// aggiorna il DOM solo se la posizione o lo z-index sono effettivamente cambiati.
(function () {
    var initOptimization = function () {
        if (!window.scala || !window.scala.rendicontenitore) return;

        // Salva la funzione originale (opzionale, per debug)
        window.scala.originalRendicontenitore = window.scala.rendicontenitore;

        // Sovrascrive con la versione ottimizzata
        window.scala.rendicontenitore = function (cont, speed) {
            var velocita = speed || 400;
            var newtop, newleft, carta, divCard;

            for (var i = 0; i < cont.carte.length; i++) {
                carta = cont.carte[i];
                divCard = carta.gui; // Cache del riferimento DOM

                // Calcola le nuove coordinate target
                newtop = cont.top + cont.offsety + Math.floor(i * cont.deltay);
                newleft = cont.left + cont.offsetx + Math.floor(i * cont.deltax) + cont.xtris * carta.ntris;

                // Aggiorna i dati nel modello logico
                carta.top = newtop;
                carta.left = newleft;
                carta.zindex = i;

                // --- LOGICA DI OTTIMIZZAZIONE ---
                // Verifica se i valori attuali nel DOM sono già corretti.
                // Usiamo una tolleranza di 1px per le coordinate.
                var currentLeft = parseInt(divCard.style.left) || 0;
                var currentTop = parseInt(divCard.style.top) || 0;
                var currentZ = parseInt(divCard.style.zIndex) || 0;

                var isPositionsSame = Math.abs(currentLeft - newleft) < 1 && Math.abs(currentTop - newtop) < 1;
                var isZIndexSame = currentZ === i;

                // Se tutto è identico, SALTA L'UPDATE DEL DOM! (Risparmia CPU/GPU)
                if (isPositionsSame && isZIndexSame) {
                    // Assicuriamoci solo che la carta sia visibile se necessario (showcard è leggera)
                    this.showcard(carta);
                    continue;
                }
                // -------------------------------

                if (window.scala.immediato) {
                    $(divCard).css({ "top": newtop, "left": newleft, "z-index": i }, velocita);
                } else {
                    $(divCard).animate({ "top": newtop, "left": newleft, "z-index": i }, velocita);
                }
                this.showcard(carta);
            }
        };
        console.log("Scala40 Render Optimization: ACTIVE");
    };

    // Tenta l'iniezione quando il documento è pronto o quando window.scala diventa disponibile
    if (document.readyState === 'complete') {
        setTimeout(initOptimization, 500); // Piccolo ritardo per sicurezza
    } else {
        window.addEventListener('load', function () {
            setTimeout(initOptimization, 500);
        });
    }
})();
// [FINE OPTIMIZATION MODULE]
