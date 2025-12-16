// valores iniciais
let vidaAtual = 100;
let sanidadeAtual = 100;

// obtém inputs e elementos
const vidaBar = document.getElementById("vida-barra");
const sanidadeBar = document.getElementById("sanidade-barra");

const vidaAtualSpan = document.getElementById("vida-atual");
const sanidadeAtualSpan = document.getElementById("sanidade-atual");

const vidaMaxInput = document.getElementById("vida-max-input");
const sanidadeMaxInput = document.getElementById("sanidade-max-input");

const vidaMaisBtn = document.getElementById("vida-mais");
const vidaMenosBtn = document.getElementById("vida-menos");
const sanidadeMaisBtn = document.getElementById("sanidade-mais");
const sanidadeMenosBtn = document.getElementById("sanidade-menos");

// retorna número seguro
function toIntSafe(v, fallback = 0) {
  const n = parseInt(v);
  return isNaN(n) ? fallback : n;
}

// atualiza visual da barra (protege divisão por zero)
function atualizarBarraVisual(atual, max, barraEl, spanEl) {
  const safeMax = Math.max(1, toIntSafe(max, 1));
  const porcent = Math.max(0, Math.min(100, (atual / safeMax) * 100));
  barraEl.style.width = porcent + "%";
  spanEl.innerText = atual;
}

// função de alterar valores (com clamp)
function alterarValor(tipo, delta) {
  if (tipo === "vida") {
    vidaAtual = Math.max(0, Math.min(vidaAtual + delta, toIntSafe(vidaMaxInput.value, 100)));
    atualizarBarraVisual(vidaAtual, vidaMaxInput.value, vidaBar, vidaAtualSpan);
  } else {
    sanidadeAtual = Math.max(0, Math.min(sanidadeAtual + delta, toIntSafe(sanidadeMaxInput.value, 100)));
    atualizarBarraVisual(sanidadeAtual, sanidadeMaxInput.value, sanidadeBar, sanidadeAtualSpan);
  }
}

// listeners dos botões
vidaMaisBtn.addEventListener("click", () => alterarValor("vida", 1));
vidaMenosBtn.addEventListener("click", () => alterarValor("vida", -1));
sanidadeMaisBtn.addEventListener("click", () => alterarValor("sanidade", 1));
sanidadeMenosBtn.addEventListener("click", () => alterarValor("sanidade", -1));

// quando o máximo é alterado
vidaMaxInput.addEventListener("input", () => {
  let max = Math.max(1, toIntSafe(vidaMaxInput.value, 1));
  vidaMaxInput.value = max;              // normaliza o valor exibido
  if (vidaAtual > max) vidaAtual = max; // ajusta o atual se necessário
  atualizarBarraVisual(vidaAtual, max, vidaBar, vidaAtualSpan);
});

sanidadeMaxInput.addEventListener("input", () => {
  let max = Math.max(1, toIntSafe(sanidadeMaxInput.value, 1));
  sanidadeMaxInput.value = max;
  if (sanidadeAtual > max) sanidadeAtual = max;
  atualizarBarraVisual(sanidadeAtual, max, sanidadeBar, sanidadeAtualSpan);
});

// inicialização visual
atualizarBarraVisual(vidaAtual, vidaMaxInput.value, vidaBar, vidaAtualSpan);
atualizarBarraVisual(sanidadeAtual, sanidadeMaxInput.value, sanidadeBar, sanidadeAtualSpan);
