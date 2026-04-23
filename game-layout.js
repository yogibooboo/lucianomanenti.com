// Make the scale factor global so the game's mouse logic can use it
window.gameScale = 1;
// Global state to toggle banner content
window.showBannerDimensions = false;

// ─── AMAZON BANNER CONFIG ────────────────────────────────────────────────────
var AMAZON_BANNERS_ENABLED = true;  // set to false to disable Amazon banners globally
var AMAZON_BANNERS_RIGHT = false;    // if true, Amazon banners load on right sidebar only (independent of AMAZON_BANNERS_ENABLED)
// ─────────────────────────────────────────────────────────────────────────────

// ─── ADSENSE CONFIG ──────────────────────────────────────────────────────────
var ADSENSE_ONLY_LEFT = true;  // if true, AdSense loads only in left sidebar; right sidebar shows dark placeholder without AdSense request
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
    // Badge DEV MODE visibile quando AdSense è disabilitato per testing
    if (document.body) {
        var _devBadge = document.getElementById('dev-mode-badge');
        if (localStorage.getItem('dev_mode') === '1') {
            if (!_devBadge) {
                _devBadge = document.createElement('div');
                _devBadge.id = 'dev-mode-badge';
                _devBadge.title = 'Dev mode attivo: AdSense disabilitato. Rimuovi con: localStorage.removeItem(\'dev_mode\')';
                _devBadge.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:99999;background:#c00;color:#fff;font-size:11px;font-weight:bold;padding:3px 7px;border-radius:4px;cursor:default;opacity:0.85;';
                _devBadge.textContent = 'DEV';
                document.body.appendChild(_devBadge);
            }
        } else if (_devBadge) {
            _devBadge.remove();
        }
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
    if (totalExtraWidth >= 320) {
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
            'ins.adsbygoogle[data-ad-status="unfilled"] { display: none !important; pointer-events: none !important; }';
        document.head.appendChild(styleEl);
    }

    sidebarLeft.style.display = 'none';
    sidebarRight.style.display = 'none';

    var createBanner = function (width, height, side, isFirst) {
        var devMode = localStorage.getItem('dev_mode') === '1';
        var adsenseActive = !devMode && window.gameConfig && window.gameConfig.adsenseActive;
        // In dev_mode su giochi con AdSense, disabilita anche i message banner (verrebbero creati al posto di AdSense)
        var isMessageBanner = isFirst && width >= 160 && !(devMode && window.gameConfig && window.gameConfig.adsenseActive);
        var slotId = null;
        var amazonBannerUrl = null;
        var amazonGeneric = false;
        var amazonGenericImg = 'banner/offerteamazon2.jpg';
        var amazonGenericLink = 'https://www.amazon.it/deals?&linkCode=ll2&tag=lucianomane00-21&linkId=51a86306a12a5877517c1a84c3add10f&ref_=as_li_ss_tl';

        var amazonEnabled = AMAZON_BANNERS_ENABLED || (AMAZON_BANNERS_RIGHT && side === 'right');
        if (amazonEnabled && width === 300 && height === 600) {
            // Se il fetch è ancora in corso (null), non mostrare niente — verrà chiamato adjustLayout al termine
            if (!slotId && window._amazonDeal600 === null) return null;
            amazonGeneric = true;
            // Se è disponibile un deal specifico dal JSON, usa quello
            if (window._amazonDeal600) {
                amazonGenericImg = window._amazonDeal600.img;
                amazonGenericLink = window._amazonDeal600.link;
            }
        } else if (amazonEnabled && width === 300 && height === 250) {
            amazonGeneric = true;
            amazonGenericImg = 'banner/offerteamazon300x250.jpg';
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
        if (!window.showBannerDimensions && !isMessageBanner && !slotId && !amazonBannerUrl && !amazonGeneric && !adsenseSuppressed) {
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
                var imgStyle = window._amazonDeal600 ? 'object-fit:contain;background:#fff;' : 'object-fit:cover;';
                html += '<a href="' + amazonGenericLink + '" target="_blank" rel="noopener" style="display:block;position:absolute;top:0;left:0;width:100%;height:100%;z-index:1;"><img src="' + amazonGenericImg + '" style="width:100%;height:100%;' + imgStyle + '" alt="Offerte Amazon"></a>';
            } else if (amazonBannerUrl) {
                html += '<iframe src="' + amazonBannerUrl + '" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; overflow: hidden; z-index: 1;" scrolling="no"></iframe>';
            }

            // Real AdSense Injection Overlays Fallback
            html += '<ins class="adsbygoogle" ' +
                'style="display:inline-block; position: relative; width:' + width + 'px;height:' + height + 'px; z-index: 2;" ' +
                'data-ad-client="' + caPub + '" ' +
                'data-ad-slot="' + slotId + '" ' +
                'data-adsbygoogle-status="pending"></ins>';

            banner.innerHTML = html;
        } else if (amazonGeneric && !window.showBannerDimensions) {
            // Standalone Amazon Banner
            var deal = (width === 300 && height === 600) ? window._amazonDeal600 : null;
            if (deal) {
                var badgeText = deal.badge || 'OFFERTA A TEMPO';
                var expiryText = deal.expiry || '';
                banner.innerHTML =
                    '<a href="' + amazonGenericLink + '" target="_blank" rel="sponsored noopener" style="display:block;width:100%;height:100%;text-decoration:none;color:inherit;">' +
                    '<div style="position:relative;width:300px;height:600px;background:#131921;border:1px solid rgba(255,255,255,0.1);overflow:hidden;display:flex;flex-direction:column;box-sizing:border-box;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">' +
                    '<div style="background:#cc0c39;color:#fff;padding:12px;text-align:center;font-weight:bold;font-size:14px;text-transform:uppercase;">Offerta a Tempo</div>' +
                    '<div style="width:100%;height:200px;background:#fff;display:flex;justify-content:center;align-items:center;padding:10px;box-sizing:border-box;">' +
                    '<img src="' + amazonGenericImg + '" style="max-width:100%;max-height:100%;object-fit:contain;" alt="Offerte Amazon">' +
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
                    '</a>';
            } else {
                banner.innerHTML = '<a href="' + amazonGenericLink + '" target="_blank" rel="noopener" style="display:block;width:100%;height:100%;"><img src="' + amazonGenericImg + '" style="width:100%;height:100%;object-fit:cover;" alt="Offerte Amazon"></a>';
            }
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
            banner.innerHTML = (slotId ? 'AD SLOT: ' + slotId + '<br>' : 'Bannner<br>') + width + 'x' + height;
            banner.style.backgroundColor = 'rgba(128,128,128,0.2)';
            banner.style.border = '1px dashed grey';
            banner.style.display = 'flex';
            banner.style.alignItems = 'center';
            banner.style.justifyContent = 'center';
            banner.style.textAlign = 'center';
        }

        // --- Amazon Banner Impression + Click Tracking ---
        if (amazonGeneric && !window.showBannerDimensions) {
            var startTime = Date.now();
            var pagePath = window.location.pathname.split('/').pop() || 'index.html';
            var dealId = (window._amazonDeal600 && window._amazonDeal600.id) ? window._amazonDeal600.id : 'generic';
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
        var currentAvailableHeight = windowHeight;
        var verticalGap = 15;
        var bannerWidthFamily = 0;
        if (availableWidth >= 300) bannerWidthFamily = 300;
        else if (availableWidth >= 160) bannerWidthFamily = 160;
        else if (availableWidth >= 120) bannerWidthFamily = 120;

        var sidebarId = sidebar.id; // 'sidebar-left' or 'sidebar-right'

        // Hide all existing banners in this sidebar first
        var existingInSide = sidebar.querySelectorAll('.ad-banner');
        for (var k = 0; k < existingInSide.length; k++) {
            existingInSide[k].style.display = 'none';
        }

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
        populateSidebar(sidebarLeft, totalExtraWidth, 'left'); // Show Italian message (or ads)
    }
}

// Fetch deals.json and pick a random valid deal for the 300x600 banner
window._amazonDeal600 = null;
window._amazonImpressionSent = {}; // chiave: bannerId → true se impression già inviata
(function () {
    try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'banner/deals.json', true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    var deals = data.deals || data; // compatibile anche con array puro
                    var valid = deals.filter(function (d) {
                        return d.link && d.link !== '#' && d.img && d.img !== '';
                    });
                    if (valid.length > 0) {
                        window._amazonDeal600 = valid[Math.floor(Math.random() * valid.length)];
                        console.log('Amazon deal caricato:', window._amazonDeal600.id);
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

window.addEventListener('load', function () {
    adjustLayout();
    trackVisibleBanners('initial_load');

    var minuteCounter = 0;
    setInterval(function () {
        minuteCounter++;
        trackVisibleBanners('timer_refresh_' + minuteCounter);
    }, 60 * 1000);

    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
            window.showBannerDimensions = !window.showBannerDimensions;
            adjustLayout();
            console.log('Toggled banner content. Showing dimensions:', window.showBannerDimensions);
        }
    });
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
