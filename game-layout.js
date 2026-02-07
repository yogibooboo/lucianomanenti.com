'use strict';

// Make the scale factor global so the game's mouse logic can use it
window.gameScale = 1;
// Global state to toggle banner content
window.showBannerDimensions = false;

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
        footer.innerHTML = '<a href="index.html" style="color: inherit; text-decoration: none; margin-left: 15px;">Home</a>' +
            '<a href="aboutme.html" style="color: inherit; text-decoration: none; margin-left: 15px;">Chi Sono</a>' +
            '<a href="privacy.html" style="color: inherit; text-decoration: none; margin-left: 15px;">Privacy</a>';
        document.body.appendChild(footer);

        // Add hover effect
        footer.onmouseover = function () { this.style.color = 'rgba(255,255,255,0.9)'; };
        footer.onmouseout = function () { this.style.color = 'rgba(255,255,255,0.6)'; };
    }
}

function adjustLayout() {
    injectLegalLinks();
    var gameWidth = 1024;
    var gameHeight = 750;
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;

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
        layoutMode = 'single-right';
    }

    if (layoutMode === 'single-right') {
        // Shift game to the left
        campogioco.style.left = ((gameWidth * scale) / 2) + 'px';
    } else {
        // Center game
        campogioco.style.left = '50%';
    }
    campogioco.style.top = '50%';
    campogioco.style.transform = 'translate(-50%, -50%) scale(' + scale + ')';
    // Backwards compatibility for older browsers
    campogioco.style.msTransform = 'translate(-50%, -50%) scale(' + scale + ')';
    campogioco.style.webkitTransform = 'translate(-50%, -50%) scale(' + scale + ')';

    if (window.scala) {
        var rect = campogioco.getBoundingClientRect();
        scala.offsetxx = rect.left;
        scala.offsetyy = rect.top;
    }

    sidebarLeft.innerHTML = '';
    sidebarRight.innerHTML = '';
    sidebarLeft.style.display = 'none';
    sidebarRight.style.display = 'none';

    var createBanner = function (width, height, side, isFirst) {
        var isMessageBanner = isFirst && width >= 160;

        if (!window.showBannerDimensions && !isMessageBanner) {
            return null;
        }

        var banner = document.createElement('div');
        banner.className = 'ad-banner';
        banner.style.width = width + 'px';
        banner.style.height = height + 'px';

        if (isMessageBanner && !window.showBannerDimensions) {
            var message = '';
            // Allow custom style from config
            var customStyle = (window.gameConfig && window.gameConfig.bannerStyle) || '';
            var defaultStyle = 'padding: 10px; text-align: left; font-size: 14px; color: white; background-color: green; border: 1px solid #2d5a3d; border-radius: 5px; height: 100%; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; overflow: auto; overflow-wrap: break-word;';

            var style = customStyle || defaultStyle;

            if (window.gameConfig && window.gameConfig.messages) {
                var lang = (side === 'left') ? 'it' : 'en';
                var msgContent = window.gameConfig.messages[lang];
                if (msgContent) {
                    message = '<div style="' + style + '"><div>' + msgContent + '</div></div>';
                }
            }
            banner.innerHTML = message;
        } else {
            banner.innerHTML = 'Banner<br>' + width + 'x' + height;
        }
        return banner;
    };

    var allAdFormats = [
        { width: 300, height: 600 }, { width: 300, height: 250 }, { width: 300, height: 100 },
        { width: 160, height: 600 }, { width: 160, height: 250 }, { width: 160, height: 160 },
        { width: 120, height: 600 }, { width: 120, height: 240 }
    ];

    var populateSidebar = function (sidebar, availableWidth, side) {
        var currentAvailableHeight = windowHeight;
        var verticalGap = 15;
        var bannerWidthFamily = 0;
        if (availableWidth >= 300) bannerWidthFamily = 300;
        else if (availableWidth >= 160) bannerWidthFamily = 160;
        else if (availableWidth >= 120) bannerWidthFamily = 120;

        if (bannerWidthFamily > 0) {
            var applicableFormats = allAdFormats.filter(function (f) { return f.width === bannerWidthFamily; });
            for (var i = 0; i < applicableFormats.length; i++) {
                var format = applicableFormats[i];
                var isFirst = sidebar.childElementCount === 0;
                var requiredGap = isFirst ? 0 : verticalGap;
                if (currentAvailableHeight >= (format.height + requiredGap)) {
                    var banner = createBanner(format.width, format.height, side, isFirst);
                    if (banner) {
                        if (!isFirst) banner.style.marginTop = verticalGap + 'px';
                        sidebar.appendChild(banner);
                        currentAvailableHeight -= (format.height + requiredGap);
                    }
                } else if (!isFirst && currentAvailableHeight >= format.height) {
                    var banner = createBanner(format.width, format.height, side, isFirst);
                    if (banner) {
                        sidebar.appendChild(banner);
                        currentAvailableHeight -= format.height;
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
    } else if (layoutMode === 'single-right') {
        sidebarRight.style.width = totalExtraWidth + 'px';
        sidebarRight.style.display = 'flex';
        populateSidebar(sidebarRight, totalExtraWidth, 'left'); // Show Italian message
    }
}

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
