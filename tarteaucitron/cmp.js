// ==============================
// CMP – configurazione centrale
// ==============================

window.cmpState = {
  adsAccepted: false
};

// ------------------------------
// Init Tarteaucitron
// ------------------------------
tarteaucitron.init({
  privacyUrl: "/privacy.html",

  hashtag: "#consent",
  cookieName: "cmp_consent",

  orientation: "bottom",
  showAlertSmall: false,
  showDenyAll: true,
  showAcceptAll: true,

  highPrivacy: true,       // niente consenso implicito
  handleBrowserDNTRequest: false,

  removeCredit: true,
  moreInfoLink: true,

  useExternalCss: false,
  useExternalJs: false
});

// ------------------------------
// Servizio PUBBLICITÀ (placeholder)
// ------------------------------
tarteaucitron.services.ads = {
  key: "ads",
  type: "ads",
  name: "Pubblicità",
  needConsent: true,

  cookies: [],

  js: function () {
    // consenso ACCETTATO
    window.cmpState.adsAccepted = true;
    document.dispatchEvent(new Event("cmp:adsAccepted"));
  },

  fallback: function () {
    // consenso RIFIUTATO
    window.cmpState.adsAccepted = false;
    document.dispatchEvent(new Event("cmp:adsRefused"));
  }
};

// attiva il servizio
(tarteaucitron.job = tarteaucitron.job || []).push("ads");
