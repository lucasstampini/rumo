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

## Banco e seed (Fase 1)

8. **Coluna extra `bookings.pickup_confirmed_at`.** A spec diz que o aluguel fica ativo quando "dono confirma código + locatário envia 4 fotos", mas o schema não tem onde guardar a confirmação do dono. Esta coluna guarda o momento em que o dono digitou o código certo.
9. **Travas no banco, não só nas Server Actions.** Triggers em `bookings` recalculam preço/taxas no insert e só deixam passar as transições de status previstas, feitas pela pessoa certa (dono ou locatário). Assim ninguém burla preço ou pula etapa chamando a API do Supabase direto. As Server Actions continuam validando antes, para dar mensagens amigáveis.
10. **Perfis: colunas privadas.** Outros usuários só leem `full_name`, `avatar_url`, `verified` (grant por coluna). Telefone e CNH do próprio usuário vêm pela função `get_my_profile()`. `verified` não é editável pelo usuário: um trigger marca `true` quando a CNH é enviada.
11. **Datas ocupadas sem expor reservas alheias:** função `car_busy_ranges(car)` (security definer) devolve só os períodos.
12. **Expiração de 24h** do pedido sem resposta: função `expire_stale_requests()` chamada pelo servidor ao carregar as telas de aluguéis/ganhos (não há cron no MVP).
13. **O locatário também pode cancelar um pedido ainda `requested`** (a spec só desenha `accepted → cancelled`); seria estranho não poder desistir antes da resposta do dono.
14. **Contas do seed: 8, não 7.** A seção 9 lista lucas, ana, bia e "mais 5 donos fictícios" (= 8); a Fase 1 fala em 7. Vale a lista da seção 9. Ana é dona do Kwid e do Mobi; os outros 5 carros do protótipo ficam com os 5 donos fictícios.
15. **Bolha Butantã criada na migration** com id fixo, para que um cadastro novo já tenha bolha mesmo sem seed. O seed faz upsert da mesma linha.
16. **Views `car_ratings` e `profile_ratings`** são agregados; rodam com privilégio do dono da view para contar aluguéis que o usuário não pode ler linha a linha.
17. **Rodar o seed de novo reinicia a demo:** o pedido pendente da Bia no Argo volta para `requested` (com `requested_at` = agora, senão expiraria em 24h). Rode `npm.cmd run seed` antes de apresentar.
18. **Fotos dos carros do seed** são SVGs gerados do desenho do protótipo (`scripts/gen-car-svgs.mjs` → `public/cars/`), sem hotlink.

## Explorar e detalhe (Fase 3)

19. **Posição do usuário fora da bolha = centro da bolha.** A spec manda usar o centro só quando a geolocalização é negada; mas quem abre a demo de outro bairro veria "140 min a pé" em tudo. Se o GPS cair fora do círculo, usamos o centro também.
20. **Explorar lista todo carro anunciado dentro do círculo**, sem filtrar por "disponível hoje" (a tela não tem seletor de data). A regra de disponibilidade por dia da semana/bloqueio é aplicada no calendário da reserva e de novo no servidor e no banco.
21. **Filtro de preço** como dois chips ("Até R$ 100", "Até R$ 150") ao lado das categorias, em vez de um slider.
22. **Combustível "Flex" e ar-condicionado "Sim" são fixos** no detalhe: o schema da spec não tem essas colunas e o protótipo mostra esses valores para todos os carros.
23. **View `car_reviews`** entrega as avaliações de um carro com o nome de quem avaliou, sem dar acesso às reservas de terceiros.
24. **Atribuição do OpenStreetMap** aparece como um selo acima dos cards (o controle padrão do Leaflet ficaria escondido atrás deles).

## Reserva e Pix simulado (Fase 4)

25. **Rota do pagamento antes de a reserva existir: `/bookings/new/pay?car=…&start=…&end=…`.** A spec pede `/bookings/[id]/pay` e também diz que "Simular pagamento" é o que *cria* a reserva paga (o schema não tem estado "aguardando pagamento"). Então `[id]` vale `new` enquanto se paga, com o rascunho na query string, e depois do pagamento a mesma rota com o id real mostra a tela de sucesso.
26. **Tela de sucesso diz "Pagamento confirmado!"**, e não "Reserva confirmada!" como no protótipo: no MVP o dono ainda precisa aceitar, e o código de retirada só existe depois disso.
27. **Conflito de datas é checado três vezes:** no calendário (dias ocupados desabilitados), no servidor antes de ir ao pagamento e ao pagar (mensagem amigável), e no banco (exclusion constraint, erro `23P01` traduzido).
28. **Cartão de crédito** é só uma variação visual do pagamento simulado ("Cartão de teste •••• 4242"); não coleta dados de cartão.
29. **O QR do Pix é propositalmente inválido** (chave e CRC falsos), para ninguém pagar de verdade por engano.
30. **Limite de 5 MB vale para o arquivo já comprimido** (o que de fato sobe). Fotos de celular costumam passar de 5 MB antes da compressão para ~1600px.

## Lado do dono (Fase 5)

31. **Quem tem mais de um carro** (ex.: Ana) escolhe o carro por chips no topo do "Ganhar" (`/earn?car=<id>`); o painel sempre mostra um carro por vez.
32. **Bloqueio de dias específicos** (tabela `car_blocked_dates`) entrou no painel de disponibilidade como uma faixa de 14 dias, além dos dias da semana.
33. **Custos e diária são digitados em reais inteiros** no formulário e gravados em centavos.
34. **Fotos do carro sobem na hora em que são escolhidas** (bucket público `car-photos`, pasta do usuário); o anúncio só grava as URLs ao publicar. Fotos órfãs de um formulário abandonado ficam no bucket (sem limpeza no MVP).
35. **O ponto de retirada precisa cair dentro do círculo da bolha**; validado no formulário e de novo na Server Action.
36. **O dono lê o `pickup_code` pelo banco (RLS por linha), mas a tela dele não mostra**: ele precisa digitar o código que o locatário apresenta. Esconder a coluna de verdade exigiria outra tabela; fica fora do MVP.

## Retirada, devolução e avaliações (Fase 6)

37. **Ordem da retirada:** o locatário mostra o código → o dono digita e confirma → o locatário envia as 4 fotos → o locatário toca "Iniciar aluguel". O botão só habilita com as duas condições (código conferido + 4 fotos); a ordem entre elas é livre.
38. **Devolução:** quando as 4 fotos de devolução existem, o botão "Confirmar devolução" aparece para o dono. Não há um status intermediário "devolução pedida" (o schema não tem); o estado é derivado das fotos.
39. **Telas que esperam a outra pessoa se atualizam sozinhas a cada 6 s** (`AutoRefresh`), já que chat/realtime/push estão fora do MVP.
40. **Fotos de vistoria** ficam no bucket privado `inspections/<id da reserva>/<retirada|devolução>-<ângulo>.jpg`; a coluna `url` guarda o caminho e as telas usam URLs assinadas de 1 hora. Só o locatário envia; os dois veem.
41. **Aluguéis do dono** (pedidos, em andamento, histórico) ficam dentro do "Ganhar", por carro, e não na aba "Aluguéis" (que é a do locatário, como no protótipo).

## Polimento e testes (Fase 7)

42. **Botões principais usam o verde escuro (`green-d #0d7442`)** em vez do `green #159a58` do protótipo: texto branco sobre `#159a58` dá contraste ~3,6:1 e não passa no mínimo de 4,5:1. O verde claro continua em ícones, bordas, gráfico e barra de progresso.
43. **O e2e inclui a conferência do código pela dona** entre a vistoria e o início (a lista da Fase 7 pula esse passo, mas o ciclo da seção 6 exige). Antes de rodar, ele apaga reservas em aberto do Kwid com a service role, para ser repetível.
44. **Estados de lista:** carregando = `loading.tsx` com skeleton; erro = `error.tsx` com "Tentar de novo"; vazio = texto + ação em cada lista.
