# Contributing

Thanks for wanting to improve Flowly!

## Development
1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Run the playground:
   ```bash
   pnpm dev
   ```
3. Run tests:
   ```bash
   pnpm test
   ```

## Packages
- `packages/flowly` — core library + devtools + URL adapter + test harness.
- `apps/playground-web` — Vite demo.

## Changesets
We are not using changesets yet; update `CHANGELOG.md` manually.

## Code style
- TypeScript strict mode.
- Avoid adding new runtime dependencies unless necessary.
