# RUMO — MVP

Marketplace peer-to-peer de aluguel de carros: o dono anuncia o carro ocioso e ganha renda; o locatário acha um carro a menos de 10 minutos a pé e aluga sem burocracia. Piloto na bolha **Butantã / USP**.

O que dá para fazer: cadastro e login, explorar o mapa da bolha, reservar com Pix simulado, o dono aceitar ou recusar, retirada com código de 4 dígitos e vistoria de 4 fotos, devolução, avaliações mútuas, painel de ganhos × custo do carro, simulador de renda e anúncio de carro novo.

- Especificação: [`SPEC.md`](SPEC.md) · decisões fora da spec: [`DECISIONS.md`](DECISIONS.md)
- Protótipo e vídeo demo: <https://lucasstampini.github.io/rumo/> (branch `main`; este MVP vive na branch `mvp`)

## URL

**Ainda não publicado.** O MVP roda completo em ambiente local (Next.js + Supabase local). Para colocar no ar, siga [Publicar](#publicar-supabase--vercel) — são os passos manuais da seção 14 da spec.

## Contas de teste

Criadas pelo seed. A senha é a mesma para todas e fica em `SEED_PASSWORD` no `.env.local` (não está no repositório).

| E-mail | Papel na demo |
|---|---|
| `lucas@rumo.test` | Locatário verificado e dono do Fiat Argo (painel "Ganhar" cheio, com um pedido pendente da Bia) |
| `ana@rumo.test` | Dona do Renault Kwid e do Fiat Mobi |
| `bia@rumo.test` | Locatária com o pedido pendente no Argo do Lucas |
| `mariana@`, `rafael@`, `carlos@`, `juliana@`, `eduardo@rumo.test` | Donos dos outros carros |

Roteiro de demo com duas janelas (uma anônima): como **lucas**, reserve o Kwid e simule o Pix → como **ana**, aceite em *Ganhar* → lucas vê o código em *Aluguéis* e envia as 4 fotos → ana digita o código → lucas inicia → lucas envia as fotos de devolução → ana confirma → os dois se avaliam.

## Rodar local

Requisitos: Node 20+, Docker Desktop aberto. No PowerShell use `npm.cmd` / `npx.cmd`.

```powershell
npm.cmd install
Copy-Item .env.example .env.local      # depois preencha (veja abaixo)
npm.cmd run db:start                   # sobe o Supabase local (Postgres, Auth, Storage)
npm.cmd run db:reset                   # aplica supabase/migrations/0001_init.sql
npm.cmd run seed                       # contas de teste, 8 carros, histórico
npm.cmd run dev                        # http://localhost:3000
```

`.env.local` para o Supabase local: `npm.cmd run db:start` imprime `API_URL`, `ANON_KEY` e `SERVICE_ROLE_KEY`; copie para `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`, e escolha um `SEED_PASSWORD`. As portas locais são `5532x` (API `55321`, banco `55322`, Studio `http://127.0.0.1:55323`).

Depois de reiniciar o computador: abra o Docker Desktop, rode `npm.cmd run db:start` e `npm.cmd run dev`. Os dados ficam guardados no volume do Docker.

## Seed

```powershell
npm.cmd run seed
```

Idempotente (ids fixos + upsert): pode rodar quantas vezes quiser sem duplicar. **Rode antes de apresentar**: ele recoloca o pedido pendente da Bia no Argo como "novo" (pedidos sem resposta expiram em 24h) e recalcula as datas a partir de hoje. Para zerar tudo, `npm.cmd run db:reset` e depois o seed.

## Testes e qualidade

```powershell
npm.cmd run build
npm.cmd run lint
npm.cmd test            # vitest: preço, ciclo da reserva, datas, geografia
npx.cmd playwright test # e2e: lucas reserva o Kwid → paga → ana aceita → vistoria → código → início
```

O e2e precisa do Supabase no ar e do seed rodado; ele sobe o `next dev` sozinho se não houver um aberto. Na primeira vez: `npx.cmd playwright install chromium`.

## Publicar (Supabase + Vercel)

1. Crie um projeto em supabase.com (região São Paulo). Copie URL, anon key e service role.
2. Rode a migration: cole `supabase/migrations/0001_init.sql` no SQL Editor (ou `npx.cmd supabase link` + `npx.cmd supabase db push`).
3. Em Authentication → Providers → Email, desligue **Confirm email**.
4. Rode o seed apontando para a nuvem: coloque as 3 chaves do projeto e um `SEED_PASSWORD` no `.env.local` e rode `npm.cmd run seed`.
5. Na Vercel, importe `lucasstampini/rumo`, escolha a branch **`mvp`** como Production Branch e cadastre `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`.
6. Coloque a URL de produção na seção [URL](#url) deste README.

## Estrutura

```
src/app/(public)/      landing, login, signup
src/app/(app)/         explore, cars, bookings, rentals, earn, profile, onboarding (bottom nav + guarda de auth)
src/components/        ui/, map/, car/, booking/, earn/
src/lib/               pricing.ts, booking.ts, geo.ts, dates.ts, format.ts (regras puras, testadas)
src/lib/actions/       Server Actions (auth, bookings, cars, profile, reviews)
src/lib/supabase/      clients de servidor, navegador e middleware
supabase/migrations/   schema, RLS, triggers, buckets
scripts/seed.ts        dados de demonstração
tests/unit, tests/e2e
```

Stack: Next.js 15 (App Router, Server Actions), Tailwind v4, Supabase (`@supabase/ssr`), Leaflet + OpenStreetMap, Recharts, Zod, Vitest, Playwright.
