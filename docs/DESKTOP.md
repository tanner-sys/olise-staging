# Olise desktop (Tauri)

Primary v1 distribution: signed native app with in-app updates.

## Prerequisites

- Rust toolchain (`rustup`)
- macOS: Xcode CLT (for signing/notarization in production)
- Env vars for staging backend (same as web):

```bash
export VITE_SUPABASE_URL=https://ryurfgfcerfiyaegbxuv.supabase.co
export VITE_SUPABASE_ANON_KEY=<anon-key>
export VITE_BRAIN_URL=https://nira-brain-staging.grayocean-e370e875.eastus.azurecontainerapps.io
```

## Local dev

```bash
npm run tauri:dev
```

## Production build

Signing private key **must** be available (never commit `src-tauri/olise.key`):

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat src-tauri/olise.key)"
# or TAURI_SIGNING_PRIVATE_KEY_PATH=src-tauri/olise.key

npm run tauri:build
```

Updater bundles (`.tar.gz` / `.sig` etc.) are created when `bundle.createUpdaterArtifacts` is `true`.

## In-app updates

Configured in `src-tauri/tauri.conf.json`:

- **Public key** — embedded at build time (from `src-tauri/olise.key.pub`)
- **Endpoint** — static manifest at staging:
  `https://olise-ui-staging.grayocean-e370e875.eastus.azurecontainerapps.io/desktop/latest.json`

When a newer signed version exists, desktop users see an **Update** pill in the sidebar footer (next to their name). Click → download → restart.

Checks run on launch and every 4 hours.

### Release flow

1. Tag `desktop-v0.1.1` or run **Release Desktop** workflow (`workflow_dispatch`)
2. GitHub Action builds all targets with `tauri-apps/tauri-action` (requires `TAURI_SIGNING_PRIVATE_KEY` secret)
3. Publish `latest.json` + platform bundles to static hosting under `/desktop/`
4. Existing installs pick up the update on next check

Generate a manifest locally after build:

```bash
node scripts/build-desktop-manifest.mjs \
  --version 0.1.1 \
  --notes "First desktop release" \
  --artifact-dir src-tauri/target/release/bundle \
  --base-url https://olise-ui-staging.grayocean-e370e875.eastus.azurecontainerapps.io/desktop/releases/0.1.1
```

Copy `public/desktop/latest.json` into the deployed static site (or automate in CI).

For Azure staging manifest mirroring, add repo secrets `AZURE_CREDENTIALS`, `AZURE_CONTAINER_REGISTRY`, and `AZURE_RESOURCE_GROUP` (same as deploy-staging). The `publish-desktop-manifest` workflow runs after each successful desktop release.

Regenerate keys (only if rotating):

```bash
CI=true npx tauri signer generate -w src-tauri/olise.key -p "" -f
```

Update `plugins.updater.pubkey` in `tauri.conf.json` with the new `.pub` content.

## Window defaults

1200×800 default, 960×640 minimum — caregiver laptop reference layout.
