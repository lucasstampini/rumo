# RUMO — Spec do MVP

> Documento para o agente de código (Claude Code) construir o MVP de ponta a ponta.
> Prazo: entrega na segunda-feira. Prioridade é **um fluxo completo funcionando e publicado**, não perfeição.
> Decisões já estão tomadas abaixo. Não pare para perguntar o que a spec já responde; quando algo não estiver coberto, escolha o mais simples e anote em `DECISIONS.md`.

---

## 1. Produto em uma frase

Marketplace peer-to-peer de aluguel de carros no Brasil: o dono anuncia o carro ocioso e ganha renda; o locatário encontra um carro a menos de 10 minutos a pé e aluga sem burocracia. Estratégia de lançamento: **bolhas de liquidez hiperlocais** (piloto: Butantã / USP, São Paulo).

## 2. Referência visual (obrigatório ler antes de codar UI)

- Protótipo navegável já aprovado: `C:\Users\lucas\rumo\index.html`. Ele é a fonte da verdade para **visual, textos e fluxo**. Reaproveite cores, tipografia, componentes e microcopy.
- Logo: `C:\Users\lucas\rumo\logo.png` (copiar para `public/logo.png`).
- Tokens do protótipo:
  - Cores: `green #159a58`, `green-d #0d7442`, `green-l #e3f4ea`, `ink #10231a`, `muted #5f7368`, `line #dbe5de`, `bg #f3f6f3`, `card #ffffff`, `amber #f2a516`, `red #d64545`
  - Fontes (Google Fonts): display `Archivo` 700/800/900, corpo `Figtree` 400–700
- Mobile-first (390px), funcionando também no desktop (conteúdo centralizado, máx. 480px de largura para as telas do app).
- Idioma da interface: **português do Brasil**. Moeda `R$` com `Intl.NumberFormat('pt-BR')`. Datas `dd/mm`.

## 3. Stack (fixa)

| Camada | Escolha |
|---|---|
| Framework | **Next.js 15** (App Router, TypeScript, Server Actions) |
| UI | **Tailwind CSS v4** + componentes próprios (sem biblioteca pesada). `lucide-react` para ícones |
| Banco, auth, arquivos | **Supabase** (Postgres + Auth e-mail/senha + Storage) via `@supabase/ssr` |
| Mapa | **Leaflet** + `react-leaflet` com tiles OpenStreetMap (sem chave de API) |
| Gráficos | `recharts` |
| QR do Pix (simulado) | `qrcode` |
| Validação | `zod` |
| Testes | `vitest` (regras de negócio) + `@playwright/test` (1 teste ponta a ponta) |
| Deploy | **Vercel** |
| Gerenciador | `npm` |

Pasta do projeto: `C:\Users\lucas\rumo-app` (criar com `npx create-next-app@latest rumo-app --ts --tailwind --app --eslint --src-dir --import-alias "@/*" --use-npm`).

> No PowerShell desta máquina, `npx`/`npm` como `.ps1` são bloqueados: use **`npx.cmd`** e **`npm.cmd`**.

## 4. Escopo

### Dentro do MVP
1. Cadastro e login (e-mail/senha). Perfil com nome, telefone, foto, CNH (upload) e selo "verificado".
2. **Explorar**: mapa da bolha com pins de preço, lista em cards, filtros (Econômico, Automático, SUV, faixa de preço), distância a pé.
3. **Detalhe do carro**: fotos, especificações, dono, avaliações, calendário de disponibilidade.
4. **Reserva**: escolher datas, proteção (Básica incluída / Completa +R$ 29/dia), resumo de preço, **pagamento Pix simulado**.
5. **Proprietário**: anunciar carro (com fotos, preço, custos anuais, dias disponíveis), aceitar/recusar pedidos, painel de ganhos x custo do carro, simulador de renda.
6. **Retirada**: código de 4 dígitos + vistoria com 4 fotos → aluguel ativo.
7. **Devolução**: vistoria com 4 fotos → dono confirma → aluguel concluído.
8. **Avaliações** mútuas após concluir.
9. **Aluguéis**: lista do locatário (ativos, próximos, anteriores) e do dono (pedidos, ativos, histórico).
10. Dados de demonstração (seed) com a bolha Butantã já cheia de carros.

### Fora do MVP (não fazer)
Pagamento real, chat em tempo real, notificações push/e-mail, chave digital/telemetria, KYC real, seguro real, multi-bolhas na UI (o modelo suporta, a UI mostra só a do usuário), app nativo, painel admin, i18n.

## 5. Regras de negócio (implementar em `src/lib/pricing.ts` e `src/lib/booking.ts`, com testes)

- **Diárias** = número de dias entre retirada e devolução, inclusivo (sex→dom = 3 diárias). Mínimo 1, máximo 30.
- **Subtotal** = diárias × `price_per_day`.
- **Proteção completa** = R$ 29 × diárias (básica = R$ 0).
- **Taxa de serviço do locatário** = 10% de (subtotal + proteção), arredondada para o real inteiro.
- **Total pago** = subtotal + proteção + taxa de serviço.
- **Repasse ao dono** = 85% do subtotal (RUMO fica com 15% do subtotal + taxa de serviço + proteção).
- Todos os valores em **centavos (inteiros)** no banco e no código; formatar só na tela.
- **Conflito de datas**: um carro não pode ter duas reservas com status `requested`, `accepted` ou `active` com datas sobrepostas. Garantir no banco (constraint de exclusão com `daterange` + `btree_gist`) e checar antes no servidor para mostrar mensagem amigável.
- **Disponibilidade**: o carro só aparece/aceita reserva em dias da semana marcados como disponíveis pelo dono e não bloqueados.
- **Distância a pé** = distância em linha reta (Haversine) × 1,3 ÷ 80 m/min, arredondada para cima. Mostrar "X min a pé".
- **Bolha**: círculo (centro + raio em metros). Butantã: centro `-23.5614, -46.7230`, raio `1500`. Explorar mostra só carros dentro da bolha do usuário.
- **Custo mensal do carro** = (IPVA + seguro + manutenção + depreciação anuais) ÷ 12.
- **% coberto no mês** = repasses de aluguéis concluídos no mês ÷ custo mensal.
- **Simulador**: renda líquida/mês = dias × diária × 0,85.
- **Código de retirada**: 4 dígitos aleatórios gerados quando o dono aceita.

## 6. Ciclo de vida da reserva

```
requested ──(dono aceita)──▶ accepted ──(dono confirma código + locatário envia 4 fotos)──▶ active
    │                            │                                                            │
    │(dono recusa / 24h)         │(locatário cancela)                     (locatário envia 4 fotos de devolução
    ▼                            ▼                                          + dono confirma)  ▼
 rejected                    cancelled                                                    completed ──▶ avaliações
```

- Ao criar a reserva o locatário "paga" (Pix simulado) → `payment_status = paid`, `status = requested`.
- `rejected`/`cancelled` → `payment_status = refunded` (simulado, só muda o status e mostra aviso).
- Cada transição é uma Server Action que valida: usuário certo, status de origem certo. Registrar `*_at` (timestamps).

## 7. Modelo de dados (Supabase / Postgres)

Criar em `supabase/migrations/0001_init.sql`. Usar RLS em todas as tabelas.

```sql
create extension if not exists btree_gist;

create table bubbles (
  id uuid primary key default gen_random_uuid(),
  name text not null,                       -- 'Butantã'
  center_lat double precision not null,
  center_lng double precision not null,
  radius_m int not null
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  cnh_url text,
  verified boolean not null default false,  -- MVP: vira true ao enviar CNH
  bubble_id uuid references bubbles,
  created_at timestamptz not null default now()
);

create type transmission as enum ('manual', 'automatic');
create type car_category as enum ('economy', 'sedan', 'suv');

create table cars (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  bubble_id uuid not null references bubbles,
  make text not null, model text not null, year int not null,
  color text not null, plate text not null,
  category car_category not null,
  transmission transmission not null,
  seats int not null default 5,
  price_per_day_cents int not null check (price_per_day_cents > 0),
  lat double precision not null, lng double precision not null,
  pickup_address text not null,             -- ex.: 'R. do Matão, garagem 2'
  available_weekdays int[] not null default '{0,1,2,3,4,5,6}', -- 0=domingo
  annual_ipva_cents int not null default 0,
  annual_insurance_cents int not null default 0,
  annual_maintenance_cents int not null default 0,
  annual_depreciation_cents int not null default 0,
  is_listed boolean not null default true,
  description text,
  created_at timestamptz not null default now()
);

create table car_photos (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars on delete cascade,
  url text not null, position int not null default 0
);

create table car_blocked_dates (
  car_id uuid references cars on delete cascade,
  day date not null,
  primary key (car_id, day)
);

create type booking_status as enum ('requested','accepted','active','completed','rejected','cancelled');
create type protection_plan as enum ('basic','full');

create table bookings (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references cars,
  renter_id uuid not null references profiles,
  start_date date not null, end_date date not null check (end_date >= start_date),
  protection protection_plan not null default 'basic',
  days int not null,
  subtotal_cents int not null, protection_cents int not null,
  service_fee_cents int not null, total_cents int not null,
  owner_payout_cents int not null,
  payment_method text not null check (payment_method in ('pix','card')),
  payment_status text not null default 'paid' check (payment_status in ('paid','refunded')),
  status booking_status not null default 'requested',
  pickup_code char(4),
  requested_at timestamptz not null default now(),
  accepted_at timestamptz, started_at timestamptz, completed_at timestamptz, closed_at timestamptz,
  exclude using gist (car_id with =, daterange(start_date, end_date, '[]') with &&)
    where (status in ('requested','accepted','active'))
);

create type inspection_kind as enum ('pickup','return');
create table inspection_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings on delete cascade,
  kind inspection_kind not null,
  angle text not null check (angle in ('front','back','left','right')),
  url text not null,
  created_at timestamptz not null default now(),
  unique (booking_id, kind, angle)
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings on delete cascade,
  author_id uuid not null references profiles,
  target_id uuid not null references profiles,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id, author_id)
);
```

**RLS (resumo)**
- `bubbles`, `cars` listados, `car_photos`, `reviews`, `profiles` (só nome, avatar, verified): leitura para usuários logados.
- `profiles`: cada um edita só o seu. Trigger cria o profile no signup (`full_name` do metadata).
- `cars`, `car_photos`, `car_blocked_dates`: escrita só pelo `owner_id`.
- `bookings`: leitura pelo locatário ou pelo dono do carro; criação pelo locatário; transições só via Server Actions que usam o client do usuário e checam o papel.
- `inspection_photos`: leitura/escrita pelo locatário e pelo dono daquela reserva.
- Storage buckets: `car-photos` (público), `avatars` (público), `inspections` (privado, URLs assinadas), `documents` (privado).

**Views/funções úteis**
- `car_ratings` (view): média e contagem de avaliações por dono e por carro.
- Função `cars_in_bubble(bubble uuid)` opcional; pode filtrar em TypeScript.

## 8. Telas e rotas

Navegação inferior fixa (como no protótipo): **Explorar · Aluguéis · Ganhar · Perfil**.

| Rota | Tela | Conteúdo principal |
|---|---|---|
| `/` | Landing | Logo, frase "Seu carro parado vira renda. O do vizinho vira seu rumo.", 3 números (R$ 52 bi, 90%, <10 min), botões Entrar / Criar conta, link para vídeo demo |
| `/login`, `/signup` | Auth | E-mail, senha, nome (signup). Após signup → onboarding |
| `/onboarding` | Onboarding | Telefone, foto opcional, upload da CNH (marca `verified`), bolha = Butantã |
| `/explore` | Explorar | Mapa Leaflet ocupando a tela, círculo tracejado da bolha, ponto azul do usuário (geolocalização do navegador; se negada, centro da bolha), pins com preço, carrossel de cards embaixo, chips de filtro em cima, contador "Bolha Butantã · N carros em até 10 min" |
| `/cars/[id]` | Detalhe | Galeria, nome/ano, "X min a pé", nota e nº de aluguéis, specs (lugares, câmbio, combustível, ar), dono com selo, "Como funciona", avaliações, botão Reservar com preço/dia |
| `/cars/[id]/book` | Reserva | Seletor de datas (calendário de 2 semanas, dias indisponíveis desabilitados), proteção, método (Pix/cartão), resumo, comparação "na locadora sairia ~45% mais caro", botão Confirmar e pagar |
| `/bookings/[id]/pay` | Pix simulado | QR code (payload fake), código copia-e-cola, cronômetro 10 min, botão **Simular pagamento** → cria reserva paga → tela de sucesso |
| `/rentals` | Aluguéis (locatário) | Abas: Próximos / Ativo / Anteriores. Card com status em pill colorida |
| `/rentals/[id]` | Aluguel (locatário) | Por status: aguardando dono · código de retirada + endereço + vistoria de 4 fotos + "Iniciar aluguel" · em andamento + "Devolver carro" com 4 fotos · concluído + avaliar |
| `/earn` | Ganhar (dono) | Sem carro: CTA "Anuncie seu carro" + simulador. Com carro: cartão verde "Você ganhou em <mês>" com barra de % coberto, pedidos pendentes (aceitar/recusar), gráfico 6 meses ganhos x linha de custo, custos anuais, disponibilidade (toggle visível + dias da semana), simulador |
| `/earn/cars/new`, `/earn/cars/[id]/edit` | Anunciar/editar | Formulário em passos: carro (marca, modelo, ano, cor, placa, categoria, câmbio) → fotos (até 6) → local (clique no mapa + endereço) → preço e custos → disponibilidade |
| `/earn/bookings/[id]` | Reserva (dono) | Dados do locatário, datas, repasse; ações por status: aceitar/recusar · confirmar código de retirada · ver vistoria · confirmar devolução · avaliar |
| `/profile` | Perfil | Dados, selos, nota média, "Indique e ganhe R$ 30" (copiar código), sair |

Estados obrigatórios em toda lista: carregando (skeleton), vazio (texto + ação), erro (mensagem + tentar de novo).

## 9. Seed de demonstração

`supabase/seed.sql` ou `scripts/seed.ts` (usando service role) que cria:
- Bolha Butantã.
- **Contas de teste** (senha das duas em `.env.example` como `SEED_PASSWORD`, nunca em código):
  - `lucas@rumo.test` — locatário, verificado.
  - `ana@rumo.test` — dona do Kwid e de outro carro.
  - `bia@rumo.test` — locatária com um pedido pendente no carro do Lucas.
  - Mais 5 donos fictícios.
- 7 carros do protótipo, com coordenadas espalhadas dentro da bolha:
  Chevrolet Onix 2022 R$ 119 · Hyundai HB20 2021 R$ 109 · Renault Kwid 2023 R$ 89 · VW Polo 2022 R$ 139 (auto) · VW T-Cross 2023 R$ 189 (auto, SUV) · Fiat Mobi 2020 R$ 79 · Toyota Corolla 2021 R$ 219 (auto, sedan).
  Fotos: usar imagens geradas (SVG do carro colorido do protótipo convertido em arquivo, ou placeholders locais em `public/cars/`). **Sem hotlink de imagens de terceiros.**
- Um carro do Lucas também (Fiat Argo 2021, custos: IPVA 2.100, seguro 3.400, manutenção 1.800, depreciação 6.500 / ano) com aluguéis `completed` nos **últimos 6 meses até o mês corrente** (datas calculadas a partir de hoje) para o gráfico do "Ganhar" ficar cheio, com repasses de R$ 420, 610, 880, 940, 1.210 e 1.382 (o último no mês corrente), e **1 pedido `requested`** pendente feito por uma locatária fictícia (`bia@rumo.test`) para sexta→domingo da próxima semana.
- Avaliações para os carros terem nota 4,7–5,0.
- Script idempotente: rodar duas vezes não duplica.

## 10. Estrutura de pastas

```
src/
  app/(public)/            landing, login, signup
  app/(app)/               layout com bottom nav + guarda de auth
    explore/ cars/[id]/ rentals/ earn/ profile/ onboarding/
  components/              ui/ (Button, Card, Pill, Sheet, Skeleton…), map/, car/, booking/
  lib/
    supabase/{server,client,middleware}.ts
    pricing.ts  booking.ts  geo.ts  format.ts
    actions/{bookings,cars,profile,reviews}.ts   (Server Actions)
  types/db.ts               (gerado: npx.cmd supabase gen types … ou escrito à mão)
supabase/migrations/  supabase/seed.sql
scripts/seed.ts
tests/unit/  tests/e2e/
```

## 11. Fases (fazer em ordem; commit ao fim de cada uma)

Cada fase só termina quando o "Pronto quando" passa. Rodar `npm.cmd run build` e `npm.cmd run lint` ao fim de cada fase.

**Fase 0 — Setup**
Criar projeto, Tailwind com tokens, fontes, logo, layout com bottom nav, `.env.example`, cliente Supabase, middleware de sessão.
*Pronto quando:* `npm.cmd run dev` abre a landing com a identidade do protótipo.

**Fase 1 — Banco e seed**
Migration, RLS, buckets, trigger de profile, seed.
*Pronto quando:* seed roda duas vezes sem duplicar; as 7 contas existem; `select count(*) from cars` = 8.

**Fase 2 — Auth e perfil**
Signup, login, logout, onboarding, perfil, guarda de rotas.
*Pronto quando:* criar conta nova → onboarding → cai no Explorar; logout volta para a landing.

**Fase 3 — Explorar e detalhe**
Mapa, pins, cards, filtros, distância a pé, detalhe com avaliações e disponibilidade.
*Pronto quando:* logado como lucas, vê 7 carros (não o próprio) na bolha, filtro "Automáticos" mostra 3, abrir o Kwid mostra dona Ana com nota.

**Fase 4 — Reserva e Pix simulado**
`pricing.ts` + testes, tela de reserva, conflito de datas, Pix simulado, sucesso.
*Pronto quando:* testes de pricing passam (incluindo sex→dom = 3 diárias; Onix 4 diárias + completa = R$ 651); reservar datas já ocupadas mostra erro amigável.

**Fase 5 — Lado do dono**
Ganhar (painel, gráfico, simulador), anunciar/editar carro com fotos, aceitar/recusar.
*Pronto quando:* lucas vê R$ 1.382 no mês corrente do Argo e o pedido pendente da Bia; ao aceitar, a reserva muda para `accepted` com código de 4 dígitos.

**Fase 6 — Retirada, devolução, avaliações**
Código + vistoria 4 fotos → ativo; devolução 4 fotos → dono confirma → concluído; avaliações mútuas; "% coberto" atualiza.
*Pronto quando:* o fluxo inteiro roda com duas contas em duas janelas (uma anônima).

**Fase 7 — Polimento e testes**
Estados vazio/erro/carregando, responsivo, acessibilidade básica (labels, foco visível, contraste), teste e2e do fluxo principal.
*Pronto quando:* `npx.cmd playwright test` passa o fluxo: login lucas → reservar Kwid → pagar → (como ana) aceitar → (como lucas) vistoria → iniciar.

**Fase 8 — Deploy**
Vercel com variáveis de ambiente, URL de produção no README, seed rodado no Supabase de produção.
*Pronto quando:* a URL pública abre, login com a conta de teste funciona no celular.

**Se o tempo apertar**, cortar nesta ordem (sem quebrar o fluxo principal): avaliações → devolução com fotos (vira só botão "Concluir") → editar carro → filtros de preço → onboarding (CNH opcional).

## 12. Qualidade mínima

- TypeScript estrito, sem `any` solto.
- Toda Server Action valida entrada com `zod` e checa permissão no servidor.
- Nenhum segredo no código ou no git: `.env.local` no `.gitignore`; `SUPABASE_SERVICE_ROLE_KEY` só em scripts/servidor, nunca no client.
- Valores monetários sempre em centavos.
- Uploads: só imagem (`image/*`), máx. 5 MB, comprimir no client para ~1600px.
- Testes unitários: `pricing.ts` (diárias, taxas, arredondamento, repasse), `booking.ts` (transições permitidas/proibidas, sobreposição de datas), `geo.ts` (dentro/fora da bolha, minutos a pé).

## 13. Variáveis de ambiente (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=     # só para scripts/seed e server
SEED_PASSWORD=                 # senha das contas de teste do seed
```

## 14. Passos que só o humano faz (o agente deve pedir na hora certa e esperar)

1. Criar projeto em supabase.com (região São Paulo), copiar URL, anon key e service role para `.env.local`.
2. Rodar a migration: colar `supabase/migrations/0001_init.sql` no SQL Editor do Supabase (ou `npx.cmd supabase db push` se o CLI estiver ligado).
3. Em Authentication → Providers → Email: **desligar "Confirm email"** (para a demo não depender de e-mail).
4. Criar conta na Vercel, importar o repositório do GitHub e colar as variáveis de ambiente.

## 15. Definição de pronto do MVP

- [ ] URL pública no ar, abre no celular.
- [ ] Duas contas de teste demonstram o ciclo completo: buscar → reservar → pagar (simulado) → dono aceita → retirada com código e vistoria → devolução → avaliação.
- [ ] Painel do dono mostra ganhos x custo do carro e o simulador funciona.
- [ ] Um usuário novo consegue se cadastrar e anunciar um carro, que aparece no mapa da bolha.
- [ ] `npm.cmd run build`, `lint`, testes unitários e o e2e passam.
- [ ] README com: o que é, URL, contas de teste (sem senha; ela fica no `.env`), como rodar local, como rodar o seed.
