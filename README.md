# mtorX

Load balancer TCP simples com descoberta de backends saudaveis pelo DNS UDP.

## Fluxo

```text
API projeto-sd -> registra no DaNouSe-server
DaNouSe-server -> faz health check das APIs registradas
Cliente -> mtorX :8080
mtorX -> resolve api.local no DNS UDP :5300
mtorX -> round robin -> API saudavel escolhida
```

- O `DaNouSe-server` guarda as APIs registradas e filtra somente as saudaveis.
- O `mtorX` nao registra backend e nao faz health check.
- A cada conexao de cliente, o `mtorX` consulta o DNS e escolhe uma location por round robin.
- Depois da escolha, o `mtorX` apenas encaminha o trafego TCP para a API.

## Estrutura

```text
src/
  config/envLoader.ts       configuracao do processo
  domain/backendTarget.ts   destino resolvido pelo DNS
  infra/dnsClient.ts        cliente UDP para o DaNouSe-server
  infra/dataPlaneServer.ts  proxy TCP e round robin
  index.ts                  composicao e inicializacao
```

## Executar

Crie o `.env` a partir do `.env.example` e execute:

```bash
npm run dev
```

Variaveis principais:

```env
PORT=8080
DNS_HOST=127.0.0.1
DNS_PORT=5300
DNS_TIMEOUT_MS=2000
DNS_RESOLVE_NAME=api.local
```

Com o `DaNouSe-server` e uma ou mais APIs `projeto-sd` rodando, envie trafego
pelo load balancer:

```bash
curl http://localhost:8080/
```
