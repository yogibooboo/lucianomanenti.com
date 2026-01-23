'use strict';

// Make the scale factor global so the game's mouse logic can use it
window.gameScale = 1;
// Global state to toggle banner content
window.showBannerDimensions = false;

// Function to get version from the script tag and store it globally
function getAndStoreScriptVersion() {
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
        const src = scripts[i].src;
        if (src && src.includes('burraco-layout.js')) {
            const match = src.match(/[?&]v=([^&]+)/);
            if (match) {
                window.scriptVersion = match[1];
                return;
            }
        }
    }
    window.scriptVersion = 'unknown'; // fallback
}

// Call the function to set the version on script load
getAndStoreScriptVersion();


// Funzione per inviare un evento Google Analytics per un banner
function sendAnalyticsEvent(bannerElement, triggerType) {
    if (typeof gtag === 'function') { // Verifica se gtag è disponibile
        const width = bannerElement.style.width;
        const height = bannerElement.style.height;
        const dimensions = width && height ? `${width}x${height}` : 'unknown_dimensions';
        gtag('event', 'simulated_banner_impression', {
            'event_category': 'Banner_Simulation',
            'event_label': dimensions,
            'trigger_type': triggerType, // Parametro aggiunto
            'version': window.scriptVersion || 'unknown', // Aggiungi la versione
            'non_interaction': true // Per non influenzare la frequenza di rimbalzo
        });
        console.log(`GA Evento Inviato: Simulazione Banner - ${dimensions} - Trigger: ${triggerType} - Version: ${window.scriptVersion}`); // Per debugging
    } else {
        console.warn('Funzione gtag non trovata. Google Analytics potrebbe non essere inizializzato.');
    }
}

// Funzione per tracciare tutti i banner visibili
function trackVisibleBanners(triggerType) {
    const visibleBanners = document.querySelectorAll('.ad-banner');
    visibleBanners.forEach(banner => {
        // Verifica base se il banner è visibile (non display:none, o larghezza/altezza 0)
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

    const scaleX = windowWidth / gameWidth;
    const scaleY = windowHeight / gameHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Update the global scale for the game logic
    window.gameScale = scale;

    // --- Reverted to prototype's scaling/positioning method ---
    campogioco.style.transform = `translate(-50%, -50%) scale(${scale})`;
    campogioco.style.left = `50%`;
    campogioco.style.top = `50%`;

    // Update the game's internal offsets for correct mouse calculations
    if (window.scala) {
        const rect = campogioco.getBoundingClientRect();
        scala.offsetxx = rect.left;
        scala.offsetyy = rect.top;
    }

    // Sidebar logic remains the same
    const sidebarWidth = (windowWidth - (gameWidth * scale)) / 2;

    sidebarLeft.innerHTML = '';
    sidebarRight.innerHTML = '';
    sidebarLeft.style.display = 'none';
    sidebarRight.style.display = 'none';

    const createBanner = (width, height, side, isFirst) => {
        const isMessageBanner = isFirst && width >= 160;

        // Se non stiamo mostrando le dimensioni dei banner, nascondi tutti tranne il messaggio
        if (!window.showBannerDimensions && !isMessageBanner) {
            return null; // Non creare banner secondari
        }

        const banner = document.createElement('div');
        banner.className = 'ad-banner';
        banner.style.width = `${width}px`;
        banner.style.height = `${height}px`;

        if (isMessageBanner && !window.showBannerDimensions) {
            // Default state: show message
            let message = '';
            const style = `padding: 15px; text-align: left; font-size: 14px; color: #fff; background-color: transparent; height: 100%; display: flex; flex-direction: column; justify-content: flex-start; box-sizing: border-box; overflow: auto; overflow-wrap: break-word;`;

            if (side === 'left') {
                // Messaggio in italiano
                message = `
                    <div style="${style}">
                        <div>
                            <p style="margin-top: 0; font-size: 22px; font-weight: bold; text-align: center; color: #fff;">LAVORI IN CORSO</p>
                            <p style="font-size: 18px; font-weight: bold; text-align: center; color: #fff;">A GRANDE RICHIESTA</p>
                            <p style="margin-top: 20px;">Quello che vedete è un primo abbozzo di layout per il gioco del Burraco, che molti di voi mi hanno chiesto.</p>
                            <p><strong>NON È UN GIOCO FUNZIONANTE.</strong></p>
                            <p>Aggiungerò man mano dei pezzi.</p>
                            <p>Sono graditi dei commenti, per ora solo sul layout.</p>
                            <p style="margin-top: 20px;">Scrivete a <a href="mailto:postmaster@lucianomanenti.com" style="color: #ffd700;">postmaster@lucianomanenti.com</a></p>
                        </div>
                    </div>
                `;
            } else if (side === 'right') {
                // Messaggio in inglese
                message = `
                    <div style="${style}">
                        <div>
                            <p style="margin-top: 0; font-size: 22px; font-weight: bold; text-align: center; color: #fff;">WORK IN PROGRESS</p>
                            <p style="font-size: 18px; font-weight: bold; text-align: center; color: #fff;">BY POPULAR DEMAND</p>
                            <p style="margin-top: 20px;">What you see is a first draft of the layout for the Burraco game, which many of you have requested.</p>
                            <p><strong>THIS IS NOT A WORKING GAME.</strong></p>
                            <p>I will add pieces gradually.</p>
                            <p>Comments are welcome, for now only about the layout.</p>
                            <p style="margin-top: 20px;">Write to <a href="mailto:postmaster@lucianomanenti.com" style="color: #ffd700;">postmaster@lucianomanenti.com</a></p>
                        </div>
                    </div>
                `;
            }
            banner.innerHTML = message;
        } else {
            // Toggled state OR not a message banner: show dimensions
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
                    if (banner) { // Skip if banner is null (hidden)
                        if (!isFirst) banner.style.marginTop = `${verticalGap}px`;
                        sidebar.appendChild(banner);
                        currentAvailableHeight -= (format.height + requiredGap);
                    }
                } else if (!isFirst && currentAvailableHeight >= format.height) {
                    const banner = createBanner(format.width, format.height, side, isFirst);
                    if (banner) { // Skip if banner is null (hidden)
                        sidebar.appendChild(banner);
                        currentAvailableHeight -= format.height;
                    }
                }
            });
        }
    };

    if (sidebarWidth >= 120) {
        sidebarLeft.style.width = `${sidebarWidth}px`;
        sidebarRight.style.width = `${sidebarWidth}px`;
        sidebarLeft.style.display = 'flex';
        sidebarRight.style.display = 'flex';
        populateSidebar(sidebarLeft, sidebarWidth, 'left');
        populateSidebar(sidebarRight, sidebarWidth, 'right');
    }
}

window.addEventListener('load', () => {
    adjustLayout();
    // Chiamata immediata per il primo invio con il trigger corretto
    trackVisibleBanners('initial_load');
    
    // Inizializza un contatore per i minuti
    let minuteCounter = 0;
    
    // Poi avvia l'intervallo per i successivi invii ogni minuto
    setInterval(function() {
        minuteCounter++; // Incrementa il contatore
        trackVisibleBanners('timer_refresh_' + minuteCounter);
    }, 60 * 1000); // 1 minuto

    // Ascolta la combinazione di tasti per alternare il contenuto dei banner (bistabile)
    // Ctrl+Alt+S: mostra/nasconde le dimensioni dei banner
    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 's') {
            event.preventDefault(); // Impedisce azioni predefinite del browser
            window.showBannerDimensions = !window.showBannerDimensions; // Alterna lo stato
            adjustLayout(); // Ridisegna i banner per riflettere il nuovo stato
            console.log('Toggled banner content. Showing dimensions:', window.showBannerDimensions);
        }
    });
});
window.addEventListener('resize', adjustLayout);