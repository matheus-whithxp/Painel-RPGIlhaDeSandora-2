/* =========================
   Config / vibração / som
========================= */
const VIB_DANO = 120;
const VIB_SANIDADE = 120;
const VIB_MORTE = 250;

const somDano = new Audio("dano_sofrido.mp3");
somDano.volume = 0.4;

/* =========================
   Estado barras
========================= */
let vidaAtual = 100;
let sanidadeAtual = 100;

/* timers debounce (1s) */
let timerVida = null;
let timerSanidade = null;

/* hold trackers (para botões) */
const holdTimeouts = {};
const holdIntervals = {};

/* flag global: se o usuário está interagindo com uma barra (drag/hold on barra) */
let isInteractingWithBar = false;

/* DOM refs (barras) */
const vidaBarInner = document.getElementById("vida-barra");
const sanidadeBarInner = document.getElementById("sanidade-barra");
const vidaAtualSpan = document.getElementById("vida-atual");
const sanidadeAtualSpan = document.getElementById("sanidade-atual");
const vidaMaxInput = document.getElementById("vida-max-input");
const sanidadeMaxInput = document.getElementById("sanidade-max-input");

const vidaMaisBtn = document.getElementById("vida-mais");
const vidaMenosBtn = document.getElementById("vida-menos");
const sanidadeMaisBtn = document.getElementById("sanidade-mais");
const sanidadeMenosBtn = document.getElementById("sanidade-menos");

const vidaContainer = document.getElementById("vida-container");
const sanidadeContainer = document.getElementById("sanidade-container");

/* Nome e itens */
const nomeEdit = document.getElementById("nome-edit");
const itensListEl = document.getElementById("itens-list");

/* =========================
   Utils
========================= */
function toIntSafe(v, fallback = 0) {
  const n = parseInt(v);
  return isNaN(n) ? fallback : n;
}
function tentarVibrar(ms) {
  if ("vibrate" in navigator) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
}

/* =========================
   VISUAL: atualiza barra, classe critico/zerado (regras estritas)
========================= */
function atualizarBarraVisual(atual, max, barraInnerEl, spanEl) {
  const safeMax = Math.max(1, toIntSafe(max, 1));
  const porcent = Math.max(0, Math.min(100, (atual / safeMax) * 100));
  barraInnerEl.style.width = porcent + "%";
  spanEl.innerText = atual;

  const textoEl = barraInnerEl.parentElement.querySelector(".barra-texto");
  const separadorEl = textoEl.querySelector(".separador");

  barraInnerEl.classList.remove("critico", "zerado");
  textoEl.classList.remove("critico", "texto-zerado");
  if (separadorEl) separadorEl.classList.remove("separador-zerado");

  if (atual === 0) {
    barraInnerEl.classList.add("zerado");
    textoEl.classList.add("texto-zerado");
    if (separadorEl) separadorEl.classList.add("separador-zerado");
  } else if (atual <= 5 && atual > 0) {
    barraInnerEl.classList.add("critico");
    textoEl.classList.add("critico");
  }
}

/* =========================
   Agendamento pós-clique (1s) anti-spam
   **Importante:** se o usuário estiver interagindo com a barra (arrastando),
   não devemos agendar vibração/som — a vibração ocorrerá ao soltar.
========================= */
function agendarVida(novo, antes) {
  clearTimeout(timerVida);
  // se o usuário está interagindo com a barra, não agendar vibração/som
  if (isInteractingWithBar) return;
  if (novo >= antes) return;
  timerVida = setTimeout(() => {
    if (antes === 1 && novo === 0) {
      // morte: vibração longa (sem som)
      tentarVibrar(VIB_MORTE);
    } else {
      // dano normal: som + vibração
      somDano.currentTime = 0;
      somDano.play().catch(()=>{});
      tentarVibrar(VIB_DANO);
    }
    timerVida = null;
  }, 1000);
}

function agendarSanidade(novo, antes) {
  clearTimeout(timerSanidade);
  // se o usuário está interagindo com a barra, não agendar vibração
  if (isInteractingWithBar) return;
  if (novo >= antes) return;
  timerSanidade = setTimeout(() => {
    tentarVibrar(VIB_SANIDADE);
    timerSanidade = null;
  }, 1000);
}

/* =========================
   Alterar valor (1 em 1) - central
========================= */
function alterarValor(tipo, delta) {
  if (tipo === "vida") {
    const max = Math.max(1, toIntSafe(vidaMaxInput.value, 100));
    const antes = vidaAtual;
    const novo = Math.max(0, Math.min(vidaAtual + delta, max));
    if (novo !== antes) agendarVida(novo, antes);
    vidaAtual = novo;
    atualizarBarraVisual(vidaAtual, max, vidaBarInner, vidaAtualSpan);
  } else {
    const max = Math.max(1, toIntSafe(sanidadeMaxInput.value, 100));
    const antes = sanidadeAtual;
    const novo = Math.max(0, Math.min(sanidadeAtual + delta, max));
    if (novo !== antes) agendarSanidade(novo, antes);
    sanidadeAtual = novo;
    atualizarBarraVisual(sanidadeAtual, max, sanidadeBarInner, sanidadeAtualSpan);
  }
  salvarEstado();
}

/* =========================
   HOLD (segurar) usando pointer events para botões (inalterado)
   inicia após 300ms, repete a cada 120ms
========================= */
function startHold(id, tipo, delta) {
  stopHold(id);
  holdTimeouts[id] = setTimeout(() => {
    holdIntervals[id] = setInterval(() => alterarValor(tipo, delta), 120);
  }, 300);
}
function stopHold(id) {
  if (holdTimeouts[id]) { clearTimeout(holdTimeouts[id]); holdTimeouts[id]=null; }
  if (holdIntervals[id]) { clearInterval(holdIntervals[id]); holdIntervals[id]=null; }
}

function bindButton(el, id, tipo, delta) {
  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    startHold(id, tipo, delta);
  });
  el.addEventListener("pointerup", () => stopHold(id));
  el.addEventListener("pointercancel", () => stopHold(id));
  el.addEventListener("pointerleave", () => stopHold(id));
  el.addEventListener("click", (e) => { e.preventDefault(); alterarValor(tipo, delta); });
}

/* =========================
   Drag/touch diretamente na barra (pointer events)
   mapa posição -> valor proporcional
   Nova regra: **não vibrar ao segurar**. Vibrar (e tocar som se vida) **somente ao soltar** a barra.
*/
function setupBarDrag(containerEl, tipo, barraInnerEl, spanEl, maxInputEl) {
  let active = false, activeId = null;

  function calcValor(clientX, max) {
    const rect = containerEl.getBoundingClientRect();
    let x = clientX - rect.left;
    if (x < 0) x = 0;
    if (x > rect.width) x = rect.width;
    const pct = x / rect.width;
    return Math.round(pct * max);
  }

  containerEl.addEventListener("pointerdown", (e) => {
    active = true; activeId = e.pointerId;
    try { containerEl.setPointerCapture(activeId); } catch (err) {}
    // marca que o usuário está interagindo com a barra — impede agendar vibrações durante o movimento
    isInteractingWithBar = true;

    const max = Math.max(1, toIntSafe(maxInputEl.value, 100));
    const novo = calcValor(e.clientX, max);
    const antes = (tipo === "vida") ? vidaAtual : sanidadeAtual;
    if (novo !== antes) {
      // atualizar valor (agendamento de vibração será bloqueado por isInteractingWithBar)
      if (tipo === "vida") {
        vidaAtual = novo;
        atualizarBarraVisual(vidaAtual, max, barraInnerEl, spanEl);
      } else {
        sanidadeAtual = novo;
        atualizarBarraVisual(sanidadeAtual, max, barraInnerEl, spanEl);
      }
      salvarEstado();
    }
  });

  containerEl.addEventListener("pointermove", (e) => {
    if (!active || activeId !== e.pointerId) return;
    const max = Math.max(1, toIntSafe(maxInputEl.value, 100));
    const novo = calcValor(e.clientX, max);
    const antes = (tipo === "vida") ? vidaAtual : sanidadeAtual;
    if (novo !== antes) {
      if (tipo === "vida") {
        vidaAtual = novo;
        atualizarBarraVisual(vidaAtual, max, barraInnerEl, spanEl);
      } else {
        sanidadeAtual = novo;
        atualizarBarVisual(sanidadeAtual, max, barraInnerEl, spanEl);
      }
      salvarEstado();
    }
  });

  // Ao soltar (pointerup) -> vibrar (ambas) e tocar som se for vida
  containerEl.addEventListener("pointerup", (e) => {
    if (!active || activeId !== e.pointerId) {
      try { containerEl.releasePointerCapture(e.pointerId); } catch (err) {}
      isInteractingWithBar = false;
      return;
    }
    try { containerEl.releasePointerCapture(activeId); } catch (err) {}
    active = false; activeId = null;

    // apenas aqui fazemos a vibração / som (independente de ter aumentado ou diminuído)
    if (tipo === "vida") {
      // tocar som (apenas quando soltar a barra) e vibrar
      somDano.currentTime = 0;
      somDano.play().catch(()=>{});
      tentarVibrar(VIB_DANO);
    } else {
      tentarVibrar(VIB_SANIDADE);
    }

    // marca interação finalizada — agora agendamentos por cliques voltarão a funcionar
    isInteractingWithBar = false;
  });

  // pointercancel: encerra sem vibrar
  containerEl.addEventListener("pointercancel", (e) => {
    if (active && activeId === e.pointerId) {
      try { containerEl.releasePointerCapture(activeId); } catch (err) {}
      active = false; activeId = null;
    }
    isInteractingWithBar = false;
  });
}

/* =========================
   ITEMS UI (contenteditable) - cria linhas e salva em localStorage
   Regras:
   - máximo 50 caracteres por linha
   - impede quebras de linha (Enter / colar com \n)
   - primeira linha não vem com texto de exemplo
   - lista com 8 linhas por padrão
   - removidos bullets/pontos ao lado (conforme pedido)
   - texto dos itens em Punktype (conforme pedido)
========================= */
const ITEM_CHAR_LIMIT = 50;

function placeCaretAtEnd(el) {
  el.focus();
  if (typeof window.getSelection != "undefined" && typeof document.createRange != "undefined") {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function insertTextAtCursor(text) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    return;
  }
  const range = sel.getRangeAt(0);
  range.deleteContents();
  const textNode = document.createTextNode(text);
  range.insertNode(textNode);

  // move caret after inserted node
  range.setStartAfter(textNode);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

function sanitizeTextForItem(raw) {
  if (!raw) return "";
  // remove line breaks, collapse multiple spaces, trim
  let t = raw.toString().replace(/\r?\n/g, " ");
  // normalize spaces
  t = t.replace(/\s+/g, " ").trim();
  if (t.length > ITEM_CHAR_LIMIT) t = t.slice(0, ITEM_CHAR_LIMIT);
  return t;
}

function criarLinhaItem(text = "") {
  const li = document.createElement("li");

  // removido: bullet (img) — conforme seu pedido
  const div = document.createElement("div");
  div.className = "item-text";
  div.contentEditable = "true";
  div.innerText = sanitizeTextForItem(text);

  // evitar Enter (pular linha)
  div.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      return;
    }
  });

  // controlar colagens (remove quebras e limita)
  div.addEventListener("paste", (e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text') || "";
    const clean = sanitizeTextForItem(paste);
    // compute remaining space
    const current = div.innerText || "";
    const remaining = ITEM_CHAR_LIMIT - current.length;
    const toInsert = clean.slice(0, Math.max(0, remaining));
    if (toInsert.length > 0) {
      insertTextAtCursor(toInsert);
    }
    // after insertion, ensure final sanitize & trim
    setTimeout(() => {
      const final = sanitizeTextForItem(div.innerText);
      if (final !== div.innerText) {
        div.innerText = final;
        placeCaretAtEnd(div);
      }
      salvarEstadoDebounced();
    }, 0);
  });

  // normal input: remover quebras e limitar comprimento
  div.addEventListener("input", () => {
    const raw = div.innerText;
    const clean = sanitizeTextForItem(raw);
    if (clean !== raw) {
      div.innerText = clean;
      placeCaretAtEnd(div);
    }
    salvarEstadoDebounced();
  });

  // salvar também no blur (imediato)
  div.addEventListener("blur", salvarEstado);

  li.appendChild(div);
  return li;
}

function popularItens(arr) {
  itensListEl.innerHTML = "";
  const maxLinhas = Math.max(8, arr.length);
  for (let i=0;i<maxLinhas;i++) {
    const raw = arr[i] ?? "";
    const texto = sanitizeTextForItem(raw);
    itensListEl.appendChild(criarLinhaItem(texto));
  }
}

/* =========================
   SALVAR / CARREGAR estado (barras + nome + itens)
========================= */
let salvarTimeout = null;
function salvarEstadoDebounced() {
  if (salvarTimeout) clearTimeout(salvarTimeout);
  salvarTimeout = setTimeout(salvarEstado, 300);
}

function salvarEstado() {
  const itens = Array.from(itensListEl.querySelectorAll(".item-text")).map(d => sanitizeTextForItem(d.innerText));
  const estado = {
    vidaAtual: Number(vidaAtual),
    vidaMax: Number(toIntSafe(vidaMaxInput.value, 100)),
    sanidadeAtual: Number(sanidadeAtual),
    sanidadeMax: Number(toIntSafe(sanidadeMaxInput.value, 100)),
    nome: nomeEdit.innerText || "",
    itens
  };
  localStorage.setItem("painelRPG", JSON.stringify(estado));
}

function carregarEstado() {
  const salvo = localStorage.getItem("painelRPG");
  if (!salvo) {
    // inicializa UI (sem texto de exemplo nos itens)
    atualizarBarraVisual(vidaAtual, toIntSafe(vidaMaxInput.value,100), vidaBarInner, vidaAtualSpan);
    atualizarBarraVisual(sanidadeAtual, toIntSafe(sanidadeMaxInput.value,100), sanidadeBarInner, sanidadeAtualSpan);
    popularItens([]);
    return;
  }
  try {
    const e = JSON.parse(salvo);
    vidaAtual = Number(e.vidaAtual ?? vidaAtual);
    sanidadeAtual = Number(e.sanidadeAtual ?? sanidadeAtual);
    vidaMaxInput.value = Number(e.vidaMax ?? toIntSafe(vidaMaxInput.value,100));
    sanidadeMaxInput.value = Number(e.sanidadeMax ?? toIntSafe(sanidadeMaxInput.value,100));
    nomeEdit.innerText = e.nome ?? nomeEdit.innerText;
    // sanitize itens carregados (remove quebras e corta)
    const itensSanitizados = (e.itens || []).map(i => sanitizeTextForItem(i));
    popularItens(itensSanitizados);
    atualizarBarraVisual(vidaAtual, vidaMaxInput.value, vidaBarInner, vidaAtualSpan);
    atualizarBarraVisual(sanidadeAtual, sanidadeMaxInput.value, sanidadeBarInner, sanidadeAtualSpan);
  } catch (err) {
    console.error("Erro carregar estado:", err);
    popularItens([]);
  }
}

/* =========================
   Binds e listeners
========================= */
bindButton(vidaMaisBtn, "vida-mais", "vida", 1);
bindButton(vidaMenosBtn, "vida-menos", "vida", -1);
bindButton(sanidadeMaisBtn, "sanidade-mais", "sanidade", 1);
bindButton(sanidadeMenosBtn, "sanidade-menos", "sanidade", -1);

/* setup drag on barras — agora vibram apenas ao soltar */
setupBarDrag(vidaContainer, "vida", vidaBarInner, vidaAtualSpan, vidaMaxInput);
setupBarDrag(sanidadeContainer, "sanidade", sanidadeBarInner, sanidadeAtualSpan, sanidadeMaxInput);

/* max input changes */
vidaMaxInput.addEventListener("input", () => {
  const novoMax = Math.max(1, toIntSafe(vidaMaxInput.value,1));
  vidaMaxInput.value = novoMax;
  if (vidaAtual > novoMax) vidaAtual = novoMax;
  atualizarBarraVisual(vidaAtual, novoMax, vidaBarInner, vidaAtualSpan);
  salvarEstadoDebounced();
});
sanidadeMaxInput.addEventListener("input", () => {
  const novoMax = Math.max(1, toIntSafe(sanidadeMaxInput.value,1));
  sanidadeMaxInput.value = novoMax;
  if (sanidadeAtual > novoMax) sanidadeAtual = novoMax;
  atualizarBarraVisual(sanidadeAtual, novoMax, sanidadeBarInner, sanidadeAtualSpan);
  salvarEstadoDebounced();
});

/* nome edit save */
nomeEdit.addEventListener("input", salvarEstadoDebounced);
nomeEdit.addEventListener("blur", salvarStateImmediate);

function salvarStateImmediate() { salvarEstado(); }

/* carregar inicial */
carregarEstado();
