import { Camada, ItemPotinho, TamanhoCopo } from "./laboratorio-types";

export function formatarPreco(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function calcularPrecoFinal(
  tamanho: TamanhoCopo,
  camadas: Camada[],
  potinho: ItemPotinho[]
): number {
  const precoCamadas = camadas.reduce((soma, c) => soma + c.ingrediente.preco, 0);
  const precoPotinho = potinho.reduce(
    (soma, p) => soma + p.ingrediente.preco * p.quantidade,
    0
  );
  return tamanho.preco_base + precoCamadas + precoPotinho;
}

export function buildMensagemLaboratorio(params: {
  nomeCopo: string;
  nomeCriador: string;
  tamanho: TamanhoCopo;
  camadas: Camada[];
  potinho: ItemPotinho[];
  precoFinal: number;
}): string {
  const { nomeCopo, nomeCriador, tamanho, camadas, potinho, precoFinal } = params;

  const linhasCamadas = camadas
    .map((c, i) => {
      const tag = c.tipoAplicacao === "parede" ? " (parede do copo)" : "";
      return `${i + 1}. ${c.ingrediente.nome}${tag}`;
    })
    .join("\n");

  const linhasPotinho = potinho.length
    ? potinho.map((p) => `- ${p.ingrediente.nome} x${p.quantidade}`).join("\n")
    : null;

  const partes = [
    "Olá! Acabei de montar meu açaí no Laboratório do Açaí do Bigode 🥭💜",
    "",
    `Criação: "${nomeCopo}" — por ${nomeCriador}`,
    `Tamanho: ${tamanho.nome}`,
    "",
    "Camadas (de baixo pra cima):",
    linhasCamadas || "(apenas açaí)",
  ];

  if (linhasPotinho) {
    partes.push("", "Potinho adicional:", linhasPotinho);
  }

  partes.push("", `Valor: ${formatarPreco(precoFinal)}`);

  return partes.join("\n");
}
