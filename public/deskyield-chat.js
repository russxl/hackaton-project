/*!
 * DeskYield Chat Widget — embeddable, framework-free.
 *
 * Secure embedding flow:
 *   1. Your backend mints a short-lived visitor token:
 *        POST {host}/api/chat/token   Authorization: Bearer dsky_...
 *        -> { token: "dyv...." }
 *   2. Your frontend mounts the widget with that token:
 *        DeskYieldChat.mount({ host, token })
 *
 * The browser NEVER holds your API key (dsky_…) — only the ephemeral token.
 * Styles are isolated via Shadow DOM so host-page CSS can't leak in.
 */
(function () {
  "use strict";

  if (window.DeskYieldChat && window.DeskYieldChat.__mounted) return;

  var STATE = {
    host: "",
    token: "",
    history: [],
    streaming: false,
    root: null,
    shadow: null,
    els: null,
  };

  function trim(s) {
    return String(s == null ? "" : s).replace(/^\/+|\/+$/g, "");
  }

  function buildStyles() {
    return [
      ":host{all:initial}",
      "*{box-sizing:border-box;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}",
      ".launcher{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:#10b981;color:#fff;font-size:24px;box-shadow:0 10px 25px -5px rgba(16,185,129,.5);display:flex;align-items:center;justify-content:center;transition:transform .15s;z-index:2147483000}",
      ".launcher:hover{transform:scale(1.06)}",
      ".panel{position:fixed;right:20px;bottom:88px;width:min(380px,calc(100vw - 40px));height:min(600px,calc(100vh - 120px));background:#0f172a;border:1px solid #1e293b;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,.6);z-index:2147483001;color:#e2e8f0}",
      ".panel.hidden{display:none}",
      ".head{display:flex;align-items:center;gap:10px;padding:14px 16px;background:#020617;border-bottom:1px solid #1e293b}",
      ".head .logo{width:30px;height:30px;border-radius:8px;background:rgba(16,185,129,.15);display:flex;align-items:center;justify-content:center;border:1px solid rgba(16,185,129,.3);font-size:16px}",
      ".head .titles{flex:1;min-width:0}",
      ".head .t1{font-size:14px;font-weight:600;color:#f1f5f9}",
      ".head .t2{font-size:11px;color:#64748b}",
      ".head .close{background:none;border:none;color:#94a3b8;cursor:pointer;font-size:20px;padding:4px;line-height:1}",
      ".head .close:hover{color:#f1f5f9}",
      ".messages{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#0f172a}",
      ".msg{max-width:85%;padding:10px 12px;border-radius:12px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}",
      ".msg.user{align-self:flex-end;background:#10b981;color:#03130d;border-bottom-right-radius:4px}",
      ".msg.assistant{align-self:flex-start;background:#1e293b;color:#e2e8f0;border-bottom-left-radius:4px}",
      ".msg.error{align-self:center;background:rgba(244,63,94,.12);color:#fda4af;border:1px solid rgba(244,63,94,.3);font-size:12px;text-align:center}",
      ".msg.system{align-self:center;color:#64748b;font-size:11px;font-style:italic}",
      ".typing{display:inline-block;width:6px;height:6px;border-radius:50%;background:#64748b;margin:0 1px;animation:dybounce 1.2s infinite}",
      ".typing:nth-child(2){animation-delay:.2s}",
      ".typing:nth-child(3){animation-delay:.4s}",
      "@keyframes dybounce{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}",
      ".composer{display:flex;gap:8px;padding:12px;border-top:1px solid #1e293b;background:#020617}",
      ".composer input{flex:1;background:#1e293b;border:1px solid #334155;border-radius:10px;padding:10px 12px;font-size:13.5px;color:#e2e8f0;outline:none}",
      ".composer input:focus{border-color:rgba(16,185,129,.5)}",
      ".composer input::placeholder{color:#64748b}",
      ".composer button{background:#10b981;color:#03130d;border:none;border-radius:10px;padding:0 16px;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s}",
      ".composer button:hover:not(:disabled){background:#34d399}",
      ".composer button:disabled{opacity:.5;cursor:not-allowed}",
      ".foot{padding:6px 16px 10px;font-size:10px;color:#475569;text-align:center}",
    ].join("\n");
  }

  function mount(opts) {
    opts = opts || {};
    var host = trim(opts.host) || trim(window.location.origin);
    var token = opts.token || "";
    if (!token) {
      console.error("[DeskYieldChat] A visitor `token` is required. Mint one via POST {host}/api/chat/token with your API key.");
      return;
    }
    if (STATE.root) unmount();

    STATE.host = host;
    STATE.token = token;
    STATE.history = [];
    STATE.streaming = false;

    var root = document.createElement("div");
    root.id = "deskyield-chat-root";
    document.body.appendChild(root);
    var shadow = root.attachShadow({ mode: "open" });
    var style = document.createElement("style");
    style.textContent = buildStyles();
    shadow.appendChild(style);

    var panel = document.createElement("div");
    panel.className = "panel hidden";
    panel.innerHTML =
      '<div class="head">' +
      '<div class="logo">🪑</div>' +
      '<div class="titles"><div class="t1">' + escapeHtml(opts.title || "DeskYield") + '</div>' +
      '<div class="t2">' + escapeHtml(opts.subtitle || "Empty-desk revenue analyst") + '</div></div>' +
      '<button class="close" aria-label="Close">&times;</button></div>' +
      '<div class="messages"></div>' +
      '<div class="composer"><input type="text" placeholder="' + escapeHtml(opts.placeholder || "Ask about at-risk seats…") + '" />' +
      "<button>Send</button></div>" +
      '<div class="foot">Read-only analysis · figures from the DeskYield engine</div>';

    var launcher = document.createElement("button");
    launcher.className = "launcher";
    launcher.setAttribute("aria-label", "Open chat");
    launcher.textContent = "💬";

    shadow.appendChild(panel);
    shadow.appendChild(launcher);

    var messagesEl = panel.querySelector(".messages");
    var inputEl = panel.querySelector("input");
    var sendBtn = panel.querySelector("button");
    var closeBtn = panel.querySelector(".close");

    STATE.root = root;
    STATE.shadow = shadow;
    STATE.els = { panel, launcher, messagesEl, inputEl, sendBtn };

    launcher.addEventListener("click", togglePanel);
    closeBtn.addEventListener("click", closePanel);
    sendBtn.addEventListener("click", send);
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    // Start closed — only the launcher is visible until clicked.
    addSystem("Connected. Ask which reserved seats are at risk this week.");
  }

  function unmount() {
    if (STATE.root && STATE.root.parentNode) STATE.root.parentNode.removeChild(STATE.root);
    STATE.root = null;
    STATE.shadow = null;
    STATE.els = null;
    STATE.history = [];
    STATE.streaming = false;
  }

  function togglePanel() {
    if (!STATE.els) return;
    STATE.els.panel.classList.toggle("hidden");
    if (!STATE.els.panel.classList.contains("hidden")) STATE.els.inputEl.focus();
  }
  function closePanel() {
    if (!STATE.els) return;
    STATE.els.panel.classList.add("hidden");
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function scrollDown() {
    var el = STATE.els && STATE.els.messagesEl;
    if (el) el.scrollTop = el.scrollHeight;
  }

  function addSystem(text) { addMessage(text, "system"); }

  function addMessage(text, kind) {
    if (!STATE.els) return null;
    var div = document.createElement("div");
    div.className = "msg " + (kind || "assistant");
    div.textContent = text == null ? "" : String(text);
    STATE.els.messagesEl.appendChild(div);
    scrollDown();
    return div;
  }

  function setTyping(on) {
    if (!STATE.els) return;
    var existing = STATE.els.messagesEl.querySelector(".typing-row");
    if (existing) existing.remove();
    if (!on) return;
    var row = document.createElement("div");
    row.className = "msg assistant typing-row";
    row.innerHTML = '<span class="typing"></span><span class="typing"></span><span class="typing"></span>';
    STATE.els.messagesEl.appendChild(row);
    scrollDown();
  }

  async function send() {
    if (!STATE.els || STATE.streaming) return;
    var text = STATE.els.inputEl.value.trim();
    if (!text) return;

    STATE.els.inputEl.value = "";
    addMessage(text, "user");
    STATE.history.push({ role: "user", content: text });

    STATE.streaming = true;
    STATE.els.sendBtn.disabled = true;
    STATE.els.inputEl.disabled = true;
    setTyping(true);

    var assistantDiv = addMessage("", "assistant");
    var acc = "";
    try {
      await streamChat(STATE.history, function (event) {
        if (event.type === "delta") {
          if (acc === "") setTyping(false);
          acc += event.text;
          assistantDiv.textContent = acc;
          scrollDown();
        } else if (event.type === "error") {
          if (acc === "") setTyping(false);
          assistantDiv.remove();
          addMessage(event.message, "error");
        }
      });
      if (acc) STATE.history.push({ role: "assistant", content: acc });
    } catch (err) {
      if (acc === "") setTyping(false);
      if (!acc) assistantDiv.remove();
      addMessage(err && err.message ? err.message : "Network error.", "error");
    } finally {
      setTyping(false);
      STATE.streaming = false;
      STATE.els.sendBtn.disabled = false;
      STATE.els.inputEl.disabled = false;
      STATE.els.inputEl.focus();
      // Keep history bounded (stateless server).
      if (STATE.history.length > 20) {
        STATE.history = STATE.history.slice(-20);
      }
    }
  }

  async function streamChat(history, onEvent) {
    var res = await fetch(STATE.host + "/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + STATE.token,
      },
      body: JSON.stringify({ messages: history }),
    });

    if (!res.ok) {
      var msg = "Chat request failed (" + res.status + ").";
      try {
        var body = await res.json();
        if (body && body.message) msg = body.message;
      } catch {}
      onEvent({ type: "error", message: msg });
      return;
    }
    if (!res.body || !res.body.getReader) {
      onEvent({ type: "error", message: "Streaming is not supported in this browser." });
      return;
    }

    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = "";
    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      var parts = buffer.split("\n\n");
      buffer = parts.pop() || "";
      for (var i = 0; i < parts.length; i++) {
        var frame = parts[i];
        var line = "";
        var lines = frame.split("\n");
        for (var j = 0; j < lines.length; j++) {
          if (lines[j].indexOf("data:") === 0) line = lines[j].slice(5).trim();
        }
        if (!line) continue;
        try {
          onEvent(JSON.parse(line));
        } catch {}
      }
    }
    onEvent({ type: "done" });
  }

  window.DeskYieldChat = { mount: mount, unmount: unmount, __mounted: true };

  // Convenience: auto-init from <script data-host data-token>.
  var currentScript = document.currentScript;
  if (currentScript && currentScript.dataset && currentScript.dataset.token) {
    var autoHost = currentScript.dataset.host || "";
    var autoToken = currentScript.dataset.token;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        mount({ host: autoHost, token: autoToken });
      });
    } else {
      mount({ host: autoHost, token: autoToken });
    }
  }
})();
