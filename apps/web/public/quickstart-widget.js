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
    .message { max-width: 85%; white-space: pre-wrap; overflow-wrap: anywhere; padding: 10px 12px; border-radius: 14px; font-size: 14px; line-height: 1.45; }
    .message.user { align-self: flex-end; border-bottom-right-radius: 4px; background: var(--qs-accent); color: white; }
    .message.assistant, .message.human { align-self: flex-start; border-bottom-left-radius: 4px; background: white; border: 1px solid #e8e8e8; }
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

  function addMessage(sender, text) {
    const bubble = document.createElement("div");
    bubble.className = `message ${sender === "assistant" ? "assistant" : sender === "user" ? "user" : sender === "human" ? "human" : "system"}`;
    bubble.textContent = text;
    messages.append(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
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
        else if (eventName === "done") turn = data.turn ?? null;
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
          addMessage(message.sender_type, message.text || "");
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
          assistantBubble.textContent += delta;
          messages.scrollTop = messages.scrollHeight;
        },
      );
      if (turn?.assistant_message?.text && !assistantBubble.textContent) {
        assistantBubble.textContent = turn.assistant_message.text;
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
