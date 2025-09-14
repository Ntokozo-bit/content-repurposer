document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ---
    const mainInput = document.getElementById('main-input');

    const charCountEl = document.getElementById('char-count');
    const wordCountEl = document.getElementById('word-count');
    const readTimeEl = document.getElementById('read-time');

    const twitterContent = document.getElementById('twitter-content');
    const linkedinContent = document.getElementById('linkedin-content');
    const instagramContent = document.getElementById('instagram-content');

    const tabs = document.querySelectorAll('.tab');
    const outputPanels = document.querySelectorAll('.output-panel');

    const twProgress = document.getElementById('tw-progress');
    const liProgress = document.getElementById('li-progress');
    const igProgress = document.getElementById('ig-progress');

    const copyThreadBtn = document.getElementById('copy-thread');
    const copyLinkedInBtn = document.getElementById('copy-linkedin');
    const copyInstagramBtn = document.getElementById('copy-instagram');

    const emojiList = document.getElementById('emoji-suggest');
    const toneBadge = document.getElementById('tone-badge');

    const themeToggle = document.getElementById('theme-toggle');

    // --- CONSTANTS ---
    const TWITTER_CHAR_LIMIT = 280;
    const LINKEDIN_SOFT_LIMIT = 3000;
    const INSTAGRAM_SOFT_LIMIT = 2200;
    const WORDS_PER_MINUTE = 200;

    // --- UTIL ---
    const escapeHTML = (str) =>
        str.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

    const splitIntoSections = (text) => {
        const cleaned = text
            .replace(/\r\n/g, '\n')
            .replace(/\t/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        return cleaned.length ? cleaned.split(/\n{2,}/).map(s => s.trim()).filter(Boolean) : [];
    };

    const parseBlockTitleBody = (block) => {
        const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
        if (!lines.length) return { title: '', body: '' };
        if (lines.length === 1) return { title: '', body: lines[0] };
        const title = lines[0];
        const body = lines.slice(1).join(' ').replace(/\s{2,}/g, ' ').trim();
        return { title, body };
    };

    const splitIntoSentences = (text) =>
        text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);

    // Debounce
    let debounceTimer = null;
    const debounce = (fn, ms = 250) => (...args) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fn(...args), ms);
    };

    // Local storage
    const LS_KEY_INPUT = 'ucr_input';
    const LS_KEY_THEME = 'ucr_theme';

    const saveInput = debounce((v) => {
        try { localStorage.setItem(LS_KEY_INPUT, v); } catch {}
    }, 300);
    const loadInput = () => {
        try { return localStorage.getItem(LS_KEY_INPUT) || ''; } catch { return ''; }
    };

    // Tone & emoji
    const POSITIVE_WORDS = ['great','amazing','awesome','love','win','success','happy','excited','incredible','fantastic','productive','boost','improve','best','powerful','easy','smart'];
    const NEGATIVE_WORDS = ['bad','hate','angry','sad','problem','hard','difficult','fail','worse','worst','annoyed','slow','broken','bug'];
    const EMOJI_MAP = [
        { key: 'success', match: ['win','success','great','amazing','fantastic','achieve','milestone','reach'], emoji: ['🎉','🏆','🚀'] },
        { key: 'work', match: ['work','productive','focus','task','goal','plan'], emoji: ['💼','✅','🧠'] },
        { key: 'time', match: ['today','tomorrow','week','minute','time','schedule'], emoji: ['⏰','📅','⌛'] },
        { key: 'learn', match: ['learn','study','tip','guide','tutorial'], emoji: ['📚','🧩','💡'] },
        { key: 'warning', match: ['mistake','avoid','problem','risk'], emoji: ['⚠️','🛑','🤔'] },
        { key: 'heart', match: ['love','like','enjoy','favourite','favorite'], emoji: ['❤️','😍','🤩'] },
    ];

    const detectTone = (text) => {
        const words = text.toLowerCase().match(/[a-z']+/g) || [];
        let pos = 0, neg = 0;
        for (const w of words) {
            if (POSITIVE_WORDS.includes(w)) pos++;
            if (NEGATIVE_WORDS.includes(w)) neg++;
        }
        if (pos === 0 && neg === 0) return 'Neutral';
        if (pos >= neg * 2) return 'Positive';
        if (neg >= pos * 2) return 'Negative';
        return pos >= neg ? 'Slightly positive' : 'Slightly negative';
    };

    const suggestEmojis = (text) => {
        const lower = text.toLowerCase();
        const set = new Set();
        for (const bucket of EMOJI_MAP) {
            if (bucket.match.some(k => lower.includes(k))) bucket.emoji.forEach(e => set.add(e));
        }
        const tone = detectTone(text);
        if (tone.includes('Positive')) ['✨','💪','😊'].forEach(e => set.add(e));
        if (tone.includes('Negative')) ['😕','🛠️','🔧'].forEach(e => set.add(e));
        return Array.from(set).slice(0, 12);
    };

    const renderEmojiChips = (emojis) => {
        emojiList.innerHTML = emojis.map(e => `<button class="emoji-chip" data-emoji="${e}" aria-label="Insert emoji ${e}">${e}</button>`).join('');
    };

    const insertAtCursor = (textarea, text) => {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const newValue = value.slice(0, start) + text + value.slice(end);
        textarea.value = newValue;
        const pos = start + text.length;
        textarea.selectionStart = textarea.selectionEnd = pos;
        return newValue;
    };

    // UPDATE
    const updateAll = (text) => {
        updateStats(text);
        updateToneAndEmoji(text);
        formatForTwitter(text);
        formatForLinkedIn(text);
        formatForInstagram(text);
        saveInput(text);
    };

    const updateStats = (text) => {
        const charCount = text.length;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;
        const readTime = Math.ceil(wordCount / WORDS_PER_MINUTE);
        charCountEl.textContent = charCount;
        wordCountEl.textContent = wordCount;
        readTimeEl.textContent = readTime;
    };

    const updateToneAndEmoji = (text) => {
        const tone = detectTone(text);
        toneBadge.textContent = `Tone: ${tone}`;
        renderEmojiChips(suggestEmojis(text));
    };

    // TWITTER
    const formatForTwitter = (text) => {
        if (!twitterContent) return;
        if (text.trim() === '') {
            twitterContent.innerHTML = '<p class="muted">Your generated thread will appear here...</p>';
            if (twProgress) twProgress.style.width = '0%';
            return;
        }
        const sections = splitIntoSections(text);
        if (!sections.length) {
            twitterContent.innerHTML = '<p class="muted">Your generated thread will appear here...</p>';
            if (twProgress) twProgress.style.width = '0%';
            return;
        }

        const tweets = [];
        for (const block of sections) {
            const { title, body } = parseBlockTitleBody(block);
            const header = title ? title : '';
            const sectionText = body ? body : '';

            let sentences = [];
            if (header && sectionText) sentences = [header].concat(splitIntoSentences(sectionText));
            else if (header && !sectionText) sentences = [header];
            else sentences = splitIntoSentences(sectionText);

            let current = '';
            const reserve = 10;
            for (let i = 0; i < sentences.length; i++) {
                const s = sentences[i];
                const piece = (i === 0 && header && sectionText) ? (s + ' —') : s;
                const candidate = current ? (current + ' ' + piece) : piece;
                if (candidate.length + reserve <= TWITTER_CHAR_LIMIT) {
                    current = candidate;
                } else {
                    if (current) tweets.push(current.trim());
                    current = piece;
                    if (current.length + reserve > TWITTER_CHAR_LIMIT) {
                        tweets.push(current.slice(0, TWITTER_CHAR_LIMIT - reserve).trim());
                        current = piece.slice(TWITTER_CHAR_LIMIT - reserve).trim();
                    }
                }
            }
            if (current) tweets.push(current.trim());
        }

        const total = tweets.length;
        const finalized = tweets.map((t, i) => {
            const counter = total > 1 ? ` (${i + 1}/${total})` : '';
            let out = t;
            if (out.length + counter.length > TWITTER_CHAR_LIMIT) {
                const max = TWITTER_CHAR_LIMIT - counter.length;
                let cut = out.slice(0, max);
                const lastSpace = cut.lastIndexOf(' ');
                if (lastSpace > 40) cut = cut.slice(0, lastSpace);
                out = cut.trim();
            }
            return out + counter;
        });

        twitterContent.innerHTML = finalized.map((tweet, index) => `
            <div class="tweet">
                <div class="tweet-header">
                    <span class="tweet-counter">Tweet ${index + 1} of ${total}</span>
                    <button class="tweet-copy-button" data-tweet-index="${index}" aria-label="Copy tweet ${index + 1}">Copy</button>
                </div>
                <div class="tweet-content" id="tweet-text-${index}">${escapeHTML(tweet)}</div>
            </div>
        `).join('');

        const last = finalized[finalized.length - 1] || '';
        if (twProgress) twProgress.style.width = Math.min(100, Math.round((last.length / TWITTER_CHAR_LIMIT) * 100)) + '%';
    };

    // LINKEDIN (one blank line above and below each title)
    const formatForLinkedIn = (text) => {
        if (!linkedinContent) return;
        if (text.trim() === '') {
            linkedinContent.textContent = '';
            if (liProgress) liProgress.style.width = '0%';
            return;
        }
        const normalized = text
            .replace(/\r\n/g, '\n')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        const blocks = normalized.length ? normalized.split(/\n{2,}/).map(s => s.trim()).filter(Boolean) : [];
        const outLines = [];

        blocks.forEach((block) => {
            const { title, body } = parseBlockTitleBody(block);
            if (title) {
                outLines.push('');
                outLines.push(title);
                outLines.push('');
                if (body) outLines.push(body);
                outLines.push('');
            } else {
                outLines.push(block);
                outLines.push('');
            }
        });

        let finalText = outLines.join('\n');
        finalText = finalText.replace(/^\n+/, '').replace(/\n+$/, '').replace(/\n{3,}/g, '\n\n');
        linkedinContent.textContent = finalText;

        if (liProgress) liProgress.style.width = Math.min(100, Math.round((finalText.length / LINKEDIN_SOFT_LIMIT) * 100)) + '%';
    };

    // INSTAGRAM (title optional)
    const formatForInstagram = (text) => {
        if (!instagramContent) return;
        if (text.trim() === '') {
            instagramContent.innerHTML = '<p class="muted">Your generated slides will appear here...</p>';
            if (igProgress) igProgress.style.width = '0%';
            return;
        }
        const blocks = splitIntoSections(text);
        if (!blocks.length) {
            instagramContent.innerHTML = '<p class="muted">Your generated slides will appear here...</p>';
            if (igProgress) igProgress.style.width = '0%';
            return;
        }

        let slideHTML = '<div class="insta-slides-container">';
        blocks.forEach((block, index) => {
            const { title, body } = parseBlockTitleBody(block);
            const hasTitle = !!title;
            const safeTitle = hasTitle ? escapeHTML(title) : '';
            const safeBody = escapeHTML(hasTitle ? (body || '') : block);

            slideHTML += `
                <div class="insta-slide">
                    <span class="slide-number">${index + 1}/${blocks.length}</span>
                    ${hasTitle ? `<div class="insta-title">${safeTitle}</div>` : ''}
                    <div class="insta-body">${safeBody}</div>
                </div>
            `;
        });
        slideHTML += '</div>';
        instagramContent.innerHTML = slideHTML;

        if (igProgress) igProgress.style.width = Math.min(100, Math.round((text.length / INSTAGRAM_SOFT_LIMIT) * 100)) + '%';
    };

    // INPUT handling
    if (mainInput) {
        mainInput.addEventListener('input', debounce(() => updateAll(mainInput.value), 200));
        const existing = loadInput();
        if (existing) {
            mainInput.value = existing;
            updateAll(existing);
        } else {
            updateAll('');
        }
    }

    // COPY actions (event delegation)
    document.body.addEventListener('click', (e) => {
        if (e.target.matches('.tweet-copy-button')) {
            const idx = e.target.getAttribute('data-tweet-index');
            const el = document.getElementById(`tweet-text-${idx}`);
            if (el) copyToClipboard(el.textContent, e.target);
        }
        if (copyLinkedInBtn && e.target === copyLinkedInBtn) {
            copyToClipboard(linkedinContent.textContent, e.target);
        }
        if (copyInstagramBtn && e.target === copyInstagramBtn) {
            const txt = Array.from(instagramContent.querySelectorAll('.insta-slide .insta-title, .insta-slide .insta-body'))
                .map(el => el.textContent.trim())
                .join('\n');
            copyToClipboard(txt, e.target);
        }
        if (e.target.matches('.emoji-chip')) {
            if (!mainInput) return;
            const emoji = e.target.getAttribute('data-emoji');
            const newVal = insertAtCursor(mainInput, emoji);
            updateAll(newVal);
            mainInput.focus();
        }
    });

    const copyToClipboard = (text, btn) => {
        navigator.clipboard.writeText(text).then(() => {
            const old = btn.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => { btn.textContent = old; }, 1200);
        }).catch(() => {
            alert('Copy failed. Your browser may block clipboard access.');
        });
    };

    // Tabs & swipe
    tabs.forEach(tab => tab.addEventListener('click', () => setActiveTab(tab.dataset.tab)));
    const setActiveTab = (name) => {
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
        outputPanels.forEach(p => p.classList.toggle('active', p.id === `${name}-output`));
    };

    let startX=0, startY=0, touching=false;
    const panelsContainer = document.querySelector('.output-section');
    const order = ['twitter','linkedin','instagram'];
    const activeIndex = () => order.findIndex(k => document.getElementById(`${k}-output`)?.classList.contains('active'));

    if (panelsContainer) {
        panelsContainer.addEventListener('touchstart', (e) => {
            if (!e.touches || e.touches.length !== 1) return;
            touching = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });

        panelsContainer.addEventListener('touchend', (e) => {
            if (!touching) return;
            touching = false;
            const endX = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : startX;
            const endY = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : startY;
            const dx = endX - startX;
            const dy = endY - startY;
            if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
            let idx = activeIndex();
            if (dx < 0 && idx < order.length - 1) idx++;
            else if (dx > 0 && idx > 0) idx--;
            setActiveTab(order[idx]);
        }, { passive: true });
    }

    // Theme toggle (shared across pages)
    const setTheme = (mode) => {
        document.documentElement.setAttribute('data-theme', mode);
        try { localStorage.setItem(LS_KEY_THEME, mode); } catch {}
        if (themeToggle) {
            themeToggle.setAttribute('aria-pressed', String(mode === 'dark'));
            themeToggle.textContent = mode === 'dark' ? '☀️' : '🌙';
        }
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', mode === 'dark' ? '#0f1115' : '#ffffff');
    };
    const initialTheme = (() => {
        try { const s = localStorage.getItem(LS_KEY_THEME); if (s) return s; } catch {}
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    })();
    setTheme(initialTheme);
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            setTheme(current === 'light' ? 'dark' : 'light');
        });
    }

    // Year in footer (if present)
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});