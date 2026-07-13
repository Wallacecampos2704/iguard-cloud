const steps = [
  {
    step: "01",
    title: "Cadastre seus equipamentos",
    description:
      "Adicione DVRs, NVRs, controladoras, câmeras IP e servidores informando IP ou hostname. Organize por cliente.",
  },
  {
    step: "02",
    title: "Configure os alertas",
    description:
      "Defina canais de notificação — E-mail, Telegram ou WhatsApp — e escolha quais eventos disparam alertas.",
  },
  {
    step: "03",
    title: "Monitore em tempo real",
    description:
      "Acompanhe status online, atenção e offline no dashboard. Veja uptime, incidentes e saúde da operação.",
  },
  {
    step: "04",
    title: "Aja antes do cliente",
    description:
      "Receba alertas proativos e resolva problemas antes que o cliente perceba. Reduza chamados reativos.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Como funciona
          </h2>
          <p className="mt-4 text-muted">
            Do cadastro ao primeiro alerta em menos de 10 minutos.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-4">
          {steps.map((item, index) => (
            <div key={item.step} className="relative">
              {index < steps.length - 1 && (
                <div className="absolute top-8 left-full hidden h-px w-full bg-gradient-to-r from-accent/40 to-transparent lg:block" />
              )}
              <div className="text-5xl font-bold text-accent/20">{item.step}</div>
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
