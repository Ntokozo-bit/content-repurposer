/* analytics.js */
(function () {
    'use strict';

    if (!window.SITE) return;

    // ---- Google AdSense (Auto Ads) ----
    (function addAdSense() {
        try {
            var s = document.createElement('script');
            s.async = true;
            s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client='
                + encodeURIComponent(window.SITE.ADSENSE_PUB_ID);
            s.setAttribute('crossorigin', 'anonymous');
            document.head.appendChild(s);
        } catch (e) { /* no-op */ }
    })();

    // ---- Google Analytics (GA4) ----
    (function addGA4() {
        if (!window.SITE.GA_MEASUREMENT_ID) return;
        try {
            var gtagScript = document.createElement('script');
            gtagScript.async = true;
            gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id='
                + encodeURIComponent(window.SITE.GA_MEASUREMENT_ID);
            document.head.appendChild(gtagScript);

            window.dataLayer = window.dataLayer || [];
            function gtag(){ dataLayer.push(arguments); }
            window.gtag = gtag;

            gtag('js', new Date());
            gtag('config', window.SITE.GA_MEASUREMENT_ID, {
                anonymize_ip: true
            });
        } catch (e) { /* no-op */ }
    })();
})();
