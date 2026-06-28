---
name: Dockerfile must use node:20-slim not alpine
description: Sharp (image compression) uses prebuilt glibc binaries that fail on Alpine musl; Dockerfile must stay on node:20-slim.
---

# Dockerfile base image: node:20-slim (not alpine)

## Rule
Keep both builder and runner stages on `node:20-slim`. Do not switch back to `node:20-alpine`.

**Why:** The `sharp` package for image compression uses prebuilt native binaries (`@img/sharp-libvips-linux-x64`) compiled against glibc. Alpine Linux uses musl libc — glibc binaries fail at runtime on Alpine. When `pnpm install --frozen-lockfile` runs in Docker, it uses the lock file generated on Replit (Ubuntu/glibc), which pins the glibc variant. Adding `libc6-compat` to Alpine is unreliable; switching base images is cleaner.

**How to apply:** Any future Dockerfile change must keep `FROM node:20-slim`. The `addgroup`/`adduser` commands also differ — Debian slim uses `addgroup --system` / `adduser --system --ingroup`, not the Alpine-style `addgroup -S` / `adduser -S -G`.
