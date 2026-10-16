# VDR QA v0.15 — Storage E2E без ручного UUID

Установите полный архив в новую папку либо распакуйте fixes-overlay в корень вашей текущей v0.13/v0.14 установки с заменой файлов. Локальные `.env`, `.env.test`, `.env.storage`, отчёты и БД архив не затрагивает.

## Что настроить

1. Отдельный тестовый проект Supabase: Storage → New Bucket → `vdr-qa-e2e`, Private. В Settings → API Keys нужны Project URL, publishable key и secret key.
2. В `virtual-data-room-main/apps/api/test/.env.test`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (серверный `sb_secret_...`), `SUPABASE_BUCKET=vdr-qa-e2e`. БД остаётся локальной `vdr_qa_test`.
3. В `virtual-data-room-main/apps/web/.env.local`: `VITE_API_URL=http://127.0.0.1:3100`, `VITE_SUPABASE_ANON_KEY=sb_publishable_...`. Не помещайте secret key в переменную VITE.
4. После `make perf-prepare` запустите `make api-dev` и `bash scripts/with-node22.sh npm --prefix virtual-data-room-main/apps/web run dev -- --host 127.0.0.1 --port 5173` в разных терминалах. Зарегистрируйте отдельного пользователя на `http://127.0.0.1:5173/register`: локальное приложение автоматически создаёт ему одну комнату.
5. `make env-storage`; в созданном `vdr-qa-starter/.env.storage` заполните только `OWNER_EMAIL` и `OWNER_PASSWORD` локального пользователя. Проверьте, что значения подтверждений относятся именно к тестовому bucket и БД.
6. `make test-storage`. UUID комнаты определяется по единственной комнате локального пользователя. При нескольких комнатах тест останавливается; используйте свежего локального пользователя.

Обычные `make test-ui` и k6 остаются независимыми и работают со своими `.env`. Тест не запускался на реальном Supabase в этой среде; проверены 66 unit/guard проверок и компиляция TypeScript.
