# HABAL

<p align="center">
	<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=22&duration=2200&pause=800&color=22C55E&center=true&vCenter=true&width=900&lines=%E2%98%98+HABAL+%7C+Clover+Edition;%E2%9A%A1+Fast+Demo+Flows+%E2%80%A2+Live+Maps+%E2%80%A2+Role+Switching;%F0%9F%9A%80+Built+to+impress+developers" alt="typing-banner" />
</p>

<p align="center">
	<a href="https://github.com/Universit-of-San-Agustin/habal/actions"><img src="https://img.shields.io/github/actions/workflow/status/Universit-of-San-Agustin/habal/deploy-pages.yml?style=for-the-badge&label=Pages%20Deploy" alt="deploy-status" /></a>
	<img src="https://img.shields.io/badge/Clover-%E2%98%98-22c55e?style=for-the-badge" alt="clover" />
	<img src="https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="vite" />
	<img src="https://img.shields.io/badge/React-18-149ECA?style=for-the-badge&logo=react&logoColor=white" alt="react" />
</p>

## ☘ Project Identity

- Platform: HABAL ride and dispatch experience
- Theme/Credit direction: 4.chan clover style inspiration
- Focus: demo-ready flow, role switching, dispatch visibility, and map-based interaction

## ⚡ Quick Start

1. Clone this repository.
2. Go to the project folder.
3. Install dependencies:

```bash
npm install
```

4. Create `.env.local` from `.env.example` and set values:

```env
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url
VITE_MAPBOX_PUBLIC_TOKEN=your_mapbox_public_token
```

5. Start local development:

```bash
npm run dev
```

6. Build production bundle:

```bash
npm run build
```

## 🚀 GitHub Pages Deployment

This repo is already configured for Pages via GitHub Actions.

1. Open repository Settings > Pages.
2. Set source to GitHub Actions.
3. Push to `main`.
4. Workflow [deploy-pages.yml](.github/workflows/deploy-pages.yml) builds and deploys `dist`.

### Pages Notes

- Uses `HashRouter` automatically on `github.io` hosts.
- Vite base path is configured for static subpath hosting.
- `.nojekyll` is included for clean static asset handling.

## 🧠 Developer Highlights

- Multi-role flow: Customer, Rider, Operator, Admin
- Demo-mode store for local simulation
- Real-time style dispatch activity feed
- Mapbox-powered rider and trip visualization

## 👤 Author

- Satoshinkarts

## 🙏 Credits

- 4.chan clover-inspired creative direction ☘
- Open-source ecosystem: React, Vite, Tailwind, Lucide
