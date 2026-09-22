import Image from "next/image";
import Link from "next/link";
import { itensCardapio } from "@/data/cardapio";
import { buildWhatsappLink, buildPedidoCardapioMensagem } from "@/lib/whatsapp";

const linksPlataformas = [
  { nome: "iFood", url: "#" },
  { nome: "99Food", url: "#" },
  { nome: "Keeta", url: "#" },
];

export default function CardapioDigitalPage() {
  const whatsappGeral = buildWhatsappLink(
    "Olá! Vim pelo site do Açaí do Bigode 🥭💜"
  );

  return (
    <main>
      {/* Hero */}
      <section className="bg-acai text-cream">
        <div className="mx-auto max-w-3xl px-6 py-14 flex flex-col items-center text-center gap-4">
          <Image
            src="/logo.png"
            alt="Açaí do Bigode"
            width={160}
            height={140}
            priority
          />
          <h1 className="font-display text-3xl sm:text-4xl">Açaí do Bigode</h1>
          <p className="text-bigode-light text-lg italic">
            Açaí que faz o bigode sorrir
          </p>
          <p className="text-cream/80 text-sm">Zona Leste de São Paulo</p>

          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/laboratorio"
              className="inline-flex items-center gap-2 rounded-full bg-bigode text-acai-dark font-semibold px-6 py-3 hover:bg-bigode-light transition-colors"
            >
              Monte seu Açaí 🥭
            </Link>
            <a
              href={whatsappGeral}
              className="inline-flex items-center gap-2 rounded-full border border-cream/40 text-cream font-semibold px-6 py-3 hover:border-bigode hover:text-bigode transition-colors"
            >
              Falar no WhatsApp
            </a>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {linksPlataformas.map((p) => (
              <a
                key={p.nome}
                href={p.url}
                className="text-sm text-cream/90 border border-cream/30 rounded-full px-4 py-1.5 hover:border-bigode hover:text-bigode transition-colors"
              >
                Pedir no {p.nome}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Cardápio */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="font-display text-2xl text-acai-dark mb-1">
          Cardápio
        </h2>
        <p className="text-acai/70 mb-8">
          Escolha um açaí pronto — ou monte o seu no Laboratório.
        </p>

        <div className="grid sm:grid-cols-2 gap-5">
          {itensCardapio.map((item) => {
            const link = buildWhatsappLink(
              buildPedidoCardapioMensagem(item.nome, item.preco)
            );
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-acai/10 bg-white overflow-hidden flex"
              >
                <div className="w-28 shrink-0 bg-acai/5 flex items-center justify-center">
                  {item.fotoUrl ? (
                    <Image
                      src={item.fotoUrl}
                      alt={item.nome}
                      width={112}
                      height={112}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-xs text-acai/40 text-center px-2">
                      foto em breve
                    </span>
                  )}
                </div>
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <h3 className="font-display text-lg text-acai-dark leading-tight">
                    {item.nome}
                  </h3>
                  <p className="text-sm text-acai/60">
                    {item.ingredientes.join(", ")}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="font-semibold text-acai-dark">
                      {item.preco}
                    </span>
                    <a
                      href={link}
                      className="text-sm rounded-full bg-acai text-cream px-4 py-1.5 hover:bg-acai-light transition-colors"
                    >
                      Pedir
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="text-center text-xs text-acai/50 pb-10">
        Açaí do Bigode — Zona Leste de São Paulo
      </footer>
    </main>
  );
}
