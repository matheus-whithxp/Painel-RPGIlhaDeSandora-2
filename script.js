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
========================= */
function agendarVida(novo, antes) {
  clearTimeout(timerVida);
  if (novo >= antes) return;
  timerVida = setTimeout(() => {
    if (antes === 1 && novo === 0) {
      // morte: vibração longa (sem som)
      tentarVibrar(VIB_MORTE);
    } else {
      // dano normal
      somDano.currentTime = 0;
      somDano.play().catch(()=>{});
      tentarVibrar(VIB_DANO);
    }
    timerVida = null;
  }, 1000);
}

function agendarSanidade(novo, antes) {
  clearTimeout(timerSanidade);
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
   HOLD (segurar) usando pointer events
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
   Drag/touch directly on barra (pointer events)
   mapa posição -> valor proporcional
========================= */
function setupBarDrag(containerEl, tipo) {
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
    containerEl.setPointerCapture(activeId);
    if (tipo === "vida") {
      const max = Math.max(1, toIntSafe(vidaMaxInput.value, 100));
      const novo = calcValor(e.clientX, max);
      const antes = vidaAtual;
      if (novo !== antes) agendarVida(novo, antes);
      vidaAtual = novo;
      atualizarBarraVisual(vidaAtual, max, vidaBarInner, vidaAtualSpan);
      salvarEstado();
    } else {
      const max = Math.max(1, toIntSafe(sanidadeMaxInput.value, 100));
      const novo = calcValor(e.clientX, max);
      const antes = sanidadeAtual;
      if (novo !== antes) agendarSanidade(novo, antes);
      sanidadeAtual = novo;
      atualizarBarraVisual(sanidadeAtual, max, sanidadeBarInner, sanidadeAtualSpan);
      salvarEstado();
    }
  });

  containerEl.addEventListener("pointermove", (e) => {
    if (!active || activeId !== e.pointerId) return;
    if (tipo === "vida") {
      const max = Math.max(1, toIntSafe(vidaMaxInput.value, 100));
      const novo = calcValor(e.clientX, max);
      const antes = vidaAtual;
      if (novo !== antes) agendarVida(novo, antes);
      vidaAtual = novo;
      atualizarBarraVisual(vidaAtual, max, vidaBarInner, vidaAtualSpan);
      salvarEstado();
    } else {
      const max = Math.max(1, toIntSafe(sanidadeMaxInput.value, 100));
      const novo = calcValor(e.clientX, max);
      const antes = sanidadeAtual;
      if (novo !== antes) agendarSanidade(novo, antes);
      sanidadeAtual = novo;
      atualizarBarraVisual(sanidadeAtual, max, sanidadeBarInner, sanidadeAtualSpan);
      salvarEstado();
    }
  });

  function release(e) {
    if (!active || activeId !== e.pointerId) return;
    try { containerEl.releasePointerCapture(activeId); } catch (err) {}
    active = false; activeId = null;
  }
  containerEl.addEventListener("pointerup", release);
  containerEl.addEventListener("pointercancel", release);
}

/* =========================
   ITEMS UI (contenteditable) - cria linhas e salva em localStorage
========================= */
function criarLinhaItem(text = "") {
  const li = document.createElement("li");
  const img = document.createElement("img");
  img.src = "ponto_branco.png";
  img.className = "bullet";
  img.alt = "•";

  const div = document.createElement("div");
  div.className = "item-text";
  div.contentEditable = "true";
  div.innerText = text;
  // salvar no input
  div.addEventListener("input", salvarEstadoDebounced);
  div.addEventListener("blur", salvarEstado);

  li.appendChild(img);
  li.appendChild(div);
  return li;
}

function popularItens(arr) {
  itensListEl.innerHTML = "";
  const maxLinhas = Math.max(12, arr.length);
  for (let i=0;i<maxLinhas;i++) {
    const texto = arr[i] ?? (i===0 ? "TEXTO TAMANHO EXEMPLO DOS ITENS." : "");
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
  const itens = Array.from(itensListEl.querySelectorAll(".item-text")).map(d => d.innerText);
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
    // inicializa UI
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
    popularItens(e.itens ?? []);
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
