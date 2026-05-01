/* script.js */
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ---
    const mainInput = document.getElementById('main-input');

    const charCountEl = document.getElementById('char-count');
    const wordCountEl = document.getElementById('word-count');
    const readTimeEl = document.getElementById('read-time');

    const twitterContent = document.getElementById('twitter-content');
    const linkedinContent = document.getElementById('linkedin-content');
    const instagramContent = document.getElementById('instagram-content');
    const facebookContent = document.getElementById('facebook-content');
    const whatsappContent = document.getElementById('whatsapp-content');

    const tabs = document.querySelectorAll('.tab');
    const outputPanels = document.querySelectorAll('.output-panel');

    const twProgress = document.getElementById('tw-progress');
    const liProgress = document.getElementById('li-progress');
    const igProgress = document.getElementById('ig-progress');
    const fbProgress = document.getElementById('fb-progress');
    const waProgress = document.getElementById('wa-progress');

    const downloadInstagramBtn = document.getElementById('download-instagram');
    const loadSampleBtn = document.getElementById('load-sample');
    const clearInputBtn = document.getElementById('clear-input');

    const emojiList = document.getElementById('emoji-suggest');
    const emojiRefreshBtn = document.getElementById('emoji-refresh');
    const toneBadge = document.getElementById('tone-badge');

    const themeToggle = document.getElementById('theme-toggle');
    const consentBanner = document.getElementById('consent-banner');
    const consentAcceptBtn = document.getElementById('consent-accept');
    const consentDeclineBtn = document.getElementById('consent-decline');
    const manageConsentBtn = document.getElementById('manage-consent');

    // --- CONSTANTS ---
    const TWITTER_CHAR_LIMIT = 280;
    const LINKEDIN_SOFT_LIMIT = 3000;
    const INSTAGRAM_SOFT_LIMIT = 2200;
    const FACEBOOK_SOFT_LIMIT = 1500;
    const WHATSAPP_SOFT_LIMIT = 1200;
    const WORDS_PER_MINUTE = 200;
    const INSTAGRAM_CANVAS_SIZE = 1080;
    const SLIDE_THEMES = [
        { background: '#11141b', text: '#f8f8f8', accent: '#ffb703', titleFont: '"Poppins", "Inter", sans-serif', bodyFont: '"Space Grotesk", "Inter", sans-serif' },
        { background: '#f4f1de', text: '#2b2d42', accent: '#ef476f', titleFont: '"Playfair Display", Georgia, serif', bodyFont: '"Inter", "Helvetica Neue", sans-serif' },
        { background: '#0d1321', text: '#d8e2dc', accent: '#64dfdf', titleFont: '"Space Grotesk", "Inter", sans-serif', bodyFont: '"Inter", "Helvetica Neue", sans-serif' },
        { background: '#fff7ec', text: '#2a2a2a', accent: '#c71f37', titleFont: '"Poppins", "Inter", sans-serif', bodyFont: '"Space Grotesk", "Inter", sans-serif' }
    ];
    const LS_KEY_CONSENT = 'ucr_consent';
    const CONSENT_ACCEPTED = 'accepted';
    const CONSENT_DECLINED = 'declined';
    const EMOJI_API_RANDOM = 'https://emojihub.yurace.pro/api/random';
    const DEFAULT_EMOJIS = ['✨','💡','✅','🚀','📌','💬'];
    const SAMPLE_DRAFT = `Launch smarter content this week
Most creators do not need more platforms. They need one reliable system for turning the same idea into posts that fit each channel.

Start with one useful insight, add a short story, and end with one clear action. Then reshape that draft for the platform instead of rewriting it from scratch.

Repurposing works best when the message stays consistent but the format feels native.`;

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

    const smartTrim = (text, max = 180) => {
        if (!text) return '';
        if (text.length <= max) return text;
        const slice = text.slice(0, max);
        const lastSpace = slice.lastIndexOf(' ');
        return (lastSpace > 60 ? slice.slice(0, lastSpace) : slice).trim() + '…';
    };

    const chunkParagraph = (text, limit = 260) => {
        const normalized = text.replace(/\s+/g, ' ').trim();
        if (!normalized) return [];
        const sentences = splitIntoSentences(normalized);
        const chunks = [];
        let current = '';
        const flush = () => {
            if (current.trim()) {
                chunks.push(current.trim());
                current = '';
            }
        };
        const appendSentence = (sentence) => {
            const candidate = current ? `${current} ${sentence}` : sentence;
            if (candidate.length <= limit) {
                current = candidate;
            } else {
                flush();
                if (sentence.length > limit) {
                    let start = 0;
                    while (start < sentence.length) {
                        const part = sentence.slice(start, start + limit);
                        chunks.push(part.trim());
                        start += limit;
                    }
                } else {
                    current = sentence;
                }
            }
        };
        if (sentences.length) {
            sentences.forEach(appendSentence);
        } else {
            appendSentence(normalized);
        }
        flush();
        return chunks.length ? chunks : [normalized];
    };

    const renderPlaceholder = (target, message, progressEl) => {
        if (target) target.innerHTML = `<p class="muted">${message}</p>`;
        if (progressEl) progressEl.style.width = '0%';
    };

    let currentInstagramSlides = [];
    let consentState = null;
    let adHydrationAttempts = 0;

    function hydrateAdSlots() {
        const slots = document.querySelectorAll('.ad-slot');
        if (!slots.length) return;
        if (!window.adsbygoogle || typeof window.adsbygoogle.push !== 'function') {
            if (adHydrationAttempts++ < 12) {
                setTimeout(hydrateAdSlots, 800);
            }
            return;
        }
        slots.forEach((slot) => {
            if (slot.dataset.loaded === 'true') return;
            slot.dataset.loaded = 'true';
            window.adsbygoogle.push({});
        });
    }
    function queueAdHydration() {
        adHydrationAttempts = 0;
        hydrateAdSlots();
    }

    // Debounce
    const debounce = (fn, ms = 250) => {
        let timer = null;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    };

    // Local storage
    const LS_KEY_INPUT = 'ucr_input';
    const LS_KEY_THEME = 'ucr_theme';

    const saveInput = debounce((v) => {
        try { localStorage.setItem(LS_KEY_INPUT, v); } catch {}
    }, 300);
    const showConsentBanner = () => {
        if (consentBanner) consentBanner.classList.add('is-visible');
    };
    const hideConsentBanner = () => {
        if (consentBanner) consentBanner.classList.remove('is-visible');
    };
    const emitConsentChange = () => {
        window.__consentState = consentState || null;
        if (!consentState) return;
        window.dispatchEvent(new CustomEvent('consentchange', { detail: { status: consentState } }));
        if (consentState === CONSENT_ACCEPTED) {
            queueAdHydration();
        }
    };
    const setConsentPreference = (state) => {
        consentState = state;
        try { localStorage.setItem(LS_KEY_CONSENT, state); } catch {}
        hideConsentBanner();
        emitConsentChange();
    };
    const initConsentPreference = () => {
        let stored = null;
        try { stored = localStorage.getItem(LS_KEY_CONSENT); } catch {}
        if (stored) {
            consentState = stored;
            emitConsentChange();
        } else {
            showConsentBanner();
        }
    };
    if (consentAcceptBtn) {
        consentAcceptBtn.addEventListener('click', () => setConsentPreference(CONSENT_ACCEPTED));
    }
    if (consentDeclineBtn) {
        consentDeclineBtn.addEventListener('click', () => setConsentPreference(CONSENT_DECLINED));
    }
    if (manageConsentBtn) {
        manageConsentBtn.addEventListener('click', () => showConsentBanner());
    }
    initConsentPreference();

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
        if (!text.trim()) return DEFAULT_EMOJIS;
        const lower = text.toLowerCase();
        const set = new Set();
        for (const bucket of EMOJI_MAP) {
            if (bucket.match.some(k => lower.includes(k))) bucket.emoji.forEach(e => set.add(e));
        }
        const tone = detectTone(text);
        if (tone.includes('Positive')) ['✨','💪','😊'].forEach(e => set.add(e));
        if (tone.includes('Negative')) ['😕','🛠️','🔧'].forEach(e => set.add(e));
        const suggestions = Array.from(set);
        return (suggestions.length ? suggestions : DEFAULT_EMOJIS).slice(0, 12);
    };

    const renderEmojiChips = (emojis) => {
        if (!emojiList) return;
        const unique = Array.from(new Set(emojis.filter(Boolean))).slice(0, 12);
        emojiList.innerHTML = unique.map(e => `<button class="emoji-chip" data-emoji="${e}" aria-label="Insert emoji ${e}">${e}</button>`).join('');
    };

    const decodeHtmlEntity = (value) => {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = value;
        return textarea.value;
    };

    const emojiFromApiPayload = (payload) => {
        if (!payload) return '';
        if (Array.isArray(payload.htmlCode) && payload.htmlCode[0]) {
            return decodeHtmlEntity(payload.htmlCode[0]);
        }
        if (Array.isArray(payload.unicode) && payload.unicode[0]) {
            const codePoints = payload.unicode
                .map(code => parseInt(String(code).replace('U+', ''), 16))
                .filter(Number.isFinite);
            if (codePoints.length) return String.fromCodePoint(...codePoints);
        }
        return '';
    };

    const fetchRandomEmoji = async () => {
        if (!emojiRefreshBtn || !emojiList) return;
        const originalLabel = emojiRefreshBtn.textContent;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        emojiRefreshBtn.disabled = true;
        emojiRefreshBtn.textContent = '...';
        try {
            const response = await fetch(EMOJI_API_RANDOM, { signal: controller.signal });
            if (!response.ok) throw new Error('Emoji API unavailable');
            const emoji = emojiFromApiPayload(await response.json());
            if (!emoji) throw new Error('Emoji API returned no emoji');
            const existing = Array.from(emojiList.querySelectorAll('.emoji-chip'))
                .map(button => button.dataset.emoji)
                .filter(Boolean);
            renderEmojiChips([emoji, ...existing]);
        } catch {
            const fallback = DEFAULT_EMOJIS[Math.floor(Math.random() * DEFAULT_EMOJIS.length)];
            const existing = Array.from(emojiList.querySelectorAll('.emoji-chip'))
                .map(button => button.dataset.emoji)
                .filter(Boolean);
            renderEmojiChips([fallback, ...existing]);
        } finally {
            clearTimeout(timeoutId);
            emojiRefreshBtn.disabled = false;
            emojiRefreshBtn.textContent = originalLabel;
        }
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
        formatForFacebook(text);
        formatForWhatsApp(text);
        saveInput(text);
    };

    const updateStats = (text) => {
        if (!charCountEl || !wordCountEl || !readTimeEl) return;
        const charCount = text.length;
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;
        const readTime = Math.ceil(wordCount / WORDS_PER_MINUTE);
        charCountEl.textContent = charCount;
        wordCountEl.textContent = wordCount;
        readTimeEl.textContent = readTime;
    };

    const updateToneAndEmoji = (text) => {
        if (toneBadge) toneBadge.textContent = `Tone: ${detectTone(text)}`;
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

            let sentences = splitIntoSentences(sectionText || block);
            if (header && sectionText) sentences = [header, ...sentences];
            else if (header && !sectionText) sentences = [header];

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

    // LINKEDIN
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
            const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
            if (!lines.length) return;
            if (lines.length === 1) {
                outLines.push(block);
                outLines.push('');
                return;
            }
            outLines.push('');
            outLines.push(lines[0]);
            outLines.push('');
            outLines.push(lines.slice(1).join(' '));
            outLines.push('');
        });

        let finalText = outLines.join('\n');
        finalText = finalText.replace(/^\n+/, '').replace(/\n+$/, '').replace(/\n{3,}/g, '\n\n');
        linkedinContent.textContent = finalText;

        if (liProgress) liProgress.style.width = Math.min(100, Math.round((finalText.length / LINKEDIN_SOFT_LIMIT) * 100)) + '%';
    };

    // INSTAGRAM
    const formatForInstagram = (text) => {
        if (!instagramContent) return;
        currentInstagramSlides = [];
        if (text.trim() === '') {
            renderPlaceholder(instagramContent, 'Your generated slides will appear here...', igProgress);
            return;
        }
        const sections = splitIntoSections(text);
        if (!sections.length) {
            renderPlaceholder(instagramContent, 'Your generated slides will appear here...', igProgress);
            return;
        }

        const slides = [];
        sections.forEach((block, sectionIndex) => {
            const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
            const hasTitle = lines.length > 1;
            const title = hasTitle ? lines[0] : '';
            const bodyText = (hasTitle ? lines.slice(1).join(' ') : block).replace(/\s{2,}/g, ' ').trim();
            const chunks = chunkParagraph(bodyText || block).filter(Boolean);
            if (!chunks.length) {
                slides.push({
                    title,
                    body: '',
                    theme: SLIDE_THEMES[sectionIndex % SLIDE_THEMES.length]
                });
                return;
            }
            chunks.forEach((chunk, chunkIndex) => {
                const theme = SLIDE_THEMES[(sectionIndex + chunkIndex) % SLIDE_THEMES.length];
                slides.push({
                    title: chunkIndex === 0 ? title : '',
                    body: chunk,
                    theme
                });
            });
        });
        currentInstagramSlides = slides;

        let slideHTML = '<div class="insta-slides-container">';
        slides.forEach((slide, index) => {
            const theme = slide.theme;
            slideHTML += `
                <div class="insta-slide" style="background:${theme.background};color:${theme.text};font-family:${theme.bodyFont};">
                    <span class="slide-number" style="color:${theme.accent};">${index + 1}/${slides.length}</span>
                    ${slide.title ? `<div class="insta-title" style="color:${theme.text};font-family:${theme.titleFont};">${escapeHTML(slide.title)}</div>` : ''}
                    <div class="insta-body" style="color:${theme.text};">${escapeHTML(slide.body)}</div>
                </div>
            `;
        });
        slideHTML += '</div>';
        instagramContent.innerHTML = slideHTML;

        if (igProgress) igProgress.style.width = Math.min(100, Math.round((text.length / INSTAGRAM_SOFT_LIMIT) * 100)) + '%';
    };

    const formatForFacebook = (text) => {
        if (!facebookContent) return;
        if (text.trim() === '') {
            renderPlaceholder(facebookContent, 'A Facebook-ready story will appear here...', fbProgress);
            return;
        }
        const sections = splitIntoSections(text);
        if (!sections.length) {
            renderPlaceholder(facebookContent, 'A Facebook-ready story will appear here...', fbProgress);
            return;
        }
        const paragraphs = sections.slice(0, 4).map((block) => {
            const paragraph = block.replace(/\s+/g, ' ').trim();
            return smartTrim(paragraph, 420);
        }).filter(Boolean);
        const cta = `Comment if you want a template or send a DM—let's build this together.`;
        facebookContent.innerHTML = `
            <article class="facebook-card">
                ${paragraphs.map(p => `<p>${escapeHTML(p)}</p>`).join('')}
                <footer>💬 ${escapeHTML(cta)}</footer>
            </article>
        `;
        const totalLength = (paragraphs.join(' ') + cta).length;
        if (fbProgress) fbProgress.style.width = Math.min(100, Math.round((totalLength / FACEBOOK_SOFT_LIMIT) * 100)) + '%';
    };

    const formatForWhatsApp = (text) => {
        if (!whatsappContent) return;
        if (text.trim() === '') {
            renderPlaceholder(whatsappContent, 'Short-form WhatsApp copy appears here...', waProgress);
            return;
        }
        const sections = splitIntoSections(text);
        if (!sections.length) {
            renderPlaceholder(whatsappContent, 'Short-form WhatsApp copy appears here...', waProgress);
            return;
        }
        const paragraphs = sections.slice(0, 3).map((block) => {
            return smartTrim(block.replace(/\s+/g, ' ').trim(), 220);
        }).filter(Boolean);
        const closer = 'Reply if you want the swipe file or share it with your crew.';
        whatsappContent.innerHTML = `
            <div class="wa-bubble">
                ${paragraphs.map(p => `<p>${escapeHTML(p)}</p>`).join('')}
                <p class="wa-footer">🔗 ${escapeHTML(closer)}</p>
            </div>
        `;
        const waLength = (paragraphs.join(' ') + closer).length;
        if (waProgress) waProgress.style.width = Math.min(100, Math.round((waLength / WHATSAPP_SOFT_LIMIT) * 100)) + '%';
    };

    const wrapCanvasText = (ctx, text, maxWidth) => {
        if (!text) return [];
        const words = text.split(/\s+/).filter(Boolean);
        const lines = [];
        let line = '';
        words.forEach((word) => {
            const candidate = line ? `${line} ${word}` : word;
            if (ctx.measureText(candidate).width > maxWidth && line) {
                lines.push(line);
                line = word;
            } else {
                line = candidate;
            }
        });
        if (line) lines.push(line);
        return lines.length ? lines : (text ? [text] : []);
    };

    const downloadSlidesAsImages = () => {
        const proceed = () => {
            currentInstagramSlides.forEach((slide, index) => {
                const canvas = document.createElement('canvas');
                canvas.width = INSTAGRAM_CANVAS_SIZE;
                canvas.height = INSTAGRAM_CANVAS_SIZE;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = slide.theme.background;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const center = canvas.width / 2;
                const margin = 120;
                const gapBetween = 36;
                let titleFontSize = slide.title ? 80 : 0;
                let bodyFontSize = 52;
                const minTitleSize = 48;
                const minBodySize = 34;
                const maxContentHeight = canvas.height - 220;

                const computeLayout = () => {
                    const layout = {};
                    layout.titleFont = `600 ${titleFontSize}px ${slide.theme.titleFont}`;
                    layout.bodyFont = `400 ${bodyFontSize}px ${slide.theme.bodyFont}`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    const textWidth = canvas.width - margin * 2;
                    ctx.font = layout.titleFont;
                    layout.titleLines = slide.title ? wrapCanvasText(ctx, slide.title, textWidth) : [];
                    layout.titleLineHeight = Math.round(titleFontSize * 1.15);
                    ctx.font = layout.bodyFont;
                    layout.bodyLines = slide.body ? wrapCanvasText(ctx, slide.body, textWidth) : [];
                    layout.bodyLineHeight = Math.round(bodyFontSize * 1.3);
                    const gap = (layout.titleLines.length && layout.bodyLines.length) ? gapBetween : 0;
                    layout.totalHeight = (layout.titleLines.length * layout.titleLineHeight) + (layout.bodyLines.length * layout.bodyLineHeight) + gap;
                    layout.textWidth = textWidth;
                    return layout;
                };

                let layout = computeLayout();
                while (layout.totalHeight > maxContentHeight && bodyFontSize > minBodySize) {
                    bodyFontSize -= 4;
                    if (titleFontSize) titleFontSize = Math.max(minTitleSize, titleFontSize - 4);
                    layout = computeLayout();
                }

                let currentY = Math.max(margin, (canvas.height - layout.totalHeight) / 2);
                ctx.fillStyle = slide.theme.text;
                ctx.font = layout.titleFont;
                layout.titleLines.forEach((line) => {
                    ctx.fillText(line, center, currentY);
                    currentY += layout.titleLineHeight;
                });
                if (layout.titleLines.length && layout.bodyLines.length) currentY += gapBetween;

                ctx.font = layout.bodyFont;
                layout.bodyLines.forEach((line) => {
                    ctx.fillText(line, center, currentY);
                    currentY += layout.bodyLineHeight;
                });

                ctx.textAlign = 'left';
                ctx.fillStyle = slide.theme.accent || slide.theme.text;
                ctx.font = `600 44px ${slide.theme.bodyFont}`;
                ctx.fillText(`${index + 1}/${currentInstagramSlides.length}`, 48, 48);

                const link = document.createElement('a');
                link.href = canvas.toDataURL('image/png');
                link.download = `repurposerhub-slide-${index + 1}.png`;
                link.click();
            });
        };
        const fontReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
        fontReady.then(proceed).catch(proceed);
    };

    const setMainInputValue = (value) => {
        if (!mainInput) return;
        mainInput.value = value;
        updateAll(value);
        mainInput.focus();
    };

    // INPUT handling
    if (mainInput) {
        mainInput.addEventListener('input', debounce(() => updateAll(mainInput.value), 200));
        const existing = (() => { try { return localStorage.getItem('ucr_input') || ''; } catch { return ''; } })();
        if (existing) {
            mainInput.value = existing;
            updateAll(existing);
        } else {
            updateAll('');
        }
    }

    if (loadSampleBtn) {
        loadSampleBtn.addEventListener('click', () => setMainInputValue(SAMPLE_DRAFT));
    }

    if (clearInputBtn) {
        clearInputBtn.addEventListener('click', () => {
            setMainInputValue('');
            try { localStorage.removeItem(LS_KEY_INPUT); } catch {}
        });
    }

    if (emojiRefreshBtn) {
        emojiRefreshBtn.addEventListener('click', fetchRandomEmoji);
    }

    if (downloadInstagramBtn) {
        downloadInstagramBtn.addEventListener('click', () => {
            if (!currentInstagramSlides.length) {
                alert('Add some content above before downloading slides.');
                return;
            }
            downloadSlidesAsImages();
        });
    }

    // COPY actions (event delegation)
    document.body.addEventListener('click', (e) => {
        if (e.target.matches('.tweet-copy-button')) {
            const idx = e.target.getAttribute('data-tweet-index');
            const el = document.getElementById(`tweet-text-${idx}`);
            if (el) copyToClipboard(el.textContent, e.target);
        }
        if (e.target.id === 'copy-thread') {
            if (!twitterContent) return;
            const thread = Array.from(twitterContent.querySelectorAll('.tweet-content'))
                .map(el => el.textContent.trim())
                .filter(Boolean)
                .join('\n\n');
            copyToClipboard(thread, e.target);
        }
        if (e.target.id === 'copy-linkedin') {
            if (linkedinContent) copyToClipboard(linkedinContent.textContent, e.target);
        }
        if (e.target.id === 'copy-instagram') {
            if (!instagramContent) return;
            const txt = Array.from(instagramContent.querySelectorAll('.insta-slide .insta-title, .insta-slide .insta-body'))
                .map(el => el.textContent.trim())
                .join('\n');
            copyToClipboard(txt, e.target);
        }
        if (e.target.id === 'copy-facebook') {
            if (facebookContent) copyToClipboard(facebookContent.textContent, e.target);
        }
        if (e.target.id === 'copy-whatsapp') {
            if (whatsappContent) copyToClipboard(whatsappContent.textContent, e.target);
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
        if (!text || !text.trim()) {
            alert('Add some content before copying.');
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            const old = btn.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => { btn.textContent = old; }, 1200);
        }).catch(() => {
            alert('Copy failed. Your browser may block clipboard access.');
        });
    };

    const order = ['twitter','linkedin','instagram','facebook','whatsapp'];
    const tabArray = Array.from(tabs);
    const setActiveTab = (name, options = {}) => {
        tabArray.forEach((tab) => {
            const isActive = tab.dataset.tab === name;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
            tab.tabIndex = isActive ? 0 : -1;
            if (isActive && options.scroll !== false) {
                tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        });
        outputPanels.forEach((panel) => {
            const isActive = panel.id === `${name}-output`;
            panel.classList.toggle('active', isActive);
            panel.toggleAttribute('hidden', !isActive);
        });
    };
    const activeIndex = () => {
        const index = order.findIndex(k => document.getElementById(`${k}-output`)?.classList.contains('active'));
        return index >= 0 ? index : 0;
    };
    tabArray.forEach((tab) => {
        tab.addEventListener('click', () => setActiveTab(tab.dataset.tab));
        tab.addEventListener('keydown', (e) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
            e.preventDefault();
            const currentIndex = order.indexOf(tab.dataset.tab);
            let nextIndex = currentIndex >= 0 ? currentIndex : 0;
            if (e.key === 'ArrowLeft') nextIndex = Math.max(0, nextIndex - 1);
            if (e.key === 'ArrowRight') nextIndex = Math.min(order.length - 1, nextIndex + 1);
            if (e.key === 'Home') nextIndex = 0;
            if (e.key === 'End') nextIndex = order.length - 1;
            const nextName = order[nextIndex];
            setActiveTab(nextName);
            tabArray.find(t => t.dataset.tab === nextName)?.focus();
        });
    });
    if (tabArray.length) {
        setActiveTab(document.querySelector('.tab.active')?.dataset.tab || order[0], { scroll: false });
    }

    let startX=0, startY=0, touching=false;
    const panelsContainer = document.querySelector('.output-section');

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

    // Theme toggle + Year (shared)
    const setTheme = (mode) => {
        document.documentElement.setAttribute('data-theme', mode);
        try { localStorage.setItem('ucr_theme', mode); } catch {}
        if (themeToggle) {
            themeToggle.setAttribute('aria-pressed', String(mode === 'dark'));
            themeToggle.textContent = mode === 'dark' ? '☀️' : '🌙';
        }
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', mode === 'dark' ? '#0f1115' : '#ffffff');
    };
    const initialTheme = (() => {
        try { const s = localStorage.getItem('ucr_theme'); if (s) return s; } catch {}
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    })();
    setTheme(initialTheme);
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') || 'light';
            setTheme(current === 'light' ? 'dark' : 'light');
        });
    }

    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});
