/* config.js */
window.SITE = {
    NAME: 'RepurposerHub',
    URL: 'https://repurposerhub.org',
    CONTACT_EMAIL: 'ntokozolms10@gmail.com',
    GA_MEASUREMENT_ID: 'G-TY8BWXYRJP',
    ADSENSE_PUB_ID: 'ca-pub-7179154805169763'
};

/* Load small responsive hotfixes after the main stylesheet. */
(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'mobile-fixes.css?v=20260710-1';
    document.head.appendChild(link);
})();
