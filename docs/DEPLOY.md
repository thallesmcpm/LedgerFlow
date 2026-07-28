# Deploy — caminho 100% gratuito

Três peças, três serviços, custo zero e sem cartão de crédito:

| Peça | Serviço | Plano |
|---|---|---|
| Banco (PostgreSQL) | **Neon** ou **Supabase** | gratuito permanente — 0,5 GB |
| Backend (NestJS) | **Render** | gratuito permanente — 750 h/mês |
| Frontend (Next.js) | **Vercel** | gratuito permanente (Hobby) |

Os dois bancos servem e a escolha tem consequência prática — está no passo 1.

## O que já está no ar

Primeiro deploy feito em 28/07/2026, seguindo este guia:

| Peça | Endereço |
|---|---|
| Site | https://ledger-flow-omega.vercel.app |
| API | https://ledgerflow-api-bgej.onrender.com/api |
| Banco | Neon, projeto «Sistema de contabilidade», branch `production` |

O banco escolhido foi o **Neon** — ele já existia do desenvolvimento, com os
dados do seed, e não pausa por inatividade como o Supabase. O ping do passo 2
ainda **não** foi configurado, então a primeira visita depois de 15 minutos
parados leva cerca de 50 segundos.

## Como isto funciona, antes dos comandos

O LedgerFlow não é *um* programa: são três peças com necessidades diferentes,
cada uma hospedada no serviço especializado nela.

Pense num escritório. O **banco de dados** é o arquivo morto, onde ficam as
pastas dos clientes. O **backend** é o funcionário dos fundos, que conhece as
regras e sabe achar as pastas. O **frontend** é o balcão de atendimento — a
única coisa que o cliente vê. O cliente fala com o balcão, o balcão pergunta ao
funcionário, o funcionário abre o arquivo. Ninguém pula etapa.

Subir as três peças é a parte fácil. O trabalho de verdade é **apresentar uma à
outra**: cada ligação é um endereço que alguém precisa saber de cor.

| Ligação | Variável | Fica em |
|---|---|---|
| O funcionário precisa da chave do arquivo | `DATABASE_URL` | Render |
| O balcão precisa saber onde fica o funcionário | `NEXT_PUBLIC_API_URL` | Vercel |
| O funcionário precisa saber qual balcão é legítimo | `CORS_ORIGINS` | Render |

A terceira é a mais estranha, e é a que mais derruba deploy. Ela existe porque,
sem uma lista de autorizados, *qualquer* site na internet poderia montar um
balcão falso e pedir os dados dos seus clientes — então o backend só responde a
quem está na lista.

E ela tem um ovo-e-galinha embutido: o endereço do balcão só existe depois que
ele é construído. Por isso o passo 2 preenche um valor provisório e o passo 4
volta para corrigir. Não é desorganização do guia; é a ordem possível.

### O sintoma que essa ligação produz

Vale reconhecer, porque ele engana: as telas abrem, o nome do escritório aparece
certo no topo, e mesmo assim os blocos de dados dão erro.

Parece contradição, mas explica tudo. O nome do escritório é buscado pelo
*servidor* do Vercel, e conversa entre servidores não passa pela checagem de
CORS. Os blocos de dados são buscados pelo *navegador*, que faz a checagem — e
apanha. Quando só parte da tela falha, suspeite do `CORS_ORIGINS` antes de
procurar bug no código.

## O que não é gratuito (e costuma ser confundido)

- **Railway** encerrou o plano gratuito. Hoje dá um crédito inicial de US$ 5 e,
  quando acaba, o serviço para até cadastrar cartão.
- **Fly.io** também deixou de ter franquia gratuita para contas novas.

O **Supabase** é gratuito de verdade e serve como banco deste projeto — mas tem
uma armadilha de pausa que muda o passo a passo. Comparação no passo 1.

O plano Hobby do Vercel é para uso **não comercial**, conforme os termos deles.
Para demonstração e validação serve; se o escritório passar a pagar pelo
sistema, o caminho é o plano pago do Vercel ou o Cloudflare Pages, que permite
uso comercial no plano gratuito.

---

## 1. Banco: Neon ou Supabase

Qualquer um dos dois funciona sem tocar no código — o Prisma só quer um
PostgreSQL. A diferença que pesa é o que acontece quando o sistema fica parado:

| | Neon | Supabase |
|---|---|---|
| Sem uso | hiberna e **acorda sozinho** em menos de 1 s | **pausa após 7 dias** e precisa ser religado à mão no painel |
| Painel | enxuto | editor de tabelas, backups visíveis, Auth pronto |
| Configuração aqui | copiar e colar a URL | copiar a URL **certa** entre três (ver abaixo) |

**Escolha o Neon** se o sistema vai ficar semanas parado entre usos — é a via com
menos manutenção. **Escolha o Supabase** se você quer o painel para olhar os
dados, ou se pretende reativar a autenticação mais adiante.

**Atenção a uma armadilha:** o ping do passo 2, que mantém o Render acordado,
**não** protege o Supabase da pausa. O `/api/health` responde sem consultar o
banco — devolve só `uptime` e `timestamp` (`src/health/health.controller.ts`) —
então o Postgres continua contando os 7 dias parado.

O pior caso, então, é o cliente abrir o link depois de duas semanas, esperar os
50 s do Render acordar e mesmo assim receber erro, porque o banco pausou. E o
conserto exige entrar no painel do Supabase — o sistema não se recupera sozinho.

Duas saídas, se você quiser o Supabase mesmo assim:

- **Um segundo agendamento** no cron-job.org chamando uma rota que leia dados de
  verdade (`/api/companies`, por exemplo), semanalmente. Custa nada e resolve.
- **Fazer o `/api/health` consultar o banco** com um `SELECT 1`. Resolve com um
  ping só, mas tem efeito colateral: o Render usa essa rota como *health check*
  (`healthCheckPath` no `render.yaml`), e aí uma instabilidade momentânea do
  banco passa a derrubar o serviço inteiro. Não é a escolha óbvia.

### 1a. Neon

Em [neon.com](https://neon.com), crie uma conta e um projeto. Copie a *connection
string*, no formato:

```
postgresql://usuario:senha@ep-algo.aws.neon.tech/neondb?sslmode=require
```

Não é preciso configurar nada para a hibernação.

### 1b. Supabase

Em [supabase.com](https://supabase.com), crie uma conta e um projeto — guarde a
senha do banco, que só aparece nesse momento.

Em **Project Settings → Database → Connection string** o Supabase oferece três
endereços, e a escolha decide se o deploy sobe:

| Opção | Porta | Serve aqui? |
|---|---|---|
| Direct connection (`db.SEUREF.supabase.co`) | 5432 | ❌ só IPv6 em projetos novos — o Render não alcança |
| **Session pooler** (`...pooler.supabase.com`) | 5432 | ✅ **é esta** |
| Transaction pooler | 6543 | ❌ derruba o `migrate deploy` no arranque |

Copie a **Session pooler**, no formato:

```
postgresql://postgres.SEUREF:SENHA@aws-0-REGIAO.pooler.supabase.com:5432/postgres
```

Troque `SENHA` pela senha do banco — a string vem com um `[YOUR-PASSWORD]` no
lugar.

Por que não as outras duas: a *direct connection* só responde em IPv6, e as
máquinas do plano gratuito do Render saem por IPv4 — a conexão simplesmente não
fecha. Já o *transaction pooler* não mantém sessão nem aceita *prepared
statements*, e o serviço arranca com `npx prisma migrate deploy` (passo 2): a
migration falha e o deploy morre no start, não no build, que é onde ninguém
costuma procurar.

A *session pooler* não é um remendo — é o modo certo para um processo Node de
vida longa, que é o caso do Render. O *transaction pooler* existe para funções
serverless, onde cada requisição abre a sua conexão.

> Se algum dia o backend virar função serverless no Vercel (ver «Alternativa:
> tudo no Vercel», no fim), aí a porta 6543 passa a ser a certa — e o
> `schema.prisma` precisa ganhar um `directUrl` para as migrations, que hoje ele
> não tem.

## 2. Backend no Render

Em [render.com](https://render.com): **New → Blueprint → conecte o GitHub →
LedgerFlow**.

O `render.yaml` na raiz do repositório já traz o diretório raiz, os comandos e o
health check prontos. Sobram duas variáveis para preencher no painel, que o
arquivo deixa em branco de propósito:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | a connection string do passo 1 |
| `CORS_ORIGINS` | `https://placeholder.vercel.app` por enquanto |

`CORS_ORIGINS` recebe um valor provisório porque o endereço do site só existe
depois do passo 3. Ele é obrigatório em produção: sem ele o servidor não sobe.

O `migrate deploy` no arranque cria as tabelas na primeira subida e não faz nada
nas seguintes — dispensa rodar migration à mão a cada deploy.

Anote o endereço gerado e confirme em `https://SEU-BACKEND.onrender.com/api/health`.

### Se preferir preencher o formulário à mão

**New → Web Service**, em vez de Blueprint:

| Campo | Valor |
|---|---|
| Root Directory | `apps/backend` |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npx prisma generate && npm run build` |
| Start Command | `npx prisma migrate deploy && npm run start:prod` |
| Instance Type | **Free** |

**`--include=dev` não é opcional.** As variáveis do serviço valem também durante
o build, e com `NODE_ENV=production` o npm descarta as dependências de
desenvolvimento — que é justamente onde vivem `@nestjs/cli`, `prisma` e
`typescript`. Sem a flag, o Render instala, joga fora o compilador e depois
tenta compilar.

**Environment Variables** (o Blueprint já põe todas, menos as duas de cima):

```
NODE_ENV=production
AUTH_MODE=stub
DATABASE_URL=<a connection string do passo 1>
BRASILAPI_BASE_URL=https://brasilapi.com.br/api
CORS_ORIGINS=https://placeholder.vercel.app
STUB_TENANT_ID=tnt_dev
STUB_USER_ID=usr_dev
STUB_ROLE=owner
```

**Não defina `PORT`** — o Render injeta a dele, e fixar um valor deixa o serviço
inacessível.

### A hibernação do Render, e o que fazer com ela

No plano gratuito o serviço **hiberna após 15 minutos** sem acesso e leva cerca
de **50 segundos** para acordar. Na prática: quem abrir o site depois de um
tempo parado espera quase um minuto na primeira tela.

Duas saídas:

**a) Manter acordado** (recomendado para demonstrar ao cliente)

Em [cron-job.org](https://cron-job.org) — gratuito — crie um agendamento que
chame `https://SEU-BACKEND.onrender.com/api/health` a cada 10 minutos.

A franquia gratuita é de 750 horas por mês e um mês tem 720 — um único serviço
sempre ligado cabe, com folga pequena. Não crie um segundo serviço no plano
gratuito, ou os dois ficam sem horas antes do fim do mês.

Este ping resolve o Render e **só** o Render. Se o banco for o Supabase, ele não
evita a pausa por inatividade — o `/api/health` não consulta o banco. Ver passo 1.

**b) Aceitar a espera**

Se ninguém vai olhar por dias, deixe hibernar. Nesse caso aumente o tempo
limite do frontend para o site não desistir antes do backend acordar: use
`NEXT_PUBLIC_API_TIMEOUT=60000` no passo 3.

No Supabase, some a esses 50 s o tempo de religar o projeto à mão no painel, se
ele já tiver pausado.

### Dados de demonstração (opcional)

Para o sistema não abrir vazio, rode o seed uma vez da sua máquina apontando
para o banco de produção:

```bash
cd apps/backend
DATABASE_URL="<a URL do passo 1>" npm run db:seed
```

No PowerShell, o prefixo de variável não existe e a linha acima dá erro de
sintaxe:

```powershell
cd apps/backend
$env:DATABASE_URL="<a URL do passo 1>"; npm run db:seed
```

## 3. Frontend no Vercel

Em [vercel.com](https://vercel.com): **Add New → Project → importe o LedgerFlow**.

- **Root Directory: `apps/frontend`** ← sem isto o build nem começa, porque o
  repositório guarda dois projetos.
- Framework Preset: Next.js (detectado sozinho).

**Environment Variables:**

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://SEU-BACKEND.onrender.com/api` |
| `NEXT_PUBLIC_USE_MOCKS` | `false` |
| `NEXT_PUBLIC_API_TIMEOUT` | `30000` (ou `60000`, ver acima) |

Repare no `/api` no fim da primeira: sem ele todas as chamadas dão 404.

Se `NEXT_PUBLIC_API_URL` faltar, o **build falha** — `lib/env.ts` valida na
importação. É proposital: melhor quebrar no build do que publicar um site que
não conversa com a API.

## 4. Fechar o círculo

Volte ao Render e corrija `CORS_ORIGINS` com o endereço real do Vercel:

```
CORS_ORIGINS=https://seu-app.vercel.app
```

Sem isso o navegador bloqueia as chamadas e as telas abrem vazias **sem
mensagem de erro visível** — o erro fica só no console (F12), com a expressão
*CORS policy*. Se for usar as URLs de pré-visualização do Vercel, acrescente-as
separadas por vírgula.

## 5. Conferir

Abra `https://seu-app.vercel.app` — a raiz redireciona para `/login`.

**A tela de login aceita qualquer coisa.** Digite um e-mail em formato válido
(`a@b.com` serve) e uma senha de 6 caracteres ou mais, e você entra. Ela não
chama a API: o `use-login.ts` espera 900 ms e manda para o dashboard. É fachada
— ver «O sistema fica aberto», adiante.

Depois do login você cai no **dashboard**, que é a tela principal. De lá, o menu
dá acesso às demais — `/companies` e `/calendar` são as que puxam mais dados do
backend, e por isso as melhores para confirmar que a API respondeu.

Se o dashboard abrir com os números zerados e as listas vazias, o backend não
respondeu: quase sempre é o `CORS_ORIGINS` do passo 4, e a confirmação está no
console do navegador (F12), com a expressão *CORS policy*.

---

## Armadilhas que derrubam este tipo de deploy

| Sintoma | Causa provável |
|---|---|
| Build falha logo no início | Faltou o **Root Directory** |
| Build acha o código mas não acha `nest`/`tsc`/`prisma` | Faltou `--include=dev` no build command (§2) |
| Build passa, mas o serviço morre no start com erro de migration | String do Supabase errada: é a **session pooler**, porta 5432 (§1b) |
| Conexão com o banco expira sem resposta | *Direct connection* do Supabase — só IPv6 (§1b) |
| Funcionava e parou depois de umas semanas | Projeto do Supabase pausado por inatividade (§1) |
| Telas abrem vazias, sem erro | `CORS_ORIGINS` ainda com o valor provisório |
| Dashboard abre zerado depois do login | Mesma causa — o login é fachada e passa mesmo sem API (§5) |
| Endereço não responde, mas o log diz que subiu | `PORT` foi definido à mão |
| Todas as chamadas dão 404 | Faltou `/api` no fim de `NEXT_PUBLIC_API_URL` |
| Primeira visita demora ~50 s | Hibernação do Render (ver §2) |

---

## O sistema fica aberto

Não há autenticação, por decisão do projeto. O escritório é identificado pelo
header `x-tenant-id`, que qualquer cliente HTTP pode escolher — na prática,
**quem souber o endereço lê a carteira de clientes de qualquer escritório**:
CNPJs, endereços e quadro societário.

O servidor sobe assim de propósito, mas registra o aviso no log a cada arranque.

**A tela de login não muda isso, e é fácil se enganar com ela.** Ela tem campos,
validação e um «Esqueceu a senha?», mas não verifica nada: o
`features/auth/hooks/use-login.ts` espera 900 ms e redireciona para o dashboard,
sem chamar a API. Qualquer e-mail bem formatado com uma senha de 6 caracteres
entra. E ela protege menos ainda do que parece — as telas internas respondem
direto pela URL, sem passar pelo login, e o backend responde a qualquer um.

Ao mostrar o sistema para alguém, vale dizer isso em voz alta: quem vê a tela de
login supõe que os dados estão protegidos.

Para fechar o acesso, em ordem de esforço:

1. **Deployment Protection** no Vercel (Settings → Deployment Protection) põe
   senha no site. Protege a tela, mas o backend continua acessível direto.
2. **Reativar a autenticação.** O código existe no histórico do git, com 12
   testes prontos — foi removido a pedido, não por não funcionar.

---

## Alternativa: tudo no Vercel

O backend **pode** rodar no Vercel como função serverless: como o banco é
externo, ele não guarda nada. Vantagem sobre o Render: acorda em 1 a 3 segundos
em vez de 50.

Custa três coisas:

- Um adaptador novo, para o NestJS rodar como função — e o empacotamento do
  Prisma nesse formato é conhecidamente trabalhoso.
- O cache de consultas à Receita Federal e de feriados vive na memória do
  processo. Hibernando com frequência, cada auditoria refaz todas as consultas
  à BrasilAPI: fica lenta e consome o limite do fornecedor.
- A conexão com o banco muda. Cada invocação abre a sua, então a session pooler
  do passo 1b vira a escolha errada: passa a ser o *transaction pooler* (porta
  6543, com `?pgbouncer=true`) — e como ele não roda migration, o
  `schema.prisma` precisa ganhar um `directUrl` apontando para a session pooler.
  Hoje o `datasource` só tem `url`.

Por isso o caminho principal deste guia é o Render com ping. Se preferir o
Vercel, o adaptador precisa ser escrito e testado em deploy — não há como
validá-lo localmente.

---

## Desenvolvimento local

Precisa de um PostgreSQL — o banco em arquivo foi abandonado porque não
sobrevive a uma hospedagem. Um banco gratuito no Neon ou no Supabase resolve, e
é a via mais rápida se você não tem Postgres instalado. No Supabase vale a mesma
regra do passo 1b: a string é a da *session pooler*.

Use **bancos separados** para desenvolver e para testar: a suíte apaga as
tabelas entre os testes.

```bash
# Backend — configure apps/backend/.env com o DATABASE_URL antes
cd apps/backend
npm ci && npx prisma migrate deploy && npm run db:seed
npm run start:dev

# Frontend, noutro terminal
cd apps/frontend
npm ci && npm run dev
```

Os testes e2e leem o `DATABASE_URL` do ambiente e falham com instrução clara se
ele não apontar para um Postgres:

```bash
cd apps/backend
DATABASE_URL="<banco de TESTE>" npm run test:e2e
```

Para rodar o E2E de tela sem depender da BrasilAPI real:

```bash
cd apps/backend && node test/fake-brasilapi.mjs 4444 &
BRASILAPI_BASE_URL=http://localhost:4444/api npm run start:prod
cd apps/frontend && npm run e2e
```

---

## O que ainda falta

Em ordem de urgência, para um uso mais sério:

1. **Limite de requisições.** Não há rate limit; a API está exposta a abuso.
2. **Retenção de auditoria.** `AuditRun` e `AuditFinding` crescem sem expurgo.
3. **Seletor de empresas no cadastro de tarefa** corta em 100 empresas, em
   silêncio.
4. **Excluir tarefa** não existe — só concluir.
