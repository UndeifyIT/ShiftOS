# Developer Workspace Setup

## Purpose

This document describes the ShiftOS engineering foundation workspace layout, package responsibilities, and developer workflow.

## Folder structure

- `apps/web/`: React web application.
- `apps/mobile/`: Expo React Native mobile application.
- `packages/config/`: Shared configuration package.
- `packages/constants/`: Shared constants package.
- `packages/types/`: Shared TypeScript types package.
- `packages/ui/`: Shared UI package placeholder.
- `packages/utils/`: Shared utilities package placeholder.
- `supabase/`: Prepared Supabase folder structure.
- `assets/`: Shared asset files.
- `scripts/`: Automation and developer scripts.

## Package responsibilities

- `@shiftos/config`: app configuration values and environment helpers.
- `@shiftos/constants`: app constants only.
- `@shiftos/types`: shared TypeScript types only.
- `@shiftos/ui`: placeholder package for shared UI components.
- `@shiftos/utils`: placeholder package for shared utilities.

## Workspace layout

This repository uses pnpm workspaces:

- `apps/*`
- `packages/*`

Each app and package is a separate workspace.

## Development workflow

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run the web application:

   ```bash
   pnpm dev:web
   ```

3. Run the Expo mobile app:

   ```bash
   pnpm start:mobile
   ```

4. Check types:

   ```bash
   pnpm typecheck
   ```

5. Lint and format:

   ```bash
   pnpm lint
   pnpm format
   ```

## Notes

- No business features, authentication, API routes, database tables, or UI implementations are present.
- This workspace is prepared for future feature development.
