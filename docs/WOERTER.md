# Denk-Raupe — словарь и авторские наборы

Nov 16, 2026

Документ для сессий-исполнителей и для проверки автором. Первая часть — как записывается словарь. Вторая — готовые наборы для № 81, 88, 101, 102 и 103. Все наборы — черновик: автор проверяет каждый вручную, прежде чем он попадёт в приложение.

## 1. Словарь

Словарь — один файл `src/woerter/woerterbuch.json`, слова 1–2 класса. Источник слов — открытые списки основного словаря начальной школы, которые публикуют федеральные земли. Объём для первой версии — около 300 слов.

### Запись слова

```json
{
  "wort": "Hase",
  "art": "N",
  "artikel": "der",
  "silben": "Ha-se",
  "reim": "ase",
  "gruppe": "tier",
  "uk": "заєць",
  "klasse": 1
}
```

| Поле | Значение | Кто заполняет |
| --- | --- | --- |
| `wort` | слово в словарной форме | автор |
| `art` | N существительное, V глагол, A прилагательное | автор |
| `artikel` | der, die или das; только у существительных | автор |
| `silben` | слово с дефисами по слогам | автор |
| `reim` | ключ рифмы по звучанию: одинаковый у слов, которые рифмуются (Bär и Meer) | автор |
| `gruppe` | смысловая группа: tier, essen, kleidung, moebel, fahrzeug, pflanze, koerper, schule, natur, familie, spiel, haus | автор |
| `uk` | перевод на украинский для родительской части | автор |
| `klasse` | 1 или 2 | автор |
| `bild` | имя файла картинки, если она есть | автор |
| `farbe` | главный цвет картинки | автор |

Пометки, которые ставит скрипт сборки, а не человек:

| Пометка | Правило | Для форматов |
| --- | --- | --- |
| `purzel` | из букв слова по большому списку словоформ не складывается другое слово | 60 |
| `anlaut` | первая буква читается своим обычным звуком: не Sch, St, Sp, Ch, Qu, Pf, Ei, Au, Eu и не V, Y, C | 51 |
| `artikelSicher` | у слова один артикль во всём немецкоязычном пространстве | 62, 72 |
| `luecke` | места, где пропуск буквы даёт только это слово | 52 |

Слова с двумя артиклями (Joghurt, Keks, Cola, Gummi, Bonbon) пометку `artikelSicher` не получают. Список таких слов ведёт автор.

### Тесты словаря

- все обязательные поля заполнены; артикль есть только у существительных;
- число слогов в `silben` совпадает с числом гласных ядер;
- слова одной группы рифмы действительно оканчиваются одинаково по звучанию — список групп выводится для проверки автором;
- у каждого слова есть перевод;
- в словаре нет слов с ошибками: проверка по большому списку словоформ.

## 2. № 81 Wort-Bausteine

Составные слова из двух половинок. Берутся только слова без соединительной буквы, где обе половинки — самостоятельные слова.

Правило набора: ни одна «чужая» пара половинок не даёт слова. Для набора из пяти слов это 20 пар, каждая проверяется по большому списку словоформ и глазами автора. Любая часть годного набора тоже годна, поэтому уровень 1 берёт три слова из набора, уровень 2 — четыре, уровень 3 — все пять.

| Набор | Слова |
| --- | --- |
| 1 | Regen + Bogen, Schnee + Mann, Vogel + Nest, Wind + Mühle, Kopf + Kissen |
| 2 | Eis + Bär, Garten + Zaun, Zahn + Bürste, Tee + Kanne, Luft + Ballon |
| 3 | Hand + Schuh, Apfel + Baum, Brief + Kasten, Gold + Fisch, Auto + Bahn |
| 4 | Fuß + Ball, Butter + Brot, Kuh + Stall, Bett + Decke, Tür + Schloss |
| 5 | Wasser + Hahn, Tisch + Lampe, Spiel + Platz, Sommer + Ferien, Zahn + Arzt |
| 6 | Mond + Schein, Sand + Burg, Tee + Löffel, Hand + Tuch, Schlüssel + Loch |

Почему наборы составлены именно так — примеры отброшенных сочетаний: Hand + Schuh нельзя рядом с Fuß + Ball (получается Handball); Zahn + Bürste нельзя рядом с Regen + Bogen (Zahnbogen); Eis + Bär нельзя рядом с Brief + Kasten (Eiskasten); Wasser + Hahn нельзя рядом с Wind + Mühle (Wassermühle); Tee + Kanne нельзя рядом с Apfel + Baum (Teebaum). Слова с Haus в наборы не берутся: Haus сочетается почти со всем.

На проверку автору: Gartenkanne (набор 2), Spielhahn (набор 5) и Sandloch (набор 6) — редкие, но возможные слова.

## 3. № 88 Satz bauen

Предложение разрезано на плитки по словам. Первая плитка с большой буквы, на последней стоит точка или вопросительный знак. Имён детей в предложениях нет.

Правило набора: из плиток складывается только одно правильное предложение. Автор проверяет все перестановки, в которых последняя плитка стоит на своём месте. Не берутся предложения с двумя свободными обстоятельствами (im Garten и mit dem Ball можно поменять местами) и с двумя именами через und.

| № | Уровень | Плитки |
| --- | --- | --- |
| 1 | 1 | Der · Hund · bellt · laut. |
| 2 | 1 | Die · Katze · schläft · gern. |
| 3 | 1 | Oma · backt · einen · Kuchen. |
| 4 | 1 | Der · Ball · ist · rund. |
| 5 | 1 | Die · Sonne · scheint · hell. |
| 6 | 1 | Opa · liest · ein · Buch. |
| 7 | 1 | Wir · spielen · im · Garten. |
| 8 | 1 | Der · Vogel · singt · schön. |
| 9 | 2 | Der · Hund · spielt · im · Garten. |
| 10 | 2 | Die · Maus · frisst · den · Käse. |
| 11 | 2 | Mama · kauft · einen · roten · Apfel. |
| 12 | 2 | Das · Auto · fährt · sehr · schnell. |
| 13 | 2 | Der · Igel · wohnt · im · Wald. |
| 14 | 2 | Papa · kocht · heute · die · Suppe. |
| 15 | 2 | Die · Ente · schwimmt · im · Teich. |
| 16 | 2 | Wir · gehen · morgen · ins · Kino. |
| 17 | 3 | Der · kleine · Hund · holt · den · Ball. |
| 18 | 3 | Die · Kinder · bauen · eine · große · Burg. |
| 19 | 3 | Am · Abend · lese · ich · ein · Buch. |
| 20 | 3 | Im · Winter · bauen · wir · einen · Schneemann. |
| 21 | 3 | Die · Katze · sitzt · auf · dem · Dach. |
| 22 | 3 | Mein · Bruder · hat · ein · neues · Fahrrad. |
| 23 | 3 | Die · Biene · fliegt · zu · der · Blume. |
| 24 | 3 | Wo · ist · mein · blauer · Stift? |

## 4. № 101 d oder t?

Слово с пропуском на конце. На ступени помощи показывается длинная форма с тем же пропуском.

Правило набора: второй вариант буквы не даёт слова. Не берутся Rad и Rat, Bund и bunt, seid и seit, Tod и tot, Bad и bat, Bank и bang.

### d или t

| Слово | Ответ | Длинная форма | | Слово | Ответ | Длинная форма |
| --- | --- | --- | --- | --- | --- | --- |
| Hun_ | d | viele Hun_e | | Bro_ | t | viele Bro_e |
| Wal_ | d | die Wäl_er | | Boo_ | t | viele Boo_e |
| Kin_ | d | viele Kin_er | | Hu_ | t | viele Hü_e |
| Bil_ | d | viele Bil_er | | Zel_ | t | viele Zel_e |
| Fel_ | d | die Fel_er | | Bar_ | t | die Bär_e |
| Han_ | d | zwei Hän_e | | Wel_ | t | die Wel_en |
| Pfer_ | d | viele Pfer_e | | Wor_ | t | die Wor_e |
| Mon_ | d | die Mon_e | | Hef_ | t | viele Hef_e |
| Win_ | d | die Win_e | | Nes_ | t | viele Nes_er |
| Hem_ | d | viele Hem_en | | Lich_ | t | viele Lich_er |
| Klei_ | d | viele Klei_er | | Zei_ | t | die Zei_en |
| Lie_ | d | viele Lie_er | | Hau_ | t | die Häu_e |
| Freun_ | d | viele Freun_e | | al_ | t | der al_e Mann |
| Aben_ | d | die Aben_e | | lau_ | t | das lau_e Auto |
| Lan_ | d | viele Län_er | | kal_ | t | der kal_e Wind |
| Stran_ | d | die Strän_e | | gu_ | t | das gu_e Buch |
| San_ | d | san_ig | | ro_ | t | der ro_e Ball |
| run_ | d | der run_e Ball | | wei_ | t | der wei_e Weg |
| wil_ | d | das wil_e Tier | | | | |
| gesun_ | d | das gesun_e Kind | | | | |

### g или k

| Слово | Ответ | Длинная форма | | Слово | Ответ | Длинная форма |
| --- | --- | --- | --- | --- | --- | --- |
| Ber_ | g | viele Ber_e | | Par_ | k | die Par_s |
| Zu_ | g | viele Zü_e | | Geschen_ | k | viele Geschen_e |
| We_ | g | viele We_e | | Schran_ | k | viele Schrän_e |
| Ta_ | g | viele Ta_e | | Vol_ | k | die Völ_er |
| Zwer_ | g | viele Zwer_e | | kran_ | k | das kran_e Kind |
| Bur_ | g | viele Bur_en | | star_ | k | der star_e Bär |
| Kru_ | g | viele Krü_e | | | | |
| Flu_ | g | viele Flü_e | | | | |
| klu_ | g | das klu_e Kind | | | | |

На проверку автору:

- **Hun_.** Слово Hunt есть в полном словаре как горняцкий термин. Пример Hund — Hunde стоит во всех школьных материалах, поэтому он оставлен.
- **b или p.** Простых слов на -p в детском словаре почти нет (Sirup, Chip), ответ был бы почти всегда b. Предложение: пару b и p в этом формате не давать. В брифе она названа; решает автор.

## 5. № 102 ä oder e?

Слово с пропуском и родственное слово рядом. На уровне 1 родственное слово показано всегда: у слов с ä в нём стоит a, у слов с e — e. На уровнях 2 и 3 родственного слова нет.

Правило набора: второй вариант не даёт слова. Не берутся Gärten и Gerten, Gäste и Geste, Wände и Wende, Lärche и Lerche, Ähre и Ehre, Fälle и Felle, Ställe и Stelle, älter и Elter, Häute и heute, läute и Leute, а также слова, которые нельзя вывести: Säule, Knäuel, Stängel.

### ä или e

| Слово | Ответ | Родственное | | Слово | Ответ | Родственное |
| --- | --- | --- | --- | --- | --- | --- |
| H_nde | ä | Hand | | F_lder | e | Feld |
| Bl_tter | ä | Blatt | | B_tten | e | Bett |
| Z_hne | ä | Zahn | | N_ster | e | Nest |
| K_mme | ä | Kamm | | Z_lte | e | Zelt |
| Gl_ser | ä | Glas | | H_fte | e | Heft |
| W_lder | ä | Wald | | H_rzen | e | Herz |
| M_nner | ä | Mann | | B_rge | e | Berg |
| V_ter | ä | Vater | | Br_tter | e | Brett |
| N_gel | ä | Nagel | | F_ste | e | Fest |
| L_nder | ä | Land | | W_lten | e | Welt |
| B_nke | ä | Bank | | h_ller | e | hell |
| St_dte | ä | Stadt | | schn_ller | e | schnell |
| Pl_tze | ä | Platz | | M_nschen | e | Mensch |
| Schr_nke | ä | Schrank | | H_mden | e | Hemd |
| w_rmer | ä | warm | | N_tze | e | Netz |
| l_nger | ä | lang | | D_cken | e | Decke |
| er f_hrt | ä | fahren | | er r_nnt | e | rennen |
| er schl_ft | ä | schlafen | | | | |
| er f_llt | ä | fallen | | | | |
| er tr_gt | ä | tragen | | | | |
| J_ger | ä | jagen | | | | |
| z_hlen | ä | Zahl | | | | |

### äu или eu

| Слово | Ответ | Родственное | | Слово | Ответ | Родственное |
| --- | --- | --- | --- | --- | --- | --- |
| B__me | äu | Baum | | Fr__nde | eu | Freund |
| H__ser | äu | Haus | | Kr__ze | eu | Kreuz |
| M__se | äu | Maus | | Flugz__ge | eu | Flugzeug |
| Tr__me | äu | Traum | | n__er | eu | neu |
| R__me | äu | Raum | | B__len | eu | Beule |
| Z__ne | äu | Zaun | | Sch__nen | eu | Scheune |
| Str__ße | äu | Strauß | | fr__en | eu | Freude |
| B__che | äu | Bauch | | l__chten | eu | Leuchte |
| Kr__ter | äu | Kraut | | t__rer | eu | teuer |
| L__fer | äu | laufen | | tr__er | eu | treu |
| K__fer | äu | kaufen | | K__len | eu | Keule |
| R__ber | äu | rauben | | | | |
| er l__ft | äu | laufen | | | | |
| tr__men | äu | Traum | | | | |

Только для уровней 2 и 3, без родственного слова: F__er, B__tel, n__n, H__ (ответ eu).

## 6. № 103 Ein Wort zu viel

В предложении одно слово лишнее. Лишнее слово не стоит первым и не стоит последним.

Правило набора: без лишнего слова остаётся правильное предложение; если убрать любое другое слово, правильного предложения не получается. Поэтому лишнее слово — не то, что может заменить соседа: не второй подходящий глагол и не существительное того же рода.

| № | Уровень | Предложение | Лишнее |
| --- | --- | --- | --- |
| 1 | 1 | Der Hund bellt oder laut. | oder |
| 2 | 1 | Die Katze schläft Lampe gern. | Lampe |
| 3 | 1 | Oma backt einen läuft Kuchen. | läuft |
| 4 | 1 | Der Ball ist und rund. | und |
| 5 | 1 | Die Sonne Stuhl scheint hell. | Stuhl |
| 6 | 1 | Opa liest ein trinkt Buch. | trinkt |
| 7 | 1 | Wir spielen im sieben Garten. | sieben |
| 8 | 1 | Der Vogel singt auf schön. | auf |
| 9 | 2 | Der Hund spielt Milch im Garten. | Milch |
| 10 | 2 | Die Maus frisst geht den Käse. | geht |
| 11 | 2 | Mama kauft einen roten wir Apfel. | wir |
| 12 | 2 | Das Auto fährt Blume sehr schnell. | Blume |
| 13 | 2 | Der Igel drei wohnt im Wald. | drei |
| 14 | 2 | Papa kocht heute lacht die Suppe. | lacht |
| 15 | 2 | Die Ente schwimmt unter im Teich. | unter |
| 16 | 2 | Wir gehen morgen Schuh ins Kino. | Schuh |
| 17 | 3 | Der kleine Hund holt weil den Ball. | weil |
| 18 | 3 | Die Kinder bauen eine Vogel große Burg. | Vogel |
| 19 | 3 | Am Abend lese ich zwei ein Buch. | zwei |
| 20 | 3 | Im Winter bauen wir essen einen Schneemann. | essen |
| 21 | 3 | Die Katze sitzt auf sehr dem Dach. | sehr |
| 22 | 3 | Mein Bruder hat ein Wolke neues Fahrrad. | Wolke |
| 23 | 3 | Die Biene fliegt Tisch zu der Blume. | Tisch |
| 24 | 3 | Heute scheint die Sonne oder den ganzen Tag. | oder |

Примеры отброшенных предложений: «Der Hund frisst läuft gern.» — можно убрать и frisst, и läuft; «Der Hund Tisch bellt laut.» — без слова Hund остаётся грамматически верное «Der Tisch bellt laut.»; «Wir spielen Hund im Garten.» — предложение верно и с лишним словом.
