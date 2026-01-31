tarteaucitron.services.gtag = {
    "key": "gtag",
    "type": "analytic",
    "name": "Google Analytics (GA4)",
    "uri": "https://policies.google.com/privacy",
    "needConsent": true,
    "cookies": ['_ga', '_gat', '_gid'],
    "js": function () {
        "use strict";
        if (tarteaucitron.user.gtagUa === undefined) {
            return;
        }
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', tarteaucitron.user.gtagUa);

        if (typeof tarteaucitron.user.gtagMore === 'function') {
            tarteaucitron.user.gtagMore();
        }

        tarteaucitron.addScript('https://www.googletagmanager.com/gtag/js?id=' + tarteaucitron.user.gtagUa);
    }
};
