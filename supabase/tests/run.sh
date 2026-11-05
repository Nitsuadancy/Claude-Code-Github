#!/usr/bin/env bash
# Checks the Manna schema against a throwaway local Postgres database.
# Usage: supabase/tests/run.sh   (DATABASE_URL defaults to a local "manna_test" database)
set -euo pipefail
cd "$(dirname "$0")/../.."
DB_URL="${DATABASE_URL:-postgresql://postgres@localhost/manna_test}"
ADMIN_URL="${DB_URL%/*}/postgres"
DB_NAME="${DB_URL##*/}"
psql "$ADMIN_URL" -q -c "drop database if exists \"$DB_NAME\"" -c "create database \"$DB_NAME\""
psql "$DB_URL" -q -v ON_ERROR_STOP=1 \
  -f supabase/tests/00_stub_supabase.sql \
  -f supabase/migrations/20261105000000_init.sql \
  -f supabase/tests/10_scenarios.sql | tail -3
