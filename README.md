# Противостояние: Сопротивление против Тьмы

Карточная научно-фантастическая стратегия (React + Vite + Express, озвучка через Gemini на сервере).

## Код на GitHub

Исходники хранятся в репозитории — **игра там не запускается как сервер**, только код и история версий:

**https://github.com/ilya6300/confrontation_cards_game**

Ветка по умолчанию: `main`. Дополнительные ветки или GitHub Pages не требуются.

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