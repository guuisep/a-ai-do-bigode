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

export default function LaboratorioPage() {
  const [etapa, setEtapa] = useState<Etapa>("identificacao");
  const [carregando, setCarregando] = useState(true);

  // Dados vindos do banco
  const [tamanhos, setTamanhos] = useState<TamanhoCopo[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);

  // Identificação do criador
  const [nome, setNome] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pin, setPin] = useState("");
  const [criadorId, setCriadorId] = useState<string | null>(null);
  const [erroIdentificacao, setErroIdentificacao] = useState<string | null>(null);

  // Montagem do copo
  const [tamanhoEscolhido, setTamanhoEscolhido] = useState<TamanhoCopo | null>(null);
  const [apenasAcai, setApenasAcai] = useState(false);
  const [camadas, setCamadas] = useState<Camada[]>([]);
  const [potinho, setPotinho] = useState<ItemPotinho[]>([]);
  const [nomeCopo, setNomeCopo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroFinalizar, setErroFinalizar] = useState<string | null>(null);

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

  function escolherTamanho(tamanho: TamanhoCopo) {
    setTamanhoEscolhido(tamanho);
    setCamadas([]);
    setPotinho([]);
    setApenasAcai(false);
    setEtapa("montagem");
  }

  function contarNoTipo(tipo: string): number {
    return camadas.filter((c) => c.ingrediente.tipo === tipo).length;
  }

  function podeAdicionar(ingrediente: Ingrediente): boolean {
    if (apenasAcai) return false;
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
        apenas_acai: apenasAcai,
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
        <TamanhoEtapa tamanhos={tamanhos} onEscolher={escolherTamanho} />
      )}

      {etapa === "montagem" && tamanhoEscolhido && (
        <MontagemEtapa
          tamanho={tamanhoEscolhido}
          ingredientes={ingredientes}
          camadas={camadas}
          potinho={potinho}
          apenasAcai={apenasAcai}
          setApenasAcai={setApenasAcai}
          podeAdicionar={podeAdicionar}
          contarNoTipo={contarNoTipo}
          onAdicionar={adicionarCamada}
          onRemover={removerCamada}
          onMover={moverCamada}
          onAlterarPotinho={alterarPotinho}
          onContinuar={() => setEtapa("finalizar")}
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
          placeholder="PIN de 4 dígitos"
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
// Etapa 2 — Escolha do tamanho
// ==================================================
function TamanhoEtapa(props: {
  tamanhos: TamanhoCopo[];
  onEscolher: (t: TamanhoCopo) => void;
}) {
  const alturas: Record<string, string> = { "500ml": "h-24", "700ml": "h-32", "1L": "h-40" };

  return (
    <section className="max-w-md mx-auto px-6 py-10">
      <h2 className="font-display text-2xl text-acai-dark mb-6 text-center">
        Escolha o tamanho
      </h2>
      <div className="flex items-end justify-center gap-4">
        {props.tamanhos.map((t) => (
          <button
            key={t.id}
            onClick={() => props.onEscolher(t)}
            className="flex flex-col items-center gap-2 group"
          >
            <div
              className={`w-16 ${alturas[t.nome] ?? "h-28"} rounded-b-2xl rounded-t-md border-2 border-acai/30 bg-white group-hover:border-bigode group-hover:bg-bigode/10 transition-colors`}
            />
            <span className="text-sm font-medium text-acai-dark">{t.nome}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// ==================================================
// Etapa 3 — Montagem (copo transparente + blocos)
// ==================================================
function MontagemEtapa(props: {
  tamanho: TamanhoCopo;
  ingredientes: Ingrediente[];
  camadas: Camada[];
  potinho: ItemPotinho[];
  apenasAcai: boolean;
  setApenasAcai: (v: boolean) => void;
  podeAdicionar: (i: Ingrediente) => boolean;
  contarNoTipo: (tipo: string) => number;
  onAdicionar: (i: Ingrediente) => void;
  onRemover: (index: number) => void;
  onMover: (index: number, direcao: -1 | 1) => void;
  onAlterarPotinho: (i: Ingrediente, delta: number) => void;
  onContinuar: () => void;
}) {
  const gruposIngredientes = ["creme_nobre", "fruta", "seco", "parede"] as const;
  const ingredientesParaPotinho = props.ingredientes.filter((i) => i.tipo !== "parede");

  return (
    <section className="max-w-md mx-auto px-6 py-8">
      {/* Copo transparente */}
      <div className="flex justify-center mb-6">
        <div className="w-40 min-h-[10rem] rounded-b-3xl rounded-t-lg border-2 border-acai/30 bg-white/40 backdrop-blur-sm flex flex-col-reverse overflow-hidden">
          {props.camadas.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-xs text-acai/40 p-4 text-center">
              {props.tamanho.nome} — comece adicionando ingredientes
            </div>
          ) : (
            props.camadas.map((c, i) => (
              <div
                key={i}
                className="h-8 flex items-center justify-center text-[10px] text-white/90 font-medium"
                style={{ backgroundColor: c.ingrediente.cor }}
              >
                {c.ingrediente.nome}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lista de camadas com reordenação */}
      {props.camadas.length > 0 && (
        <div className="mb-6 flex flex-col gap-1.5">
          {props.camadas.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-white rounded-lg px-3 py-1.5 border border-acai/10"
            >
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: c.ingrediente.cor }}
              />
              <span className="text-sm flex-1 text-acai-dark">{c.ingrediente.nome}</span>
              <button onClick={() => props.onMover(i, -1)} className="text-acai/50 px-1">
                ↑
              </button>
              <button onClick={() => props.onMover(i, 1)} className="text-acai/50 px-1">
                ↓
              </button>
              <button onClick={() => props.onRemover(i)} className="text-red-500 px-1">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Apenas açaí */}
      <label className="flex items-center gap-2 mb-6 text-sm text-acai-dark">
        <input
          type="checkbox"
          checked={props.apenasAcai}
          onChange={(e) => props.setApenasAcai(e.target.checked)}
        />
        Apenas açaí (sem complementos)
      </label>

      {/* Paleta de ingredientes por tipo */}
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
                    className={`text-sm rounded-full px-3 py-1.5 border transition-colors ${
                      habilitado
                        ? "border-acai/20 bg-white hover:border-bigode hover:bg-bigode/10 text-acai-dark"
                        : "border-acai/10 bg-acai/5 text-acai/30 cursor-not-allowed"
                    }`}
                  >
                    {ing.nome}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Potinho adicional */}
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
                  <button
                    onClick={() => props.onAlterarPotinho(ing, -1)}
                    className="text-acai/50 w-6"
                  >
                    −
                  </button>
                  <span className="text-sm w-4 text-center">{qtd}</span>
                  <button
                    onClick={() => props.onAlterarPotinho(ing, 1)}
                    className="text-acai/50 w-6"
                  >
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
