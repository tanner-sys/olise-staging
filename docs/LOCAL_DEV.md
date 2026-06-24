# Local development — olise-ui

## Repo layout

```
~/olise-ui/        # This repo
~/olise-supabase/  # Migrations + local Supabase
~/olise-brain/     # Chat service (Azure locally or remote staging)
```

> **Note:** Local folders may still be named `nira-*` until you rename the git clones. Functionality is unchanged.

## 1. Start Supabase

```bash
cd ~/olise-supabase
supabase start
supabase db reset    # migrations + seed
```

Copy anon URL and key from `supabase status`.

## 2. Configure UI

```bash
cd ~/olise-ui
cp .env.example .env
# Set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_BRAIN_URL
npm install
npm run dev
```

## 3. (Optional) Run brain locally

```bash
cd ~/olise-brain
cp .env.example .env
npm install
npm run dev
```

Point `VITE_BRAIN_URL=http://localhost:8080` in `olise-ui/.env`, or use the staging brain URL.

## Auth flow (local)

1. Sign up at `/signup`
2. Verify email (Inbucket at http://127.0.0.1:54324 for local mail)
3. Accept consent modal
4. Chat home at `/`

See `~/olise-supabase/docs/INFRA.md` for provisioning checklist.
