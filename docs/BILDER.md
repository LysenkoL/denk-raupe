# Denk-Raupe — картинки: что нужно и откуда взять

Nov 16, 2026

Документ для автора и сессий-исполнителей: сколько картинок нужно приложению, какие можно взять из готовой библиотеки и какие придётся генерировать. Числа — расчёт по брифу; точные числа мира подбираются на этапе 5.

## 1. Что уже есть

В `src/bilder/`: голова гусеницы в четырёх выражениях, голова близнеца, пять листьев (обычный, золотой, три редких), корзинка пустая и полная. Всего 12 файлов. Они сделаны в прежнем стиле с тёмным контуром и заменяются первым пакетом из `docs/STIL.md`, раздел 12.

### Пакет K1 (19.11.2026)

В `src/bilder/k1/` — картинки, выбранные автором для экрана набора: гусеница и близнец (приподнятые и лёжа), листья зелёный и золотой, фонарик, корзинки пустая и полная, фон, текстура стола, мелкая текстура войлока. Вырезаны из листов автора, белый фон убран, большая сторона до 512 px. Прежние 12 файлов в `src/bilder/` остаются, пока A10 не переведёт экран на новые.

Лист гусеницы — образец стиля автора (целиком и четыре лица); к каждому запросу ниже прикладывался он. Запросы, по которым сделаны остальные листы (сохранены, чтобы стиль можно было повторить):

**1. Близнец — лист персонажа, как у гусеницы** (`zwilling-blatt.png`)

```
Character sheet of the twin of the caterpillar in the attached image. Exactly the same character: the same body, face, eyes, green velvet material, antennae and proportions. But the twin has NO orange bandana on the head, NO orange scarf, NO brown strap and NO bag. Instead the twin wears only a small neat sky-blue bow tie at the neck. Use exactly the same layout as the attached image: on the left the full body in three-quarter view, on the right four head portraits in a 2 by 2 grid with these expressions: calm smile, thinking, happy laughing, surprised. Style: exactly the same soft 3D toy look as the caterpillar in the first image: matte felt and modelling-clay surfaces with a fine soft fibre texture, rounded soft shapes, warm sunny daylight from the top left, bright clean cheerful colours, never neon, no black outlines. Plain pure white background, no shadows on the ground, no text.
```

**2. Фон: комната в доме на дереве** (`hintergrund.png`)

```
Background picture for a children's tablet game, landscape 16:9. The inside of a cosy treehouse room: a big open arched window in the middle shows a sunny meadow with soft green hills, round trees and a clear blue sky with two small white clouds. Warm wooden window frame and wooden walls only at the left and right edges, a small potted plant on each side, a few fresh green leaves hanging into the top corners. The bottom quarter is an empty light warm-wood tabletop across the full width. The middle of the picture is calm and open: no branches across the window, no characters, no objects on the table. Everything important is in the middle third, so the picture still works when the left and right sides are cut off for a phone held upright. Style: exactly the same soft 3D toy look as the caterpillar in the first image: matte felt and modelling-clay surfaces with a fine soft fibre texture, rounded soft shapes, warm sunny daylight from the top left, bright clean cheerful colours, never neon, no black outlines. No text.
```

**3. Лист мелких предметов — сочно, не войлок** (`dinge-blatt.png`)

```
A sheet of six separate small objects for a children's game, arranged in a neat grid of 2 rows and 3 columns, all about the same size, with plenty of white space between them so that each can be cut out. Style: polished stylised 3D like a high-quality animated film for children, the same warm sunny light from the top left and the same cheerful look as the caterpillar in the first image, juicy saturated colours, smooth surfaces with soft highlights and a gentle inner glow. Not felt, not fabric, not wool, not clay, no stitches, not photorealistic. Top row from left to right: a fresh juicy green leaf, plump and slightly curved, glossy with a soft shine and one tiny clear dew drop; a precious golden leaf made of shiny polished gold, the same shape, with bright golden reflections and a few small sparkles around it, clearly real gold; a small cute lantern of polished honey-coloured wood with warm glowing glass and a little handle, the light glowing softly. Bottom row from left to right: a small round woven basket of smooth golden straw with a handle, empty; the same basket filled with juicy green leaves and one shiny golden leaf on top; a fresh white daisy with plump petals and a bright yellow centre. Plain pure white background, no shadows on the ground, nothing else, no text, no letters, no numbers.
```

**4. Передняя часть — гусеница и близнец, два положения** (`vorderteil-blatt.png`)

```
A sheet of four pictures in a 2 by 2 grid with plenty of white space between them. Use the caterpillar with the orange bandana and scarf and her twin with the sky-blue bow tie from the attached images: same faces, same green velvet material, same antennae. Each picture shows only the FRONT PART of one character: the head, its clothing detail, the first body segment and two small front legs. The body continues to the right, so the front part is seen from the side, the character faces left, and the face is turned three-quarter towards the viewer with a calm friendly smile. On the right side the first body segment ends in a clean round cut, where a round bead will join. Top row: the caterpillar with the orange bandana, on the left lying low and straight, on the right with the front part lifted up and curved like a real caterpillar raising its head. Bottom row: the twin with the sky-blue bow tie, in the same two positions. All four pictures the same size and scale. Style: exactly the same soft 3D toy look as the caterpillar in the first image: matte felt and modelling-clay surfaces with a fine soft fibre texture, rounded soft shapes, warm sunny daylight from the top left, bright clean cheerful colours, never neon, no black outlines. Plain pure white background, no shadows on the ground, nothing else, no text.
```


**Круг 2 (19.11.2026, вечер): ещё не сгенерировано.** Фон-луг вместо комнаты с окном и лист кнопок с пальцем-подсказкой. Новый чат, приложить лист гусеницы, потом:

**5. Фон: луг под открытым небом** (`wiese.png`)

```
Background picture for a children's tablet game, landscape 16:9. A bright sunny open meadow under a big clear blue sky with a few soft white clouds. Soft rolling green hills far away, a few round trees on the left and right edges, a few small flowers in the grass only near the bottom corners. The upper half is mostly calm sky, the lower half is calm, even, juicy green grass. No house, no window, no wood, no table, no fence, no path, no characters, no objects in the middle. Everything important stays in the middle third, so the picture still works when the left and right sides are cut off for a phone. Same soft 3D look and warm sunny light as the caterpillar in the first image, bright clean colours, never neon. No text.
```

**6. Лист кнопок и палец-подсказка** (`knoepfe-blatt.png`)

```
A sheet of six separate objects for a children's game interface, arranged in a neat grid of 2 rows and 3 columns, all about the same size, with plenty of white space between them so each can be cut out. Style: polished stylised 3D like a high-quality animated film for children, the same warm sunny light and cheerful look as the caterpillar in the first image, juicy saturated colours, soft highlights. Not felt, not wood, not photorealistic. Top row from left to right: a round glossy sky-blue button with a big simple white arrow pointing left; a round glossy honey-yellow button with a big simple white gear; a round glossy green button with a small glowing lantern on it. Bottom row from left to right: a round glossy pink button with a big simple white cross inside a rounded arrow shape pointing left, like a delete key; a chubby friendly pink eraser; a cute cartoon child's hand with the index finger pointing straight up and the other fingers softly curled, light skin with rosy shading, a small green sleeve cuff at the wrist. Plain pure white background, no shadows on the ground, nothing else, no text, no letters, no numbers.
```

Готовые файлы класть в `src/bilder/k1/` (`wiese.webp` — фон; кнопки вырезать `proben/ablauf-7/freistellen.py`). Проба 7 подхватывает `wiese.webp` сама.

Лист предметов взят в двух вариантах: листья и корзинки — из гладкого «сочного» варианта, фонарик с крышкой-жёлудем — из соседнего. Совмещать лучшие предметы из разных листов можно (решение автора 19.11.2026).

## 2. Что рисует код — генерировать не нужно

Бусины, фигуры в заданиях, сетки, стены, часы, монеты, линейка, кубики, стрелки, знаки условий, звёзды на карточках, узоры при перекраске (горошек, полоски), дождь и радуга, кнопки и значки интерфейса.

## 3. Картинки слов для заданий

Основной путь с 16.11.2026 — вариант Б: картинки слов генерируются в общем стиле приложения (`docs/STIL.md`, раздел 12). Готовая библиотека — запасной путь, если генерация не даст 80 картинок в одном стиле.

Нужны только форматам с пометкой К: № 51, 52, 53, 58, 61, 65, 104. Все они во второй очереди, для первых 50 форматов картинки слов не нужны.

Объём: около 80 картинок простых слов в одном стиле, на прозрачном фоне.

### Вариант А: готовая библиотека

Подходят открытые наборы цветных значков: сотни животных, еды, вещей и явлений природы в одном стиле. Большинство таких наборов выпускают крупные технологические компании, поэтому названия здесь не пишутся (правило 4). Лицензии найденных наборов проверены 16.11.2026:

| Лицензия на картинки | Что требуется | Вывод |
| --- | --- | --- |
| Apache 2.0 | сохранить текст лицензии и указание автора в приложении | подходит |
| MIT | сохранить текст лицензии и указание автора | подходит |
| CC BY 4.0 | указать автора в разделе «о приложении» | подходит |
| CC BY-SA 4.0 | указать автора; изменённые картинки — под той же лицензией | можно, но условие «под той же лицензией» лишнее усложнение |
| BY-NC-SA, «некоммерческое использование» | — | не брать |
| CC0, сборники клипарта | ничего | не брать: стиль у каждой картинки свой |

Что это значит для проекта:

- Если библиотека всё же понадобится, исполнитель находит её по лицензии из таблицы, а её название появляется только на экране «Lizenzen», как требует лицензия (исключение из правила 4).
- Стиль значков отличается от гусеницы. Картинки слов живут только внутри заданий, рядом с миром не показываются.
- Набор берётся один, картинки не перерисовываются. Каждая картинка проверяется: называют ли её одним словом.

### Вариант Б: сгенерировать

80 картинок в стиле гусеницы. Сложность — удержать один стиль на 80 картинках; плюс — мир и задания выглядят одинаково.

### Список слов (черновик на проверку автору)

Слова подобраны так, чтобы у картинки было одно название, без региональных вариантов. Не берутся: Hase или Kaninchen, Huhn или Henne, Möhre или Karotte, Mütze или Kappe, Brötchen или Semmel, Tasse или Becher, Sofa или Couch, Schiff или Boot, Kuchen или Torte, Kartoffel, Eimer.

| Группа | Слова | Сколько |
| --- | --- | --- |
| Животные | Hund, Katze, Maus, Igel, Fuchs, Bär, Löwe, Tiger, Affe, Elefant, Giraffe, Zebra, Esel, Pferd, Kuh, Schaf, Ente, Eule, Fisch, Frosch, Biene, Spinne, Schnecke, Wal, Pinguin | 25 |
| Еда | Apfel, Birne, Banane, Zitrone, Kirsche, Erdbeere, Nuss, Käse, Ei, Brot, Brezel, Pizza, Eis | 13 |
| Вещи | Ball, Buch, Schere, Pinsel, Uhr, Brille, Schlüssel, Koffer, Ring, Krone, Trommel, Gitarre, Lampe, Besen, Gabel, Löffel, Teller, Flasche | 18 |
| Дом и мебель | Haus, Tür, Fenster, Tisch, Stuhl, Bett | 6 |
| Транспорт | Auto, Bus, Zug, Flugzeug, Rakete, Roller | 6 |
| Природа | Sonne, Mond, Stern, Wolke, Baum, Blume, Berg, Feuer, Pilz | 9 |
| Тело | Hand, Fuß, Auge, Ohr, Nase, Mund, Zahn | 7 |
| | | **84** |

### Серии для № 66

Формат «Was passiert zuerst?» — кандидат на отсев. Если его оставить: 8 серий по 3 сюжетные картинки, 24 картинки. В библиотеках таких серий нет, только генерация.

## 4. Картинки мира

Мир гусеницы в библиотеку не укладывается: это свой стиль. Числа ниже — на семь мест из брифа.

| Что | Расчёт | Сколько |
| --- | --- | --- |
| Фоны мест | 7 мест | 7 |
| Дом-дерево | снаружи | 1 |
| Друзья | 6 мест по 4 и волшебная поляна 3 | 27 |
| Лакомства | 4 на место, среди них любимые | 28 |
| Украшения | 3 на место и особое украшение «расцвета» | 28 |
| Игрушки с действием | 2 на место | 14 |
| Домики | 1 на место | 7 |
| Гардероб гусеницы и близнеца | шапки, шарфы, очки, банты | 12 |
| Редкие гости и особые игрушки | после открытия всех мест | 10 |
| Сезонные украшения | 4 сезона по 3 | 12 |
| Сюрпризы | корзинка-сюрприз, семечко, росток, растение, кокон, бабочка | 6 |
| Особые угощения по рецептам | по одному на место, кроме волшебной поляны | 6 |
| Значки | за новые форматы, разнообразие, упорство | 12 |
| Иконка приложения, заставка, графика для магазина | | 3 |
| | | **173** |

Что сокращает объём:

- **Рост друзей.** Друг растёт размером и получает новое движение в коде, а не новую картинку. Если рисовать три возраста отдельно, друзей станет 81 вместо 27.
- **Наряды друзей** — те же вещи, что в гардеробе гусеницы.
- **Лакомства и простые игрушки** (яблоко, орех, мяч) можно взять из той же библиотеки значков, что и слова. Тогда генерировать на 30–40 картинок меньше, но они будут в другом стиле, чем друзья. Решение за автором.

## 5. Итог и порядок

| Когда | Что нужно | Сколько генерировать |
| --- | --- | --- |
| Сейчас, этапы 2–4 | первый пакет по `docs/STIL.md`: лист персонажа, сцена луга в двух кадрах, друг и игрушка, листья, корзинка, текстуры | около 12 |
| Этап 5, скелет | луг: фон, дом-дерево, 4 друга, 4 лакомства, 4 украшения, 2 игрушки, домик, 6 вещей гардероба, корзинка-сюрприз, 4 значка | 28 |
| Этап 5, содержание | остальные шесть мест и всё остальное из раздела 4 | 145 |
| Этап 6, вторая очередь | картинки слов | 0 при библиотеке, 84 при генерации |
| Этап 6, если № 66 остаётся | серии | 24 |

Всего: от 173 картинок (слова из библиотеки, без № 66) до 281 (всё генерируется).

## 6. Требования к файлам

- Прозрачный фон, формат WebP, большая сторона 512 px; фоны мест — 1600 px по ширине.
- Один предмет на картинке, целиком, без текста и без теней на полу.
- Имя файла — немецкое слово маленькими буквами без умлаутов: `loewe.webp`.
- Картинка слова подходит, только если два-три носителя языка называют её одним и тем же словом.
- Для каждого сгенерированного набора в репозитории хранится лист с промтом, чтобы стиль можно было повторить.

## Круг 3 (19.11.2026)

Стиль тот же, что у `raupe.webp`: мягкое объёмное 3D, бархатная поверхность, свет сверху слева, без контуров; предметы — сочные и глянцевые, как листья и корзинка. Каждая картинка — отдельный запрос в новом чате, к нему приложить `raupe.webp` (для близнеца — ещё `zwilling.webp`, для домика — `korb-voll.webp`). Порядок: фон, палец, близнец, потом кнопки конца набора.

Заменяет «Круг 2»: фон 5 — новой версией ниже (тише, обрезка в обе стороны); лист кнопок 6 не нужен — кнопки рисует код, из него остаётся только палец. Для «садится рядом» годятся готовые `zwilling.webp` и `zwilling-liegt.webp`.

**7. Фон: тихий луг** (`wiese.webp`)

```
Wide background for a children's game, 16:9. A calm sunny meadow under an open sky: soft light-blue sky with two small clouds, gentle low hills, even green grass. The centre is an empty, quiet area of plain grass and sky; only a few round trees and flowers at the far left and right edges.
Same soft 3D look and top-left light as the caterpillar in the attached image, but quieter: softer, lighter colours, low contrast, slightly blurred like a background far behind. Fresh and sunny, not grey. No characters, no house, no path, no text.
```

Фон экрана набора вместо неба и холмов из кода; середина — под доску, края срезаются на телефоне (вертикально) и на планшете (горизонтально).

**8. Палец-подсказка** (`finger.webp`)

```
A child's hand with the index finger pointing up and the other fingers softly curled, seen from the back of the hand, slightly turned. Soft rounded 3D like a gentle toy, smooth skin with warm rosy shading, short chubby fingers.
Same soft 3D style and top-left light as the caterpillar in the attached image. No black outlines, no sleeve, no shadow on the ground. Plain pure white background, no text.
```

Палец в учебном примере: показывает, куда нажать; код поворачивает и «нажимает» им. Заменяет светящийся кружок.

**9. Близнец выглядывает** (`zwilling-guckt.webp`)

```
The twin caterpillar with the sky-blue bow tie from the attached image: exactly the same face, antennae and green velvet material. Only the head and the top of the bow tie are visible, peeking up curiously from below, eyes looking to the side, a small shy smile. The bottom edge of the picture is a straight clean cut.
Same soft 3D toy look, warm light from the top left, no black outlines. Plain pure white background, no shadow, no text.
```

Первый кадр «Vergleichen»: близнец выглядывает из-за края доски (код выдвигает картинку снизу).

**10. Близнец ползёт** (`zwilling-kriecht.webp`)

```
The twin caterpillar with the sky-blue bow tie from the attached image, front part only: head, bow tie, first body segment and two small front legs, like the attached front-part picture. Crawling pose: head low and stretched forward to the left, one front leg lifted mid-step, happy eager face. On the right the segment ends in a clean round cut where a bead will join.
Same soft 3D toy look, warm light from the top left, no black outlines. Plain pure white background, no shadow, no text.
```

Средний кадр: близнец ползёт по своей ветке, бусины-листья тянутся за ним; дальше он садится (`zwilling.webp`).

**11. Гусеница спит** (`raupe-schlaeft.webp`)

```
The caterpillar with the orange bandana and scarf from the attached image, the same front part as the lying picture: head resting on the two front legs, body continuing to the right. Eyes peacefully closed, a soft happy smile, antennae relaxed and drooping a little, rosy cheeks.
Same soft 3D toy look, warm light from the top left, no black outlines. Plain pure white background, no shadow, no letters like Z, no text.
```

Кнопка «Pause» в конце набора вместо рисунка кодом.

**12. Домик на дереве** (`baumhaus.webp`)

```
A small cosy treehouse sitting in a round, juicy green tree crown, a short thick trunk on a little round patch of grass. The house is honey-coloured wood with a round door, one round warm glowing window and a soft red roof. Simple shape that is still clear when very small.
Glossy juicy stylised 3D like the attached basket with leaves, warm light from the top left, no black outlines. Plain pure white background, no shadow, no text.
```

Кнопка «Meine Welt» в конце набора вместо рисунка кодом; позже — образ дома-дерева в мире.

## Круг 4 (20.11.2026): фоны-миры

Несколько фонов, которые меняются (главы, выбор ребёнка — `docs/IDEEN.md`). Проверено на пробе 7 и экране `#/neu` с фонами автора: на телефоне доска закрывает середину, фон виден только сверху (кнопки «Zurück» и «Menü» с белыми подписями, гусеница, светлые гнёзда), по краям и снизу (белая клавиатура, зелёный лист с бусиной). Отсюда правила:

- **верх** насыщенный и тёмный; в середине верха ничего светлого: ни облаков, ни солнца — иначе сливаются гнёзда и белые подписи;
- **середина** спокойная — её закрывает доска;
- **низ** насыщенный, в тени, не белый и не светло-зелёный — иначе пропадает зелёный лист;
- **на планшете** справа внизу клавиатура и лист — там пусто; левую половину закрывает доска, поэтому украшения, которые видно, — справа выше середины;
- за верхом и низом нет тонких линий, рам, веток (оранжерея не подошла именно поэтому).

Порядок: один мир — один чат. Приложить вечерний луг автора (сад светлячков) как образец стиля. Сначала горизонтальный кадр, потом в том же чате вертикальный. Файлы: `welt-<имя>-quer.webp` и `welt-<имя>-hoch.webp`.

**Общий блок — горизонтальный кадр** (вместо `[WORLD]` строка мира):

```
Wide background picture for a children's learning game, 16:9. [WORLD]
Layout rules, very important:
- Top fifth: a rich, saturated, medium-deep colour, like a deep sky blue or a violet-blue. Not dark navy, not black. A smooth gradient with no visible bands or stripes. Nothing light or white in the top middle: no clouds, no sun, no bright glow there.
- Middle: calm, soft and simple. It will be covered by a big panel.
- Bottom fifth: a rich, darker ground in soft shade. Not white, not light green.
- Bottom right quarter: calm and simple, no plants or objects there.
- Decorations only at the far right edge in the upper half, at the far left edge and in the bottom left corner. No tree crowns or leaves hanging into the top corners.
- No thin lines, frames, branches or busy patterns at the top and at the bottom.
Style: the same style and materials as the attached picture, but with the light and colours described here: polished stylised 3D like a high-quality animated film for children, soft rounded shapes, juicy saturated colours, a soft magical glow, never neon. No characters, no animals, no text.
```

**Общий блок — вертикальный кадр** (тот же чат):

```
The same place as in the previous picture, now as a tall background for a phone, portrait 9:16.
- Top quarter: a rich, saturated, medium-deep colour, not dark navy, not black, a smooth gradient with no visible bands. Nothing light or white in it: no clouds, no sun there. No tree crowns or leaves hanging into the top corners.
- Middle: calm and simple. It will be covered by a big panel.
- Bottom quarter: a rich, darker ground in soft shade, not white, not light green, calm in the middle.
- Small decorations only in the two bottom corners and at the side edges, fully inside the picture.
Same style, light and colours as the previous picture. No characters, no animals, no text.
```

**13. Солнечный луг** (`welt-wiese`)

```
A sunny summer meadow at midday: a deep clear blue sky at the top, a warm light glow near the horizon, soft rolling hills far away, round fluffy trees at the far edges, the meadow in the foreground lies in the deep cool shade of the trees.
```

**14. Пруд** (`welt-teich`)

```
A calm pond on a bright morning: a deep blue sky at the top, soft mist and gentle hills near the horizon, deep turquoise water in the foreground, pink water lilies on lily pads and mossy stones only at the edges.
```

**15. Осенний сад** (`welt-herbst`)

```
A golden autumn orchard: a deep warm blue sky at the top, round trees with orange, red and golden leaves at the edges, a few falling leaves only at the sides, the ground in the foreground covered in deep orange and red fallen leaves in soft shade.
```

**16. Лавандовое поле** (`welt-lavendel`)

```
A lavender field in summer: a deep blue sky at the top, soft hills far away, rows of deep purple lavender in the foreground, a few big sunflowers only at the far left and right edges.
```

**17. Сад светлячков** (`welt-gluehwuermchen`)

```
A magical meadow at golden dusk: a deep violet-blue sky with a few small stars at the top, a warm golden glow near the horizon, glowing fireflies, small glowing mushrooms and daisies only at the edges, the grass in the foreground in deep blue-teal shade.
```

Горизонтальный кадр сада светлячков у автора уже есть (вечерний луг); для него нужен только вертикальный.

Первая проба (20.11.2026, экран `#/neu`): сад светлячков и дневной луг подошли — белые подписи кнопок, гнёзда и лист читаются. Простой ночной вариант — нет: почти чёрный верх с резкой полосой и пусто. Отсюда в общем блоке «не тёмно-синий, не чёрный, без полос» и «без крон в верхних углах».

Вторая проба (20.11.2026): пруд и подробная осень подошли и вместе с садом светлячков и дневным лугом дают одну семью — объёмное 3D с деталями. Лаванда и две простые осени — нет: плоский рисунок, ярко-синее «электрическое» небо, 941 px. Ещё вывод: на телефоне от фона видны только полоса сверху и полоса снизу; если у всех миров одинаково синий верх, миры отличаются только низом — цвет неба лучше менять от мира к миру (фиолетовый вечер, утренний синий, тёплый синий с золотом). Образец стиля для следующих миров — вертикальный пруд; в запрос про верх добавить `natural sky colour, not electric blue, not ultramarine`.

Быстрая проверка готовой картинки: середина верха насыщенная, но не чёрная, без полос; низ не светло-зелёный и не белый; справа внизу пусто; в верхних углах нет веток; большая сторона не меньше 2000 px. Потом — экран `#/neu` с этим фоном на телефоне и планшете.
