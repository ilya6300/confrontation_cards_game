# Противостояние: Сопротивление против Тьмы

Карточная научно-фантастическая стратегия (React + Vite + Express, озвучка через Gemini на сервере).

## Код на GitHub

Исходники хранятся в репозитории — **игра там не запускается как сервер**, только код и история версий:

**https://github.com/ilya6300/confrontation_cards_game**

Ветка по умолчанию: `main`.

### GitHub Pages (демо без сервера)

Статическая сборка выкладывается через GitHub Actions при push в `main`.

**Сайт:** https://ilya6300.github.io/confrontation_cards_game/

Первый раз в репозитории (обязательно, иначе отдаётся сырой `index.html` из `main`):

1. Репозиторий **public** (на бесплатном плане).
2. **Settings → Pages → Build and deployment**
3. **Source: Deploy from a branch** (не корень `main`!)
4. **Branch: `gh-pages`**, папка **`/ (root)`** — ветку создаёт workflow после первого успешного запуска.
5. **Actions** → дождаться **Deploy GitHub Pages** (после push в `main` или Run workflow).

Если выбран `main` + `/`, сайт ломается: в браузере будет `/src/main.tsx` вместо собранного JS.

Локальная проверка той же сборки:

```bash
npm run build:pages
# PowerShell:
$env:VITE_BASE_PATH="/confrontation_cards_game/"; npm run build:pages
npm run preview
```

На Pages **нет** Express и `/api/tts` — игра работает, озвучка кампании недоступна. Полная версия: `npm run build` + `npm start` на своём сервере.

После изменений:

```bash
git add -A
git commit -m "описание изменений"
git push origin main
```

Секреты (`.env`, ключи API) в репозиторий не попадают — см. `.gitignore`. Шаблон переменных: [`.env.example`](.env.example).

Играбельный хостинг — отдельно (VPS, PaaS и т.п.): `npm run build` и `npm start` с `NODE_ENV=production`.

## Локальный запуск

**Нужно:** Node.js

1. `npm install`
2. Скопировать [`.env.example`](.env.example) в `.env` и задать `GEMINI_API_KEY` (для озвучки)
3. `npm run dev` — по умолчанию http://localhost:3000 (порт: `PORT=3333 npm run dev`)

Проверка API: `GET /api/health`

## AI Studio

Шаблон из Google AI Studio: https://ai.studio/apps/127557f3-7940-4ab8-81ee-079b30d04b07