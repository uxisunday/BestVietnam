# Инструкция по деплою Cloudflare Worker + D1 для BestVietnam

Это руководство поможет запустить защищённый бэкенд для синхронизации данных сайта `BestVietnam`. API-ключ базы будет храниться только на сервере Cloudflare, а сайт на GitHub Pages будет общаться с сервером через логин/пароль.

## Что получится

- Вход на сайт по логину и ключевому слову.
- Один аккаунт для двоих — оба видите и редактируете общие данные.
- Все данные (траты, маршруты, заметки, настройки) синхронизируются через облако.
- История изменений сохраняется в `audit_log`.
- API-ключ от базы не виден в исходном коде сайта.

---

## Шаг 1. Регистрация в Cloudflare

1. Перейдите на https://dash.cloudflare.com/sign-up
2. Зарегистрируйтесь или войдите.
3. Это бесплатно. Для нашего использования хватит Free плана.

---

## Шаг 2. Установите Wrangler CLI

Нужен компьютер с Node.js 18+.

```bash
npm install -g wrangler
```

Затем авторизуйтесь:

```bash
wrangler login
```

Откроется браузер — подтвердите доступ.

---

## Шаг 3. Создайте D1 базу данных

```bash
wrangler d1 create bestvietnam-db
```

В терминале появится ID базы, например:

```
[[d1_databases]]
binding = "DB"
database_name = "bestvietnam-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Скопируйте этот блок — он понадобится для `wrangler.toml`.

---

## Шаг 4. Создайте Worker

```bash
mkdir bestvietnam-sync
cd bestvietnam-sync
wrangler init --from-cloudflare-dashboard
```

Или проще:

```bash
wrangler init bestvietnam-sync
```

Выберите тип проекта: **"Hello World" Worker**.

---

## Шаг 5. Скопируйте файлы

Скопируйте файлы из папки `cloudflare/` этого репозитория в папку `bestvietnam-sync/`:

```
bestvietnam-sync/
├── src/
│   ├── worker.js       <- заменить на наш worker.js
│   └── router.js       <- добавить
├── schema.sql          <- добавить
└── wrangler.toml       <- отредактировать
```

Если `wrangler init` создал `src/index.js`, замените его содержимое на наш `worker.js`.

---

## Шаг 6. Настройте wrangler.toml

Пример:

```toml
name = "bestvietnam-sync"
main = "src/worker.js"
compatibility_date = "2026-08-05"

[[d1_databases]]
binding = "DB"
database_name = "bestvietnam-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

[vars]
PASSPHRASE_SALT = "your-random-salt-at-least-20-chars"

# JWT_SECRET лучше хранить как секрет (см. шаг 7)
```

Замените `database_id` на ваш реальный ID.

---

## Шаг 7. Создайте секреты

JWT-секрет не должен лежать в открытом виде. Создайте его через команду:

```bash
wrangler secret put JWT_SECRET
```

Введите случайную строку длиной не менее 32 символов.

Также можно вынести `PASSPHRASE_SALT` в секрет:

```bash
wrangler secret put PASSPHRASE_SALT
```

Если вы используете секрет, удалите строку `PASSPHRASE_SALT` из `[vars]`.

---

## Шаг 8. Примените схему базы данных

```bash
wrangler d1 execute bestvietnam-db --file=./schema.sql
```

Или через Cloudflare Dashboard:
1. Workers & Pages → D1 → bestvietnam-db → Query.
2. Вставьте содержимое `schema.sql` и нажмите Execute.

---

## Шаг 9. Задеплойте Worker

```bash
wrangler deploy
```

После успешного деплоя в терминале появится URL:

```
https://bestvietnam-sync.YOUR_SUBDOMAIN.workers.dev
```

Скопируйте этот URL.

---

## Шаг 10. Укажите URL в сайте

Откройте файл `js/auth.js` в репозитории сайта и замените:

```js
const API_URL = 'https://bestvietnam-sync.YOUR_SUBDOMAIN.workers.dev';
```

на ваш реальный URL, например:

```js
const API_URL = 'https://bestvietnam-sync.ivanivanov123.workers.dev';
```

---

## Шаг 11. Проверьте работу

1. Откройте сайт.
2. Введите любой логин и ключевое слово. Если пользователя нет — он создастся автоматически.
3. Войдите с другого устройства под тем же логином/ключом — данные должны совпадать.

Проверьте API:

```bash
curl https://bestvietnam-sync.YOUR_SUBDOMAIN.workers.dev/health
```

Должен вернуть:

```json
{ "ok": true }
```

---

## Шаг 12. Загрузите обновлённый сайт на GitHub Pages

Закоммитьте и запушьте изменения в репозиторий `uxisunday/BestVietnam`:

```bash
git add .
git commit -m "Add Cloudflare sync and login"
git push origin main
```

GitHub Pages автоматически обновит сайт через несколько минут.

---

## Дополнительно: безопасность

- Длинное ключевое слово (фраза из 3–4 слов) защитит лучше, чем короткий пароль.
- JWT_SECRET и PASSPHRASE_SALT храните только в Cloudflare Secrets.
- При желании можно ограничить доступ к Worker по домену в Cloudflare Dashboard: Workers → bestvietnam-sync → Settings → Triggers → Routes.
- Чтобы сменить пароль, удалите пользователя из D1 и зайдите снове — новый хеш сохранится.

---

## Ограничения бесплатного плана

Cloudflare Workers Free:
- 100 000 запросов/день
- 10 ms CPU/запрос

Cloudflare D1 Free:
- 500 000 строк-запросов/день
- 5 ГБ хранилища
- 100 000 строк в таблице

Для двоих пользователей этого хватит с большим запасом.
