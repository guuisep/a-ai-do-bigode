export type ItemCardapio = {
  id: string;
  nome: string;
  ingredientes: string[];
  preco: string;
  fotoUrl?: string;
};

/**
 * Itens de exemplo — troque pelos itens e preços reais quando definidos.
 * No futuro, isso será substituído por dados vindos do Supabase (tabela itens_cardapio),
 * editáveis pelo painel admin.
 */
export const itensCardapio: ItemCardapio[] = [
  {
    id: "tradicional",
    nome: "Açaí Tradicional",
    ingredientes: ["Açaí", "Leite condensado", "Granola"],
    preco: "R$ 15,00",
  },
  {
    id: "morango",
    nome: "Açaí de Creme de Morango",
    ingredientes: ["Açaí", "Leite condensado", "Creme de morango", "Morango"],
    preco: "R$ 18,00",
  },
  {
    id: "ninho-nutela",
    nome: "Açaí de Creme de Ninho com Nutella",
    ingredientes: ["Açaí", "Leite condensado", "Creme de ninho", "Nutella"],
    preco: "R$ 20,00",
  },
];
