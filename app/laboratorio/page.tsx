"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { buildWhatsappLink } from "@/lib/whatsapp";
import {
  buildMensagemLaboratorio,
  calcularPrecoFinal,
  formatarPreco,
} from "@/lib/laboratorio-helpers";
import {
  Camada,
  Ingrediente,
  ItemPotinho,
  TamanhoCopo,
} from "@/lib/laboratorio-types";

type Etapa = "identificacao" | "tamanho" | "montagem" | "finalizar";

const LIMITE_POR_TIPO: Record<string, "limite_creme_nobre" | "limite_frutas" | "limite_secos"> = {
  creme_nobre: "limite_creme_nobre",
  fruta: "limite_frutas",
  seco: "limite_secos",
};

const NOME_TIPO: Record<string, string> = {
  creme_nobre: "Cremes e recheios nobres",
  fruta: "Frutas",
  seco: "Acompanhamentos secos",
  parede: "Parede do copo",
};

const FORMATO_POR_TAMANHO: Record<string, "copo" | "pote"> = {
  "500ml": "copo",
  "700ml": "copo",
  "1L": "pote",
};

const CLIP_PATH: Record<"copo" | "pote", string> = {
  copo: "polygon(14% 0%, 86% 0%, 78% 100%, 22% 100%)",
  pote: "polygon(4% 0%, 96% 0%, 90% 100%, 10% 100%)",
};

const DIMENSOES: Record<string, { largura: number; altura: number }> = {
  "500ml": { largura: 112, altura: 168 },
  "700ml": { largura: 132, altura: 208 },
  "1L": { largura: 224, altura: 132 },
};

const DIMENSOES_MINI: Record<string, { largura: number; altura: number }> = {
  "500ml": { largura: 56, altura: 84 },
  "700ml": { largura: 66, altura: 104 },
  "1L": { largura: 100, altura: 60 },
};

function texturaIngrediente(tipo: string, cor: string): React.CSSProperties {
  switch (tipo) {
    case "fruta":
      return {
        backgroundColor: cor,
        backgroundImage:
          "radial-gradient(circle at 25% 30%, rgba(255,255,255,0.4) 0 18%, transparent 19%), " +
          "radial-gradient(circle at 65% 65%, rgba(255,255,255,0.3) 0 14%, transparent 15%), " +
          "radial-gradient(circle at 85% 25%, rgba(255,255,255,0.25) 0 10%, transparent 11%)",
        backgroundSize: "26px 26px, 22px 22px, 18px 18px",
        backgroundRepeat: "repeat",
      };
    case "seco":
      return {
        backgroundColor: cor,
        backgroundImage:
          "repeating-radial-gradient(circle at center, rgba(255,255,255,0.55) 0 1.2px, transparent 1.6px 7px)",
        backgroundSize: "9px 9px",
      };
    case "creme_nobre":
      return {
        backgroundColor: cor,
        backgroundImage:
          "repeating-linear-gradient(115deg, rgba(255,255,255,0.18) 0 5px, transparent 5px 13px)",
      };
    default:
      return { backgroundColor: cor };
  }
}

export default function LaboratorioPage() {
  const [etapa, setEtapa] = useState<Etapa>("identificacao");
  const [carregando, setCarregando] = useState(true);

  const [tamanhos, setTamanhos] = useState<TamanhoCopo[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);

  const [nome, setNome] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pin, setPin] = useState("");
  const [criadorId, setCriadorId] = useState<string | null>(null);
  const [erroIdentificacao, setErroIdentificacao] = useState<string | null>(null);

  const [tamanhoEscolhido, setTamanhoEscolhido] = useState<TamanhoCopo | null>(null);
  const [tamanhoAnimando, setTamanhoAnimando] = useState<string | null>(null);
  const [camadas, setCamadas] = useState<Camada[]>([]);
  const [potinho, setPotinho] = useState<ItemPotinho[]>([]);
  const [nomeCopo, setNomeCopo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroFinalizar, setErroFinalizar] = useState<string | null>(null);

  const whatsappGeral = buildWhatsappLink(
    "Olá! Quero pedir um açaí tradicional, sem montar no Laboratório 🥭"
  );

  useEffect(() => {
    async function carregar() {
      const [{ data: tamanhosData }, { data: ingredientesData }] = await Promise.all([
        supabase
          .from("tamanhos_copo")
          .select("id, nome, preco_base, limite_creme_nobre, limite_frutas, limite_secos")
          .eq("ativo", true)
          .order("preco_base", { ascending: true }),
        supabase
          .from("ingredientes")
          .select("id, nome, tipo, preco, cor")
          .eq("ativo", true)
          .order("nome", { ascending: true }),
      ]);
      setTamanhos(tamanhosData ?? []);
      setIngredientes(ingredientesData ?? []);
      setCarregando(false);
    }
    carregar();
  }, []);

  async function confirmarIdentificacao() {
    setErroIdentificacao(null);

    if (!nome.trim() || !instagram.trim() || !whatsapp.trim() || pin.length !== 4) {
      setErroIdentificacao("Preencha nome, Instagram, WhatsApp e um PIN de 4 dígitos.");
      return;
    }

    const { data, error } = await supabase.rpc("verificar_ou_criar_criador", {
      p_nome: nome.trim(),
      p_instagram: instagram.trim(),
      p_whatsapp: whatsapp.trim(),
      p_pin: pin.trim(),
    });

    if (error) {
      if (error.message.includes("PIN_INCORRETO")) {
        setErroIdentificacao(
          "Esse WhatsApp já tem uma criação no Laboratório, mas o PIN não confere. Tente novamente."
        );
      } else {
        setErroIdentificacao("Não deu pra confirmar seus dados agora. Tente de novo em instantes.");
      }
      return;
    }

    setCriadorId(data as string);
    setEtapa("tamanho");
  }

  function handleEscolherTamanho(tamanho: TamanhoCopo) {
    if (tamanhoAnimando) return;
    setTamanhoAnimando(tamanho.id);
    setTimeout(() => {
      setTamanhoEscolhido(tamanho);
      setCamadas([]);
      setPotinho([]);
      setEtapa("montagem");
      setTamanhoAnimando(null);
    }, 450);
  }

  function contarNoTipo(tipo: string): number {
    return camadas.filter((c) => c.ingrediente.tipo === tipo).length;
  }

  function podeAdicionar(ingrediente: Ingrediente): boolean {
    if (ingrediente.tipo === "parede") return true;
    const chaveLimite = LIMITE_POR_TIPO[ingrediente.tipo];
    if (!chaveLimite || !tamanhoEscolhido) return true;
    return contarNoTipo(ingrediente.tipo) < tamanhoEscolhido[chaveLimite];
  }

  function adicionarCamada(ingrediente: Ingrediente) {
    if (!podeAdicionar(ingrediente)) return;
    const tipoAplicacao = ingrediente.tipo === "parede" ? "parede" : "camada";
    setCamadas((atual) => [...atual, { ingrediente, tipoAplicacao }]);
  }

  function removerCamada(index: number) {
    setCamadas((atual) => atual.filter((_, i) => i !== index));
  }

  function moverCamada(index: number, direcao: -1 | 1) {
    setCamadas((atual) => {
      const novoIndex = index + direcao;
      if (novoIndex < 0 || novoIndex >= atual.length) return atual;
      const copia = [...atual];
      [copia[index], copia[novoIndex]] = [copia[novoIndex], copia[index]];
      return copia;
    });
  }

  function alterarPotinho(ingrediente: Ingrediente, delta: number) {
    setPotinho((atual) => {
      const existente = atual.find((p) => p.ingrediente.id === ingrediente.id);
      if (!existente) {
        return delta > 0 ? [...atual, { ingrediente, quantidade: 1 }] : atual;
      }
      const novaQtd = existente.quantidade + delta;
      if (novaQtd <= 0) {
        return atual.filter((p) => p.ingrediente.id !== ingrediente.id);
      }
      return atual.map((p) =>
        p.ingrediente.id === ingrediente.id ? { ...p, quantidade: novaQtd } : p
      );
    });
  }

  async function finalizarPedido() {
    if (!tamanhoEscolhido || !criadorId) return;
    if (!nomeCopo.trim()) {
      setErroFinalizar("Dê um nome pra sua criação antes de finalizar.");
      return;
    }

    setSalvando(true);
    setErroFinalizar(null);

    const precoFinal = calcularPrecoFinal(tamanhoEscolhido, camadas, potinho);

    const { data: copo, error: erroCopo } = await supabase
      .from("copos_criados")
      .insert({
        criador_id: criadorId,
        tamanho_id: tamanhoEscolhido.id,
        nome_copo: nomeCopo.trim(),
        apenas_acai: false,
        preco_final: precoFinal,
      })
      .select("id")
      .single();

    if (erroCopo || !copo) {
      setErroFinalizar("Não deu pra salvar seu copo agora. Tente de novo em instantes.");
      setSalvando(false);
      return;
    }

    const linhasCamadas = camadas.map((c, i) => ({
      copo_id: copo.id,
      ingrediente_id: c.ingrediente.id,
      posicao: i,
      tipo_aplicacao: c.tipoAplicacao,
    }));

    const linhasPotinho = potinho.flatMap((p, grupoIndex) =>
      Array.from({ length: p.quantidade }).map((_, unidadeIndex) => ({
        copo_id: copo.id,
        ingrediente_id: p.ingrediente.id,
        posicao: 1000 + grupoIndex * 100 + unidadeIndex,
        tipo_aplicacao: "potinho_adicional" as const,
      }))
    );

    if (linhasCamadas.length + linhasPotinho.length > 0) {
      const { error: erroCamadas } = await supabase
        .from("copo_camadas")
        .insert([...linhasCamadas, ...linhasPotinho]);

      if (erroCamadas) {
        setErroFinalizar("Seu copo foi salvo, mas houve um problema ao salvar as camadas.");
        setSalvando(false);
        return;
      }
    }

    const mensagem = buildMensagemLaboratorio({
      nomeCopo: nomeCopo.trim(),
      nomeCriador: nome.trim(),
      tamanho: tamanhoEscolhido,
      camadas,
      potinho,
      precoFinal,
    });

    window.location.href = buildWhatsappLink(mensagem);
  }

  if (carregando) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-acai/60">Carregando o Laboratório...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream pb-16">
      <header className="bg-acai text-cream px-6 py-5 flex items-center justify-between">
        <Link href="/" className="text-cream/80 text-sm hover:text-bigode">
          ← Voltar
        </Link>
        <h1 className="font-display text-xl">Laboratório</h1>
        <span className="w-10" />
      </header>

      {etapa === "identificacao" && (
        <IdentificacaoEtapa
          nome={nome}
          setNome={setNome}
          instagram={instagram}
          setInstagram={setInstagram}
          whatsapp={whatsapp}
          setWhatsapp={setWhatsapp}
          pin={pin}
          setPin={setPin}
          erro={erroIdentificacao}
          onConfirmar={confirmarIdentificacao}
        />
      )}

      {etapa === "tamanho" && (
        <TamanhoEtapa
          tamanhos={tamanhos}
          tamanhoAnimando={tamanhoAnimando}
          onEscolher={handleEscolherTamanho}
        />
      )}

      {etapa === "montagem" && tamanhoEscolhido && (
        <MontagemEtapa
          tamanho={tamanhoEscolhido}
          ingredientes={ingredientes}
          camadas={camadas}
          potinho={potinho}
          podeAdicionar={podeAdicionar}
          onAdicionar={adicionarCamada}
          onRemover={removerCamada}
          onMover={moverCamada}
          onAlterarPotinho={alterarPotinho}
          onContinuar={() => setEtapa("finalizar")}
          whatsappGeral={whatsappGeral}
        />
      )}

      {etapa === "finalizar" && tamanhoEscolhido && (
        <FinalizarEtapa
          tamanho={tamanhoEscolhido}
          camadas={camadas}
          potinho={potinho}
          nomeCopo={nomeCopo}
          setNomeCopo={setNomeCopo}
          salvando={salvando}
          erro={erroFinalizar}
          onVoltar={() => setEtapa("montagem")}
          onFinalizar={finalizarPedido}
        />
      )}
    </main>
  );
}

// ==================================================
// Etapa 1 — Identificação / login do criador
// ==================================================
function IdentificacaoEtapa(props: {
  nome: string;
  setNome: (v: string) => void;
  instagram: string;
  setInstagram: (v: string) => void;
  whatsapp: string;
  setWhatsapp: (v: string) => void;
  pin: string;
  setPin: (v: string) => void;
  erro: string | null;
  onConfirmar: () => void;
}) {
  return (
    <section className="max-w-md mx-auto px-6 py-10">
      <h2 className="font-display text-2xl text-acai-dark mb-2">Antes de montar...</h2>
      <p className="text-acai/70 text-sm mb-6">
        Seu copo vai aparecer no Hall da Fama com seu nome. Se você criar mais copos no
        futuro, use o mesmo WhatsApp e PIN pra continuar no seu mesmo perfil.
      </p>

      <div className="flex flex-col gap-3">
        <input
          className="rounded-xl border border-acai/20 px-4 py-3 bg-white"
          placeholder="Seu nome"
          value={props.nome}
          onChange={(e) => props.setNome(e.target.value)}
        />
        <input
          className="rounded-xl border border-acai/20 px-4 py-3 bg-white"
          placeholder="@seu.instagram"
          value={props.instagram}
          onChange={(e) => props.setInstagram(e.target.value)}
        />
        <input
          className="rounded-xl border border-acai/20 px-4 py-3 bg-white"
          placeholder="WhatsApp (com DDD)"
          value={props.whatsapp}
          onChange={(e) => props.setWhatsapp(e.target.value)}
        />
        <input
          className="rounded-xl border border-acai/20 px-4 py-3 bg-white tracking-widest"
          placeholder="Crie um PIN de 4 números (você escolhe)"
          inputMode="numeric"
          maxLength={4}
          value={props.pin}
          onChange={(e) => props.setPin(e.target.value.replace(/\D/g, ""))}
        />

        {props.erro && <p className="text-sm text-red-600">{props.erro}</p>}

        <p className="text-xs text-acai/50">
          Seu Instagram e WhatsApp ficam visíveis só para a loja — usamos pra avisar você
          quando bater uma meta de vendas. Seu nome de exibição aparece publicamente no
          Hall da Fama.
        </p>

        <button
          onClick={props.onConfirmar}
          className="mt-2 rounded-full bg-acai text-cream font-semibold py-3 hover:bg-acai-light transition-colors"
        >
          Continuar
        </button>
      </div>
    </section>
  );
}

// ==================================================
// Formato visual do copo/pote (reaproveitado nas duas etapas)
// ==================================================
function FormaRecipiente(props: {
  tamanhoNome: string;
  largura: number;
  altura: number;
  children?: React.ReactNode;
}) {
  const formato = FORMATO_POR_TAMANHO[props.tamanhoNome] ?? "copo";
  return (
    <div
      className="relative border-2 border-acai/30 bg-white/50 overflow-hidden flex flex-col-reverse"
      style={{
        width: props.largura,
        height: props.altura,
        clipPath: CLIP_PATH[formato],
      }}
    >
      {props.children}
    </div>
  );
}

// ==================================================
// Etapa 2 — Escolha do tamanho, com animação
// ==================================================
function TamanhoEtapa(props: {
  tamanhos: TamanhoCopo[];
  tamanhoAnimando: string | null;
  onEscolher: (t: TamanhoCopo) => void;
}) {
  return (
    <section className="max-w-md mx-auto px-6 py-10">
      <h2 className="font-display text-2xl text-acai-dark mb-8 text-center">
        Escolha o tamanho
      </h2>
      <div className="flex items-end justify-center gap-5 min-h-[13rem]">
        {props.tamanhos.map((t) => {
          const dim = DIMENSOES_MINI[t.nome] ?? { largura: 60, altura: 90 };
          const estaAnimando = props.tamanhoAnimando !== null;
          const escolhido = props.tamanhoAnimando === t.id;
          return (
            <button
              key={t.id}
              onClick={() => props.onEscolher(t)}
              disabled={estaAnimando}
              className={`flex flex-col items-center gap-2 transition-all duration-500 ease-out ${
                escolhido
                  ? "scale-125 opacity-100 z-10"
                  : estaAnimando
                  ? "scale-75 opacity-0"
                  : "scale-100 opacity-100 hover:scale-105"
              }`}
            >
              <FormaRecipiente tamanhoNome={t.nome} largura={dim.largura} altura={dim.altura} />
              <span className="text-sm font-medium text-acai-dark">{t.nome}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ==================================================
// Etapa 3 — Montagem (copo com formato real + texturas)
// ==================================================
function MontagemEtapa(props: {
  tamanho: TamanhoCopo;
  ingredientes: Ingrediente[];
  camadas: Camada[];
  potinho: ItemPotinho[];
  podeAdicionar: (i: Ingrediente) => boolean;
  onAdicionar: (i: Ingrediente) => void;
  onRemover: (index: number) => void;
  onMover: (index: number, direcao: -1 | 1) => void;
  onAlterarPotinho: (i: Ingrediente, delta: number) => void;
  onContinuar: () => void;
  whatsappGeral: string;
}) {
  const gruposIngredientes = ["creme_nobre", "fruta", "seco"] as const;
  const paredes = props.ingredientes.filter((i) => i.tipo === "parede");
  const ingredientesParaPotinho = props.ingredientes.filter((i) => i.tipo !== "parede");
  const camadasParede = props.camadas.filter((c) => c.tipoAplicacao === "parede");
  const camadasNormais = props.camadas.filter((c) => c.tipoAplicacao !== "parede");
  const dim = DIMENSOES[props.tamanho.nome] ?? { largura: 160, altura: 200 };

  return (
    <section className="max-w-md mx-auto px-6 py-8">
      <div className="flex justify-center mb-2">
        <div className="relative">
          <FormaRecipiente tamanhoNome={props.tamanho.nome} largura={dim.largura} altura={dim.altura}>
            {camadasNormais.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-acai/40 p-4 text-center">
                {props.tamanho.nome} — comece adicionando ingredientes
              </div>
            ) : (
              camadasNormais.map((c, i) => (
                <div
                  key={i}
                  className="flex-1 min-h-[1.75rem] flex items-center justify-center text-[10px] text-white font-medium"
                  style={{
                    ...texturaIngrediente(c.ingrediente.tipo, c.ingrediente.cor),
                    textShadow: "0 1px 2px rgba(0,0,0,0.4)",
                  }}
                >
                  {c.ingrediente.nome}
                </div>
              ))
            )}
          </FormaRecipiente>

          {camadasParede.map((c, i) => (
            <div key={i}>
              <div
                className="absolute top-0 bottom-0 left-0 w-2.5 opacity-90"
                style={{
                  backgroundColor: c.ingrediente.cor,
                  clipPath: "polygon(0 0, 100% 0, 100% 85%, 60% 100%, 30% 90%, 0 100%)",
                }}
              />
              <div
                className="absolute top-0 bottom-0 right-0 w-2.5 opacity-90"
                style={{
                  backgroundColor: c.ingrediente.cor,
                  clipPath: "polygon(0 0, 100% 0, 100% 100%, 70% 90%, 40% 100%, 0 85%)",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-acai/50 mb-6">
        Quer só açaí puro, sem nada?{" "}
        <Link href="/" className="underline hover:text-bigode">
          Peça pelo Cardápio
        </Link>{" "}
        ou{" "}
        <a href={props.whatsappGeral} className="underline hover:text-bigode">
          chame no WhatsApp
        </a>{" "}
        — o Laboratório é pra combinações.
      </p>

      {props.camadas.length > 0 && (
        <div className="mb-6 flex flex-col gap-1.5">
          {props.camadas.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-acai/10"
            >
              <span
                className="w-4 h-4 rounded-full shrink-0 border border-black/10"
                style={texturaIngrediente(c.ingrediente.tipo, c.ingrediente.cor)}
              />
              <span className="text-sm flex-1 text-acai-dark">
                {c.ingrediente.nome}
                {c.tipoAplicacao === "parede" && <span className="text-acai/40"> (parede)</span>}
              </span>
              {c.tipoAplicacao !== "parede" && (
                <>
                  <button onClick={() => props.onMover(i, -1)} className="text-acai/50 px-1">
                    ↑
                  </button>
                  <button onClick={() => props.onMover(i, 1)} className="text-acai/50 px-1">
                    ↓
                  </button>
                </>
              )}
              <button onClick={() => props.onRemover(i)} className="text-red-500 px-1">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {gruposIngredientes.map((tipo) => {
        const itens = props.ingredientes.filter((i) => i.tipo === tipo);
        if (itens.length === 0) return null;
        const chaveLimite = LIMITE_POR_TIPO[tipo];
        const limite = chaveLimite ? props.tamanho[chaveLimite] : null;

        return (
          <div key={tipo} className="mb-5">
            <p className="text-xs font-semibold text-acai/60 mb-2">
              {NOME_TIPO[tipo]}
              {limite !== null && ` (até ${limite})`}
            </p>
            <div className="flex flex-wrap gap-2">
              {itens.map((ing) => {
                const habilitado = props.podeAdicionar(ing);
                return (
                  <button
                    key={ing.id}
                    disabled={!habilitado}
                    onClick={() => props.onAdicionar(ing)}
                    className={`flex items-center gap-1.5 text-sm rounded-full pl-1.5 pr-3 py-1 border transition-colors ${
                      habilitado
                        ? "border-acai/20 bg-white hover:border-bigode hover:bg-bigode/10 text-acai-dark"
                        : "border-acai/10 bg-acai/5 text-acai/30 cursor-not-allowed"
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={texturaIngrediente(ing.tipo, ing.cor)}
                    />
                    {ing.nome}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {paredes.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-acai/60 mb-2">{NOME_TIPO.parede}</p>
          <div className="flex flex-wrap gap-2">
            {paredes.map((ing) => (
              <button
                key={ing.id}
                onClick={() => props.onAdicionar(ing)}
                className="flex items-center gap-1.5 text-sm rounded-full pl-1.5 pr-3 py-1 border border-acai/20 bg-white hover:border-bigode hover:bg-bigode/10 text-acai-dark transition-colors"
              >
                <span
                  className="w-4 h-4 rounded-full border border-black/10"
                  style={{ backgroundColor: ing.cor }}
                />
                {ing.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <p className="text-xs font-semibold text-acai/60 mb-2">
          Potinho adicional (ilimitado, cobrado por unidade)
        </p>
        <div className="flex flex-col gap-1.5">
          {ingredientesParaPotinho.map((ing) => {
            const item = props.potinho.find((p) => p.ingrediente.id === ing.id);
            const qtd = item?.quantidade ?? 0;
            return (
              <div
                key={ing.id}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-acai/10"
              >
                <span className="text-sm text-acai-dark">{ing.nome}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => props.onAlterarPotinho(ing, -1)} className="text-acai/50 w-6">
                    −
                  </button>
                  <span className="text-sm w-4 text-center">{qtd}</span>
                  <button onClick={() => props.onAlterarPotinho(ing, 1)} className="text-acai/50 w-6">
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={props.onContinuar}
        className="w-full rounded-full bg-acai text-cream font-semibold py-3 hover:bg-acai-light transition-colors"
      >
        Continuar
      </button>
    </section>
  );
}

// ==================================================
// Etapa 4 — Nomear e finalizar
// ==================================================
function FinalizarEtapa(props: {
  tamanho: TamanhoCopo;
  camadas: Camada[];
  potinho: ItemPotinho[];
  nomeCopo: string;
  setNomeCopo: (v: string) => void;
  salvando: boolean;
  erro: string | null;
  onVoltar: () => void;
  onFinalizar: () => void;
}) {
  const preco = calcularPrecoFinal(props.tamanho, props.camadas, props.potinho);

  return (
    <section className="max-w-md mx-auto px-6 py-8">
      <h2 className="font-display text-2xl text-acai-dark mb-4">Dê um nome à sua criação</h2>

      <input
        className="w-full rounded-xl border border-acai/20 px-4 py-3 bg-white mb-4"
        placeholder='Ex: "Açaí Extremo"'
        value={props.nomeCopo}
        onChange={(e) => props.setNomeCopo(e.target.value)}
      />

      <div className="bg-white rounded-xl border border-acai/10 p-4 mb-6">
        <p className="text-sm text-acai/60 mb-1">{props.tamanho.nome}</p>
        <p className="text-sm text-acai-dark mb-3">
          {props.camadas.length > 0
            ? props.camadas.map((c) => c.ingrediente.nome).join(", ")
            : "Apenas açaí"}
        </p>
        <p className="font-display text-xl text-acai-dark">{formatarPreco(preco)}</p>
      </div>

      {props.erro && <p className="text-sm text-red-600 mb-4">{props.erro}</p>}

      <div className="flex gap-3">
        <button
          onClick={props.onVoltar}
          className="flex-1 rounded-full border border-acai/30 text-acai-dark font-semibold py-3"
        >
          Voltar
        </button>
        <button
          onClick={props.onFinalizar}
          disabled={props.salvando}
          className="flex-1 rounded-full bg-bigode text-acai-dark font-semibold py-3 hover:bg-bigode-light transition-colors disabled:opacity-50"
        >
          {props.salvando ? "Enviando..." : "Finalizar no WhatsApp"}
        </button>
      </div>
    </section>
  );
}
