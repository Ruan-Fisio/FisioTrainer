# Operational Scripts (`scripts`)

## Overview

Contains standalone CLI operational scripts for infrastructure provisioning. Currently hosts `r2-setup.ts`, which ensures the configured Cloudflare R2 bucket exists via `@aws-sdk/client-s3`, applies browser-upload CORS rules, and configures a 1-day lifecycle expiration policy for temporary uploads under `tmp/`.

## Interface

- `[r2-setup.ts:main]` — Module-private `async` entrypoint invoked automatically at top level (`main().catch(...)`); no symbols are exported.
- `[r2-setup.ts:dotenv/config]` — Side-effect import (`import "dotenv/config"`) loading environment variables from `.env`.
- `[r2-setup.ts:S3Client]` — Imported from `@aws-sdk/client-s3` and instantiated as `[r2-setup.ts:s3]` targeting `https://${accountId}.r2.cloudflarestorage.com` with `region: "auto"`.
- `[r2-setup.ts:HeadBucketCommand]` — Probes whether the target R2 bucket exists.
- `[r2-setup.ts:CreateBucketCommand]` — Creates the target R2 bucket if `HeadBucketCommand` throws.
- `[r2-setup.ts:PutBucketCorsCommand]` — Applies a single CORS rule allowing `PUT`, `GET`, and `HEAD` with `AllowedHeaders: ["*"]` and `MaxAgeSeconds: 3600`.
- `[r2-setup.ts:PutBucketLifecycleConfigurationCommand]` — Applies lifecycle rule `ID: "expirar-uploads-temporarios"` (`Status: "Enabled"`, `Filter: { Prefix: "tmp/" }`, `Expiration: { Days: 1 }`).
- `[r2-setup.ts:R2_ACCOUNT_ID]` — Required env var (`process.env.R2_ACCOUNT_ID`) used for the R2 endpoint hostname.
- `[r2-setup.ts:ACCESS_KEY_ID]` — Required env var (`process.env.ACCESS_KEY_ID`) used as S3 `accessKeyId`.
- `[r2-setup.ts:SECRET_ACCESS_ID]` — Required env var (`process.env.SECRET_ACCESS_ID`) used as S3 `secretAccessKey`.
- `[r2-setup.ts:R2_BUCKET]` — Optional env var (`process.env.R2_BUCKET`) specifying the target bucket name, defaulting to `"fisiotrainer"`.
- `[r2-setup.ts:process.argv[2]]` — Optional positional CLI argument providing comma-separated allowed CORS origins, defaulting to `"http://localhost:3000,http://localhost:3100"`.

## Invariants

- `[r2-setup.ts:main]` — All three credential/account env vars (`R2_ACCOUNT_ID`, `ACCESS_KEY_ID`, `SECRET_ACCESS_ID`) must be truthy; otherwise throws `Error("Defina R2_ACCOUNT_ID, ACCESS_KEY_ID e SECRET_ACCESS_ID no .env.")`.
- `[r2-setup.ts:R2_BUCKET]` — Falls back via nullish coalescing (`??`) to `"fisiotrainer"` when `process.env.R2_BUCKET` is undefined or null.
- `[r2-setup.ts:process.argv[2]]` — Falls back via nullish coalescing (`??`) to `"http://localhost:3000,http://localhost:3100"` and splits strictly on `","` with no whitespace trimming or URL validation.
- `[r2-setup.ts:s3]` — Region is fixed to `"auto"` and endpoint is fixed to `https://${accountId}.r2.cloudflarestorage.com`.
- `[r2-setup.ts:HeadBucketCommand]` — Any rejection from `HeadBucketCommand` (regardless of HTTP status or error code) triggers `CreateBucketCommand` in the catch block.
- `[r2-setup.ts:PutBucketCorsCommand]` — Always overwrites the bucket CORS configuration with a single rule (`AllowedMethods: ["PUT", "GET", "HEAD"]`, `AllowedHeaders: ["*"]`, `MaxAgeSeconds: 3600`, `AllowedOrigins: origens`).
- `[r2-setup.ts:PutBucketLifecycleConfigurationCommand]` — Always overwrites the bucket lifecycle configuration with a single enabled rule (`ID: "expirar-uploads-temporarios"`, `Prefix: "tmp/"`, `Days: 1`).

## Side Effects

- `[r2-setup.ts:dotenv/config]` — Mutates `process.env` at import time by loading `.env`.
- `[r2-setup.ts:main]` — Executes immediately upon module evaluation.
- `[r2-setup.ts:HeadBucketCommand]` — Sends a network `HEAD` request to the Cloudflare R2 S3 API via `s3.send`.
- `[r2-setup.ts:CreateBucketCommand]` — Sends a network mutation to create the R2 bucket via `s3.send` when `HeadBucketCommand` throws.
- `[r2-setup.ts:PutBucketCorsCommand]` — Sends a network mutation to replace the bucket's CORS configuration via `s3.send`.
- `[r2-setup.ts:PutBucketLifecycleConfigurationCommand]` — Sends a network mutation to replace the bucket's lifecycle configuration via `s3.send`.
- `[r2-setup.ts:console.log]` — Writes bucket existence/creation status, lifecycle confirmation, and applied CORS origins to stdout.
- `[r2-setup.ts:console.error]` / `[r2-setup.ts:process.exit]` — Logs uncaught errors to stderr and terminates the process with exit code `1` in the top-level `.catch` handler.

## Verification

- Run: `npm test`
