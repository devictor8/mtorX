# mtorX

Load balancer TCP simples com descoberta de backends saudaveis pelo DNS UDP.

## Fluxo

```text
API projeto-sd -> registra no DaNouSe-server
DaNouSe-server -> faz health check das APIs registradas
mtorX -> resolve api.local no DNS UDP :5300 a cada 10s
Cliente -> mtorX :8080
mtorX -> round robin -> API saudavel escolhida
```

- O `DaNouSe-server` guarda as APIs registradas e filtra somente as saudaveis.
- O `mtorX` nao registra backend e nao faz health check.
- O `mtorX` consulta o DNS no startup e depois a cada intervalo configurado.
- A cada conexao de cliente, o `mtorX` escolhe uma location do cache por round robin.
- Depois da escolha, o `mtorX` apenas encaminha o trafego TCP para a API.

## Estrutura

```text
src/
  app/
    DataPlaneServer.ts      servidor TCP e coordenacao das conexoes
    ProxyRouter.ts          retry e escolha do proximo backend
    TargetRefresher.ts      atualizacao periodica do cache via DNS
    createDataPlane.ts      composicao das dependencias
  config/
    envLoader.ts            configuracao do processo
  domain/
    BackendTarget.ts        destino resolvido pelo DNS
    RoundRobinBalancer.ts   politica de balanceamento
    TargetPool.ts           cache de backends saudaveis
  infra/
    dns/
      DnsClient.ts          cliente UDP para o DaNouSe-server
      parseDnsResolveResponse.ts validacao da resposta DNS
    tcp/
      TcpProxy.ts           encaminhamento TCP client <-> backend
  index.ts                  bootstrap da aplicacao
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
DNS_REFRESH_INTERVAL_MS=10000
DNS_RESOLVE_NAME=api.local
```

Com o `DaNouSe-server` e uma ou mais APIs `projeto-sd` rodando, envie trafego
pelo load balancer:

```bash
curl http://localhost:8080/
```
