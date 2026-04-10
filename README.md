# Hedge Lab — frontend (Next.js)

Documentação principal do projeto (desenvolvimento local, produção Vercel + API, atualização de dados, Docker): **[README.md na raiz do repositório](../README.md)** (válido quando este diretório está dentro do monorepo privado).

## Repositório público (Vercel Hobby)

Para manter o **backend privado** e um **repo público só com o Next.js** (ex.: exigência do plano Hobby):

1. Crie no GitHub um repositório **público vazio** (sem README inicial).
2. No clone do **monorepo privado**, registre o remote, por exemplo:
   ```bash
   git remote add public https://github.com/SEU_USUARIO/hedge-lab-web.git
   ```
3. Envie apenas `frontend/` para esse remote (a raiz do repo público passa a ser este app):
   ```powershell
   .\tools\push-frontend-to-public.ps1
   ```
4. Na Vercel, importe o repositório **público**; **Root Directory** em branco. Defina `API_BASE_URL` (preferido), `NEXT_PUBLIC_API_BASE_URL` se quiser expor a URL para debug, e demais variáveis (ver secção **3** em `docs/DEPLOY_RENDER_RAILWAY_VERCEL.md` no **monorepo privado** — neste clone público esse ficheiro não existe).

O workflow em `.github/workflows/ci.yml` (presente nesta pasta) só é executado pelo GitHub **no repo público**, após o push do subtree (na raiz do repositório).

## Comandos rápidos (esta pasta)

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). Para a API local, use `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000` em `.env.local` se necessário.

Build de produção:

```bash
npm run build
npm run start
```

Deploy na Vercel e variáveis de ambiente: ver [docs/DEPLOY_RENDER_RAILWAY_VERCEL.md](../docs/DEPLOY_RENDER_RAILWAY_VERCEL.md).

## Next.js

Este projeto usa [Next.js](https://nextjs.org). Documentação oficial: [nextjs.org/docs](https://nextjs.org/docs).
