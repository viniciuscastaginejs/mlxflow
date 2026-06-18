# MLX Flow — base + módulo Dashboard

Sistema interno da MLX Mind. Next.js (App Router) + Supabase + Vercel.

## Passo a passo

1. **Crie o projeto Next.js** (se ainda não tiver) e copie estes arquivos por cima:
   ```bash
   npx create-next-app@latest mlxflow --ts --app --no-tailwind --no-src-dir --import-alias "@/*"
   ```
   (Pode deixar Tailwind se quiser — o dashboard usa CSS próprio em `globals.css`, então funciona com ou sem.)

2. **Instale as dependências do Supabase:**
   ```bash
   npm install @supabase/ssr @supabase/supabase-js
   ```

3. **Rode o schema** (`mlxflow_schema.sql`) no SQL Editor do Supabase.

4. **Variáveis de ambiente** — crie `.env.local` (veja `.env.local.example`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # usado depois, na aprovação pública de posts
   ```
   Pega em: Supabase > Project Settings > API.

5. **Crie seu usuário** em Authentication > Users e rode o `update profiles set role='admin'...`
   (está comentado no fim do schema) pra virar admin.

6. `npm run dev` → acesse `/login`.

## Estrutura

```
middleware.ts                 protege rotas + força noindex
app/layout.tsx                metadata noindex, lang pt-BR
app/globals.css               identidade visual MLX
app/robots.ts                 robots.txt bloqueado (Disallow: /)
app/login/                    tela de login + server action
app/(app)/layout.tsx          layout autenticado (sidebar + header)
app/(app)/dashboard/page.tsx  o dashboard
app/api/dashboard/route.ts    mesma data via REST (GET /api/dashboard)
lib/supabase/                 clients server/browser + middleware
lib/queries/dashboard.ts      agregação dos dados do dashboard
lib/format.ts                 R$ e números em pt-BR
```

A lógica do dashboard fica em `lib/queries/dashboard.ts` e é usada tanto pela
página (server component) quanto pela API route — sem duplicar.
