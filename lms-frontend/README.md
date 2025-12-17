# LMS Frontend (Vite + React + Tailwind)

This is a ready-to-run scaffold for your **LMS** frontend using **Vite**, **React**, and **Tailwind CSS**.

## Quick Start

```bash
# 1) Install deps
npm install

# 2) Create env (optional if using default localhost API)
cp .env.example .env

# 3) Run dev server
npm run dev
```

The app runs on **http://localhost:5173** by default.

## Environment

Create a `.env` file in the project root:

```
VITE_API_URL=http://localhost:5000
```

Use `import.meta.env.VITE_API_URL` anywhere you need your backend base URL.

## Scripts

- `npm run dev` — Start Vite dev server
- `npm run build` — Production build
- `npm run preview` — Preview the production build

## Notes

- Tailwind is preconfigured with `darkMode: "class"`.
- Content paths cover `index.html` and all files in `src/`.
- Vite React plugin is included.
