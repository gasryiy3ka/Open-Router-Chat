"use strict";

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

var state = {
  apiKey: "",
  userName: "",
  model: "openrouter/free",
  onlyFree: true,
  chats: [],
  currentChatId: null,
  attachments: [],
  stats: { reqs: 0, tokensIn: 0, tokensOut: 0, total: 0, cost: 0, models: {} },
  loading: false,
  allModels: []
};

var $ = function(id) { return document.getElementById(id); };
var menuBtn = $("menuBtn");
var newChatBtn = $("newChatBtn");
var newChatBtnTop = $("newChatBtnTop");
var drawer = $("drawer");
var drawerOverlay = $("drawerOverlay");
var chatsList = $("chatsList");
var topbarTitle = $("topbarTitle");
var settingsBtn = $("settingsBtn");
var settingsPanel = $("settingsPanel");
var settingsOverlay = $("settingsOverlay");
var closeSettingsBtn = $("closeSettingsBtn");
var apiKeyInput = $("apiKey");
var userNameInput = $("userName");
var saveKeyBtn = $("saveKeyBtn");
var modelSelect = $("modelSelect");
var loadModelsBtn = $("loadModelsBtn");
var onlyFreeCheckbox = $("onlyFree");
var modelsInfo = $("modelsInfo");
var fileInput = $("fileInput");
var filePreview = $("filePreview");
var messagesEl = $("messages");
var chatForm = $("chatForm");
var userInput = $("userInput");
var sendBtn = $("sendBtn");
var resetStatsBtn = $("resetStatsBtn");
var currentModelInfo = $("currentModelInfo");

function saveChats() { localStorage.setItem("or_chats", JSON.stringify(state.chats)); }
function saveCurrentChatId() {
  if (state.currentChatId) localStorage.setItem("or_currentChatId", state.currentChatId);
  else localStorage.removeItem("or_currentChatId");
}
function getCurrentChat() {
  for (var i = 0; i < state.chats.length; i++) {
    if (state.chats[i].id === state.currentChatId) return state.chats[i];
  }
  return null;
}

function createChat() {
  var chat = {
    id: "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
    title: "Novo chat",
    messages: [],
    createdAt: Date.now()
  };
  state.chats.unshift(chat);
  state.currentChatId = chat.id;
  saveChats();
  saveCurrentChatId();
  return chat;
}

function deleteChat(id) {
  state.chats = state.chats.filter(function(c) { return c.id !== id; });
  if (state.currentChatId === id) state.currentChatId = state.chats[0] ? state.chats[0].id : null;
  saveChats(); saveCurrentChatId();
  renderChatsList(); renderMessages(); updateTopbarTitle();
}

function setChatTitleFromMessage(chat, text) {
  if (chat.title === "Novo chat" && text) {
    chat.title = text.slice(0, 40) + (text.length > 40 ? "…" : "");
    saveChats(); renderChatsList(); updateTopbarTitle();
  }
}

function updateTopbarTitle() {
  var chat = getCurrentChat();
  topbarTitle.textContent = chat ? chat.title : "Novo chat";
}

function updateCurrentModelInfo() {
  currentModelInfo.textContent = "Modelo: " + state.model;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, function(c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function getGreeting() {
  var h = new Date().getHours();
  var name = state.userName || "";
  var suffix = name ? ", " + name : "";
  if (h >= 5 && h < 12) {
    var opts1 = [
      "Bom dia" + suffix + "! ☀️",
      "Bom dia" + suffix + "! Pronto para começar?",
      "Olá" + suffix + "! Que tal uma conversa matinal?"
    ];
    return { title: opts1[Math.floor(Math.random() * opts1.length)], sub: "Como posso ajudar você hoje?" };
  }
  if (h >= 12 && h < 18) {
    var opts2 = [
      "Boa tarde" + suffix + "! 👋",
      "Boa tarde" + suffix + "! Em que posso ajudar?",
      "Oi" + suffix + "! Tudo certo nesta tarde?"
    ];
    return { title: opts2[Math.floor(Math.random() * opts2.length)], sub: "Sobre o que vamos conversar?" };
  }
  var opts3 = [
    "Boa noite" + suffix + "! 🌙",
    "Boa noite" + suffix + "! Trabalhando até tarde?",
    "Olá" + suffix + "! Como foi seu dia?"
  ];
  return { title: opts3[Math.floor(Math.random() * opts3.length)], sub: "Como posso ajudar você agora?" };
}

marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(text) {
  var mathBlocks = [];
  var protectedText = String(text || "");

  protectedText = protectedText.replace(/\$\$([\s\S]+?)\$\$/g, function(_, expr) {
    var idx = mathBlocks.length;
    mathBlocks.push({ type: "block", expr: expr.trim() });
    return "@@MATH_BLOCK_" + idx + "@@";
  });

  protectedText = protectedText.replace(/\$([^\$\n]+?)\$/g, function(_, expr) {
    var idx = mathBlocks.length;
    mathBlocks.push({ type: "inline", expr: expr.trim() });
    return "@@MATH_INLINE_" + idx + "@@";
  });

  var html = marked.parse(protectedText);

  html = html.replace(/@@MATH_(BLOCK|INLINE)_(\d+)@@/g, function(match, kind, i) {
    var item = mathBlocks[parseInt(i, 10)];
    if (!item) return match;
    try {
      return katex.renderToString(item.expr, {
        displayMode: item.type === "block",
        throwOnError: false,
        output: "html"
      });
    } catch (e) {
      return "<code>" + escapeHtml(item.expr) + "</code>";
    }
  });

  var temp = document.createElement("div");
  temp.innerHTML = html;

  var codeEls = temp.querySelectorAll("pre > code");
  for (var i = 0; i < codeEls.length; i++) {
    (function(codeEl) {
      var pre = codeEl.parentElement;
      var langMatch = codeEl.className.match(/language-(\w+)/);
      var lang = langMatch ? langMatch[1] : "text";
      var rawCode = codeEl.textContent;

      var block = document.createElement("div");
      block.className = "code-block";

      var header = document.createElement("div");
      header.className = "code-header";

      var langLabel = document.createElement("span");
      langLabel.className = "code-lang";
      langLabel.textContent = lang;

      var copyBtn = document.createElement("button");
      copyBtn.className = "copy-btn";
      copyBtn.type = "button";
      copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar';

      copyBtn.addEventListener("click", function() {
        var codeToCopy = rawCode;
        function done() {
          copyBtn.classList.add("copied");
          copyBtn.innerHTML = "✓ Copiado!";
          setTimeout(function() {
            copyBtn.classList.remove("copied");
            copyBtn.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copiar';
          }, 1500);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(codeToCopy).then(done).catch(function() {
            fallbackCopy(codeToCopy); done();
          });
        } else {
          fallbackCopy(codeToCopy); done();
        }
      });

      header.appendChild(langLabel);
      header.appendChild(copyBtn);

      pre.parentNode.insertBefore(block, pre);
      block.appendChild(header);
      block.appendChild(pre);
    })(codeEls[i]);
  }

  if (window.hljs) {
    var allCode = temp.querySelectorAll("pre code");
    for (var j = 0; j < allCode.length; j++) {
      try { hljs.highlightElement(allCode[j]); } catch (e) {}
    }
  }

  return temp.innerHTML;
}

function fallbackCopy(text) {
  var ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch (e) {}
  document.body.removeChild(ta);
}

apiKeyInput.value = state.apiKey;
userNameInput.value = state.userName;
onlyFreeCheckbox.checked = state.onlyFree;
if (!state.chats.length) createChat();
updateTopbarTitle();
updateCurrentModelInfo();

function openDrawer() { drawer.classList.add("open"); drawerOverlay.classList.add("open"); }
function closeDrawer() { drawer.classList.remove("open"); drawerOverlay.classList.remove("open"); }
menuBtn.addEventListener("click", openDrawer);
drawerOverlay.addEventListener("click", closeDrawer);

function openSettings() { settingsPanel.classList.add("open"); settingsOverlay.classList.add("open"); }
function closeSettings() { settingsPanel.classList.remove("open"); settingsOverlay.classList.remove("open"); }
settingsBtn.addEventListener("click", function() { closeDrawer(); openSettings(); });
settingsOverlay.addEventListener("click", closeSettings);
closeSettingsBtn.addEventListener("click", closeSettings);

function handleNewChat() {
  createChat(); renderChatsList(); renderMessages(); updateTopbarTitle();
  closeDrawer();
  setTimeout(function() { userInput.focus(); }, 300);
}
newChatBtn.addEventListener("click", handleNewChat);
newChatBtnTop.addEventListener("click", handleNewChat);

function renderChatsList() {
  chatsList.innerHTML = "";
  if (!state.chats.length) {
    chatsList.innerHTML = '<div class="chats-empty">Nenhuma conversa ainda</div>';
    return;
  }
  state.chats.forEach(function(c) {
    var item = document.createElement("div");
    item.className = "chat-item" + (c.id === state.currentChatId ? " active" : "");

    var title = document.createElement("span");
    title.className = "chat-title";
    title.textContent = c.title;
    item.appendChild(title);

    var del = document.createElement("button");
    del.className = "chat-del";
    del.textContent = "×";
    del.title = "Apagar conversa";
    del.addEventListener("click", function(e) {
      e.stopPropagation();
      if (confirm('Apagar "' + c.title + '"?')) deleteChat(c.id);
    });
    item.appendChild(del);

    item.addEventListener("click", function() {
      state.currentChatId = c.id;
      saveCurrentChatId();
      renderChatsList(); renderMessages(); updateTopbarTitle();
      closeDrawer();
    });

    chatsList.appendChild(item);
  });
}

function renderMessages() {
  var chat = getCurrentChat();
  messagesEl.innerHTML = "";
  if (!chat || !chat.messages.length) {
    var g = getGreeting();
    var wrap = document.createElement("div");
    wrap.className = "welcome";
    wrap.innerHTML = '<div class="welcome-logo"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><h1></h1><p></p>';
    wrap.querySelector("h1").textContent = g.title;
    wrap.querySelector("p").textContent = g.sub;
    messagesEl.appendChild(wrap);
    return;
  }

  chat.messages.forEach(function(msg) {
    var div = document.createElement("div");
    div.className = "msg " + msg.role;

    if (msg.role === "assistant") {
      var content = document.createElement("div");
      content.className = "content";
      content.innerHTML = renderMarkdown(typeof msg.content === "string" ? msg.content : "");
      div.appendChild(content);
    } else {
      div.textContent = typeof msg.content === "string" ? msg.content : "[conteúdo multimídia]";
      if (msg.attachmentsData && msg.attachmentsData.length) {
        var wrap2 = document.createElement("div");
        wrap2.className = "attachments";
        msg.attachmentsData.forEach(function(a) { wrap2.appendChild(buildAttachmentPreview(a)); });
        div.appendChild(wrap2);
      }
    }
    messagesEl.appendChild(div);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function buildAttachmentPreview(a) {
  if (a.type.startsWith("image/")) {
    var img = document.createElement("img");
    img.src = a.dataUrl;
    return img;
  }
  if (a.type.startsWith("video/")) {
    var v = document.createElement("video");
    v.src = a.dataUrl; v.controls = true;
    return v;
  }
  if (a.type.startsWith("audio/")) {
    var au = document.createElement("audio");
    au.src = a.dataUrl; au.controls = true;
    return au;
  }
  var chip = document.createElement("span");
  chip.className = "file-chip";
  chip.textContent = "📄 " + a.name;
  return chip;
}

function appendMessageToDOM(role, text, attachments) {
  var div = document.createElement("div");
  div.className = "msg " + role;

  if (role === "assistant") {
    var content = document.createElement("div");
    content.className = "content";
    content.innerHTML = renderMarkdown(text || "");
    div.appendChild(content);
  } else {
    if (text) div.textContent = text;
    if (attachments && attachments.length) {
      var wrap = document.createElement("div");
      wrap.className = "attachments";
      attachments.forEach(function(a) { wrap.appendChild(buildAttachmentPreview(a)); });
      div.appendChild(wrap);
    }
  }

  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function renderStats() {
  $("statReqs").textContent = state.stats.reqs;
  $("statIn").textContent = state.stats.tokensIn.toLocaleString();
  $("statOut").textContent = state.stats.tokensOut.toLocaleString();
  $("statTotal").textContent = state.stats.total.toLocaleString();
  $("statCost").textContent = "$" + state.stats.cost.toFixed(6);

  var ul = $("modelUsage");
  ul.innerHTML = "";
  var entries = Object.entries(state.stats.models).sort(function(a, b) { return b[1].count - a[1].count; });
  if (!entries.length) {
    ul.innerHTML = "<li><span>Nenhum modelo usado</span></li>";
  } else {
    entries.forEach(function(entry) {
      var model = entry[0], data = entry[1];
      var li = document.createElement("li");
      var span = document.createElement("span");
      span.title = model;
      span.textContent = model.split("/").pop();
      var b = document.createElement("b");
      b.textContent = data.count + "x · " + data.tokens.toLocaleString() + " tk";
      li.appendChild(span); li.appendChild(b);
      ul.appendChild(li);
    });
  }
  localStorage.setItem("or_stats", JSON.stringify(state.stats));
}

function saveKey() {
  var k = apiKeyInput.value.trim();
  if (k && !k.startsWith("sk-or-")) {
    alert("A chave deve começar com 'sk-or-'");
    return;
  }
  state.apiKey = k;
  localStorage.setItem("or_apiKey", k);
  alert("Configurações salvas!");
}

userNameInput.addEventListener("input", function() {
  state.userName = userNameInput.value.trim();
  localStorage.setItem("or_userName", state.userName);
  var chat = getCurrentChat();
  if (!chat || !chat.messages.length) renderMessages();
});

var CODE_EXTENSIONS = [
  "js","mjs","cjs","ts","tsx","jsx","py","rb","php","java","kt","swift",
  "c","h","cpp","hpp","cc","cs","go","rs","sh","bash","zsh","ps1",
  "html","htm","css","scss","sass","less","xml","yaml","yml","json",
  "sql","lua","r","m","pl","dart","scala","clj","ex","exs","vue","svelte",
  "ini","conf","env","toml","log","dockerfile","gitignore","makefile",
  "ms","mscript","micro","mini","mins","gs","nut","angelscript","as",
  "luau","gd","csx","fsx","vb","vbnet","pas","asm","s"
];

var PROJECT_TEXT_EXTS = [
  "json","txt","md","csv","xml","yaml","yml","ini","conf","toml","log","env"
];

function getExt(name) {
  var parts = name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function isCodeFile(name) { return CODE_EXTENSIONS.indexOf(getExt(name)) !== -1; }
function isTextLikeFile(name) {
  var e = getExt(name);
  return CODE_EXTENSIONS.indexOf(e) !== -1 || PROJECT_TEXT_EXTS.indexOf(e) !== -1;
}

var MAX_TEXT_SIZE = 500000;
var MAX_MEDIA_SIZE = 15000000;
var MAX_ZIP_SIZE = 25000000;

fileInput.addEventListener("change", async function(e) {
  var files = Array.from(e.target.files);
  for (var i = 0; i < files.length; i++) {
    try { await processFile(files[i]); }
    catch (err) { alert("Erro ao ler " + files[i].name + ": " + err.message); }
  }
  fileInput.value = "";
  renderFilePreview();
});

async function processFile(file) {
  var type = file.type || "";
  var ext = getExt(file.name);

  if (type.indexOf("image/") === 0) {
    var dataUrl = await readAsDataURL(file);
    state.attachments.push({ name: file.name, type: type, dataUrl: dataUrl, size: file.size, kind: "image" });
    return;
  }
  if (type.indexOf("video/") === 0) {
    if (file.size > MAX_MEDIA_SIZE) throw new Error("Vídeo muito grande (máx 15 MB).");
    var dUrl = await readAsDataURL(file);
    state.attachments.push({ name: file.name, type: type, dataUrl: dUrl, size: file.size, kind: "video" });
    return;
  }
  if (type.indexOf("audio/") === 0) {
    if (file.size > MAX_MEDIA_SIZE) throw new Error("Áudio muito grande (máx 15 MB).");
    var aUrl = await readAsDataURL(file);
    state.attachments.push({ name: file.name, type: type, dataUrl: aUrl, size: file.size, kind: "audio" });
    return;
  }

  if (ext === "zip") {
    if (file.size > MAX_ZIP_SIZE) throw new Error("ZIP muito grande (máx 25 MB).");
    var zipText = await extractZipText(file);
    state.attachments.push({
      name: file.name,
      type: "application/zip",
      textContent: zipText,
      size: file.size,
      kind: "zip"
    });
    return;
  }

  if (ext === "pdf") {
    var text = await extractPdfText(file);
    state.attachments.push({ name: file.name, type: "application/pdf", textContent: text, size: file.size, kind: "doc" });
    return;
  }
  if (ext === "docx" || ext === "doc") {
    var dtext = await extractDocxText(file);
    state.attachments.push({ name: file.name, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", textContent: dtext, size: file.size, kind: "doc" });
    return;
  }
  if (ext === "xlsx" || ext === "xls") {
    var xtext = await extractXlsxText(file);
    state.attachments.push({ name: file.name, type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", textContent: xtext, size: file.size, kind: "doc" });
    return;
  }
  if (file.size <= MAX_TEXT_SIZE) {
    var t = await readAsText(file);
    var kind = isCodeFile(file.name) ? "code" : "text";
    state.attachments.push({
      name: file.name,
      type: kind === "code" ? "text/x-code" : "text/plain",
      textContent: t, size: file.size, kind: kind
    });
    return;
  }
  throw new Error("Tipo de arquivo não suportado ou muito grande.");
}

async function extractZipText(file) {
  if (!window.JSZip) throw new Error("JSZip não carregou (verifique a internet).");
  var buf = await file.arrayBuffer();
  var zip = await JSZip.loadAsync(buf);

  var allEntries = [];
  zip.forEach(function(relativePath, zipEntry) {
    if (!zipEntry.dir) allEntries.push(relativePath);
  });

  var textFiles = [];
  var binaryFiles = [];

  allEntries.forEach(function(name) {
    if (isTextLikeFile(name)) textFiles.push(name);
    else binaryFiles.push(name);
  });

  textFiles.sort(function(a, b) {
    var aBase = a.split("/").pop().toLowerCase();
    var bBase = b.split("/").pop().toLowerCase();
    if (aBase === "project.json") return -1;
    if (bBase === "project.json") return 1;
    var aScore = (a.indexOf("/ms/") !== -1 ? 0 : 1) + (a.indexOf("/") === -1 ? 0 : 1);
    var bScore = (b.indexOf("/ms/") !== -1 ? 0 : 1) + (b.indexOf("/") === -1 ? 0 : 1);
    if (aScore !== bScore) return aScore - bScore;
    return a.localeCompare(b);
  });

  var out = "";
  out += "=== PROJETO ZIP: " + file.name + " ===\n";
  out += "Total de arquivos: " + allEntries.length + "\n";
  out += "Arquivos de texto/código: " + textFiles.length + "\n";
  out += "Arquivos binários (sprites, áudio, etc.): " + binaryFiles.length + "\n\n";

  out += "--- ESTRUTURA DE ARQUIVOS ---\n";
  allEntries.sort().forEach(function(n) { out += "  " + n + "\n"; });
  out += "\n";

  var totalChars = 0;
  var MAX_CHARS = 200000;

  for (var i = 0; i < textFiles.length; i++) {
    var n = textFiles[i];
    try {
      var content = await zip.files[n].async("string");
      if (totalChars + content.length > MAX_CHARS) {
        out += "\n\n===== " + n + " =====\n[conteúdo omitido — limite de tamanho atingido]\n";
        continue;
      }
      totalChars += content.length;
      out += "\n===== " + n + " =====\n" + content + "\n";
    } catch (e) {
      out += "\n===== " + n + " =====\n(erro ao ler: " + e.message + ")\n";
    }
  }

  if (binaryFiles.length) {
    out += "\n\n--- Arquivos binários (sprites/imagens/áudio, não incluídos no texto) ---\n";
    binaryFiles.forEach(function(n) { out += "  " + n + "\n"; });
  }

  return out;
}

async function extractPdfText(file) {
  var buf = await file.arrayBuffer();
  var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  var out = "";
  for (var i = 1; i <= pdf.numPages; i++) {
    var page = await pdf.getPage(i);
    var content = await page.getTextContent();
    var items = content.items.map(function(it) { return it.str; }).join(" ");
    out += "\n--- Página " + i + " ---\n" + items;
  }
  return out.trim();
}

async function extractDocxText(file) {
  var buf = await file.arrayBuffer();
  var result = await mammoth.extractRawText({ arrayBuffer: buf });
  return result.value;
}

async function extractXlsxText(file) {
  var buf = await file.arrayBuffer();
  var wb = XLSX.read(buf, { type: "array" });
  var out = "";
  wb.SheetNames.forEach(function(name) {
    out += "\n--- Planilha: " + name + " ---\n";
    out += XLSX.utils.sheet_to_csv(wb.Sheets[name]);
  });
  return out.trim();
}

function readAsDataURL(file) {
  return new Promise(function(res, rej) {
    var r = new FileReader();
    r.onload = function() { res(r.result); };
    r.onerror = function() { rej(new Error("Falha ao ler arquivo")); };
    r.readAsDataURL(file);
  });
}
function readAsText(file) {
  return new Promise(function(res, rej) {
    var r = new FileReader();
    r.onload = function() { res(r.result); };
    r.onerror = function() { rej(new Error("Falha ao ler arquivo")); };
    r.readAsText(file);
  });
}

function renderFilePreview() {
  filePreview.innerHTML = "";
  state.attachments.forEach(function(a, i) {
    var chip = document.createElement("div");
    chip.className = "file-chip";

    var icon = "📄";
    if (a.kind === "image") {
      var img = document.createElement("img");
      img.src = a.dataUrl;
      chip.appendChild(img);
    } else {
      if (a.kind === "video") icon = "🎬";
      else if (a.kind === "audio") icon = "🎵";
      else if (a.kind === "code") icon = "💻";
      else if (a.kind === "doc") icon = "📕";
      else if (a.kind === "zip") icon = "🗜️";
      var ic = document.createElement("span");
      ic.textContent = icon;
      chip.appendChild(ic);
    }

    var span = document.createElement("span");
    span.textContent = a.name;
    chip.appendChild(span);

    var btn = document.createElement("button");
    btn.textContent = "×";
    btn.title = "Remover";
    btn.onclick = function() { state.attachments.splice(i, 1); renderFilePreview(); };
    chip.appendChild(btn);

    filePreview.appendChild(chip);
  });
}

function isFreeModel(m) {
  if (!m) return false;
  if (m.id && m.id.endsWith(":free")) return true;
  var p = m.pricing || {};
  return (p.prompt === "0" || p.prompt === 0) && (p.completion === "0" || p.completion === 0);
}

async function loadModels() {
  try {
    loadModelsBtn.disabled = true;
    loadModelsBtn.textContent = "Carregando...";
    if (!state.allModels.length) {
      var res = await fetch("https://openrouter.ai/api/v1/models");
      var data = await res.json();
      state.allModels = data.data || [];
      if (!state.allModels.length) throw new Error("Lista vazia");
    }
    populateModelSelect();
  } catch (e) {
    alert("Erro ao carregar modelos: " + e.message);
  } finally {
    loadModelsBtn.disabled = false;
    loadModelsBtn.textContent = "Carregar modelos";
  }
}

function populateModelSelect() {
  var models = state.allModels;
  if (state.onlyFree) models = models.filter(function(m) { return isFreeModel(m); });
  models = models.slice().sort(function(a, b) { return a.id.localeCompare(b.id); });

  modelSelect.innerHTML = "";

  var routerOpt = document.createElement("option");
  routerOpt.value = "openrouter/free";
  routerOpt.textContent = "🆓 Roteador Automático de Grátis";
  if (state.model === "openrouter/free") routerOpt.selected = true;
  modelSelect.appendChild(routerOpt);

  if (!models.length && state.onlyFree) {
    modelsInfo.textContent = "Nenhum modelo gratuito encontrado na lista.";
    return;
  }

  models.forEach(function(m) {
    var opt = document.createElement("option");
    opt.value = m.id;
    var free = isFreeModel(m);
    var priceIn = m.pricing && m.pricing.prompt ? (+m.pricing.prompt * 1e6).toFixed(2) : "?";
    var priceOut = m.pricing && m.pricing.completion ? (+m.pricing.completion * 1e6).toFixed(2) : "?";
    opt.textContent = free
      ? "🆓 " + m.id
      : m.id + " ($" + priceIn + "/$" + priceOut + " por 1M)";
    if (m.id === state.model) opt.selected = true;
    modelSelect.appendChild(opt);
  });

  var found = null;
  for (var i = 0; i < models.length; i++) {
    if (models[i].id === state.model) { found = models[i]; break; }
  }
  if (!found && state.model !== "openrouter/free" && models.length) {
    state.model = models[0].id;
    modelSelect.value = state.model;
    localStorage.setItem("or_model", state.model);
    updateCurrentModelInfo();
  }

  var freeCount = state.onlyFree ? models.length : state.allModels.filter(function(m) { return isFreeModel(m); }).length;
  modelsInfo.textContent = state.onlyFree
    ? models.length + " modelos gratuitos disponíveis"
    : state.allModels.length + " modelos no total (" + freeCount + " grátis)";
}

modelSelect.addEventListener("change", function() {
  state.model = modelSelect.value;
  localStorage.setItem("or_model", state.model);
  updateCurrentModelInfo();
});

async function sendMessage(userText) {
  if (!state.apiKey) {
    alert("Configure sua API key primeiro (menu → Configurações).");
    openSettings();
    return;
  }
  var chat = getCurrentChat();
  if (!chat) return;

  var parts = [];
  if (userText) parts.push({ type: "text", text: userText });

  state.attachments.forEach(function(a) {
    if (a.kind === "image") {
      parts.push({ type: "image_url", image_url: { url: a.dataUrl } });
    } else if (a.kind === "video") {
      parts.push({ type: "video_url", video_url: { url: a.dataUrl } });
    } else if (a.kind === "audio") {
      parts.push({ type: "input_audio", input_audio: { data: a.dataUrl, format: a.name.split(".").pop() } });
    } else if (a.textContent) {
      var label;
      if (a.kind === "code") label = "[Arquivo de código: " + a.name + "]";
      else if (a.kind === "zip") label = "[Projeto ZIP descompactado: " + a.name + "]";
      else label = "[Arquivo: " + a.name + "]";
      parts.push({ type: "text", text: "\n\n" + label + "\n```\n" + a.textContent + "\n```" });
    }
  });

  var userMsgContent = (parts.length === 1 && parts[0].type === "text") ? parts[0].text : parts;

  if (chat.messages.length === 0) messagesEl.innerHTML = "";

  var attachmentsSnapshot = state.attachments.map(function(a) {
    return { name: a.name, type: a.type, dataUrl: a.dataUrl, kind: a.kind };
  });

  chat.messages.push({
    role: "user",
    content: userMsgContent,
    attachmentsData: attachmentsSnapshot.map(function(a) {
      return {
        name: a.name, type: a.type, kind: a.kind,
        dataUrl: (a.kind === "image" || a.kind === "video" || a.kind === "audio") ? a.dataUrl : null
      };
    })
  });
  saveChats();
  setChatTitleFromMessage(chat, userText || "Arquivo enviado");
  appendMessageToDOM("user", userText || "(arquivos enviados)", attachmentsSnapshot);

  state.attachments = [];
  renderFilePreview();

  var botDiv = document.createElement("div");
  botDiv.className = "msg assistant typing";
  var botContent = document.createElement("div");
  botContent.className = "content";
  botDiv.appendChild(botContent);
  messagesEl.appendChild(botDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;

  state.loading = true;
  sendBtn.disabled = true;

  try {
    var res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + state.apiKey,
        "Content-Type": "application/json",
        "HTTP-Referer": location.origin,
        "X-Title": "OpenRouter Chat Local"
      },
      body: JSON.stringify({
        model: state.model,
        messages: chat.messages.map(function(m) { return { role: m.role, content: m.content }; }),
        usage: { include: true }
      })
    });

    if (!res.ok) {
      var errText = await res.text();
      throw new Error("HTTP " + res.status + ": " + errText);
    }

    var data = await res.json();
    var reply = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "(sem resposta)";

    botDiv.classList.remove("typing");
    botContent.innerHTML = renderMarkdown(reply);

    chat.messages.push({ role: "assistant", content: reply });
    saveChats();

    var usage = data.usage || {};
    var modelUsed = data.model || state.model;
    var tkIn = usage.prompt_tokens || 0;
    var tkOut = usage.completion_tokens || 0;
    var total = usage.total_tokens || (tkIn + tkOut);

    state.stats.reqs += 1;
    state.stats.tokensIn += tkIn;
    state.stats.tokensOut += tkOut;
    state.stats.total += total;
    if (!state.stats.models[modelUsed]) state.stats.models[modelUsed] = { count: 0, tokens: 0 };
    state.stats.models[modelUsed].count += 1;
    state.stats.models[modelUsed].tokens += total;

    renderStats();
  } catch (e) {
    botDiv.classList.remove("typing");
    botDiv.classList.add("error");
    botContent.textContent = "❌ Erro: " + e.message;
    chat.messages.pop();
    saveChats();
  } finally {
    state.loading = false;
    sendBtn.disabled = false;
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

chatForm.addEventListener("submit", function(e) {
  e.preventDefault();
  var text = userInput.value.trim();
  if (!text && state.attachments.length === 0) return;
  if (state.loading) return;
  userInput.value = "";
  userInput.style.height = "auto";
  sendMessage(text);
});

userInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

userInput.addEventListener("input", function() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
});

onlyFreeCheckbox.addEventListener("change", function() {
  state.onlyFree = onlyFreeCheckbox.checked;
  localStorage.setItem("or_onlyFree", state.onlyFree);
  if (state.allModels.length) populateModelSelect();
  else loadModels();
});

resetStatsBtn.addEventListener("click", function() {
  if (!confirm("Zerar estatísticas de uso?")) return;
  state.stats = { reqs: 0, tokensIn: 0, tokensOut: 0, total: 0, cost: 0, models: {} };
  renderStats();
});

saveKeyBtn.addEventListener("click", saveKey);
loadModelsBtn.addEventListener("click", loadModels);

renderChatsList();
renderMessages();
renderStats();
updateTopbarTitle();
updateCurrentModelInfo();
