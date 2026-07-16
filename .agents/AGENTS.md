# Project Rules: Chatcart

## Automated Verification Policy
To prevent regressions and ensure system stability, the following rules MUST be followed:
1. Every time you make any changes to Nginx configurations, database schemas, frontend pages, or backend routes, you MUST run the automated health check verification script:
   ```bash
   node scripts/verify_system.mjs https://chatcart.in
   ```
2. When deploying to production, you MUST verify that the deployment successfully passes all verification tests. The custom deployment script `deploy.sh` contains built-in verification checks and will automatically roll back code on failure.
3. NEVER manually restart services without verifying the health of the API container via `/api/healthz`.
