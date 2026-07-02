# Дизайн-система

Этот документ фиксирует текущий визуальный стиль проекта по реальным значениям из `Assistant.html` и страницы-витрины `/design-system`. Он нужен, чтобы новые правки не добавляли случайные цвета, размеры, кнопки и отступы.

## Источники

```text
[Assistant.html]
      |
      | CSS-переменные, компоненты, размеры, состояния
      v
[/design-system]
      |
      | витрина для просмотра текущего стиля
      v
[DESIGN.md]
      |
      | договорённости и рекомендуемый эталон
      v
[Новые UI-правки]
```

| Источник | Что брать |
|---|---|
| `Assistant.html` | CSS-переменные, классы компонентов, реальные inline-исключения |
| `/design-system` | Визуальная проверка цветов, типографики, кнопок, карточек, полей и отступов |
| `DESIGN.md` | Зафиксированные правила и рекомендации по унификации |

## Маршрут витрины

Страница дизайн-системы живёт внутри текущего статического приложения. Отдельный фреймворк, сборка или серверная часть не нужны.

```text
URL: /design-system
        |
        | Netlify rewrite
        v
[Assistant.html]
        |
        | app/main.js проверяет location.pathname
        v
[screenDesignSystem]
```

Локально маршрут можно открыть через сервер с rewrite. На Netlify после деплоя он будет доступен как:

```text
https://<netlify-site>/design-system
```

## Экранная схема

Витрина должна показывать весь стиль компактно, без маркетинговой страницы и без новых декоративных сущностей.

```text
+--------------------------------------------------------------+
| Ассистент                                      MVP            |
+--------------------------------------------------------------+
| Дизайн-система                         [Открыть приложение]  |
| Реальные значения текущего интерфейса                        |
|                                                              |
| +-------------------------+ +------------------------------+ |
| | Цвета                   | | Типографика                  | |
| | bg/card/text/accent     | | H1/H2/body/meta              | |
| | statuses/borders        | | weights/line-height          | |
| +-------------------------+ +------------------------------+ |
|                                                              |
| +-------------+ +-------------------+ +--------------------+ |
| | Кнопки      | | Карточки/статусы  | | Поля форм          | |
| | CTA/ghost   | | category/question | | textarea/focus     | |
| | demo/copy   | | warning cards     | | radius/padding     | |
| +-------------+ +-------------------+ +--------------------+ |
|                                                              |
| +-------------------------+ +------------------------------+ |
| | Отступы и сетка         | | Размеры и радиусы            | |
| | 6/10/14/20/24/32/40     | | 52, 320, 14, 10, 8, 6, 999  | |
| +-------------------------+ +------------------------------+ |
|                                                              |
| +----------------------------------------------------------+ |
| | Где стиль разошёлся                                     | |
| | кнопки, близкие цвета, границы и радиусы                | |
| +----------------------------------------------------------+ |
+--------------------------------------------------------------+
```

## Цвета

Основные цвета заданы в `:root`.

| Токен | Значение | Использование |
|---|---:|---|
| `--bg` | `#0D0D10` | Фон страницы |
| `--card` | `#17171B` | Карточки, textarea, основные поверхности |
| `--card-hover` | `#1B1B1F` | Hover у раскрывающихся блоков |
| `--text` | `#EDEDEF` | Основной текст |
| `--text-muted` | `#9B9BA3` | Вторичный текст, body в карточках |
| `--text-dim` | `#65656D` | Метки, счётчики, служебный текст |
| `--accent` | `#3B82F6` | Основная CTA, точка в header |
| `--accent-hover` | `#2563EB` | Hover основной CTA |
| `--red` | `#EF4444` | Красный статус, риск, `must` |
| `--yellow` | `#F59E0B` | Жёлтый статус |
| `--green` | `#22C55E` | Готово, успех |
| `--orange` | `#F97316` | Противоречия, fallback warning |

Дополнительные фактические значения:

| Значение | Где встречается | Рекомендация |
|---|---|---|
| `#fff` | Текст CTA, pulse-dot | Оставить для текста на яркой CTA |
| `#8ebcff` | AI pill | Если AI pill останется, вынести в отдельный токен |
| `rgba(255,255,255,0.04)` | Основной border и hover background | Использовать как спокойный border |
| `rgba(255,255,255,0.08)` | Hover/focus border | Использовать для hover и focus |
| `rgba(255,255,255,0.12)` | Hover border demo-кнопки | Не плодить дальше без необходимости |
| `rgba(249,115,22,0.06)` | Фон карточки противоречия | Оставить только для warning-сценариев |
| `rgba(249,115,22,0.15)` | Border карточки противоречия | Оставить только для warning-сценариев |

## Типографика

Шрифт проекта: `Inter` из Google Fonts. Базовый размер HTML: `16px`.

```text
[H1 32/700/1.2]
      |
      v
[H2 22/700/1.25]
      |
      v
[Section 18/600]
      |
      v
[Card title 16/600]
      |
      v
[Body 15 или 14]
      |
      v
[Meta 13/12/11]
```

| Роль | Размер | Вес | Line-height | Где используется |
|---|---:|---:|---:|---|
| H1 | `32px` | `700` | `1.2` | Главный заголовок экрана ввода, витрина |
| H2 | `22px` | `700` | `1.25` | Заголовки колонок |
| Section title | `18px` | `600` | default | Вопросы, понимание задачи |
| Card title | `16px` | `600` | default | Заголовок категории |
| Large body | `15px` | `400` | `1.65` | Подзаголовок, большие textarea |
| Body | `14px` | `400-600` | `1.6` | Карточки, вопросы, summary |
| Meta | `13px` | `500-600` | `1.5-1.55` | Счётчики, причины, labels |
| Small | `12px` | `500` | `1.5` | Badge, copy button, rationale |
| Pill | `11px` | `600` | default | AI, fallback, must/should |

Эталон: не добавлять новые размеры текста без явной причины. Для новых UI-элементов сначала выбрать ближайшую роль из таблицы.

## Компоненты

### Header

```text
+--------------------------------------------------------------+
| blue dot  Ассистент                                  MVP      |
+--------------------------------------------------------------+
height: 52px
padding: 0 24px
background: rgba(13,13,16,0.85)
border-bottom: var(--border)
```

| Элемент | Значение |
|---|---|
| Header height | `52px` |
| Header padding | `0 24px` |
| Dot | `7px`, `border-radius: 50%`, `--accent` |
| Title | `14px`, `600`, `--text-muted` |
| Badge | `12px`, `--text-dim`, radius `6px`, padding `2px 8px` |

### Кнопки

```text
[Primary CTA]   [Ghost]   [Demo dashed]   [Copy icon]
     |             |            |              |
     v             v            v              v
  главный       вторичное    демо-данные   точечное действие
  action        действие     на вводе      в карточке
```

| Класс | Размеры | Цвета | Состояния |
|---|---|---|---|
| `.btn-cta` | `10px 24px`, radius `10px`, `14px/600` | `--accent`, текст `#fff` | hover `--accent-hover` + shadow, disabled `opacity: 0.5` |
| `.btn-ghost` | `8px 18px`, radius `10px`, `14px/500` | transparent, border `--border-hover`, text `--text-muted` | hover `rgba(255,255,255,0.04)` + `--text` |
| `.btn-demo` | `7px 14px`, radius `8px`, `13px/500` | dashed border `--border-hover`, text `--text-dim` | hover background `rgba(255,255,255,0.04)` |
| `.btn-copy` | `4px 6px`, radius `6px`, `12px` | transparent, `--text-dim` | hover background `rgba(255,255,255,0.04)` |

Расхождение: кнопка `Собрать понимание задачи` сейчас использует `.btn-cta` с inline `background: var(--green)`.

Рекомендация: единый primary action - синий `--accent`. Зелёный использовать для статуса успеха, подтверждения или результата, а не как второй primary-цвет.

### Карточки

| Компонент | Поверхность | Radius | Padding | Текст |
|---|---|---:|---:|---|
| `.original-card` | `--card` | `14px` | `20px` | `14px / 1.6` |
| `.category-card` | `--card` | `14px` | `20px` | title `16px/600`, body `14px/1.6` |
| `.question-card` | `--card` | `14px` | `14px 18px` | question `14px/1.6` |
| `.contradiction-card` | orange tint | `14px` | `16px 20px` | title `14px/600`, body `13px/1.6` |
| `.understanding-value` | `--card` | `10px` | `14px 18px` | `14px/1.6` |
| `.accordion-card` | `--card` | `14px` | header `14px 18px` | title `14px` |

Эталон: новые карточки начинать с `--card`, `1px solid --border`, radius `14px`, padding `20px`. Уменьшать padding только для плотных повторяющихся элементов вроде вопросов.

### Поля форм

| Класс | Размер | Radius | Padding | Текст | Focus |
|---|---|---:|---:|---|---|
| `.textarea-main` | `min-height: 200px`, `max-height: 400px` | `14px` | `20px` | `15px / 1.65` | border `--border-hover` |
| `.textarea-answers` | `min-height: 180px`, `max-height: 360px` | `14px` | `20px` | `15px / 1.65` | border `--border-hover` |

Эталон: для новых больших текстовых полей использовать тот же набор: `--card`, `--border`, radius `14px`, padding `20px`, `15px / 1.65`.

### Badges и pills

| Класс | Размеры | Цвет |
|---|---|---|
| `.badge` | `12px/500`, padding `3px 10px`, radius `999px` | статусный цвет |
| `.pill` | `11px/600`, padding `2px 8px`, radius `999px` | AI, warning, danger |
| `.badge-green` | фон `rgba(34,197,94,0.12)` | text `--green` |
| `.badge-yellow` | фон `rgba(245,158,11,0.12)` | text `--yellow` |
| `.badge-red` | фон `rgba(239,68,68,0.12)` | text `--red` |
| `.pill-ai` | фон `rgba(59,130,246,0.16)` | text `#8ebcff` |
| `.pill-warning` | фон `rgba(249,115,22,0.14)` | text `--orange` |
| `.pill-danger` | фон `rgba(239,68,68,0.14)` | text `--red` |

## Сетка и отступы

```text
[container 1080px max]
        |
        | padding left/right 24px
        v
[screen padding 40px top / 80px bottom]
        |
        v
[desktop grid: 360px + 1fr, gap 32px]
        |
        | max-width 768px
        v
[mobile grid: 1 column, gap 20px]
```

| Значение | Где используется |
|---:|---|
| `4px` | gap copy button |
| `6px` | summary gap, CTA icon gap |
| `8px` | gap warning header, card list spacing |
| `10px` | category margin, input footer gap, DS grid |
| `12px` | question gap, CTA bottom gap |
| `14px` | input footer margin, card bottom spacing |
| `18px` | summary bottom, ghost horizontal padding |
| `20px` | card and textarea padding, mobile grid gap |
| `24px` | container horizontal padding, contradiction body indent |
| `28px` | understanding top padding, design-system bottom rhythm |
| `32px` | desktop grid gap, questions/CTA top |
| `36px` | understanding section top |
| `40px` | screen top padding |
| `52px` | fixed header height and container top padding |
| `80px` | screen bottom padding |

Эталон: для новых блоков выбирать из существующей шкалы. Не добавлять новые отступы вроде `17px`, `26px`, `44px`, если нет жёсткой причины.

## Радиусы и размеры

| Значение | Использование | Эталон |
|---:|---|---|
| `999px` | pills, badges, progress tracks | Оставить для полностью круглых меток |
| `14px` | cards, textareas, accordion | Основной radius поверхностей |
| `10px` | CTA, ghost, understanding value, DS swatches | Основной radius контролов |
| `8px` | demo button | Допустим для компактных вторичных controls |
| `6px` | copy button, header badge | Только для очень мелких элементов |

## Состояния

| Состояние | Как выглядит |
|---|---|
| Hover CTA | `--accent-hover` + `0 4px 16px rgba(59,130,246,0.2)` |
| Disabled CTA | `opacity: 0.5`, `cursor: not-allowed` |
| Hover ghost/demo/copy | `rgba(255,255,255,0.04)` |
| Focus textarea | border `--border-hover` |
| Hover card | border `--border-hover` |
| Loading CTA | текст + `.pulse-dot` |
| Analysis cards show | `opacity` + `translateY` transition |

## Текущие расхождения

| Расхождение | Где видно | Что взять за эталон |
|---|---|---|
| Две primary-кнопки разных цветов | `.btn-cta` и зелёная inline CTA | Primary всегда синий `--accent`; зелёный только для успеха |
| Много близких border opacity | `0.04`, `0.06`, `0.08`, `0.12`, `0.15` | `0.04` для покоя, `0.08` для hover/focus, orange border только для warning |
| AI pill использует нетокенизированный `#8ebcff` | `.pill-ai` | Вынести в токен, если AI-бейдж останется долгосрочно |
| Радиусы 6, 8, 10, 14, 999 | разные controls | 14 поверхности, 10 controls, 999 status pills |
| Inline-стили в render и HTML | `app/render.js`, кнопка понимания | Новые UI-правки лучше заводить через классы |

## Рекомендованный эталон

```text
[Primary action] -> blue --accent
[Success/status] -> green --green
[Warning/conflict] -> orange --orange
[Danger/blocker] -> red --red

[Surface] -> --card + --border + 14px radius + 20px padding
[Control] -> 10px radius
[Status pill] -> 999px radius
```

1. Главная CTA всегда синяя: `--accent`, hover `--accent-hover`.
2. Зелёный цвет использовать для статусов, готовности и подтверждения, а не для обычного primary action.
3. Карточки и большие поля начинать с radius `14px` и padding `20px`.
4. Кнопки начинать с radius `10px`.
5. Badges и pills оставлять с radius `999px`.
6. Новые цвета добавлять только как CSS-переменные в `:root` и фиксировать здесь.
7. Новые текстовые размеры добавлять только после проверки, что существующая роль не подходит.

## Как обновлять

При изменении визуального стиля:

```text
[Изменение CSS/HTML]
        |
        v
[Проверить /design-system]
        |
        v
[Обновить DESIGN.md]
        |
        v
[Если меняется продуктовый сценарий, сверить PRODUCT_SCENARIOS.md]
```

Если меняется только документация, достаточно обновить `DESIGN.md`. Если меняется реальный UI, после правки нужно открыть приложение в браузере и проверить связанный сценарий.
