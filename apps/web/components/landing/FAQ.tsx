"use client";

import { useState } from "react";

const faqs = [
  {
    question: "O que o iGuard monitora?",
    answer:
      "DVRs, NVRs, câmeras IP, controladoras de acesso, alarmes, switches, servidores e equipamentos de portaria remota — qualquer dispositivo acessível por IP ou hostname na rede do cliente.",
  },
  {
    question: "Preciso instalar agente nos equipamentos?",
    answer:
      "Não. O iGuard realiza verificações remotas por protocolos padrão (ICMP, HTTP, SNMP e outros), sem necessidade de instalar software nos equipamentos monitorados.",
  },
  {
    question: "Como funcionam os alertas?",
    answer:
      "Você configura canais de E-mail, Telegram e WhatsApp. Quando um equipamento muda de status ou um limite é atingido, a equipe recebe notificação imediata com contexto completo.",
  },
  {
    question: "Quantos equipamentos posso monitorar no trial?",
    answer:
      "O trial gratuito permite monitorar até 3 equipamentos por 10 dias, sem necessidade de cartão de crédito.",
  },
  {
    question: "Quando estará disponível o pagamento?",
    answer:
      "A integração com Mercado Pago para assinaturas recorrentes está em desenvolvimento e será lançada em breve, com suporte a Pix, cartão e boleto.",
  },
  {
    question: "Posso usar para múltiplos clientes?",
    answer:
      "Sim. O iGuard foi projetado para integradores que gerenciam dezenas ou centenas de clientes, com organização por cliente, tipo de equipamento e filtros avançados.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-surface/50">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Perguntas frequentes
          </h2>
          <p className="mt-4 text-muted">
            Tudo o que você precisa saber antes de começar.
          </p>
        </div>

        <div className="mt-12 space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={faq.question}
              className="rounded-xl border border-border bg-surface overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-medium transition hover:bg-surface-elevated"
              >
                {faq.question}
                <svg
                  className={`h-5 w-5 shrink-0 text-muted transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {openIndex === index && (
                <div className="border-t border-border px-6 py-4 text-sm leading-relaxed text-muted">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
