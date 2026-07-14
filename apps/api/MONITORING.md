# Monitoramento automático

O iGuard possui duas formas de executar uma verificação automática completa:

- `POST /devices/monitoring/run`, para acionamento administrativo via HTTP;
- `npm run monitor:once`, para execução local pelo sistema operacional.

Ambas reutilizam a mesma rotina de verificação em lote, atualizam o status dos equipamentos e registram cada resultado em `CheckResult` com origem `AUTOMATIC`.

## Preparação

O comando usa o JavaScript compilado da API. Após cada atualização da aplicação, gere o build:

```bash
cd /caminho/para/iguard/apps/api
npm ci
npm run build
```

Confirme que a variável `DATABASE_URL` está disponível no ambiente usado pelo comando e teste uma execução:

```bash
npm run monitor:once
```

O processo imprime um resumo JSON e termina. Um código de saída diferente de zero indica falha.

## Exemplo de cron a cada 5 minutos

Este exemplo é apenas documentação. O cron não é instalado ou alterado automaticamente:

```cron
*/5 * * * * cd /caminho/para/iguard/apps/api && /usr/bin/npm run monitor:once >> /var/log/iguard-monitor.log 2>&1
```

Antes de usar, ajuste o caminho do projeto, confirme o caminho de `npm` com `which npm` e garanta permissão de escrita no arquivo de log. Use o mesmo usuário e as mesmas variáveis de ambiente da API.

Para evitar execuções sobrepostas quando um lote puder durar mais de cinco minutos, pode-se usar `flock`:

```cron
*/5 * * * * flock -n /tmp/iguard-monitor.lock -c 'cd /caminho/para/iguard/apps/api && /usr/bin/npm run monitor:once' >> /var/log/iguard-monitor.log 2>&1
```
