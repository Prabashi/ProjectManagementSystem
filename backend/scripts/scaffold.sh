#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# DB-first scaffold — regenerates EF Core entities from the PostgreSQL schema.
# Run from the backend/ directory: bash scripts/scaffold.sh
#
# Connection is read from environment variables; set them before running or
# export them in your shell profile / .env file (never commit real credentials).
#
# Usage:
#   DB_HOST=localhost DB_NAME=projectmgmt DB_USER=postgres DB_PASSWORD=secret \
#     bash scripts/scaffold.sh
#
# Prerequisites:
#   dotnet tool restore        (installs dotnet-ef from dotnet-tools.json)
# ---------------------------------------------------------------------------

set -euo pipefail

: "${DB_HOST:=localhost}"
: "${DB_PORT:=5432}"
: "${DB_NAME:=projectmgmt}"
: "${DB_USER:=postgres}"
: "${DB_PASSWORD:=postgres}"

CONNECTION="Host=${DB_HOST};Port=${DB_PORT};Database=${DB_NAME};Username=${DB_USER};Password=${DB_PASSWORD}"

echo "Scaffolding EF Core entities from ${DB_HOST}:${DB_PORT}/${DB_NAME} ..."

dotnet tool restore

dotnet ef dbcontext scaffold "$CONNECTION" \
  Npgsql.EntityFrameworkCore.PostgreSQL \
  --output-dir Data/Entities \
  --context-dir Data \
  --context AppDbContext \
  --namespace ProjectManagementSystem.Data.Entities \
  --context-namespace ProjectManagementSystem.Data \
  --no-onconfiguring \
  --force

echo "Done. Entities written to Data/Entities/, context to Data/AppDbContext.cs"
