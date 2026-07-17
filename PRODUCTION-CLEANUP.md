# Limpeza segura de dados demonstrativos

Este guia ajuda a identificar e tratar dados de demonstração antes ou depois de uma publicação. Nenhum procedimento desta etapa apaga dados automaticamente.

## Auditoria somente leitura

Com `DATABASE_URL` já configurada no ambiente da API, execute a partir da raiz:

```bash
npm run demo:audit --prefix apps/api
```

Ou, dentro de `apps/api`:

```bash
npm run demo:audit
```

O comando consulta organizações, clientes, sites, equipamentos e incidentes. Ele sinaliza campos contendo marcadores como `demo`, `demonstração`, `teste`, `sample` ou `sandbox`, além de registros vinculados a uma entidade já sinalizada.

O resultado é uma lista de candidatos, não uma decisão automática. Nomes reais podem conter palavras como “teste”, portanto falsos positivos devem ser revisados. O auditor não executa `create`, `update`, `delete` ou SQL bruto, não imprime hosts/e-mails e nunca exibe `DATABASE_URL`.

## Checklist antes de qualquer alteração

1. Faça backup verificável do PostgreSQL e confirme como restaurá-lo.
2. Execute `demo:audit` e salve apenas os IDs necessários para a revisão. Não copie credenciais ou dados pessoais para tickets.
3. Confirme a organização, o cliente e o site de cada ID na interface administrativa ou no Prisma Studio.
4. Verifique vínculos com equipamentos, `CheckResult`, incidentes e notificações.
5. Prefira desativar e observar antes de excluir definitivamente.
6. Realize alterações em uma janela controlada e valide o monitoramento ao final.

Nunca remova registros usando filtros amplos como `name ILIKE '%demo%'`. Use IDs explicitamente revisados, um registro por vez.

## Desativação recomendada

- **Equipamento:** defina `monitoringEnabled=false`. Isso preserva histórico e impede que o item continue entrando no monitoramento automático.
- **Cliente:** defina `active=false` somente depois de desativar os equipamentos relacionados.
- **Incidente:** prefira resolver pelo endpoint `POST /incidents/:id/resolve`, mantendo a trilha histórica.
- **Site:** o modelo atual não possui flag de ativo. Mantenha-o vinculado ao cliente inativo até a revisão de dependências ou remova-o manualmente apenas após confirmar que não existem vínculos necessários.
- **Organização:** não use exclusão como forma de desativação. Se ela for exclusivamente demonstrativa, revise primeiro clientes, sites, equipamentos e históricos relacionados; trate seu status por meio do fluxo administrativo aprovado para a conta.

Faça a mudança pela aplicação ou Prisma Studio usando acesso administrativo controlado. Não edite diretamente a VPS durante esta etapa.

## Exclusão definitiva

Exclusão é opcional e deve ocorrer somente quando a retenção de histórico não for necessária e o backup tiver sido testado.

O schema usa exclusões em cascata em várias relações. Em especial, apagar uma organização, cliente, site ou equipamento pode também apagar dados dependentes. Antes de remover:

1. confira novamente o ID e o tenant;
2. inventarie relações e quantidade de registros afetados;
3. resolva ou exporte incidentes que precisem ser preservados;
4. confirme a política de retenção de checks e notificações;
5. aplique uma alteração pequena e valide antes de continuar;
6. execute `npm run demo:audit --prefix apps/api` novamente.

Não há script destrutivo no repositório. Uma remoção permanente deve ser uma ação manual, revisada e auditável por um operador autorizado.

## Modo de demonstração da interface

O valor seguro e padrão é:

```dotenv
NEXT_PUBLIC_DEMO_MODE=false
```

A referência está em `.env.example`. Em desenvolvimento, copie apenas essa configuração para `apps/web/.env.local` se necessário. Em produção, configure-a na plataforma de deploy; não versionar `.env`, tokens do Telegram, URLs com credenciais ou outros segredos.

Definir `NEXT_PUBLIC_DEMO_MODE=true` altera somente a apresentação dos elementos demonstrativos da interface. Isso não cria, remove nem modifica registros do banco.
