# Staging UI infrastructure

## Live staging URL

https://olise-ui-staging.grayocean-e370e875.eastus.azurecontainerapps.io

Azure Container App `olise-ui-staging` in `nira-staging-rg` (nginx serving Vite `dist/`).

## Manual redeploy

Build and push from repo root after `npm run build` with staging Vite env vars:

```bash
export VITE_SUPABASE_URL=https://ryurfgfcerfiyaegbxuv.supabase.co
export VITE_SUPABASE_ANON_KEY=<anon-key>
export VITE_BRAIN_URL=https://nira-brain-staging.grayocean-e370e875.eastus.azurecontainerapps.io
npm run build

TAG=staging-$(date +%Y%m%d%H%M%S)
az acr build --registry nirabrainstgacr --image "olise-ui:${TAG}" --image olise-ui:staging --platform linux/amd64 -f Dockerfile.staging .

# Use a unique tag (or revision suffix) so Container Apps pulls the new image — reusing `:staging` alone may not roll out.
az containerapp update \
  --name olise-ui-staging \
  --resource-group nira-staging-rg \
  --image "nirabrainstgacr.azurecr.io/olise-ui:${TAG}" \
  --revision-suffix "r${TAG#staging-}"
```

## Azure Static Web Apps (GitHub CI)

Resource: `olise-ui-staging` in `nira-staging-rg`  
Default hostname: `https://ambitious-mushroom-029ea9b0f.7.azurestaticapps.net`

GitHub Actions workflow: `.github/workflows/deploy-staging.yml`  
Secrets: `AZURE_CREDENTIALS`, `AZURE_CONTAINER_REGISTRY`, `AZURE_RESOURCE_GROUP`, `VITE_*`

## Supabase auth redirects

Add to staging Supabase project (Auth → URL configuration):

- Site URL: `https://olise-ui-staging.grayocean-e370e875.eastus.azurecontainerapps.io`
- Redirect URLs: `https://olise-ui-staging.grayocean-e370e875.eastus.azurecontainerapps.io/**`, `https://staging.olise.co/**`
