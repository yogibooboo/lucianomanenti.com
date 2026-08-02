document.addEventListener('DOMContentLoaded', async () => {
    // Ottieni il tab attivo
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) return;

    const url = tab.url;
    const productIdInput = document.getElementById('productIdInput');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');
    const storeBadge = document.getElementById('storeBadge');
    const idLabel = document.getElementById('idLabel');
    const endpointText = document.getElementById('endpointText');

    let store = 'unknown';
    let extractedId = '';
    let serverUrl = '';

    // 1. Regex Riconoscimento Amazon (ASIN)
    const amazonRegex = /(?:dp|o|ASIN|gp\/product)\/([a-zA-Z0-9]{10})/i;
    const amazonMatch = url.match(amazonRegex);

    // 2. Regex Riconoscimento AliExpress (Product ID numerico in qualsiasi variante di URL)
    const aliRegex = /item\/(\d+)\.html|(\d{13,17})\.html|[?&](?:itemId|productId|goods_id)=(\d+)/i;
    const aliMatch = url.match(aliRegex);

    const isAmazon = /amazon/i.test(url) || amazonMatch;
    const isAliExpress = /aliexpress/i.test(url) || aliMatch;

    if (isAmazon) {
        store = 'amazon';
        if (amazonMatch && amazonMatch[1]) {
            extractedId = amazonMatch[1];
        }
    } else if (isAliExpress) {
        store = 'aliexpress';
        if (aliMatch) {
            extractedId = aliMatch[1] || aliMatch[2] || aliMatch[3] || '';
        }
    }

    // Configurazione visuale in base allo store riconosciuto
    if (store === 'amazon') {
        storeBadge.textContent = 'Amazon';
        storeBadge.className = 'badge-store store-amazon';
        idLabel.textContent = 'ASIN Amazon Rilevato:';
        serverUrl = 'http://itinerari.local/api_ricevi_asin.php';
        saveBtn.className = 'amazon-btn';
    } else if (store === 'aliexpress') {
        storeBadge.textContent = 'AliExpress';
        storeBadge.className = 'badge-store store-aliexpress';
        idLabel.textContent = 'Product ID AliExpress Rilevato:';
        serverUrl = 'http://itinerari.local/api_ricevi_ali_id.php';
        saveBtn.className = 'ali-btn';
    } else {
        storeBadge.textContent = 'Non Riconosciuto';
        storeBadge.className = 'badge-store store-unknown';
        idLabel.textContent = 'ID Prodotto:';
        serverUrl = 'http://itinerari.local/api_ricevi_asin.php';
        saveBtn.className = 'unknown-btn';
    }

    endpointText.textContent = serverUrl;

    if (extractedId) {
        productIdInput.value = extractedId;
        saveBtn.disabled = false;
    } else {
        productIdInput.value = "Nessun ID trovato nell'URL";
        saveBtn.disabled = true;
    }

    // Salva l'ID sul server locale
    saveBtn.addEventListener('click', async () => {
        const idVal = productIdInput.value;
        const message = document.getElementById('messageInput').value;

        saveBtn.disabled = true;
        saveBtn.innerText = "Salvataggio...";

        const payload = store === 'aliexpress' 
            ? { product_id: idVal, message: message }
            : { asin: idVal, message: message };

        try {
            const response = await fetch(serverUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.status === 'success') {
                statusDiv.style.display = 'block';
                setTimeout(() => window.close(), 1500); // Chiude il popup automaticamente
            } else {
                alert("Errore dal server: " + result.message);
                saveBtn.disabled = false;
                saveBtn.innerText = "Riprova";
            }
        } catch (error) {
            alert("Errore di connessione a LocalWP. Assicurati che il sito locale sia acceso e l'URL sia corretto.\nErrore: " + error.message);
            saveBtn.disabled = false;
            saveBtn.innerText = "Salva su LocalWP";
        }
    });
});
