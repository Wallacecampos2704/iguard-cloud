import { Badge } from "@/components/ui/Badge";

export function Payment() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <div className="rounded-2xl border border-border bg-surface p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#009ee3]/10">
                  <svg className="h-10 w-10" viewBox="0 0 512 512" fill="#009ee3">
                    <path d="M248.096 0C111.033 0 0 111.033 0 248.096c0 137.063 111.033 248.096 248.096 248.096 137.063 0 248.096-111.033 248.096-248.096C496.192 111.033 385.159 0 248.096 0zm-52.8 352.896c-8.8 0-16-7.2-16-16s7.2-16 16-16h105.6c8.8 0 16 7.2 16 16s-7.2 16-16 16H195.296zm105.6-64H195.296c-8.8 0-16-7.2-16-16s7.2-16 16-16h105.6c8.8 0 16 7.2 16 16s-7.2 16-16 16zm0-64H195.296c-8.8 0-16-7.2-16-16s7.2-16 16-16h105.6c8.8 0 16 7.2 16 16s-7.2 16-16 16z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-semibold">Mercado Pago</p>
                  <p className="text-sm text-muted">Pagamentos recorrentes em BRL</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {["Pix", "Cartão de crédito", "Boleto bancário"].map((method) => (
                  <div key={method} className="flex items-center gap-3 rounded-lg bg-background px-4 py-3 text-sm">
                    <div className="h-2 w-2 rounded-full bg-muted/40" />
                    <span className="text-muted">{method}</span>
                    <Badge variant="default" className="ml-auto">Em breve</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <Badge variant="warning" className="mb-4">Em breve</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Assinaturas com Mercado Pago
            </h2>
            <p className="mt-4 text-muted leading-relaxed">
              Em breve você poderá converter trials em assinaturas pagas diretamente
              pelo iGuard, com cobrança recorrente via Mercado Pago — Pix, cartão ou boleto.
            </p>
            <p className="mt-4 text-sm text-muted/80">
              Planos flexíveis por quantidade de equipamentos monitorados,
              com gestão automática de trials vencendo e renovações.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
