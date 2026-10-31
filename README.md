# Своя игра

Браузерная версия викторины «Своя игра» для проведения индивидуальных и
командных игр с одного устройства.

## Технологии

- React и TypeScript
- Vite
- Radix Primitives для доступных headless-компонентов
- SCSS Modules
- ESLint, Stylelint и Prettier

## Команды

```bash
yarn dev           # локальная разработка
yarn build         # проверка TypeScript и production-сборка
yarn lint          # код, стили и форматирование
yarn lint:fix      # автоматические исправления
yarn format        # форматирование проекта
yarn test          # unit-тесты
yarn test:e2e      # сквозной smoke-тест в Chromium
yarn validate      # все проверки и сборка
```

Перед первым локальным запуском E2E установите тестовый браузер:

```bash
yarn playwright install chromium
```

Продуктовые правила и доменная модель будут добавляться поэтапно. На первом
этапе приложение работает с одного устройства под управлением ведущего.

Правила разработки описаны в [`PROJECT_RULES.md`](./PROJECT_RULES.md), а
инструкции для агента — в [`AGENTS.md`](./AGENTS.md).
