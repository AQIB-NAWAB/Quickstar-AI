/* QuickStart AI website chat widget. Configure with data-* attributes on this script. */
(() => {
  const script = document.currentScript;
  if (!(script instanceof HTMLScriptElement)) return;

  const gatewayUrl = (script.dataset.gatewayUrl || "").replace(/\/$/, "");
  const publishableKey = script.dataset.publishableKey || "";
  const agentId = script.dataset.agentId || "";
  const title = script.dataset.title || "Chat with us";
  const requestedAccent = script.dataset.color || "#f15a24";
  const accent = CSS.supports("color", requestedAccent) ? requestedAccent : "#f15a24";
  if (!gatewayUrl || !publishableKey) {
    console.error("QuickStart widget requires data-gateway-url and data-publishable-key.");
    return;
  }

  const storagePrefix = `quickstart-widget:${location.origin}:${publishableKey}:`;
  const storage = {
    get(name) {
      try {
        return localStorage.getItem(storagePrefix + name);
      } catch {
        return null;
      }
    },
    set(name, value) {
      try {
        localStorage.setItem(storagePrefix + name, value);
      } catch {
        /* Keep this session usable without storage. */
      }
    },
    remove(name) {
      try {
        localStorage.removeItem(storagePrefix + name);
      } catch {
        /* Storage may be disabled. */
      }
    },
  };
  let visitorId = storage.get("visitor") || crypto.randomUUID();
  storage.set("visitor", visitorId);
  let conversationId = storage.get("conversation");
  let initialized = false;
  let busy = false;
  let pendingRequest = null;
  let lastSeq = 0;
  let pollTimer = null;
  const seenIds = new Set();
  /** True while a local turn is in flight (stream + typewriter). Poll must not duplicate UI. */
  let outboundTurnActive = false;
  let activeAssistantBubble = null;
  let voiceStream = null;
  let voicePlayback = null;
  let voiceAudioContext = null;
  let voiceSource = null;
  let voiceProcessor = null;
  let voiceLiveActive = false;
  let voiceSessionId = null;
  let voiceStreamAbort = null;
  let voicePcmPending = [];
  let voiceSendTimer = null;
  let voiceAudioQueue = [];
  let voiceAudioPlaying = false;
  let voiceLiveAssistantBubble = null;
  let voiceLiveUserShown = "";
  let voiceMicMuted = false;

  const host = document.createElement("div");
  host.setAttribute("data-quickstart-widget", "");
  document.body.append(host);
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; --qs-accent: ${accent}; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #171717; }
    * { box-sizing: border-box; }
    .launcher { position: fixed; z-index: 2147483000; right: 24px; bottom: 24px; width: 60px; height: 60px; border: 0; border-radius: 50%; background: var(--qs-accent); color: white; box-shadow: 0 8px 28px #0003; cursor: pointer; font-size: 25px; }
    .panel { position: fixed; z-index: 2147483000; right: 24px; bottom: 96px; width: min(380px, calc(100vw - 32px)); height: min(560px, calc(100dvh - 128px)); display: none; flex-direction: column; overflow: hidden; border: 1px solid #e5e5e5; border-radius: 18px; background: #fff; box-shadow: 0 16px 55px #0002; }
    .panel.open { display: flex; }
    .header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; background: var(--qs-accent); color: white; }
    .title { margin: 0; font-size: 15px; font-weight: 650; }
    .close { border: 0; background: transparent; color: white; cursor: pointer; font-size: 23px; line-height: 1; }
    .messages { flex: 1; overflow: auto; display: flex; flex-direction: column; gap: 10px; padding: 16px; background: #fafafa; }
    .voice-stage { display: none; }
    .panel.voice-live .messages { display: none; }
    .panel.voice-live .voice-stage {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 28px 24px;
      background: #fafafa;
      text-align: center;
    }
    .voice-wave {
      width: min(320px, 94%);
      height: 112px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 12px 10px;
      border-radius: 28px;
      background: radial-gradient(ellipse at center, color-mix(in srgb, var(--qs-accent) 16%, transparent), transparent 72%);
    }
    .voice-wave i {
      display: block;
      width: 6px;
      height: 88px;
      border-radius: 999px;
      background: var(--qs-accent);
      transform: scaleY(0.1);
      transform-origin: center center;
      opacity: 0.92;
      will-change: transform;
    }
    .voice-stage.speaking .voice-wave i { opacity: 1; }
    .voice-person { display: none; flex-direction: column; align-items: center; gap: 8px; }
    .voice-stage.with-person .voice-wave { display: none; }
    .voice-stage.with-person .voice-person { display: flex; }
    .voice-avatar {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--qs-accent);
      color: #fff;
      font-size: 40px;
      font-weight: 680;
      letter-spacing: 0.02em;
      box-shadow: 0 0 0 calc(8px + var(--person-level, 0) * 14px) color-mix(in srgb, var(--qs-accent) 32%, transparent);
    }
    .voice-person strong { font-size: 18px; font-weight: 680; color: #171717; }
    .voice-person em { font-style: normal; color: #737373; font-size: 13px; }
    .voice-stage h3 { margin: 0; font-size: 16px; font-weight: 650; color: #171717; }
    .voice-stage p { margin: 0; max-width: 240px; color: #737373; font-size: 13px; line-height: 1.45; }
    .panel.voice-live .voice-stage h3,
    .panel.voice-live .voice-stage > p,
    .voice-stage.with-person .voice-person em { display: none; }
    .panel.voice-live .form { display: none; }
    .message { max-width: 85%; overflow-wrap: anywhere; padding: 10px 12px; border-radius: 14px; font-size: 14px; line-height: 1.45; }
    .message.user { align-self: flex-end; border-bottom-right-radius: 4px; background: var(--qs-accent); color: white; white-space: pre-wrap; }
    .message.assistant, .message.human { align-self: flex-start; border-bottom-left-radius: 4px; background: white; border: 1px solid #e8e8e8; }
    .message.assistant p, .message.human p { margin: 0 0 8px; }
    .message.assistant p:last-child, .message.human p:last-child { margin-bottom: 0; }
    .message.assistant ul, .message.assistant ol, .message.human ul, .message.human ol { margin: 0 0 8px; padding-left: 1.2em; }
    .message.assistant li, .message.human li { margin: 0 0 6px; }
    .message.assistant li:last-child, .message.human li:last-child { margin-bottom: 0; }
    .message.assistant h3, .message.assistant h4, .message.assistant h5, .message.human h3, .message.human h4, .message.human h5 { margin: 0 0 6px; font-size: 14px; line-height: 1.35; }
    .message.assistant strong, .message.human strong { font-weight: 650; }
    .message.assistant a, .message.human a { color: var(--qs-accent); }
    .message.assistant code, .message.human code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; background: #f3f3f3; padding: 1px 4px; border-radius: 4px; }
    .message.assistant pre, .message.human pre { margin: 0 0 8px; padding: 8px; overflow: auto; border-radius: 8px; background: #f3f3f3; }
    .message.assistant pre code, .message.human pre code { background: transparent; padding: 0; }
    .message.assistant.is-streaming { white-space: pre-wrap; color: #404040; }
    .message.assistant.is-streaming::after {
      content: "▍";
      display: inline-block;
      margin-left: 2px;
      color: var(--qs-accent);
      animation: qs-blink 1s step-end infinite;
    }
    @keyframes qs-blink { 50% { opacity: 0; } }
    .message.system { align-self: center; color: #737373; font-size: 12px; }
    .status { min-height: 18px; padding: 0 16px 8px; color: #737373; font-size: 12px; }
    .gate { display: none; flex: 1; flex-direction: column; justify-content: center; gap: 14px; padding: 22px 18px; background: #fafafa; }
    .panel.needs-intro .messages,
    .panel.needs-intro .voice-stage,
    .panel.needs-intro .status,
    .panel.needs-intro .form,
    .panel.needs-intro .hangup-bar { display: none; }
    .panel.needs-intro .gate { display: flex; }
    .gate h3 { margin: 0; font-size: 16px; font-weight: 650; color: #171717; }
    .gate p { margin: 0; color: #737373; font-size: 13px; line-height: 1.45; }
    .gate label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 650; color: #404040; }
    .gate input { border: 1px solid #ddd; border-radius: 12px; padding: 10px 12px; color: #171717; background: #fff; font: inherit; font-size: 14px; font-weight: 450; outline: none; }
    .gate input:focus { border-color: var(--qs-accent); }
    .gate .start { border: 0; border-radius: 12px; background: var(--qs-accent); color: #fff; padding: 11px 14px; font: inherit; font-size: 14px; font-weight: 650; cursor: pointer; }
    .gate .gate-error { min-height: 16px; color: #b42318; font-size: 12px; }
    .form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #eee; background: white; }
    .hangup-bar { display: none; justify-content: center; align-items: center; gap: 20px; padding: 16px 12px 18px; border-top: 1px solid #eee; background: #fff; }
    .panel.voice-live .hangup-bar { display: flex; }
    .call-btn {
      width: 52px;
      height: 52px;
      border: 0;
      border-radius: 50%;
      padding: 0;
      background: var(--qs-accent);
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px color-mix(in srgb, var(--qs-accent) 35%, transparent);
    }
    .call-btn svg { width: 24px; height: 24px; display: block; }
    .call-btn.mute {
      background: #fff;
      color: var(--qs-accent);
      border: 1.5px solid color-mix(in srgb, var(--qs-accent) 45%, #fff);
      box-shadow: none;
    }
    .call-btn .icon-off { display: none; }
    .call-btn.muted .icon-on { display: none; }
    .call-btn.muted .icon-off { display: block; }
    .input { flex: 1; min-width: 0; resize: none; max-height: 96px; border: 1px solid #ddd; border-radius: 12px; padding: 10px 12px; color: #171717; background: #fff; font: inherit; font-size: 14px; outline: none; }
    .input:focus { border-color: var(--qs-accent); }
    .send { width: 42px; border: 0; border-radius: 12px; background: var(--qs-accent); color: white; cursor: pointer; font-size: 18px; flex-shrink: 0; }
    .mic-wrap {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 3px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--qs-accent) 14%, #fff);
      border: 1px solid color-mix(in srgb, var(--qs-accent) 28%, #e8e8e8);
    }
    .mic {
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 50%;
      padding: 0;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--qs-accent);
      color: #fff;
      cursor: pointer;
      box-shadow: 0 2px 8px color-mix(in srgb, var(--qs-accent) 35%, transparent);
    }
    .mic .mic-icon { width: 22px; height: 22px; display: block; }
    .mic.live {
      background: color-mix(in srgb, var(--qs-accent) 88%, #000);
      box-shadow: 0 0 0 calc(3px + var(--mic-level, 0) * 6px) color-mix(in srgb, var(--qs-accent) 45%, transparent);
      animation: qs-pulse 1.2s ease-in-out infinite;
    }
    .mic-wrap.live { border-color: color-mix(in srgb, var(--qs-accent) 55%, #e8e8e8); }
    @keyframes qs-pulse { 50% { opacity: .75; } }
    button:disabled { opacity: .55; cursor: wait; }
    @media (max-width: 480px) { .launcher { right: 16px; bottom: 16px; } .panel { right: 8px; bottom: 84px; width: calc(100vw - 16px); height: min(620px, calc(100dvh - 100px)); } }
  `;
  root.append(style);

  const panel = document.createElement("section");
  panel.className = "panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", title);
  const header = document.createElement("header");
  header.className = "header";
  const heading = document.createElement("h2");
  heading.className = "title";
  heading.textContent = title;
  const close = document.createElement("button");
  close.className = "close";
  close.type = "button";
  close.setAttribute("aria-label", "Close chat");
  close.textContent = "×";
  header.append(heading, close);
  const messages = document.createElement("div");
  messages.className = "messages";
  messages.setAttribute("aria-live", "polite");
  const voiceStage = document.createElement("div");
  voiceStage.className = "voice-stage";
  const voiceWave = document.createElement("div");
  voiceWave.className = "voice-wave";
  voiceWave.setAttribute("aria-hidden", "true");
  const VOICE_BARS = 29;
  const voiceWaveBars = [];
  for (let i = 0; i < VOICE_BARS; i++) {
    const bar = document.createElement("i");
    voiceWave.append(bar);
    voiceWaveBars.push(bar);
  }
  const voicePerson = document.createElement("div");
  voicePerson.className = "voice-person";
  const voiceAvatar = document.createElement("div");
  voiceAvatar.className = "voice-avatar";
  voiceAvatar.textContent = "T";
  const voicePersonName = document.createElement("strong");
  const voicePersonRole = document.createElement("em");
  voicePerson.append(voiceAvatar, voicePersonName, voicePersonRole);
  const voiceTitle = document.createElement("h3");
  voiceTitle.textContent = "Voice conversation";
  const voiceHint = document.createElement("p");
  voiceHint.textContent = "Speak naturally. The reply plays as audio and is saved with this chat.";
  voiceStage.append(voiceWave, voicePerson, voiceTitle, voiceHint);

  function personInitials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
    const letters = parts.map((part) => part[0].toUpperCase()).join("");
    return letters || "T";
  }

  function showVoicePerson(name) {
    const label = name && name.trim() ? name.trim() : "Teammate";
    voiceStage.classList.add("with-person");
    voiceAvatar.textContent = personInitials(label);
    voicePersonName.textContent = label;
    voicePersonRole.textContent = "";
    status.textContent = "";
  }

  function hideVoicePerson() {
    voiceStage.classList.remove("with-person");
    voiceAvatar.style.setProperty("--person-level", "0");
    voiceTitle.textContent = "Voice conversation";
    voiceHint.textContent = "Speak naturally. The reply plays as audio and is saved with this chat.";
  }
  const status = document.createElement("div");
  status.className = "status";
  status.setAttribute("role", "status");
  const form = document.createElement("form");
  form.className = "form";
  const input = document.createElement("textarea");
  input.className = "input";
  input.rows = 1;
  input.maxLength = 4000;
  input.placeholder = "Write a message…";
  input.setAttribute("aria-label", "Your message");
  const micWrap = document.createElement("div");
  micWrap.className = "mic-wrap";
  micWrap.hidden = !navigator.mediaDevices?.getUserMedia;
  const mic = document.createElement("button");
  mic.className = "mic";
  mic.type = "button";
  mic.setAttribute("aria-label", "Start voice chat");
  mic.innerHTML = `<svg class="mic-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="3.5" y="10" width="2.4" height="4" rx="1.2" fill="currentColor"/>
    <rect x="7.3" y="7.5" width="2.4" height="9" rx="1.2" fill="currentColor"/>
    <rect x="11" y="4.5" width="2.4" height="15" rx="1.2" fill="currentColor"/>
    <rect x="14.7" y="7.5" width="2.4" height="9" rx="1.2" fill="currentColor"/>
    <rect x="18.1" y="10" width="2.4" height="4" rx="1.2" fill="currentColor"/>
  </svg>`;
  micWrap.append(mic);
  const send = document.createElement("button");
  send.className = "send";
  send.type = "submit";
  send.setAttribute("aria-label", "Send message");
  send.textContent = "➤";
  form.append(input, micWrap, send);
  const hangupBar = document.createElement("div");
  hangupBar.className = "hangup-bar";
  const muteBtn = document.createElement("button");
  muteBtn.className = "call-btn mute";
  muteBtn.type = "button";
  muteBtn.setAttribute("aria-label", "Mute microphone");
  muteBtn.setAttribute("aria-pressed", "false");
  muteBtn.innerHTML = `<svg class="icon-on" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg><svg class="icon-off" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V6a3 3 0 0 0-6 0v.18l5.98 5.99zM4.27 3 3 4.27l6.01 6.01V11a3 3 0 0 0 4.15 2.77l1.45 1.45A5.9 5.9 0 0 1 12 16c-2.76 0-5.3-2.1-5.3-5H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></svg>`;
  const hangup = document.createElement("button");
  hangup.className = "call-btn hangup";
  hangup.type = "button";
  hangup.setAttribute("aria-label", "Hang up");
  hangup.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.996.996 0 0 1-.29-.71c0-.28.11-.53.29-.71C3.18 8.86 7.4 7 12 7s8.82 1.86 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
  </svg>`;
  hangupBar.append(muteBtn, hangup);
  const gate = document.createElement("form");
  gate.className = "gate";
  gate.innerHTML = `
    <h3>Before we start</h3>
    <p>Add your name and email so the team knows who they are talking with.</p>
    <label>Name<input class="gate-name" name="name" type="text" autocomplete="name" maxlength="80" required placeholder="Your name" /></label>
    <label>Email<input class="gate-email" name="email" type="email" autocomplete="email" maxlength="120" required placeholder="you@example.com" /></label>
    <p class="gate-error" role="alert"></p>
    <button class="start" type="submit">Start chat</button>
  `;
  const gateName = gate.querySelector(".gate-name");
  const gateEmail = gate.querySelector(".gate-email");
  const gateError = gate.querySelector(".gate-error");
  panel.append(header, gate, messages, voiceStage, status, form, hangupBar);
  const launcher = document.createElement("button");
  launcher.className = "launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.setAttribute("aria-expanded", "false");
  launcher.textContent = "✦";
  root.append(panel, launcher);

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderInline(escaped) {
    return escaped
      .replace(/`([^`\n]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  }

  function renderMarkdown(source) {
    const lines = String(source || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let paragraph = [];
    let index = 0;

    function flushParagraph() {
      if (!paragraph.length) return;
      html.push(`<p>${renderInline(escapeHtml(paragraph.join("\n"))).replace(/\n/g, "<br>")}</p>`);
      paragraph = [];
    }

    while (index < lines.length) {
      const line = lines[index];
      if (line.startsWith("```")) {
        flushParagraph();
        const code = [];
        index += 1;
        while (index < lines.length && !lines[index].startsWith("```")) {
          code.push(lines[index]);
          index += 1;
        }
        html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        if (index < lines.length) index += 1;
        continue;
      }

      const heading = /^(#{1,3})\s+(.+)$/.exec(line);
      if (heading) {
        flushParagraph();
        const level = heading[1].length + 2;
        html.push(`<h${level}>${renderInline(escapeHtml(heading[2]))}</h${level}>`);
        index += 1;
        continue;
      }

      const ordered = /^\d+\.\s+(.+)$/.exec(line);
      const unordered = /^[-*]\s+(.+)$/.exec(line);
      if (ordered || unordered) {
        flushParagraph();
        const tag = ordered ? "ol" : "ul";
        const pattern = ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/;
        const items = [];
        while (index < lines.length) {
          const match = pattern.exec(lines[index]);
          if (!match) break;
          items.push(`<li>${renderInline(escapeHtml(match[1]))}</li>`);
          index += 1;
        }
        html.push(`<${tag}>${items.join("")}</${tag}>`);
        continue;
      }

      if (!line.trim()) {
        flushParagraph();
        index += 1;
        continue;
      }

      paragraph.push(line);
      index += 1;
    }

    flushParagraph();
    return html.join("");
  }

  const STREAM_CHAR_MS = 24;
  const streamStates = new WeakMap();

  function streamState(bubble) {
    let state = streamStates.get(bubble);
    if (!state) {
      state = { buffer: "", shown: "", timer: null, finalized: false };
      streamStates.set(bubble, state);
    }
    return state;
  }

  function stopStreamTimer(state) {
    if (state.timer) {
      window.clearInterval(state.timer);
      state.timer = null;
    }
  }

  function scrollMessages() {
    messages.scrollTop = messages.scrollHeight;
  }

  function beginAssistantStream(bubble) {
    bubble._streaming = true;
    bubble.classList.add("is-streaming");
    bubble.textContent = "";
    bubble._source = "";
  }

  function tickAssistantStream(bubble) {
    const state = streamState(bubble);
    if (state.shown.length < state.buffer.length) {
      const chunk = state.buffer.slice(state.shown.length, state.shown.length + 2);
      state.shown += chunk;
      bubble.textContent = state.shown;
      scrollMessages();
      return;
    }
    if (state.finalized) {
      stopStreamTimer(state);
      bubble.classList.remove("is-streaming");
      bubble._streaming = false;
      const full = state.buffer;
      bubble._source = full;
      if (full.trim()) {
        bubble.innerHTML = renderMarkdown(full);
      } else {
        bubble.textContent = "";
      }
      scrollMessages();
    }
  }

  function enqueueAssistantStream(bubble, delta) {
    if (!delta) return;
    const state = streamState(bubble);
    state.buffer += delta;
    if (!bubble._streaming) beginAssistantStream(bubble);
    if (status.textContent === "Thinking…") status.textContent = "";
    if (!state.timer) {
      state.timer = window.setInterval(() => tickAssistantStream(bubble), STREAM_CHAR_MS);
    }
    tickAssistantStream(bubble);
  }

  function finalizeAssistantStream(bubble, fullText) {
    const state = streamState(bubble);
    if (typeof fullText === "string" && fullText.length >= state.buffer.length) {
      state.buffer = fullText;
    }
    state.finalized = true;
    if (!state.timer) {
      state.timer = window.setInterval(() => tickAssistantStream(bubble), STREAM_CHAR_MS);
    }
    tickAssistantStream(bubble);
  }

  function waitForStreamDrain(bubble) {
    return new Promise((resolve) => {
      const step = () => {
        if (!bubble.isConnected) {
          resolve();
          return;
        }
        const state = streamState(bubble);
        if (state.finalized && state.shown === state.buffer && !state.timer) {
          resolve();
          return;
        }
        window.requestAnimationFrame(step);
      };
      step();
    });
  }

  function cancelAssistantStream(bubble) {
    const state = streamStates.get(bubble);
    if (state) stopStreamTimer(state);
    bubble.classList.remove("is-streaming");
    bubble._streaming = false;
  }

  function setMessageText(bubble, sender, text) {
    if (sender === "assistant" || sender === "human") {
      cancelAssistantStream(bubble);
      bubble._source = text;
      bubble.innerHTML = renderMarkdown(text);
      return;
    }
    bubble.textContent = text;
  }

  function rememberMessage(message) {
    if (!message) return;
    if (message.id) seenIds.add(message.id);
    if (typeof message.seq === "number" && message.seq > lastSeq) lastSeq = message.seq;
  }

  function isStoredVoiceTurn(message) {
    const modality = message?.metadata?.modality;
    return modality === "gemini-live" || modality === "openai-realtime" || modality === "voice";
  }

  function addMessage(sender, text, message) {
    if (message?.id && seenIds.has(message.id)) {
      rememberMessage(message);
      return null;
    }
    const bubble = document.createElement("div");
    const kind = sender === "assistant" ? "assistant" : sender === "user" ? "user" : sender === "human" ? "human" : "system";
    bubble.className = `message ${kind}`;
    setMessageText(bubble, kind, text);
    rememberMessage(message);
    messages.append(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
  }

  async function pollNewMessages() {
    if (!conversationId || !initialized) return;
    try {
      const result = await request(
        `/conversations/${encodeURIComponent(conversationId)}/messages?after_seq=${lastSeq}`,
      );
      for (const message of result.messages || []) {
        if (
          (voiceLiveActive || isStoredVoiceTurn(message)) &&
          (message.sender_type === "user" || message.sender_type === "assistant")
        ) {
          rememberMessage(message);
          continue;
        }
        if (
          outboundTurnActive &&
          (message.sender_type === "user" || message.sender_type === "assistant")
        ) {
          rememberMessage(message);
          continue;
        }
        if (
          message.sender_type === "assistant" &&
          activeAssistantBubble &&
          message.id &&
          activeAssistantBubble._messageId === message.id
        ) {
          rememberMessage(message);
          continue;
        }
        const bubble = addMessage(message.sender_type, message.text || "", message);
        if (bubble && message.sender_type === "system") status.textContent = message.text || "";
        if (bubble && message.sender_type === "human") status.textContent = "";
      }
    } catch {
      /* Keep the open chat usable if a poll fails. */
    }
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = window.setInterval(() => void pollNewMessages(), 2000);
  }

  async function consumeTurnStream(response, onToken) {
    if (!response.body) {
      throw new Error("No response stream from server");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let turn = null;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
        let eventName = "message";
        let dataLine = "";
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        if (eventName === "token" && data.delta) onToken(data.delta);
        else if (eventName === "handoff") turn = { ...(turn || {}), handoff: true, handoff_message: data.message };
        else if (eventName === "done") turn = { ...(data.turn || {}), handoff: turn?.handoff || data.turn?.handoff, handoff_message: turn?.handoff_message };
        else if (eventName === "error") {
          throw new Error(data.message || "Model completion failed");
        }
      }
    }
    if (!turn) {
      throw new Error("Reply ended before it finished");
    }
    return turn;
  }

  async function postTurnStream(path, options, onToken) {
    const response = await fetch(`${gatewayUrl}/v1/public/widget${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "X-Publishable-Key": publishableKey,
        ...(options.headers || {}),
      },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new Error(
        body.error?.message || body.message || `Request failed (${response.status})`,
      );
      error.status = response.status;
      throw error;
    }
    return consumeTurnStream(response, onToken);
  }

  async function request(path, options = {}) {
    const response = await fetch(`${gatewayUrl}/v1/public/widget${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Publishable-Key": publishableKey,
        ...(options.headers || {}),
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(
        body.error?.message || body.message || `Request failed (${response.status})`,
      );
      error.status = response.status;
      throw error;
    }
    return body;
  }

  function isValidName(value) {
    const name = String(value || "").trim();
    return name.length >= 2 && name.length <= 80 && /\p{L}/u.test(name) && !/[<>]/.test(name);
  }

  function isValidEmail(value) {
    const email = String(value || "").trim();
    return email.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function savedProfile() {
    const name = (storage.get("visitor-name") || "").trim();
    const email = (storage.get("visitor-email") || "").trim();
    if (!isValidName(name) || !isValidEmail(email)) return null;
    if (`${name} <${email}>`.length > 255) return null;
    return { name, email };
  }

  async function createConversation() {
    const profile = savedProfile();
    if (!profile) throw new Error("Name and email are required before the chat can start.");
    const body = { subject_key: `${profile.name} <${profile.email}>` };
    if (agentId) body.agent_id = agentId;
    const result = await request("/conversations", { method: "POST", body: JSON.stringify(body) });
    conversationId = result.conversation_id;
    if (!conversationId) throw new Error("The gateway did not return a conversation id.");
    storage.set("conversation", conversationId);
  }

  async function loadConversation() {
    if (conversationId) {
      try {
        const result = await request(
          `/conversations/${encodeURIComponent(conversationId)}/messages`,
        );
        for (const message of result.messages || []) {
          if (isStoredVoiceTurn(message)) {
            rememberMessage(message);
            continue;
          }
          addMessage(message.sender_type, message.text || "", message);
        }
        return;
      } catch (error) {
        if (error.status !== 404) throw error;
        storage.remove("conversation");
        conversationId = null;
      }
    }
    await createConversation();
    addMessage("system", "Send a message to start the conversation.");
  }

  async function openChat() {
    panel.classList.add("open");
    launcher.setAttribute("aria-expanded", "true");
    launcher.textContent = "×";
    if (!savedProfile()) {
      panel.classList.add("needs-intro");
      gateName.value = storage.get("visitor-name") || "";
      gateEmail.value = storage.get("visitor-email") || "";
      gateName.focus();
      return;
    }
    panel.classList.remove("needs-intro");
    if (initialized) return;
    initialized = true;
    status.textContent = "Loading conversation…";
    try {
      await loadConversation();
      status.textContent = "";
      startPolling();
    } catch (error) {
      status.textContent = error.message || "Could not load chat.";
      initialized = false;
    }
  }

  gate.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = gateName.value.trim();
    const email = gateEmail.value.trim();
    if (!isValidName(name)) {
      gateError.textContent = "Enter your name.";
      gateName.focus();
      return;
    }
    if (!isValidEmail(email)) {
      gateError.textContent = "Enter a valid email.";
      gateEmail.focus();
      return;
    }
    storage.set("visitor-name", name);
    storage.set("visitor-email", email);
    storage.remove("conversation");
    conversationId = null;
    gateError.textContent = "";
    panel.classList.remove("needs-intro");
    void openChat();
  });
  launcher.addEventListener("click", () => {
    if (panel.classList.contains("open")) {
      panel.classList.remove("open");
      launcher.setAttribute("aria-expanded", "false");
      launcher.textContent = "✦";
    } else {
      void openChat();
    }
  });
  close.addEventListener("click", () => {
    panel.classList.remove("open");
    launcher.setAttribute("aria-expanded", "false");
    launcher.textContent = "✦";
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  function bytesToBase64(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, i + chunk);
      for (let j = 0; j < slice.length; j++) {
        binary += String.fromCharCode(slice[j]);
      }
    }
    return btoa(binary);
  }

  function resampleTo16k(float32, fromRate) {
    if (!fromRate || fromRate === 16_000) return float32;
    const ratio = fromRate / 16_000;
    const outLen = Math.max(1, Math.floor(float32.length / ratio));
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const src = i * ratio;
      const idx = Math.floor(src);
      const frac = src - idx;
      const a = float32[idx] ?? 0;
      const b = float32[idx + 1] ?? a;
      out[i] = a + (b - a) * frac;
    }
    return out;
  }

  function float32ToInt16Bytes(float32) {
    const out = new Uint8Array(float32.length * 2);
    const view = new DataView(out.buffer);
    for (let i = 0; i < float32.length; i++) {
      const s = Math.max(-1, Math.min(1, float32[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return out;
  }

  function stopVoicePlayback() {
    if (voicePlayback) {
      voicePlayback.pause();
      voicePlayback = null;
    }
  }

  function teardownVoiceGraph() {
    if (voiceSendTimer) {
      clearInterval(voiceSendTimer);
      voiceSendTimer = null;
    }
    voicePcmPending = [];
    try {
      voiceProcessor?.disconnect();
      voiceSource?.disconnect();
    } catch {
      /* ignore */
    }
    voiceProcessor = null;
    voiceSource = null;
    voiceStream?.getTracks().forEach((t) => t.stop());
    voiceStream = null;
    if (voiceAudioContext && voiceAudioContext.state !== "closed") {
      void voiceAudioContext.close();
    }
    voiceAudioContext = null;
  }

  let voiceSendBusy = false;

  function setMicMuted(muted) {
    voiceMicMuted = muted;
    voiceStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
    muteBtn.classList.toggle("muted", muted);
    muteBtn.setAttribute("aria-pressed", muted ? "true" : "false");
    muteBtn.setAttribute("aria-label", muted ? "Unmute microphone" : "Mute microphone");
    if (muted) voicePcmPending = [];
  }

  async function flushVoicePcm() {
    if (voiceMicMuted) {
      voicePcmPending = [];
      return;
    }
    if (voiceSendBusy) return;
    if (!voiceSessionId || voicePcmPending.length === 0) return;
    voiceSendBusy = true;
    const merged = new Float32Array(
      voicePcmPending.reduce((n, c) => n + c.length, 0),
    );
    let offset = 0;
    for (const chunk of voicePcmPending) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }
    voicePcmPending = [];
    const captureRate = voiceAudioContext?.sampleRate || 16_000;
    const pcm = float32ToInt16Bytes(resampleTo16k(merged, captureRate));
    try {
      await fetch(`${gatewayUrl}/v1/public/widget/voice-live/audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Publishable-Key": publishableKey,
        },
        body: JSON.stringify({
          session_id: voiceSessionId,
          pcm_b64: bytesToBase64(pcm),
        }),
      });
    } catch {
      /* keep session alive; next chunk retries */
    } finally {
      voiceSendBusy = false;
    }
  }

  let voicePlayCtx = null;
  let voicePlayTime = 0;
  let voiceAnalyser = null;
  let voiceTimeData = null;
  let voiceMicLevel = 0;
  let voiceWaveRaf = 0;

  function attachPlaybackAnalyser(ctx) {
    if (voiceAnalyser && voiceAnalyser.context === ctx) return voiceAnalyser;
    voiceAnalyser = ctx.createAnalyser();
    voiceAnalyser.fftSize = 1024;
    voiceAnalyser.smoothingTimeConstant = 0.32;
    voiceAnalyser.connect(ctx.destination);
    voiceTimeData = new Uint8Array(voiceAnalyser.fftSize);
    return voiceAnalyser;
  }

  function paintVoiceWave() {
    voiceWaveRaf = 0;
    const speaking = voiceAudioPlaying && voiceAnalyser && voiceTimeData;
    voiceStage.classList.toggle("speaking", Boolean(speaking));
    if (speaking) {
      voiceAnalyser.getByteTimeDomainData(voiceTimeData);
      const len = voiceTimeData.length;
      let loudest = 0;
      for (let i = 0; i < VOICE_BARS; i++) {
        const start = Math.floor((i / VOICE_BARS) * len);
        const end = Math.max(start + 1, Math.floor(((i + 1) / VOICE_BARS) * len));
        let peak = 0;
        for (let s = start; s < end; s++) {
          const amp = Math.abs(voiceTimeData[s] - 128) / 128;
          if (amp > peak) peak = amp;
        }
        const shaped = Math.min(1, Math.pow(peak, 0.6) * 1.9);
        if (shaped > loudest) loudest = shaped;
        voiceWaveBars[i].style.transform = `scaleY(${(0.08 + shaped * 0.92).toFixed(3)})`;
      }
      voiceAvatar.style.setProperty("--person-level", loudest.toFixed(3));
    } else {
      const now = performance.now();
      const drive = 0.22 + voiceMicLevel * 0.78;
      const center = (VOICE_BARS - 1) / 2;
      for (let i = 0; i < VOICE_BARS; i++) {
        const dist = Math.abs(i - center) / center;
        const ripple = 0.5 + 0.5 * Math.sin(now / 240 + i * 0.5);
        const scale = 0.07 + (1 - dist * 0.4) * ripple * drive * 0.38;
        voiceWaveBars[i].style.transform = `scaleY(${scale.toFixed(3)})`;
      }
    }
    if (voiceLiveActive) voiceWaveRaf = requestAnimationFrame(paintVoiceWave);
  }

  function startVoiceWave() {
    if (!voiceWaveRaf) voiceWaveRaf = requestAnimationFrame(paintVoiceWave);
  }

  function stopVoiceWave() {
    if (voiceWaveRaf) cancelAnimationFrame(voiceWaveRaf);
    voiceWaveRaf = 0;
    voiceMicLevel = 0;
    voiceStage.classList.remove("speaking");
    for (const bar of voiceWaveBars) bar.style.transform = "scaleY(0.1)";
  }

  function enqueuePcm16(b64, sampleRate) {
    if (!b64) return;
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const samples = new Float32Array(Math.floor(bytes.length / 2));
    const view = new DataView(bytes.buffer);
    for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
    if (!samples.length) return;
    if (!voicePlayCtx || voicePlayCtx.state === "closed") {
      voicePlayCtx = new AudioContext({ sampleRate });
    }
    if (voicePlayCtx.state === "suspended") void voicePlayCtx.resume();
    const buffer = voicePlayCtx.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);
    const source = voicePlayCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(attachPlaybackAnalyser(voicePlayCtx));
    const now = voicePlayCtx.currentTime;
    if (voicePlayTime < now + 0.02) voicePlayTime = now + 0.05;
    source.start(voicePlayTime);
    voicePlayTime += buffer.duration;
    voiceAudioPlaying = true;
    status.textContent = "Speaking…";
    source.onended = () => {
      if (!voicePlayCtx || voicePlayCtx.currentTime + 0.08 >= voicePlayTime) {
        voiceAudioPlaying = false;
        if (voiceLiveActive && !outboundTurnActive) status.textContent = "Listening… speak naturally";
      }
    };
  }

  function enqueueVoiceClip(audioB64, mime) {
    if (!audioB64) return;
    voiceAudioQueue.push({ audioB64, mime: mime || "audio/mpeg" });
    void drainVoiceClips();
  }

  function drainVoiceClips() {
    if (voiceAudioPlaying || voiceAudioQueue.length === 0) return;
    const next = voiceAudioQueue.shift();
    voiceAudioPlaying = true;
    status.textContent = "Speaking…";
    stopVoicePlayback();
    voicePlayback = new Audio(`data:${next.mime};base64,${next.audioB64}`);
    if (!voicePlayCtx || voicePlayCtx.state === "closed") voicePlayCtx = new AudioContext();
    if (voicePlayCtx.state === "suspended") void voicePlayCtx.resume();
    try {
      voicePlayCtx.createMediaElementSource(voicePlayback).connect(attachPlaybackAnalyser(voicePlayCtx));
    } catch {
      /* playback still starts; the wave stays on the idle motion */
    }
    const done = () => {
      voiceAudioPlaying = false;
      voicePlayback = null;
      if (voiceAudioQueue.length) drainVoiceClips();
      else if (voiceLiveActive && !outboundTurnActive) status.textContent = "Listening… speak naturally";
    };
    voicePlayback.onended = done;
    voicePlayback.onerror = done;
    voicePlayback.play().catch(done);
  }

  async function consumeVoiceLiveStream(response) {
    if (!response.body) throw new Error("No live voice stream");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (voiceLiveActive) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");
        let eventName = "message";
        let dataLine = "";
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
        }
        if (!dataLine) continue;
        let data;
        try {
          data = JSON.parse(dataLine);
        } catch {
          continue;
        }
        if (eventName === "ready") {
          status.textContent = "";
        } else if (eventName === "level") {
          mic.style.setProperty("--mic-level", String(data.value ?? 0));
        } else if (eventName === "transcript") {
          if (!data.interim && data.text) voiceLiveUserShown = data.text;
        } else if (eventName === "thinking" || eventName === "assistant_token") {
          if (!voiceAudioPlaying && !voiceStage.classList.contains("with-person")) status.textContent = "";
        } else if (eventName === "audio") {
          if (data.encoding === "pcm16") enqueuePcm16(data.data, data.sample_rate || 24000);
          else enqueueVoiceClip(data.data, data.mime);
        } else if (eventName === "handoff" || eventName === "human_joined") {
          showVoicePerson(data.name || "Teammate");
        } else if (eventName === "human_left") {
          hideVoicePerson();
          status.textContent = "";
        } else if (eventName === "interrupt") {
          voicePlayTime = 0;
          voiceAudioPlaying = false;
          voiceAudioQueue = [];
          if (voicePlayCtx && voicePlayCtx.state !== "closed") {
            void voicePlayCtx.close();
            voicePlayCtx = null;
          }
          voiceAnalyser = null;
          voiceTimeData = null;
          stopVoicePlayback();
          if (!voiceStage.classList.contains("with-person")) status.textContent = "";
        } else if (eventName === "turn_done" || eventName === "assistant_done") {
          voiceLiveAssistantBubble = null;
          outboundTurnActive = false;
          if (voiceLiveActive && !voiceAudioPlaying && !voiceStage.classList.contains("with-person")) status.textContent = "";
        } else if (eventName === "error") {
          status.textContent = data.message || "Voice error";
        }
      }
    }
  }

  async function stopLiveVoice() {
    voiceLiveActive = false;
    outboundTurnActive = false;
    voiceStreamAbort?.abort();
    voiceStreamAbort = null;
    teardownVoiceGraph();
    setMicMuted(false);
    mic.classList.remove("live");
    micWrap.classList.remove("live");
    mic.style.setProperty("--mic-level", "0");
    mic.setAttribute("aria-label", "Start voice chat");
    panel.classList.remove("voice-live");
    hideVoicePerson();
    stopVoiceWave();
    voiceAnalyser = null;
    voiceTimeData = null;
    if (voiceSessionId) {
      try {
        await fetch(`${gatewayUrl}/v1/public/widget/voice-live/stop`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Publishable-Key": publishableKey,
          },
          body: JSON.stringify({ session_id: voiceSessionId }),
        });
      } catch {
        /* ignore */
      }
      voiceSessionId = null;
    }
    voiceAudioQueue = [];
    voiceAudioPlaying = false;
    voicePlayTime = 0;
    if (voicePlayCtx && voicePlayCtx.state !== "closed") void voicePlayCtx.close();
    voicePlayCtx = null;
    if (!busy) status.textContent = "";
  }

  async function startLiveVoice() {
    if (voiceLiveActive || busy || !conversationId) return;
    stopVoicePlayback();
    voiceLiveActive = true;
    voiceLiveUserShown = "";
    setMicMuted(false);
    outboundTurnActive = false;
    mic.classList.add("live");
    micWrap.classList.add("live");
    mic.setAttribute("aria-label", "Voice is on");
    panel.classList.add("voice-live");
    startVoiceWave();
    status.textContent = "";
    try {
      const start = await request(
        `/conversations/${encodeURIComponent(conversationId)}/voice-live/start`,
        {
          method: "POST",
          body: JSON.stringify({ actor_id: visitorId }),
        },
      );
      voiceSessionId = start.session_id;
      if (!voiceSessionId) throw new Error("Voice session did not start");

      voiceStreamAbort = new AbortController();
      const streamUrl = `${gatewayUrl}/v1/public/widget/conversations/${encodeURIComponent(conversationId)}/voice-live/stream?session_id=${encodeURIComponent(voiceSessionId)}`;
      const streamRes = await fetch(streamUrl, {
        headers: {
          Accept: "text/event-stream",
          "X-Publishable-Key": publishableKey,
        },
        signal: voiceStreamAbort.signal,
      });
      if (!streamRes.ok) {
        const errBody = await streamRes.json().catch(() => ({}));
        throw new Error(errBody.error?.message || "Voice stream failed");
      }
      status.textContent = "Listening… speak naturally";
      void consumeVoiceLiveStream(streamRes);

      voiceStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      voiceAudioContext = new AudioContext({ sampleRate: 16_000 });
      voiceSource = voiceAudioContext.createMediaStreamSource(voiceStream);
      voiceProcessor = voiceAudioContext.createScriptProcessor(1024, 1, 1);
      voiceProcessor.onaudioprocess = (event) => {
        if (!voiceLiveActive || voiceMicMuted) return;
        const input = event.inputBuffer.getChannelData(0);
        voicePcmPending.push(new Float32Array(input));
        let sum = 0;
        let count = 0;
        for (let i = 0; i < input.length; i += 16) {
          sum += input[i] * input[i];
          count++;
        }
        const level = Math.min(1, Math.sqrt(sum / Math.max(1, count)) * 9);
        voiceMicLevel = voiceMicLevel * 0.55 + level * 0.45;
      };
      voiceSource.connect(voiceProcessor);
      voiceProcessor.connect(voiceAudioContext.destination);
      voiceSendTimer = setInterval(() => {
        void flushVoicePcm();
      }, 100);
    } catch (error) {
      const msg = error.message || "";
      status.textContent =
        msg === "Failed to fetch"
          ? "Cannot reach the gateway. Use the same host as in your publishable key (try http://127.0.0.1:8080) and ensure the API is running on :3000."
          : msg || "Could not start voice.";
      await stopLiveVoice();
    }
  }

  mic.addEventListener("click", () => {
    if (!voiceLiveActive) void startLiveVoice();
  });
  hangup.addEventListener("click", () => {
    if (voiceLiveActive) void stopLiveVoice();
  });
  muteBtn.addEventListener("click", () => {
    if (voiceLiveActive) setMicMuted(!voiceMicMuted);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || busy || !conversationId) return;
    const idempotencyKey = crypto.randomUUID();
    pendingRequest = { text, key: idempotencyKey };
    busy = true;
    outboundTurnActive = true;
    activeAssistantBubble = null;
    input.value = "";
    input.disabled = true;
    send.disabled = true;
    status.textContent = "Thinking…";
    addMessage("user", text);
    let assistantBubble = null;
    const onToken = (delta) => {
      if (!assistantBubble) {
        assistantBubble = addMessage("assistant", "");
        activeAssistantBubble = assistantBubble;
        beginAssistantStream(assistantBubble);
      }
      enqueueAssistantStream(assistantBubble, delta);
    };
    try {
      const turn = await postTurnStream(
        `/conversations/${encodeURIComponent(conversationId)}/turns`,
        {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
          body: JSON.stringify({ message: text }),
        },
        onToken,
      );
      if (turn?.user_message) rememberMessage(turn.user_message);
      if (turn?.assistant_message?.id && assistantBubble) {
        assistantBubble._messageId = turn.assistant_message.id;
      }
      if (turn?.handoff) {
        if (assistantBubble) {
          cancelAssistantStream(assistantBubble);
          assistantBubble.remove();
        }
        status.textContent = turn.handoff_message || "A teammate is in this chat and will reply here.";
      } else {
        const finalText =
          turn?.assistant_message?.text ||
          (assistantBubble ? streamState(assistantBubble).buffer : "") ||
          "";
        if (finalText.trim() && assistantBubble) {
          finalizeAssistantStream(assistantBubble, finalText);
          await waitForStreamDrain(assistantBubble);
        } else if (assistantBubble) {
          cancelAssistantStream(assistantBubble);
          assistantBubble.remove();
          status.textContent = "No reply was generated. Try again.";
        } else {
          status.textContent = "No reply was generated. Try again.";
        }
        if (turn?.assistant_message?.id) rememberMessage(turn.assistant_message);
      }
      pendingRequest = null;
      if (!turn?.handoff) status.textContent = "";
    } catch (error) {
      if (assistantBubble) {
        cancelAssistantStream(assistantBubble);
        assistantBubble.remove();
      }
      const msg = error.message || "";
      status.textContent =
        msg.includes("empty reply") || msg.includes("append message")
          ? "The assistant could not finish a reply. Please send again."
          : msg || "Message could not be sent. Please try again.";
    } finally {
      outboundTurnActive = false;
      activeAssistantBubble = null;
      busy = false;
      input.disabled = false;
      send.disabled = false;
      input.focus();
    }
  });
})();
