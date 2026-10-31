# Архитектура

## Общая схема

```text
pages/widgets/shared UI
          ↓
features: Zustand stores, persistence, import/export
          ↓
domain/game: Zod-модели, правила, transitionGame
```

UI вызывает действия store. `game-session-store` преобразует сохранённую сессию в
`GameRuntimeState` и передаёт `GameCommand` в чистую функцию `transitionGame`.
Доменный слой не импортирует React, браузерные API или Zustand.

## Основные модули

- `app` — `HashRouter`; маршруты `/`, `/setup`, `/editor`, `/game`.
- `domain/game/model.ts` — схема пакета: 3 раунда, 5 категорий, 5 вопросов,
  7 финальных тем.
- `domain/game/game-engine` — допустимые команды и переходы игровых фаз.
- `features/game-session-store` — участники, текущая партия, undo и persistence.
- `features/game-definition-store` — редактируемый пакет вопросов.
- `features/game-definition-file` — версионированный JSON-импорт/экспорт.
- `pages` и `widgets` — представление и действия ведущего.

## Состояние и хранение

- Zustand хранит пакет и сессию раздельно.
- Ключи `localStorage`: `svoyak-game-definition` и `svoyak-game-state`.
- Persisted-схемы валидируются Zod и имеют версионные миграции.
- История undo хранит до 50 runtime-снимков, чтобы не раздувать `localStorage`.
- Внешний JSON пакета не равен внутреннему формату store и валидируется до записи.

## Ключевые решения

- Игровая логика — детерминированная state machine, удобная для unit-тестов.
- Решение о правильности ответа принимает ведущий; автоматическая проверка ответа
  не управляет начислением очков.
- Конфигурация пакета отделена от прогресса партии.
- UI-модули имеют публичный `index.ts` и локальный SCSS Module.

## Ограничения текущей версии

- Количество раундов и сетка 5×5 пока закреплены Zod-схемой.
- Модель допускает image/audio/video content blocks, но UI отображает только текст.
- Приложение рассчитано на один браузер и не синхронизируется между устройствами.
