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
    .message.system { align-self: center; color: #737373; font-size: 12px; }
    .status { min-height: 18px; padding: 0 16px 8px; color: #737373; font-size: 12px; }
    .form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #eee; background: white; }
    .input { flex: 1; min-width: 0; resize: none; max-height: 96px; border: 1px solid #ddd; border-radius: 12px; padding: 10px 12px; color: #171717; background: #fff; font: inherit; font-size: 14px; outline: none; }
    .input:focus { border-color: var(--qs-accent); }
    .send { width: 42px; border: 0; border-radius: 12px; background: var(--qs-accent); color: white; cursor: pointer; font-size: 18px; }
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
  const send = document.createElement("button");
  send.className = "send";
  send.type = "submit";
  send.setAttribute("aria-label", "Send message");
  send.textContent = "➤";
  form.append(input, send);
  panel.append(header, messages, status, form);
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

  function setMessageText(bubble, sender, text) {
    if (sender === "assistant" || sender === "human") {
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
        const data = JSON.parse(dataLine);
        if (eventName === "token" && data.delta) onToken(data.delta);
        else if (eventName === "handoff") turn = { ...(turn || {}), handoff: true, handoff_message: data.message };
        else if (eventName === "done") turn = { ...(data.turn || {}), handoff: turn?.handoff || data.turn?.handoff, handoff_message: turn?.handoff_message };
        else if (eventName === "error") {
          throw new Error(data.message || "Model completion failed");
        }
      }
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

  async function createConversation() {
    const body = { subject_key: `anon:${visitorId}` };
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
        for (const message of result.messages || [])
          addMessage(message.sender_type, message.text || "", message);
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
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || busy || !conversationId) return;
    if (!pendingRequest || pendingRequest.text !== text) {
      pendingRequest = { text, key: crypto.randomUUID() };
    }
    busy = true;
    input.disabled = true;
    send.disabled = true;
    status.textContent = "";
    addMessage("user", text);
    const assistantBubble = addMessage("assistant", "");
    try {
      const turn = await postTurnStream(
        `/conversations/${encodeURIComponent(conversationId)}/turns`,
        {
          method: "POST",
          headers: { "Idempotency-Key": pendingRequest.key },
          body: JSON.stringify({ message: text }),
        },
        (delta) => {
          assistantBubble._source = (assistantBubble._source || "") + delta;
          assistantBubble.innerHTML = renderMarkdown(assistantBubble._source);
          messages.scrollTop = messages.scrollHeight;
        },
      );
      if (turn?.user_message) rememberMessage(turn.user_message);
      if (turn?.handoff) {
        assistantBubble.remove();
        status.textContent = turn.handoff_message || "A teammate is in this chat and will reply here.";
      } else if (turn?.assistant_message?.id) {
        rememberMessage(turn.assistant_message);
      }
      if (!turn?.handoff && turn?.assistant_message?.text && !assistantBubble._source) {
        setMessageText(assistantBubble, "assistant", turn.assistant_message.text);
      }
      input.value = "";
      pendingRequest = null;
      status.textContent = "";
    } catch (error) {
      status.textContent = error.message || "Message could not be sent. Please try again.";
    } finally {
      busy = false;
      input.disabled = false;
      send.disabled = false;
      input.focus();
    }
  });
})();
