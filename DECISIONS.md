# DECISIONS

Decisões tomadas durante a construção que a `SPEC.md` não cobre (ou onde foi preciso desviar). Mais recentes no fim.

## Ambiente e entrega (modo autopilot, 22/11/2026)

1. **Passos manuais da seção 14 substituídos por ambiente local.** O pedido foi rodar sem parar e trocar os passos humanos por algo mockado. Em vez de mockar o Supabase em código, o app usa um **Supabase local de verdade** (`supabase start`, via Docker): mesmo Postgres, Auth, Storage e RLS. Trocar para o Supabase da nuvem é só mudar as 3 variáveis do `.env.local`, rodar a migration e o seed. Nada no código é falso.
   - 14.1 (criar projeto) → Supabase local; `.env.local` já preenchido com as chaves padrão de desenvolvimento do CLI.
   - 14.2 (rodar migration) → `supabase db reset` aplica `supabase/migrations/*`.
   - 14.3 (desligar "Confirm email") → `enable_confirmations = false` em `supabase/config.toml`.
   - 14.4 (Vercel) → **não feito**: o token da Vercel CLI nesta máquina está inválido e uma URL pública apontando para um banco local não funcionaria. A Fase 8 foi validada com `next build` + `next start` local. O passo a passo para publicar está no README.
2. **Portas do Supabase local em 5532x** (API `55321`, DB `55322`, Studio `55323`). As portas padrão 5432x já estavam em uso por outro projeto Supabase local desta máquina (`lugh`), que não foi tocado.
3. **Pasta do projeto: `C:\Users\lucas\rumo-app`** (como manda a spec), e não a pasta do OneDrive onde a sessão foi aberta: `node_modules` dentro do OneDrive causa travas de arquivo e sincronização de dezenas de milhares de arquivos.
4. **Git: branch `mvp` no repositório `lucasstampini/rumo`.** A `main` desse repositório é o site do protótipo publicado no GitHub Pages (`lucasstampini.github.io/rumo`). Para não derrubar o protótipo e o vídeo demo, o MVP vai numa branch separada. Na Vercel, basta escolher `mvp` como Production Branch (ou fazer merge quando quiser aposentar o protótipo).
5. **Next.js 15** fixado via `create-next-app@15` (a spec pede 15; o `@latest` já instalaria outra major).
6. **`<img>` em vez de `next/image`.** As imagens são SVGs locais ou arquivos do Supabase Storage; evita configurar `remotePatterns` por ambiente. Regra do ESLint desligada.
7. **Link do vídeo demo** na landing aponta para o GitHub Pages do protótipo (`/rumo/demo.html`), em vez de duplicar 9 MB de vídeo neste repositório.
