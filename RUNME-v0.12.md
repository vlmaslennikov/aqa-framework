# VDR QA v0.12 — установка и запуск

Эта инструкция актуальнее RUNME предыдущих версий. Исправления v0.11 сохранены.

## Обновление существующего проекта v0.10/v0.11

Распакуйте overlay в каталог, содержащий Makefile, scripts/ и vdr-qa-starter/.
Архив обновления включает исправления v0.11 и v0.12.
Он заменяет исходники и lock-файлы; сохраните собственные изменения этих файлов перед распаковкой.
.env, .env.browser, .env.k6, .env.test, .qa-resources.env, node_modules и результаты тестов
в overlay не включены.

Из корня проекта:
~~~bash
unzip -o /путь/к/vdr-qa-v0.12-fixes-overlay.zip
make setup
make test-framework test-guards
make test-ui
make test-cypress
~~~

Для новой установки сначала нужны GNU Make, Bash, nvm, Docker Engine и Compose v2.
После make setup выполните make env-ui env-qa env-k6, заполните учётные данные
в vdr-qa-starter/.env и только затем запускайте тесты.
Существующие .env не перезаписываются. .env.browser необязателен.

## Исправления

- Make задаёт LHCI_CHROME_NO_SANDBOX=0 по умолчанию. Отсутствие .env.browser больше
  не приводит к пустому значению. Явно некорректное значение по-прежнему отклоняется.
- Cypress получает абсолютный путь Chromium от Playwright, включая пути с пробелами;
  отдельно установленный Google Chrome больше не нужен.
- Cypress 16.2.0 включён в package.json и package-lock.json web-проекта.
  Повторный npm ci сохраняет Cypress.
- QA получает собственный package-lock.json; deps-qa использует npm ci.
- Зависимости Make упорядочены для make -j: Node перед npm, web-зависимости перед
  Cypress verify, без автоматической установки системных библиотек.
- Установки Chromium и FFmpeg упорядочены: Chromium также скачивает FFmpeg.
- db-prepare дожидается postgres-up, в том числе при параллельном perf-prepare.

## Системные библиотеки браузеров — без повышения прав

make setup работает от обычного пользователя и не устанавливает системные пакеты.
Автоматические вызовы sudo, apt и playwright install-deps удалены.
Существующие системные библиотеки используются как есть.

Необязательная команда make browser-deps только проверяет наличие Xvfb и
динамических библиотек скачанного Chromium. Она ничего не устанавливает.
Cypress verify по-прежнему проверяет возможность запуска Cypress.

Если библиотек не хватает, команда сообщает об этом и завершается ошибкой.
SKIP_BROWSER_OS_DEPS больше не требуется.

## Что проверено на Node 22.16.0

- 61 QA unit/regression tests и 8 DB/performance guard tests.
- Реальные npm ci API, QA и web по lock-файлам (для web скачивание Cypress binary
  отключено на этом шаге и проверялось отдельно).
- TypeScript QA и production-сборка frontend.
- Playwright collection: 14 обычных тестов (9 API + 5 UI), mutation-файлы исключены.
- Регрессионные тесты Make: sandbox default без .env.browser, порядок make -j8 setup,
  путь браузера Cypress с пробелами. До исправления все три теста падали.
- Синтаксис Bash.

## Ограничения верификации

Скачивание настоящих Cypress и Chromium в среде проверки вернуло повреждённые ZIP
(End of central directory record signature not found). Поэтому браузерные тесты
не объявляются пройденными. Docker/PostgreSQL/k6 и apt provisioning здесь не запускались.
В окружении пользователя нужны доступ к npm/CDN, исправный Docker и учётные данные VDR.

Lighthouse по умолчанию обращается к http://127.0.0.1:4173: frontend должен быть запущен,
а его VITE_API_URL настроен перед сборкой. make setup не запускает приложение.
Для localhost performance:
~~~bash
make env-qa
make perf-prepare
make perf-seed
make api-dev
# В другом терминале:
make perf-smoke
~~~

Не считайте skipped-тесты успешным тестированием. make test-ui сохраняет preflight
и read-only discovery; при недостающих credentials/ресурсах он завершается ошибкой.
