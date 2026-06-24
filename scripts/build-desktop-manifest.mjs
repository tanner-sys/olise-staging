#!/usr/bin/env node
/**
 * Build a Tauri static update manifest (latest.json) from release bundle artifacts.
 *
 * Usage:
 *   node scripts/build-desktop-manifest.mjs \
 *     --version 0.1.1 \
 *     --notes "Bug fixes" \
 *     --artifact-dir src-tauri/target/release/bundle \
 *     --base-url https://olise-ui-staging.grayocean-e370e875.eastus.azurecontainerapps.io/desktop/releases/0.1.1
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const value = argv[i + 1]
    args[key.slice(2)] = value
    i += 1
  }
  return args
}

function findSigFile(dir, pattern) {
  if (!existsSync(dir)) return null
  const files = readdirSync(dir, { recursive: true })
  const match = files.find((file) => typeof file === 'string' && file.endsWith(pattern))
  return match ? join(dir, match) : null
}

function platformEntry(artifactDir, baseUrl, platform, globEndsWith) {
  const sigPath = findSigFile(artifactDir, globEndsWith)
  if (!sigPath) return null

  const fileName = basename(sigPath.replace(/\.sig$/, ''))
  const signature = readFileSync(sigPath, 'utf8').trim()

  return {
    signature,
    url: `${baseUrl.replace(/\/$/, '')}/${fileName}`,
  }
}

const args = parseArgs(process.argv)
const version = args.version
const artifactDir = args['artifact-dir']
const baseUrl = args['base-url']

if (!version || !artifactDir || !baseUrl) {
  console.error('Missing required args: --version, --artifact-dir, --base-url')
  process.exit(1)
}

const platforms = {}

const darwinArm = platformEntry(artifactDir, baseUrl, 'darwin-aarch64', '.app.tar.gz.sig')
if (darwinArm) platforms['darwin-aarch64'] = darwinArm

const darwinX64 = platformEntry(artifactDir, baseUrl, 'darwin-x86_64', '.app.tar.gz.sig')
if (darwinX64) platforms['darwin-x86_64'] = darwinX64

const linux = platformEntry(artifactDir, baseUrl, 'linux-x86_64', '.AppImage.tar.gz.sig')
if (linux) platforms['linux-x86_64'] = linux

const windows = platformEntry(artifactDir, baseUrl, 'windows-x86_64', '.nsis.zip.sig')
if (windows) platforms['windows-x86_64'] = windows

if (Object.keys(platforms).length === 0) {
  console.error('No updater signatures found under', artifactDir)
  process.exit(1)
}

const manifest = {
  version,
  notes: args.notes ?? '',
  pub_date: new Date().toISOString(),
  platforms,
}

const outPath = args.out ?? 'public/desktop/latest.json'
writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Wrote ${outPath}`)
