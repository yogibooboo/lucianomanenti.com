'use strict';

// Make the scale factor global so the game's mouse logic can use it
window.gameScale = 1;
// Global state to toggle banner content
window.showBannerDimensions = false;

// Function to get version from the script tag and store it globally
function getAndStoreScriptVersion() {
    const scriptTag = document.currentScript;
    if (scriptTag && scriptTag.src) {
        const match = scriptTag.src.match(/[?&]v=([^&]+)/);
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
        const width = bannerElement.style.width;
        const height = bannerElement.style.height;
        const dimensions = width && height ? `${width}x${height}` : 'unknown_dimensions';

        // Use prefix from config or default
        const prefix = (window.gameConfig && window.gameConfig.gaPrefix) || '';
        const eventName = prefix + 'simulated_banner_impression';

        gtag('event', eventName, {
            'event_category': 'Banner_Simulation',
            'event_label': dimensions,
            'trigger_type': triggerType,
            'version': window.scriptVersion || 'unknown',
            'non_interaction': true
        });
        console.log(`GA Evento Inviato: ${eventName} - ${dimensions} - Trigger: ${triggerType} - Version: ${window.scriptVersion}`);
    } else {
        console.warn('Funzione gtag non trovata. Google Analytics potrebbe non essere inizializzato.');
    }
}

// Funzione per tracciare tutti i banner visibili
function trackVisibleBanners(triggerType) {
    const visibleBanners = document.querySelectorAll('.ad-banner');
    visibleBanners.forEach(banner => {
        if (banner.offsetWidth > 0 && banner.offsetHeight > 0) {
            sendAnalyticsEvent(banner, triggerType);
        }
    });
}

function adjustLayout() {
    const gameWidth = 1024;
    const gameHeight = 750;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const campogioco = document.getElementById('campogioco');
    const sidebarLeft = document.getElementById('sidebar-left');
    const sidebarRight = document.getElementById('sidebar-right');

    if (!campogioco || !sidebarLeft || !sidebarRight) return;

    const scaleX = windowWidth / gameWidth;
    const scaleY = windowHeight / gameHeight;
    const scale = Math.min(scaleX, scaleY);

    window.gameScale = scale;

    const totalExtraWidth = windowWidth - (gameWidth * scale);
    let layoutMode = 'none';
    if (totalExtraWidth >= 320) {
        layoutMode = 'dual';
    } else if (totalExtraWidth >= 160) {
        layoutMode = 'single-right';
    }

    if (layoutMode === 'single-right') {
        // Shift game to the left
        campogioco.style.left = `${(gameWidth * scale) / 2}px`;
    } else {
        // Center game
        campogioco.style.left = `50%`;
    }
    campogioco.style.top = `50%`;
    campogioco.style.transform = `translate(-50%, -50%) scale(${scale})`;

    if (window.scala) {
        const rect = campogioco.getBoundingClientRect();
        scala.offsetxx = rect.left;
        scala.offsetyy = rect.top;
    }

    sidebarLeft.innerHTML = '';
    sidebarRight.innerHTML = '';
    sidebarLeft.style.display = 'none';
    sidebarRight.style.display = 'none';

    const createBanner = (width, height, side, isFirst) => {
        const isMessageBanner = isFirst && width >= 160;

        if (!window.showBannerDimensions && !isMessageBanner) {
            return null;
        }

        const banner = document.createElement('div');
        banner.className = 'ad-banner';
        banner.style.width = `${width}px`;
        banner.style.height = `${height}px`;

        if (isMessageBanner && !window.showBannerDimensions) {
            let message = '';
            // Allow custom style from config
            const customStyle = (window.gameConfig && window.gameConfig.bannerStyle) || '';
            const defaultStyle = `padding: 10px; text-align: left; font-size: 14px; color: white; background-color: green; border: 1px solid #2d5a3d; border-radius: 5px; height: 100%; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; overflow: auto; overflow-wrap: break-word;`;

            const style = customStyle || defaultStyle;

            if (window.gameConfig && window.gameConfig.messages) {
                const lang = (side === 'left') ? 'it' : 'en';
                const msgContent = window.gameConfig.messages[lang];
                if (msgContent) {
                    message = `<div style="${style}"><div>${msgContent}</div></div>`;
                }
            }
            banner.innerHTML = message;
        } else {
            banner.innerHTML = `Banner<br>${width}x${height}`;
        }
        return banner;
    };

    const allAdFormats = [
        { width: 300, height: 600 }, { width: 300, height: 250 }, { width: 300, height: 100 },
        { width: 160, height: 600 }, { width: 160, height: 250 }, { width: 160, height: 160 },
        { width: 120, height: 600 }, { width: 120, height: 240 }
    ];

    const populateSidebar = (sidebar, availableWidth, side) => {
        let currentAvailableHeight = windowHeight;
        const verticalGap = 15;
        let bannerWidthFamily = 0;
        if (availableWidth >= 300) bannerWidthFamily = 300;
        else if (availableWidth >= 160) bannerWidthFamily = 160;
        else if (availableWidth >= 120) bannerWidthFamily = 120;

        if (bannerWidthFamily > 0) {
            const applicableFormats = allAdFormats.filter(f => f.width === bannerWidthFamily);
            applicableFormats.forEach(format => {
                const isFirst = sidebar.childElementCount === 0;
                const requiredGap = isFirst ? 0 : verticalGap;
                if (currentAvailableHeight >= (format.height + requiredGap)) {
                    const banner = createBanner(format.width, format.height, side, isFirst);
                    if (banner) {
                        if (!isFirst) banner.style.marginTop = `${verticalGap}px`;
                        sidebar.appendChild(banner);
                        currentAvailableHeight -= (format.height + requiredGap);
                    }
                } else if (!isFirst && currentAvailableHeight >= format.height) {
                    const banner = createBanner(format.width, format.height, side, isFirst);
                    if (banner) {
                        sidebar.appendChild(banner);
                        currentAvailableHeight -= format.height;
                    }
                }
            });
        }
    };

    if (layoutMode === 'dual') {
        const sideWidth = totalExtraWidth / 2;
        sidebarLeft.style.width = `${sideWidth}px`;
        sidebarRight.style.width = `${sideWidth}px`;
        sidebarLeft.style.display = 'flex';
        sidebarRight.style.display = 'flex';
        populateSidebar(sidebarLeft, sideWidth, 'left');
        populateSidebar(sidebarRight, sideWidth, 'right');
    } else if (layoutMode === 'single-right') {
        sidebarRight.style.width = `${totalExtraWidth}px`;
        sidebarRight.style.display = 'flex';
        populateSidebar(sidebarRight, totalExtraWidth, 'left'); // Show Italian message
    }
}

window.addEventListener('load', () => {
    adjustLayout();
    trackVisibleBanners('initial_load');

    let minuteCounter = 0;
    setInterval(function () {
        minuteCounter++;
        trackVisibleBanners('timer_refresh_' + minuteCounter);
    }, 60 * 1000);

    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
            window.showBannerDimensions = !window.showBannerDimensions;
            adjustLayout();
            console.log('Toggled banner content. Showing dimensions:', window.showBannerDimensions);
        }
    });
});
window.addEventListener('resize', adjustLayout);
