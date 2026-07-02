# FORGE — Identity Engine

Decide who you are. Prove it daily.

## Deploy (one-time setup, ~30 minutes)

### 1. Put this code on GitHub
- Open your repository (Forged App) on github.com
- Click **Add file → Upload files**
- Drag ALL files and folders from this zip (keep the folder structure: `src/`, `api/`, `public/`, plus the root files)
- Click **Commit changes**

### 2. Deploy on Vercel
- Go to vercel.com → **Add New → Project**
- Import your **Forged App** repository (Vercel auto-detects Vite — accept defaults)
- Before deploying, open **Environment Variables** and add:
  - Name: `ANTHROPIC_API_KEY`
  - Value: your key from console.anthropic.com → API Keys
- Click **Deploy**. In ~1 minute you get a live URL like `forged-app.vercel.app`

### 3. Connect forgeyourself.app
- In the Vercel project: **Settings → Domains → Add** → enter `forgeyourself.app`
- Vercel shows you DNS records (an A record and/or CNAME)
- In Namecheap: **Domain List → Manage → Advanced DNS** → add those records
- Wait 10 min – 2 hours for DNS. Done: FORGE is live at forgeyourself.app

### Notes
- The Anthropic key lives ONLY in Vercel env vars — never in this code.
- User data currently lives in each device's localStorage (same behavior as the prototype). Accounts + sync come with the Stripe build.
- Supabase cohort/feedback works as-is (public anon key, by design for the prototype cohort).
