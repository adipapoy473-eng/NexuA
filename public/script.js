// ═══════════════════════════════════════════════════════
// NexusAI — Gemini Chatbot Frontend
// Premium AI Chat Experience
// ═══════════════════════════════════════════════════════

// ── DOM References ──
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const chatForm = $("#chat-form");
const userInput = $("#user-input");
const chatBox = $("#chat-box");
const sendBtn = $("#send-btn");
const welcomeScreen = $("#welcome-screen");
const newChatBtn = $("#new-chat-btn");
const charCount = $("#char-count");

// Sidebar
const sidebar = $("#sidebar");
const menuBtn = $("#menu-btn");
const sidebarClose = $("#sidebar-close");
const sidebarOverlay = $("#sidebar-overlay");
const historyList = $("#chat-history-list");

// Settings
const settingsPanel = $("#settings-panel");
const settingsToggle = $("#settings-toggle-btn");
const settingsContent = $("#settings-content");
const temperatureSlider = $("#temperature");
const topKSlider = $("#top-k");
const topPSlider = $("#top-p");
const tempValue = $("#temp-value");
const topkValue = $("#topk-value");
const toppValue = $("#topp-value");
const systemInstructionInput = $("#system-instruction");

// Theme
const themeToggle = $("#theme-toggle");

// Toast
const toastContainer = $("#toast-container");

// ── State ──
let conversationHistory = [];
let isGenerating = false;
let chatSessions = []; // { id, title, messages, timestamp }
let currentSessionId = null;

// ── Initialize ──
function init() {
  loadTheme();
  loadSessions();
  setupEventListeners();
  setupSliders();
  autoResizeTextarea();
  renderHistory();
}

// ═══════════════════════════════════════════════
// EVENT LISTENERS
// ═══════════════════════════════════════════════
function setupEventListeners() {
  // Form submit
  chatForm.addEventListener("submit", handleSubmit);

  // Enter to send, Shift+Enter for newline
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });

  // Auto-resize + char count
  userInput.addEventListener("input", () => {
    autoResizeTextarea();
    updateCharCount();
  });

  // New chat
  newChatBtn.addEventListener("click", startNewChat);

  // Sidebar mobile toggle
  menuBtn.addEventListener("click", () => toggleSidebar(true));
  sidebarClose.addEventListener("click", () => toggleSidebar(false));
  sidebarOverlay.addEventListener("click", () => toggleSidebar(false));

  // Settings toggle
  settingsToggle.addEventListener("click", () => {
    settingsPanel.classList.toggle("open");
  });

  // Theme toggle
  themeToggle.addEventListener("click", toggleTheme);

  // Suggestion cards
  $$(".suggestion-card").forEach((card) => {
    card.addEventListener("click", () => {
      const prompt = card.getAttribute("data-prompt");
      userInput.value = prompt;
      autoResizeTextarea();
      updateCharCount();
      chatForm.dispatchEvent(new Event("submit"));
    });
  });
}

// ── Slider Setup ──
function setupSliders() {
  temperatureSlider.addEventListener("input", () => {
    tempValue.textContent = temperatureSlider.value;
  });
  topKSlider.addEventListener("input", () => {
    topkValue.textContent = topKSlider.value;
  });
  topPSlider.addEventListener("input", () => {
    toppValue.textContent = topPSlider.value;
  });
}

// ── Textarea Auto-resize ──
function autoResizeTextarea() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + "px";
}

// ── Character Count ──
function updateCharCount() {
  const len = userInput.value.length;
  charCount.textContent = len > 0 ? len : "";
}

// ── Sidebar Toggle ──
function toggleSidebar(open) {
  sidebar.classList.toggle("open", open);
  sidebarOverlay.classList.toggle("active", open);
}

// ═══════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════
function loadTheme() {
  const saved = localStorage.getItem("nexus-theme") || "dark";
  applyTheme(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  applyTheme(next);
  localStorage.setItem("nexus-theme", next);
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const sunIcon = themeToggle.querySelector(".sun-icon");
  const moonIcon = themeToggle.querySelector(".moon-icon");
  if (theme === "light") {
    sunIcon.style.display = "none";
    moonIcon.style.display = "block";
  } else {
    sunIcon.style.display = "block";
    moonIcon.style.display = "none";
  }
}

// ═══════════════════════════════════════════════
// CHAT SESSIONS (localStorage)
// ═══════════════════════════════════════════════
function loadSessions() {
  try {
    const data = localStorage.getItem("nexus-sessions");
    if (data) chatSessions = JSON.parse(data);
  } catch (e) {
    chatSessions = [];
  }
}

function saveSessions() {
  try {
    localStorage.setItem("nexus-sessions", JSON.stringify(chatSessions));
  } catch (e) {
    console.warn("Could not save sessions:", e);
  }
}

function startNewChat() {
  // Save current session if exists
  saveCurrentSession();

  conversationHistory = [];
  currentSessionId = null;
  chatBox.innerHTML = "";
  restoreWelcomeScreen();
  toggleSidebar(false);
  userInput.focus();
  renderHistory();
}

function saveCurrentSession() {
  if (conversationHistory.length === 0) return;

  if (currentSessionId) {
    // Update existing
    const session = chatSessions.find((s) => s.id === currentSessionId);
    if (session) {
      session.messages = [...conversationHistory];
      session.timestamp = Date.now();
    }
  } else {
    // Create new
    const firstMsg = conversationHistory.find((m) => m.role === "user");
    const title = firstMsg
      ? firstMsg.text.substring(0, 40) + (firstMsg.text.length > 40 ? "..." : "")
      : "Chat Baru";

    const session = {
      id: generateId(),
      title,
      messages: [...conversationHistory],
      timestamp: Date.now(),
    };
    chatSessions.unshift(session);
    currentSessionId = session.id;

    // Keep max 20 sessions
    if (chatSessions.length > 20) {
      chatSessions = chatSessions.slice(0, 20);
    }
  }

  saveSessions();
  renderHistory();
}

function loadSession(sessionId) {
  saveCurrentSession();

  const session = chatSessions.find((s) => s.id === sessionId);
  if (!session) return;

  currentSessionId = session.id;
  conversationHistory = [...session.messages];

  // Rebuild chat UI
  chatBox.innerHTML = "";
  conversationHistory.forEach((msg) => {
    if (msg.role === "user") {
      appendMessage("user", msg.text);
    } else {
      appendMessage("bot", formatMarkdown(msg.text), true);
    }
  });

  toggleSidebar(false);
  renderHistory();
  scrollToBottom();
}

function deleteSession(sessionId, event) {
  event.stopPropagation();
  chatSessions = chatSessions.filter((s) => s.id !== sessionId);
  if (currentSessionId === sessionId) {
    currentSessionId = null;
    conversationHistory = [];
    chatBox.innerHTML = "";
    restoreWelcomeScreen();
  }
  saveSessions();
  renderHistory();
  showToast("Riwayat dihapus", "info");
}

function renderHistory() {
  if (chatSessions.length === 0) {
    historyList.innerHTML = '<p class="no-history">Belum ada riwayat chat</p>';
    return;
  }

  historyList.innerHTML = chatSessions
    .map(
      (s) => `
    <div class="history-item ${s.id === currentSessionId ? "active" : ""}" 
         onclick="loadSession('${s.id}')">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <span class="history-item-text">${escapeHtml(s.title)}</span>
    </div>
  `
    )
    .join("");
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ═══════════════════════════════════════════════
// FORM SUBMISSION
// ═══════════════════════════════════════════════
async function handleSubmit(e) {
  e.preventDefault();

  const userMessage = userInput.value.trim();
  if (!userMessage || isGenerating) return;

  // Hide welcome screen
  if (welcomeScreen) {
    welcomeScreen.style.display = "none";
  }

  // Append user message
  appendMessage("user", userMessage);
  conversationHistory.push({ role: "user", text: userMessage });

  // Clear input
  userInput.value = "";
  autoResizeTextarea();
  updateCharCount();
  userInput.focus();

  // Show thinking indicator
  const thinkingEl = appendThinking();
  setGenerating(true);

  try {
    // Build config
    const config = {
      temperature: parseFloat(temperatureSlider.value),
      topK: parseInt(topKSlider.value),
      topP: parseFloat(topPSlider.value),
    };

    const sysInstruction = systemInstructionInput.value.trim();
    if (sysInstruction) {
      config.systemInstruction = sysInstruction;
    }

    // Call API
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation: conversationHistory,
        config,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    removeThinking(thinkingEl);

    if (data.result) {
      const formattedResult = formatMarkdown(data.result);
      appendMessage("bot", formattedResult, true);
      conversationHistory.push({ role: "model", text: data.result });
      saveCurrentSession();
    } else {
      appendMessage(
        "bot",
        "<p>Maaf, tidak ada respons yang diterima. Silakan coba lagi.</p>",
        true
      );
    }
  } catch (error) {
    console.error("Error:", error);
    removeThinking(thinkingEl);
    appendMessage(
      "bot",
      `<p>⚠️ Gagal mendapatkan respons.</p><p style="font-size:0.78rem;opacity:0.6">${escapeHtml(error.message)}</p>`,
      true
    );
    showToast("Gagal menghubungi server", "error");
  } finally {
    setGenerating(false);
  }
}

// ═══════════════════════════════════════════════
// CHAT UI HELPERS
// ═══════════════════════════════════════════════
function appendMessage(role, content, isHtml = false) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "U" : "AI";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (isHtml) {
    bubble.innerHTML = content;
    // Add copy buttons to code blocks
    bubble.querySelectorAll("pre").forEach((pre) => {
      const copyBtn = document.createElement("button");
      copyBtn.className = "code-copy-btn";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", () => {
        const code = pre.querySelector("code")?.textContent || pre.textContent;
        navigator.clipboard.writeText(code).then(() => {
          copyBtn.textContent = "Copied!";
          setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
        });
      });
      pre.style.position = "relative";
      pre.appendChild(copyBtn);
    });
  } else {
    bubble.textContent = content;
  }

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatBox.appendChild(row);
  scrollToBottom();
}

function appendThinking() {
  const row = document.createElement("div");
  row.className = "message-row bot";
  row.id = "thinking-row";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "AI";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `
    <div style="display:flex;align-items:center;gap:4px;">
      <div class="thinking-dots">
        <span></span><span></span><span></span>
      </div>
      <span class="thinking-text">NexusAI sedang berpikir...</span>
    </div>
  `;

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatBox.appendChild(row);
  scrollToBottom();
  return row;
}

function removeThinking(el) {
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

function setGenerating(state) {
  isGenerating = state;
  sendBtn.disabled = state;
  userInput.disabled = state;
  if (!state) userInput.focus();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatBox.scrollTop = chatBox.scrollHeight;
  });
}

// ═══════════════════════════════════════════════
// WELCOME SCREEN RESTORE
// ═══════════════════════════════════════════════
function restoreWelcomeScreen() {
  chatBox.innerHTML = `
    <div class="welcome-screen" id="welcome-screen">
      <div class="welcome-avatar">
        <div class="welcome-avatar-ring"></div>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#welcomeGrad2)" />
          <defs>
            <linearGradient id="welcomeGrad2" x1="3" y1="2" x2="21" y2="22">
              <stop stop-color="#c4b5fd" />
              <stop offset="1" stop-color="#818cf8" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <h1 class="welcome-title">Halo, ada yang bisa dibantu? 👋</h1>
      <p class="welcome-subtitle">Saya NexusAI, asisten cerdas berbasis Gemini. Tanyakan apa saja — dari coding, sains, sampai ide kreatif!</p>
      <div class="suggestion-grid">
        <button class="suggestion-card" data-prompt="Jelaskan apa itu Artificial Intelligence secara sederhana dan mudah dipahami">
          <div class="suggestion-icon">🧠</div>
          <div class="suggestion-text">
            <strong>Apa itu AI?</strong>
            <span>Penjelasan mudah tentang kecerdasan buatan</span>
          </div>
        </button>
        <button class="suggestion-card" data-prompt="Buatkan contoh kode JavaScript modern untuk fetch API dengan async/await dan error handling">
          <div class="suggestion-icon">💻</div>
          <div class="suggestion-text">
            <strong>Contoh Kode JS</strong>
            <span>Fetch API dengan async/await</span>
          </div>
        </button>
        <button class="suggestion-card" data-prompt="Berikan 5 tips produktivitas terbaik untuk software developer di tahun 2026">
          <div class="suggestion-icon">🚀</div>
          <div class="suggestion-text">
            <strong>Tips Developer</strong>
            <span>5 tips produktivitas terbaik</span>
          </div>
        </button>
        <button class="suggestion-card" data-prompt="Apa saja tren teknologi terbaru di 2026 yang paling berpengaruh? Jelaskan masing-masing">
          <div class="suggestion-icon">✨</div>
          <div class="suggestion-text">
            <strong>Tren Teknologi</strong>
            <span>Teknologi terbaru dan paling berpengaruh</span>
          </div>
        </button>
      </div>
    </div>
  `;

  // Re-attach suggestion card listeners
  chatBox.querySelectorAll(".suggestion-card").forEach((card) => {
    card.addEventListener("click", () => {
      const prompt = card.getAttribute("data-prompt");
      userInput.value = prompt;
      autoResizeTextarea();
      updateCharCount();
      chatForm.dispatchEvent(new Event("submit"));
    });
  });
}

// ═══════════════════════════════════════════════
// MARKDOWN FORMATTER
// ═══════════════════════════════════════════════
function formatMarkdown(text) {
  let html = escapeHtml(text);

  // Code blocks (```lang ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre><code class="language-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");

  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Blockquote
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");

  // Horizontal rule
  html = html.replace(/^---$/gm, "<hr>");

  // Unordered list
  html = html.replace(/^[\-\*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>$1</ul>");

  // Ordered list
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );

  // Paragraphs & line breaks
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br>");

  // Wrap in paragraph
  if (
    !html.startsWith("<h") &&
    !html.startsWith("<pre") &&
    !html.startsWith("<ul") &&
    !html.startsWith("<ol")
  ) {
    html = `<p>${html}</p>`;
  }

  return html;
}

// ── HTML Escaping ──
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ═══════════════════════════════════════════════
// TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ═══════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════
init();
