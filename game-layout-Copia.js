// Non-functional change to trigger recognition

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



function injectLegalLinks() {
    if (window.gameConfig && window.gameConfig.hideLegalFooter) return;
    var footer = document.getElementById('game-legal-links');
    if (!footer) {
        footer = document.createElement('div');
        footer.id = 'game-legal-links';
        footer.style.cssText = 'position: fixed; bottom: 10px; right: 10px; font-size: 12px; font-family: sans-serif; z-index: 10000; color: rgba(255,255,255,0.6); pointer-events: auto;';
        footer.innerHTML = '<a href="index.html" style="color: inherit; text-decoration: none; margin-left: 15px;">Home</a>' +
            '<a href="aboutme.html" style="color: inherit; text-decoration: none; margin-left: 15px;">Chi Sono</a>' +
            '<a href="privacy.html" style="color: inherit; text-decoration: none; margin-left: 15px;">Privacy Policy</a>';
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
        layoutMode = 'single-right';
    }

    // Calculate desired visual center
    var cx = windowWidth / 2;
    var cy = windowHeight / 2;
    if (layoutMode === 'single-right') {
        cx = (gameWidth * scale) / 2;
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

    sidebarLeft.style.display = 'none';
    sidebarRight.style.display = 'none';

    var createBanner = function (width, height, side, isFirst) {
        var isMessageBanner = isFirst && width >= 160;
        var adsenseActive = window.gameConfig && window.gameConfig.adsenseActive;
        var slotId = null;

        // Map fixed sizes to provided AdSense Slot IDs
        if (adsenseActive && window.gameConfig.adsenseSlots) {
            var key = width + 'x' + height;
            slotId = window.gameConfig.adsenseSlots[key];
        }

        // If AdSense is active for this game, we skip the message banner in the top slot
        // to give full priority to the ad units.
        if (!window.showBannerDimensions && !isMessageBanner && !slotId) {
            return null;
        }

        var bannerId = 'ad-' + side + '-' + width + 'x' + height + '-' + (isFirst ? 'top' : 'bottom');
        var existingBanner = document.getElementById(bannerId);

        if (existingBanner) {
            return existingBanner;
        }

        var banner = document.createElement('div');
        banner.id = bannerId;
        banner.className = 'ad-banner';
        banner.style.width = width + 'px';
        banner.style.height = height + 'px';

        if (slotId && !window.showBannerDimensions) {
            // AdSense Injection Disabled
            banner.innerHTML = 'ADS DISABLED';
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
    } else if (layoutMode === 'single-right') {
        sidebarRight.style.width = totalExtraWidth + 'px';
        sidebarRight.style.display = 'flex';
        populateSidebar(sidebarRight, totalExtraWidth, 'left'); // Show Italian message (or ads)
    }
}

// Support both modern and older browsers for early execution
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', adjustLayout);
} else {
    adjustLayout();
}

adjustLayout();

document.addEventListener('keydown', function (event) {
    if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        window.showBannerDimensions = !window.showBannerDimensions;
        adjustLayout();
        console.log('Toggled banner content. Showing dimensions:', window.showBannerDimensions);
    }
});

// [INIZIO FIX RESIZE E ROTAZIONE SURFACE/TABLET]
window.addEventListener('resize', adjustLayout);
window.addEventListener('orientationchange', function () {
    // Ritardo di 200ms per dare tempo al browser di completare la rotazione fisica
    setTimeout(adjustLayout, 200);
});
// [FINE FIX RESIZE]
