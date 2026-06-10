@echo off
REM ---------------------------------------------------------------------------
REM DB-first scaffold — regenerates EF Core entities from the PostgreSQL schema.
REM Run from the backend\ directory: scripts\scaffold.cmd
REM
REM Connection is read from environment variables; set them before running or
REM set them permanently via System Properties (never commit real credentials).
REM
REM Usage:
REM   set DB_HOST=localhost
REM   set DB_NAME=projectmgmt
REM   set DB_USER=postgres
REM   set DB_PASSWORD=secret
REM   scripts\scaffold.cmd
REM
REM Prerequisites:
REM   dotnet tool restore        (installs dotnet-ef from dotnet-tools.json)
REM ---------------------------------------------------------------------------

IF NOT DEFINED DB_HOST     SET DB_HOST=localhost
IF NOT DEFINED DB_PORT     SET DB_PORT=5432
IF NOT DEFINED DB_NAME     SET DB_NAME=projectmgmt
IF NOT DEFINED DB_USER     SET DB_USER=postgres
IF NOT DEFINED DB_PASSWORD SET DB_PASSWORD=postgres

SET CONNECTION=Host=%DB_HOST%;Port=%DB_PORT%;Database=%DB_NAME%;Username=%DB_USER%;Password=%DB_PASSWORD%

echo Scaffolding EF Core entities from %DB_HOST%:%DB_PORT%/%DB_NAME% ...

dotnet tool restore

dotnet ef dbcontext scaffold "%CONNECTION%" ^
  Npgsql.EntityFrameworkCore.PostgreSQL ^
  --output-dir Data/Entities ^
  --context-dir Data ^
  --context AppDbContext ^
  --namespace ProjectManagementSystem.Data.Entities ^
  --context-namespace ProjectManagementSystem.Data ^
  --no-onconfiguring ^
  --force

echo Done. Entities written to Data\Entities\, context to Data\AppDbContext.cs
