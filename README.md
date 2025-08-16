# Lukewarm Split (Next.js + Tailwind)

A gorgeous, minimalist web app to split Uber Eats / grocery orders fairly:
- Items assigned per person
- Fees split evenly across participants
- **Balanced whole-dollar rounding** that preserves the rounded total
- 4-step wizard with clean UI and lucide icons
- LocalStorage persistence

## Quick Start

```bash
# 1) Install deps
pnpm i   # or: npm i  OR  yarn

# 2) Run locally
pnpm dev # or: npm run dev

# 3) Build + preview
pnpm build && pnpm start
```

## Deploy to Vercel

1. Create a new **GitHub repo** named `lukewarm-split` and push this folder.
2. In **Vercel**, click **New Project** → import the repo.
3. Framework preset: **Next.js**. No special env vars needed.
4. Deploy. You're done.

## Tech
- Next.js 14 (app router)
- TailwindCSS
- lucide-react
- TypeScript

## Notes
- All state persists in `localStorage` for convenience.
- If you want a read-only share page next, we can add `/share` that serializes the order to the URL.
