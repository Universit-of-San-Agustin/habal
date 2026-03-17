# HABAL

<p align="center">
	<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=700&size=22&duration=2400&pause=700&color=22C55E&center=true&vCenter=true&width=900&lines=HABAL+Platform;Real-time+Booking+%E2%80%A2+Dispatch+%E2%80%A2+Role+Simulation;Built+with+React%2C+Vite%2C+and+Mapbox" alt="typing-banner" />
</p>

<p align="center">
	<a href="https://github.com/Universit-of-San-Agustin/habal/actions"><img src="https://img.shields.io/github/actions/workflow/status/Universit-of-San-Agustin/habal/deploy-pages.yml?style=for-the-badge&label=Pages%20Deploy" alt="deploy-status" /></a>
	<img src="https://img.shields.io/badge/React-18-149ECA?style=for-the-badge&logo=react&logoColor=white" alt="react" />
	<img src="https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="vite" />
	<img src="https://img.shields.io/badge/TailwindCSS-3.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="tailwind" />
	<img src="https://img.shields.io/badge/Mapbox-GL-000000?style=for-the-badge&logo=mapbox&logoColor=white" alt="mapbox" />
</p>

## Overview

HABAL is a role-based mobility platform prototype focused on booking, rider dispatch, operator monitoring, and admin visibility. It includes a full demo simulation loop for end-to-end flow testing without requiring live backend interactions in demo mode.

## Core Features

- Multi-role experience: Customer, Rider, Operator, Admin
- Live booking lifecycle and trip status transitions
- Dispatch activity stream and role-specific dashboards
- Rider location visualization and map tracking
- Demo store simulation for local, deterministic test runs
- GitHub Pages-ready static deployment pipeline

## Tech Stack

- React 18
- Vite 6
- Tailwind CSS
- React Router
- TanStack Query
- Mapbox GL

## Quick Start

1. Clone the repository.
2. Install dependencies:

```bash
npm install
```

3. Copy environment template and configure values:

```bash
cp .env.example .env.local
```

4. Start development server:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

## Deployment (GitHub Pages)

This repository includes a Pages workflow at [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

1. Go to repository Settings > Pages.
2. Set source to GitHub Actions.
3. Push to main.
4. Wait for workflow completion in Actions.

## Project Structure

- [src](src): application source code
- [src/components](src/components): role dashboards and shared UI
- [src/pages](src/pages): route-level entry pages
- [functions](functions): server-side function handlers
- [.github/workflows](.github/workflows): CI/CD workflows

## Author

- Satoshinkarts

## Credits

- Open-source community libraries and tooling
