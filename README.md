# iGuard Cloud

iGuard Cloud é um SaaS de monitoramento inteligente para integradores de segurança eletrônica, CFTV, controle de acesso, portaria remota, MikroTik, DVR/NVR, faciais, servidores e equipamentos de rede.

## Estrutura do projeto

- `apps/web`: Front-end em Next.js com React, TypeScript e Tailwind CSS
- `apps/api`: Back-end em NestJS com TypeScript
- `docker-compose.yml`: configuração para PostgreSQL e Redis prontos para uso futuro
- `.env.example`: variáveis de ambiente iniciais

## O que foi criado

- Monorepo com `npm workspaces`
- Front-end premium com layout dark, navegação lateral, cards de status e tabela de dispositivos demo
- API NestJS com rotas `GET /health`, `GET /dashboard/summary` e `GET /devices`
- CORS configurado para consumo pelo front-end
- `docker-compose.yml` com PostgreSQL e Redis
- Documentação inicial e `.env.example`

## Variáveis de ambiente

Copie `.env.example` para `.env` e ajuste conforme necessário.

```env
DATABASE_URL=postgresql://iguard:iguard@localhost:5432/iguard
REDIS_URL=redis://localhost:6379
API_PORT=4000
NEXT_PUBLIC_API_URL=http://localhost:4000
CORS_ORIGIN=http://localhost:3000
```

## Comandos

### Instalar dependências

```bash
npm install
```

### Rodar API em desenvolvimento

```bash
npm run dev:api
```

### Rodar front-end em desenvolvimento

```bash
npm run dev:web
```

### Build do back-end

```bash
npm run build:api
```

### Build do front-end

```bash
npm run build:web
```

### Subir infraestrutura Docker

```bash
docker-compose up -d
```

## Rotas principais

- `GET /health` → `http://localhost:4000/health`
- `GET /dashboard/summary` → `http://localhost:4000/dashboard/summary`
- `GET /devices` → `http://localhost:4000/devices`

## Roadmap MVP

- Autenticação de usuários e JWT
- Conexão real com PostgreSQL via Prisma
- Cache e filas com Redis
- Dados de dispositivos em tempo real
- Relatórios de incidentes e faturamento
- Deploy em Render, Supabase ou VPS Docker
