# Alertas do iGuard

O iGuard envia alertas quando detecta uma destas mudanças reais de status:

- `ONLINE` → `OFFLINE`;
- `OFFLINE` → `ONLINE`;
- `WARNING` → `OFFLINE`;
- `OFFLINE` → `WARNING`;
- `ONLINE` → `WARNING`;
- `WARNING` → `ONLINE`.

Estados repetidos, como `OFFLINE` → `OFFLINE`, não geram novo alerta. O canal EMAIL é um placeholder que registra a mensagem no log da API. O Telegram é enviado quando as duas variáveis abaixo estão configuradas.

## Criar um bot no Telegram

1. Abra uma conversa com `@BotFather` no Telegram.
2. Envie `/newbot` e siga as instruções para escolher nome e usuário.
3. Copie o token fornecido pelo BotFather. Não publique nem versione esse token.
4. Abra uma conversa com o bot criado e envie uma mensagem, como `/start`.
5. Consulte `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates` e procure o campo `message.chat.id`. Esse valor é o chat ID.

Para grupos, adicione o bot ao grupo, envie uma mensagem e consulte `getUpdates`. IDs de grupos normalmente são negativos.

## Configuração

Defina as variáveis do Telegram no `.env` da API:

```bash
TELEGRAM_BOT_TOKEN=123456:token-fornecido-pelo-botfather
TELEGRAM_CHAT_ID=123456789
```

Opcionalmente, proteja o endpoint de teste com um token administrativo:

```bash
NOTIFICATION_TEST_TOKEN=gere-um-segredo-longo-e-aleatorio
```

Gere esse segredo, por exemplo, com `openssl rand -hex 32`, e não o publique nem versione. Reinicie a API depois de alterar as variáveis. Se uma variável do Telegram estiver ausente, esse canal será ignorado, uma mensagem será registrada no log e o EMAIL placeholder continuará funcionando.

## Testar

Com a API em execução:

```bash
curl -X POST http://localhost:4000/notifications/test
```

Se `NOTIFICATION_TEST_TOKEN` estiver configurado, envie-o no header:

```bash
curl -X POST http://localhost:4000/notifications/test \
  -H "X-Notification-Test-Token: $NOTIFICATION_TEST_TOKEN"
```

A resposta informa o resultado de cada canal (`logged`, `sent`, `skipped` ou `failed`). Quando o token opcional estiver configurado, requisições sem o header correto serão rejeitadas. O endpoint não aceita mensagem arbitrária, não altera equipamentos e não cria `CheckResult`.

## Monitoramento automático

`npm run monitor:once` e `POST /devices/monitoring/run` usam a mesma rotina de checks. Quando o novo status forma uma das transições listadas acima, o alerta é enviado após o status e o histórico serem gravados. Falha no Telegram é registrada no log, mas não desfaz o check nem interrompe o lote.

Este MVP não possui fila de retentativa. Se o Telegram falhar depois que a mudança for gravada, o mesmo estado não gera alerta repetido; uma nova tentativa só ocorrerá em outra mudança real de status.
