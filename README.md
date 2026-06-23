# mtorX

Load balancer TCP/HTTP simples com descoberta de backends por registro.

## Fluxo

```text
API -> POST /register -> control plane :9090
Cliente -> data plane :8080 -> API escolhida
Load balancer -> GET /health -> API registrada
```

- O control plane cadastra e lista backends.
- O health checker acompanha a saude dos backends.
- O registro guarda os backends e faz a escolha round-robin.
- O data plane encaminha cada conexao para um backend saudavel.

## Estrutura

```text
src/
  application/backendRegistry.ts  registro, TTL e round-robin
  config/envLoader.ts              configuracao do processo
  domain/backendTarget.ts          modelo de um backend
  dto/registerNodeDto.ts           validacao do POST /register
  infra/controlPlaneServer.ts      servidor HTTP administrativo
  infra/dataPlaneServer.ts         proxy TCP para os clientes
  infra/healthChecker.ts           verificacao de GET /health
  index.ts                         composicao e inicializacao
```

## Executar

Crie o `.env` a partir do `.env.example` e execute:

```bash
npm run dev
```

O projeto contem o load balancer. As APIs backend sao processos separados e
precisam implementar um endpoint de saude, como `GET /health`.

Registre um backend que esteja rodando localmente na porta `3001`:

```bash
curl -X POST http://localhost:9090/register \
  -H 'Content-Type: application/json' \
  -H 'x-registry-token: dev-token' \
  -d '{"id":"api-1","publicHost":"127.0.0.1","port":3001,"healthPath":"/health"}'
```

Consulte os backends e envie trafego pelo load balancer:

```bash
curl http://localhost:9090/nodes
curl http://localhost:8080/
```

O registro fica apenas em memoria. Um backend deve renovar `POST /register`
antes de `NODE_TTL_MS`; caso contrario, sera removido mesmo que o health check
esteja respondendo.
