(() => {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const STORE = {
    draft: "rh_draft_v2",
    settings: "rh_settings_v2",
    theme: "rh_theme_v2",
    consent: "rh_consent_v2"
  };
  const SAMPLE = `You do not need more content ideas
Most creators already have enough useful ideas hidden inside old videos, notes, conversations and unfinished drafts.

The real problem is distribution. A strong idea gets posted once, disappears, and then the creator starts from zero again.

A better system is to take one useful message, adapt it to the way people read on each platform, and publish it across the week.

Repurposing should keep the meaning consistent while changing the hook, structure, length and call to action for each audience.`;
  const STOP = new Set("a an and are as at be been but by can could did do does for from had has have he her here him his how i if in into is it its just me more most my no nor not of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who why will with would you your".split(" "));
  const META = {
    twitter: ["X thread", "Short, punchy and easy to scan", "𝕏"],
    linkedin: ["LinkedIn post", "Professional, insight-led and skimmable", "in"],
    instagram: ["Instagram caption", "Visual, conversational and save-worthy", "◎"],
    facebook: ["Facebook post", "Warm, contextual and community-friendly", "f"],
    whatsapp: ["WhatsApp update", "Direct, personal and easy to forward", "◉"]
  };
  const state = { length: "medium", emoji: "light", variation: 0, active: "twitter", outputs: {} };
  const el = {
    input: $("#main-input"), goal: $("#goal"), tone: $("#tone"), audience: $("#audience"),
    cta: $("#cta"), hashtags: $("#hashtags"), results: $("#results"),
    editor: $("#output-editor"), title: $("#output-title"), hint: $("#output-hint"),
    icon: $("#output-icon"), count: $("#output-count"), grid: $("#all-output-grid"),
    words: $("#word-count"), chars: $("#char-count"), read: $("#read-time"),
    status: $("#draft-status"), toast: $("#toast"), theme: $("#theme-toggle"),
    consent: $("#consent-banner")
  };

  const get = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const set = (key, value) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };
  const debounce = (fn, wait = 250) => { let id; return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), wait); }; };
  const clean = value => value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const sentences = value => (value.replace(/\n+/g, " ").match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []).map(v => v.trim()).filter(Boolean);
  const cap = value => value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
  const noEnd = value => value.trim().replace(/[.!?]+$/, "");
  const end = value => value && !/[.!?]$/.test(value.trim()) ? `${value.trim()}.` : value.trim();
  const trim = (value, max) => {
    const text = value.trim();
    if (text.length <= max) return text;
    const part = text.slice(0, max - 1);
    const cut = part.lastIndexOf(" ");
    return `${part.slice(0, cut > max * .55 ? cut : max - 1).trim()}…`;
  };
  const rotate = (items, n) => items.length ? [...items.slice(n % items.length), ...items.slice(0, n % items.length)] : [];
  const titleCase = value => value.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());

  function toast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("is-visible");
    clearTimeout(toast.id);
    toast.id = setTimeout(() => el.toast.classList.remove("is-visible"), 2100);
  }

  function parse(value) {
    const text = clean(value);
    const lines = text.split("\n").map(v => v.trim()).filter(Boolean);
    const first = lines[0] || "";
    const titleLike = first.length <= 90 && lines.length > 1 && !/[.!?]$/.test(first) && first.split(/\s+/).length <= 12;
    const body = titleLike ? lines.slice(1).join(" ") : text.replace(/\n+/g, " ");
    return { text, title: titleLike ? first : "", body, sentences: sentences(body) };
  }

  function keywords(value, count = 8) {
    const freq = new Map();
    (value.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || []).forEach(word => {
      if (!STOP.has(word) && word.length > 3) freq.set(word, (freq.get(word) || 0) + 1);
    });
    return [...freq].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, count).map(([word]) => word);
  }

  function rank(items, keys) {
    return items.map((sentence, index) => {
      const lower = sentence.toLowerCase();
      let score = Math.max(0, 4 - index * .35);
      keys.forEach(key => { if (lower.includes(key)) score += 2; });
      if (sentence.length >= 45 && sentence.length <= 180) score += 1.5;
      if (/\b(problem|solution|because|better|important|need|should|can|means)\b/i.test(sentence)) score += 1;
      return [cap(sentence), score];
    }).sort((a, b) => b[1] - a[1]).map(([sentence]) => sentence);
  }

  function settings() {
    return {
      goal: el.goal.value, tone: el.tone.value, audience: el.audience.value.trim(),
      cta: el.cta.value.trim(), hashtags: el.hashtags.checked,
      length: state.length, emoji: state.emoji
    };
  }

  function hook(source, opts, keys, variation) {
    const subject = source.title || keys.slice(0, 2).join(" and ") || "this idea";
    const tail = opts.audience ? ` for ${opts.audience}` : "";
    const options = {
      educate: [`Most people misunderstand ${subject}.`, `Here is a simpler way to think about ${subject}.`, `${titleCase(subject)} becomes easier when you focus on the right thing.`, `A useful lesson about ${subject}${tail}:`],
      promote: [`${titleCase(subject)} should not feel this difficult.`, `A better way to handle ${subject}${tail}.`, `Stop losing time on ${subject}.`, `You can get more from ${subject} without starting again.`],
      announce: [`Something new is happening with ${subject}.`, `We are making ${subject} easier.`, `A new chapter for ${subject} starts here.`, `Here is what is changing with ${subject}.`],
      engage: [`What is the hardest part of ${subject} for you?`, `Is ${subject} actually the problem—or is it the system around it?`, `Let us talk honestly about ${subject}.`, `How do you currently approach ${subject}${tail}?`],
      story: [`I kept noticing the same problem with ${subject}.`, `This started with a simple frustration about ${subject}.`, `For a long time, ${subject} felt harder than it needed to be.`, `There is a story behind the way I now approach ${subject}.`]
    };
    let value = rotate(options[opts.goal] || options.educate, variation)[0];
    if (opts.tone === "bold") value = `Forget the usual advice. ${value}`;
    if (opts.tone === "casual") value = `Quick thought: ${value[0].toLowerCase()}${value.slice(1)}`;
    if (opts.tone === "friendly") value = `A friendly reminder: ${value[0].toLowerCase()}${value.slice(1)}`;
    if (opts.tone === "inspiring") value = `You can make ${subject} work harder for you.`;
    return trim(value, 180);
  }

  function emoji(opts, type = "point") {
    if (opts.emoji === "none") return "";
    const map = { point: opts.emoji === "more" ? "👉" : "•", check: opts.emoji === "more" ? "✅" : "•", spark: "✨" };
    return map[type] || "";
  }

  function tags(keys, platform) {
    const limits = { twitter: 2, linkedin: 4, instagram: 7, facebook: 3, whatsapp: 0 };
    return keys.slice(0, limits[platform] || 0).map(k => `#${k.replace(/[^a-z0-9]/gi, "")}`).join(" ");
  }

  function callToAction(opts, platform) {
    if (opts.cta) return end(opts.cta);
    if (platform === "whatsapp") return opts.goal === "engage" ? "What do you think?" : "Feel free to share this with someone who needs it.";
    return ({
      educate: "Save this and use it the next time you create content.",
      promote: "Try this approach and see what changes.",
      announce: "Take a look and tell me what you think.",
      engage: "What would you add to this?",
      story: "Has something similar happened to you?"
    })[opts.goal] || "What do you think?";
  }

  function chosen(items, length) {
    return items.slice(0, ({ short: 2, medium: 3, long: 5 })[length] || 3);
  }

  function thread(parts) {
    const chunks = [];
    parts.forEach(part => {
      if (part.length <= 255) return chunks.push(part);
      sentences(part).forEach(sentence => chunks.push(trim(sentence, 255)));
    });
    return chunks.map((chunk, i) => `${i + 1}/${chunks.length} ${chunk}`).join("\n\n");
  }

  function build(value, opts, variation) {
    const source = parse(value);
    const keys = keywords(source.body);
    const points = chosen(rotate(rank(source.sentences, keys), variation), opts.length);
    const opening = hook(source, opts, keys, variation);
    const bullet = emoji(opts, "point");
    const addTags = platform => opts.hashtags ? tags(keys, platform) : "";

    const twitterParts = [
      opening,
      ...points.map(point => `${bullet} ${trim(noEnd(point), 220)}.`),
      [callToAction(opts, "twitter"), addTags("twitter")].filter(Boolean).join("\n\n")
    ];
    const twitter = opts.length === "short" ? trim(twitterParts.join("\n\n"), 275) : thread(twitterParts);

    const linkedin = [
      opening,
      opts.audience ? `This matters especially for ${opts.audience}.` : "The idea is simple, but the way you apply it matters.",
      points.map(point => `${bullet} ${trim(noEnd(point), 230)}`).join("\n\n"),
      callToAction(opts, "linkedin"),
      addTags("linkedin")
    ].filter(Boolean).join("\n\n");

    const instagram = [
      `${emoji(opts, "spark")} ${opening}`.trim(),
      points.map(point => `${emoji(opts, "check")} ${trim(noEnd(point), 190)}`).join("\n"),
      opts.goal === "educate" ? "Save this for the next time you are planning content." : callToAction(opts, "instagram"),
      addTags("instagram")
    ].filter(Boolean).join("\n\n");

    const facebook = [
      opening,
      points.map(end).join("\n\n"),
      callToAction(opts, "facebook"),
      addTags("facebook")
    ].filter(Boolean).join("\n\n");

    const whatsapp = [
      `*${noEnd(opening)}*`,
      points.map(point => `${bullet} ${trim(noEnd(point), 150)}`).join("\n"),
      callToAction(opts, "whatsapp")
    ].filter(Boolean).join("\n\n");

    return { twitter, linkedin, instagram, facebook, whatsapp };
  }

  function valid() {
    const value = clean(el.input.value);
    if (!value) { toast("Add some source content first."); el.input.focus(); return false; }
    if (value.length < 35) { toast("Add a little more detail for stronger results."); el.input.focus(); return false; }
    return true;
  }

  function generate(scroll = true) {
    if (!valid()) return;
    state.outputs = build(el.input.value, settings(), state.variation);
    el.results.hidden = false;
    render();
    renderCards();
    saveSettings();
    track("generate_content_pack", { goal: el.goal.value, tone: el.tone.value, length: state.length });
    if (scroll) el.results.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function render() {
    const platform = state.active;
    const [title, hint, icon] = META[platform];
    const output = state.outputs[platform] || "";
    el.title.textContent = title;
    el.hint.textContent = hint;
    el.icon.textContent = icon;
    el.editor.value = output;
    el.count.textContent = `${output.length.toLocaleString()} characters`;
    $$(".platform-tab").forEach(tab => {
      const active = tab.dataset.platform === platform;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
    });
  }

  function renderCards() {
    el.grid.replaceChildren();
    Object.entries(META).forEach(([platform, meta]) => {
      if (platform === state.active) return;
      const card = document.createElement("article");
      card.className = "output-card";
      const top = document.createElement("div");
      top.className = "output-card__top";
      const strong = document.createElement("strong");
      strong.textContent = meta[0];
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Open";
      button.addEventListener("click", () => {
        state.active = platform;
        render();
        renderCards();
        el.results.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      const preview = document.createElement("p");
      preview.textContent = state.outputs[platform] || "";
      top.append(strong, button);
      card.append(top, preview);
      el.grid.append(card);
    });
  }

  function updateStats() {
    const text = el.input.value;
    const words = (text.trim().match(/\S+/g) || []).length;
    el.words.textContent = words.toLocaleString();
    el.chars.textContent = text.length.toLocaleString();
    el.read.textContent = words ? Math.max(1, Math.ceil(words / 200)) : 0;
  }

  const saveDraft = debounce(() => {
    el.status.textContent = set(STORE.draft, el.input.value) ? "Saved on this device" : "Could not save locally";
  }, 350);

  function saveSettings() {
    set(STORE.settings, JSON.stringify(settings()));
  }

  function syncSegments() {
    $$("[data-setting]").forEach(button => {
      button.classList.toggle("is-active", state[button.dataset.setting] === button.dataset.value);
    });
  }

  function restore() {
    el.input.value = get(STORE.draft) || "";
    try {
      const saved = JSON.parse(get(STORE.settings) || "{}");
      if (saved.goal) el.goal.value = saved.goal;
      if (saved.tone) el.tone.value = saved.tone;
      if (typeof saved.audience === "string") el.audience.value = saved.audience;
      if (typeof saved.cta === "string") el.cta.value = saved.cta;
      if (typeof saved.hashtags === "boolean") el.hashtags.checked = saved.hashtags;
      if (saved.length) state.length = saved.length;
      if (saved.emoji) state.emoji = saved.emoji;
    } catch {}
    syncSegments();
    updateStats();
  }

  async function copy(value) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const field = document.createElement("textarea");
      field.value = value;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.append(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    toast(`${META[state.active][0]} copied.`);
    track("copy_output", { platform: state.active });
  }

  function download() {
    const value = Object.entries(META).map(([platform, meta]) =>
      `${meta[0].toUpperCase()}\n${"=".repeat(meta[0].length)}\n\n${state.outputs[platform] || ""}`
    ).join("\n\n\n");
    const url = URL.createObjectURL(new Blob([value], { type: "text/plain;charset=utf-8" }));
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: `repurposerhub-content-pack-${new Date().toISOString().slice(0, 10)}.txt`
    });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast("Content pack downloaded.");
    track("download_content_pack");
  }

  function applyTheme(value) {
    const theme = value === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    el.theme.textContent = theme === "dark" ? "☀" : "☾";
    el.theme.setAttribute("aria-pressed", String(theme === "dark"));
    el.theme.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    $('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0e0f18" : "#5b5cf0");
    set(STORE.theme, theme);
  }

  function loadOptionalScripts() {
    const config = window.SITE || {};
    if (config.GA_MEASUREMENT_ID && !window.__rhAnalytics) {
      window.__rhAnalytics = true;
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.GA_MEASUREMENT_ID)}`;
      document.head.append(script);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", config.GA_MEASUREMENT_ID, { anonymize_ip: true });
    }
    if (config.ADSENSE_PUB_ID && !window.__rhAds) {
      window.__rhAds = true;
      const script = document.createElement("script");
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.ADSENSE_PUB_ID)}`;
      script.onload = () => $$(".ad-slot").forEach(slot => {
        if (!slot.dataset.loaded) {
          slot.dataset.loaded = "true";
          try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
        }
      });
      document.head.append(script);
    }
  }

  function consent(value) {
    set(STORE.consent, value);
    el.consent.classList.remove("is-visible");
    if (value === "accepted") loadOptionalScripts();
  }

  function track(name, params = {}) {
    if (get(STORE.consent) === "accepted" && typeof window.gtag === "function") window.gtag("event", name, params);
  }

  function bind() {
    el.input.addEventListener("input", () => {
      updateStats();
      el.status.textContent = "Saving…";
      saveDraft();
    });
    $("#generate").addEventListener("click", () => { state.variation = 0; generate(); });
    $("#load-sample").addEventListener("click", () => {
      el.input.value = SAMPLE; updateStats(); saveDraft(); state.variation = 0; toast("Sample loaded."); el.input.focus();
    });
    $("#hero-sample").addEventListener("click", () => {
      el.input.value = SAMPLE; updateStats(); saveDraft();
      $("#workspace").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => generate(false), 400);
    });
    $("#clear-input").addEventListener("click", () => {
      el.input.value = ""; updateStats(); saveDraft(); el.results.hidden = true; el.input.focus();
    });
    $("#reset-settings").addEventListener("click", () => {
      el.goal.value = "educate"; el.tone.value = "professional"; el.audience.value = "";
      el.cta.value = ""; el.hashtags.checked = true; state.length = "medium"; state.emoji = "light";
      state.variation = 0; syncSegments(); saveSettings(); toast("Settings reset.");
    });
    $$("[data-setting]").forEach(button => button.addEventListener("click", () => {
      state[button.dataset.setting] = button.dataset.value; syncSegments(); saveSettings();
    }));
    [el.goal, el.tone, el.audience, el.cta, el.hashtags].forEach(control => {
      control.addEventListener("change", saveSettings);
      control.addEventListener("input", saveSettings);
    });
    $$(".platform-tab").forEach(tab => tab.addEventListener("click", () => {
      state.outputs[state.active] = el.editor.value;
      state.active = tab.dataset.platform;
      render(); renderCards();
    }));
    el.editor.addEventListener("input", () => {
      state.outputs[state.active] = el.editor.value;
      el.count.textContent = `${el.editor.value.length.toLocaleString()} characters`;
      renderCards();
    });
    $("#copy-output").addEventListener("click", () => copy(el.editor.value));
    $("#new-variation").addEventListener("click", () => {
      state.variation += 1; generate(false); toast(`Variation ${state.variation + 1} generated.`);
    });
    $("#download-all").addEventListener("click", download);
    el.theme.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
    $("#consent-accept").addEventListener("click", () => consent("accepted"));
    $("#consent-decline").addEventListener("click", () => consent("declined"));
    $("#manage-consent").addEventListener("click", () => el.consent.classList.add("is-visible"));
    document.addEventListener("keydown", event => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault(); state.variation = 0; generate();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    $("#year").textContent = new Date().getFullYear();
    const preferred = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    applyTheme(get(STORE.theme) || preferred);
    restore();
    const choice = get(STORE.consent);
    if (choice === "accepted") loadOptionalScripts();
    else if (!choice) el.consent.classList.add("is-visible");
    bind();
  });
})();