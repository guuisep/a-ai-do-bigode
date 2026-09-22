export type TipoIngrediente = "base" | "creme_nobre" | "fruta" | "seco" | "calda" | "parede";

export type Ingrediente = {
  id: string;
  nome: string;
  tipo: TipoIngrediente;
  preco: number;
  cor: string;
};

export type TamanhoCopo = {
  id: string;
  nome: string;
  preco_base: number;
  limite_creme_nobre: number;
  limite_frutas: number;
  limite_secos: number;
};

export type Camada = {
  ingrediente: Ingrediente;
  tipoAplicacao: "camada" | "parede";
};

export type ItemPotinho = {
  ingrediente: Ingrediente;
  quantidade: number;
};
