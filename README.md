# ShiftOS Engineering Foundation

This repository is scaffolded as a monorepo for the ShiftOS engineering foundation.

## Workspace layout

- `apps/web/` — React web application.
- `apps/mobile/` — Expo React Native mobile application.
- `packages/config/` — Shared configuration for apps and packages.
- `packages/constants/` — Shared constant values.
- `packages/types/` — Shared TypeScript types.
- `packages/ui/` — Shared UI package placeholder.
- `packages/utils/` — Shared utility package placeholder.
- `supabase/` — Prepared Supabase folder structure.
- `docs/` — Product and developer documentation.
- `assets/` — Shared assets and media.
- `scripts/` — Dev scripts and automation.

## Package manager

This repository uses `pnpm` as the official package manager.

Install dependencies with:

```bash
pnpm install
```

## Development commands

```bash
pnpm dev:web
pnpm start:mobile
pnpm build:web
pnpm typecheck
pnpm lint
pnpm format
```

## TypeScript setup

- `tsconfig.base.json` defines shared compiler options, strict mode, and path aliases.
- `tsconfig.json` is the root project reference file.
- App and package workspaces reference the shared base config.

## Tooling

- ESLint configured for TypeScript, React, and JSX accessibility.
- Prettier configured for consistent formatting.
- EditorConfig enforced for whitespace and newlines.

## Notes

- No business logic, authentication, APIs, database tables, or UI screens are implemented.
- `supabase/` is only scaffolded with empty subfolders.
- Shared packages are prepared but empty.
