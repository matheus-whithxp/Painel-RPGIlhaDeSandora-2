let vidaAtual = 0;
let sanidadeAtual = 0;

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

const itensInput = document.getElementById("itens-input");

function atualizarBarra(atual, max, barra, texto) {
  const porcent = max > 0 ? (atual / max) * 100 : 0;
  barra.style.width = porcent + "%";
  texto.innerText = atual;

  barra.classList.remove("critico", "zerado");

  if (atual === 0) {
    barra.classList.add("zerado");
  } else if (atual <= 5) {
    barra.classList.add("critico");
  }
}

function alterar(tipo, delta) {
  if (tipo === "vida") {
    vidaAtual = Math.max(0, Math.min(vidaAtual + delta, vidaMaxInput.value));
    atualizarBarra(vidaAtual, vidaMaxInput.value, vidaBar, vidaAtualSpan);
  } else {
    sanidadeAtual = Math.max(0, Math.min(sanidadeAtual + delta, sanidadeMaxInput.value));
    atualizarBarra(sanidadeAtual, sanidadeMaxInput.value, sanidadeBar, sanidadeAtualSpan);
  }
  salvar();
}

vidaMaisBtn.onclick = () => alterar("vida", 1);
vidaMenosBtn.onclick = () => alterar("vida", -1);
sanidadeMaisBtn.onclick = () => alterar("sanidade", 1);
sanidadeMenosBtn.onclick = () => alterar("sanidade", -1);

/* ITENS – regras */
itensInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") e.preventDefault();
});

itensInput.addEventListener("input", () => {
  if (itensInput.innerText.length > 50) {
    itensInput.innerText = itensInput.innerText.slice(0, 50);
    placeCaretAtEnd(itensInput);
  }
  salvar();
});

function placeCaretAtEnd(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

/* salvar */
function salvar() {
  localStorage.setItem("painelRPG", JSON.stringify({
    vidaAtual,
    vidaMax: vidaMaxInput.value,
    sanidadeAtual,
    sanidadeMax: sanidadeMaxInput.value,
    itens: itensInput.innerText
  }));
}

function carregar() {
  const data = JSON.parse(localStorage.getItem("painelRPG"));
  if (!data) return;

  vidaAtual = data.vidaAtual ?? vidaAtual;
  sanidadeAtual = data.sanidadeAtual ?? sanidadeAtual;
  vidaMaxInput.value = data.vidaMax ?? vidaMaxInput.value;
  sanidadeMaxInput.value = data.sanidadeMax ?? sanidadeMaxInput.value;
  itensInput.innerText = data.itens ?? "";

  atualizarBarra(vidaAtual, vidaMaxInput.value, vidaBar, vidaAtualSpan);
  atualizarBarra(sanidadeAtual, sanidadeMaxInput.value, sanidadeBar, sanidadeAtualSpan);
}

carregar();
