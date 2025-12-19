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

/* hold trackers */
const holdTimeouts = {};
const holdIntervals = {};

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

const vidaContainer = vidaBarInner.parentElement;
const sanidadeContainer = sanidadeBarInner.parentElement;

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
  separadorEl.classList.remove("separador-zerado");

  if (atual === 0) {
    barraInnerEl.classList.add("zerado");
    textoEl.classList.add("texto-zerado");
    separadorEl.classList.add("separador-zerado");
  } else if (atual <= 5 && atual > 0) {
    barraInnerEl.classList.add("critico");
    textoEl.classList.add("critico");
  }
}

/* =========================
   Agendamento pós-clique (1s) anti-spam
   - agora suporta option { fromBar: true } para forçar vibração
     mesmo se o valor aumentou (usado quando ajuste vem da barra).
========================= */
function agendarVida(novo, antes, options = {}) {
  clearTimeout(timerVida);
  const fromBar = options.fromBar === true;
  if (!fromBar && novo >= antes) return;
  timerVida = setTimeout(() => {
    // se veio da barra ou houve redução, executa vibração/ som conforme regra
    if (antes === 1 && novo === 0) {
      // morte: vibração longa (sem som)
      tentarVibrar(VIB_MORTE);
    } else {
      // dano/ajuste normal: som + vibração
      somDano.currentTime = 0;
      somDano.play().catch(()=>{});
      tentarVibrar(VIB_DANO);
    }
    timerVida = null;
  }, 1000);
}

function agendarSanidade(novo, antes, options = {}) {
  clearTimeout(timerSanidade);
  const fromBar = options.fromBar === true;
  if (!fromBar && novo >= antes) return;
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
    if (novo !== antes) agendarVida(novo, antes); // buttons: mantêm regra original (somente se diminuiu)
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
   HOLD (segurar) usando pointer events
   inicia após 300ms, repete a cada 120ms
   Comportamento dos botões mantido (segurar repete).
========================= */
function startHold(id, tipo, delta) {
  stopHold(id);
  // start repeating after initial hold
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
   NOVA REGRA: ao ajustar via barra, a vibração será executada APENAS
   pelo agendador (agendarVida/agtSanidade) após 1s — independente de aumento/diminuição.
   NÃO vibra ao segurar nem imediatamente ao soltar.
========================= */
function setupBarDrag(containerEl, tipo) {
  let active = false, activeId = null;
  let holdTimer = null;
  let holdActive = false;

  function startBarHold() {
    cancelBarHold();
    holdActive = false;
    holdTimer = setTimeout(() => {
      holdActive = true;
      // não vibra aqui
    }, 300);
  }

  function cancelBarHold() {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    holdActive = false;
  }

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
    startBarHold();

    if (tipo === "vida") {
      const max = Math.max(1, toIntSafe(vidaMaxInput.value, 100));
      const novo = calcValor(e.clientX, max);
      const antes = vidaAtual;
      if (novo !== antes) agendarVida(novo, antes, { fromBar: true }); // força agendamento mesmo se aumentou
      vidaAtual = novo;
      atualizarBarraVisual(vidaAtual, max, vidaBarInner, vidaAtualSpan);
      salvarEstado();
    } else {
      const max = Math.max(1, toIntSafe(sanidadeMaxInput.value, 100));
      const novo = calcValor(e.clientX, max);
      const antes = sanidadeAtual;
      if (novo !== antes) agendarSanidade(novo, antes, { fromBar: true });
      sanidadeAtual = novo;
      atualizarBarraVisual(sanidadeAtual, max, sanidadeBarInner, sanidadeAtualSpan);
      salvarEstado();
    }
  });

  containerEl.addEventListener("pointermove", (e) => {
    if (!active || activeId !== e.pointerId) return;
    // holdActive apenas indica que o user está segurando por >300ms (mas não disparamos vibração aqui)
    if (!holdActive) {
      // sem-op
    }
    if (tipo === "vida") {
      const max = Math.max(1, toIntSafe(vidaMaxInput.value, 100));
      const novo = calcValor(e.clientX, max);
      const antes = vidaAtual;
      if (novo !== antes) agendarVida(novo, antes, { fromBar: true }); // reagenda continuamente; último permanece
      vidaAtual = novo;
      atualizarBarraVisual(vidaAtual, max, vidaBarInner, vidaAtualSpan);
      salvarEstado();
    } else {
      const max = Math.max(1, toIntSafe(sanidadeMaxInput.value, 100));
      const novo = calcValor(e.clientX, max);
      const antes = sanidadeAtual;
      if (novo !== antes) agendarSanidade(novo, antes, { fromBar: true });
      sanidadeAtual = novo;
      atualizarBarraVisual(sanidadeAtual, max, sanidadeBarInner, sanidadeAtualSpan);
      salvarEstado();
    }
  });

  function release(e) {
    if (!active || activeId !== e.pointerId) return;
    try { containerEl.releasePointerCapture(activeId); } catch (err) {}
    active = false; activeId = null;
    cancelBarHold();

    // NÃO vibrar aqui; a vibração ocorrerá (se agendada) pelo agendador após 1s.
  }
  containerEl.addEventListener("pointerup", release);
  containerEl.addEventListener("pointercancel", release);
}

/* =========================
   ITEMS UI (contenteditable) - cria linhas e salva em localStorage
   REGRAS APLICADAS:
   - exatamente 8 caixas de texto (placeholders no HTML)
   - mantém bullets nas 8 caixas
   - máximo 50 caracteres por linha
   - impede quebras de linha (Enter / colar com \n)
*/
const ITEM_CHAR_LIMIT = 50;
const ITENS_FIXED_COUNT = 8;

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

/* helper para criar um li caso esteja faltando */
function criarLinhaItem(text = "") {
  const li = document.createElement("li");
  const img = document.createElement("img");
  img.src = "ponto_branco.png";
  img.className = "bullet";
  img.alt = "•";

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

  li.appendChild(img);
  li.appendChild(div);
  return li;
}

/* agora populamos reaproveitando os 8 placeholders do HTML
   - se houver menos de 8, cria os faltantes
   - se houver mais de 8 (por algum motivo), remove os extras
   - em seguida preenche cada .item-text */
function popularItens(arr) {
  // garantir que existam exatamente ITENS_FIXED_COUNT li placeholders
  let currentLis = Array.from(itensListEl.querySelectorAll("li"));
  // remove extras se tiver mais
  if (currentLis.length > ITENS_FIXED_COUNT) {
    for (let i = currentLis.length - 1; i >= ITENS_FIXED_COUNT; i--) {
      itensListEl.removeChild(currentLis[i]);
    }
    currentLis = Array.from(itensListEl.querySelectorAll("li"));
  }
  // cria faltantes se houver menos
  while (currentLis.length < ITENS_FIXED_COUNT) {
    const newLi = criarLinhaItem("");
    itensListEl.appendChild(newLi);
    currentLis.push(newLi);
  }

  // agora preenche os textos
  for (let i = 0; i < ITENS_FIXED_COUNT; i++) {
    const raw = arr[i] ?? "";
    const texto = sanitizeTextForItem(raw);
    const li = currentLis[i];
    // encontrar a div.item-text dentro do li (se já existir, reutiliza; se não, cria)
    let div = li.querySelector(".item-text");
    if (!div) {
      div = document.createElement("div");
      div.className = "item-text";
      div.contentEditable = "true";
      li.appendChild(div);

      // adicionar listeners como em criarLinhaItem
      div.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          return;
        }
      });
      div.addEventListener("paste", (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text') || "";
        const clean = sanitizeTextForItem(paste);
        const current = div.innerText || "";
        const remaining = ITEM_CHAR_LIMIT - current.length;
        const toInsert = clean.slice(0, Math.max(0, remaining));
        if (toInsert.length > 0) {
          insertTextAtCursor(toInsert);
        }
        setTimeout(() => {
          const final = sanitizeTextForItem(div.innerText);
          if (final !== div.innerText) {
            div.innerText = final;
            placeCaretAtEnd(div);
          }
          salvarEstadoDebounced();
        }, 0);
      });
      div.addEventListener("input", () => {
        const raw2 = div.innerText;
        const clean2 = sanitizeTextForItem(raw2);
        if (clean2 !== raw2) {
          div.innerText = clean2;
          placeCaretAtEnd(div);
        }
        salvarEstadoDebounced();
      });
      div.addEventListener("blur", salvarEstado);
    }
    // set text (preserva caret by not focusing)
    if (div.innerText !== texto) div.innerText = texto;
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
  let itens = Array.from(itensListEl.querySelectorAll(".item-text")).map(d => sanitizeTextForItem(d.innerText));
  // garantir exatamente 8 itens salvos (truncar ou preencher com "")
  itens = itens.slice(0, ITENS_FIXED_COUNT);
  while (itens.length < ITENS_FIXED_COUNT) itens.push("");

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
    let itensSanitizados = (e.itens || []).map(i => sanitizeTextForItem(i));
    // garantir exatamente 8 itens carregados (truncar ou preencher com "")
    itensSanitizados = itensSanitizados.slice(0, ITENS_FIXED_COUNT);
    while (itensSanitizados.length < ITENS_FIXED_COUNT) itensSanitizados.push("");
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

setupBarDrag(vidaContainer, "vida");
setupBarDrag(sanidadeContainer, "sanidade");

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
