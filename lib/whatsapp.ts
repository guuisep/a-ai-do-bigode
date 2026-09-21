/**
 * Número de WhatsApp da loja, no formato internacional sem símbolos.
 * Ex.: "5511999999999" (55 = Brasil, 11 = DDD, depois o número).
 * Configurado pela variável de ambiente NEXT_PUBLIC_WHATSAPP_NUMBER na Vercel.
 */
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "5511999999999";

export function buildWhatsappLink(mensagem: string): string {
  const texto = encodeURIComponent(mensagem);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${texto}`;
}

export function buildPedidoCardapioMensagem(nomeItem: string, precoItem: string): string {
  return [
    "Olá! Quero pedir pelo Cardápio Digital do Açaí do Bigode 🥭💜",
    "",
    `Item: ${nomeItem}`,
    `Preço: ${precoItem}`,
  ].join("\n");
}
