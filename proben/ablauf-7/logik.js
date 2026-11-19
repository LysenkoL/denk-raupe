
  // ── v5: состояние ──
  var schnelleHilfe = false; // для автора: палец через 3 с вместо 15 с
  var autoSenden = false; // настройка ребёнка: выбор и картинка улетают сразу
  var antwort, entwurf, blatt, geaendert, runden, aktuell, phase, manuell, sperre, korb, fliegt, beispielGesehen, introGesehen, neuIndex;
  var selbst = { wahl: 0, tippen: 0 }, fingerGezeigt = {}, perleSeit = 0, leerTipps = 0, hilfeTimer = null;
  var intro = null, bsp = null;

  function neu(mitIntro) {
    antwort = new Array(N).fill(null); blatt = new Array(N).fill('zu'); geaendert = new Array(N).fill(false);
    entwurf = AUFGABEN.map(leererEntwurf);
    runden = 0; aktuell = 0; manuell = false; sperre = 0; korb = 0; fliegt = false; neuIndex = -1;
    beispielGesehen = false; fingerGezeigt = {}; leerTipps = 0;
    if (mitIntro) { introGesehen = false; selbst = { wahl: 0, tippen: 0 }; }
    if (!introGesehen) starteIntro(); else { phase = 'loesen'; zeichnen(); }
  }
  function leererEntwurf(a) { return a.typ === 'zahl' ? '' : a.typ === 'ordnen' ? [null, null, null] : null; }
  function gleich(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function offen(i) { return blatt[i] === 'zu'; }
  function bewegung() { return !matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // Значение в бусине из черновика. null — бусина пустая (пунктир), отправлять нечего.
  function perlenWert(a, e) {
    if (a.typ === 'zahl') return e === '' ? null : { art: 'zahl', wert: Number(e) };
    if (a.typ === 'ordnen') return e.indexOf(null) === -1 ? { art: 'folge', werte: e.slice() } : null; // стекло, когда заняты все видимые места
    return e; // выбор и метка в картинке
  }
  function setzeEntwurf(i, e) { entwurf[i] = e; perleSeit = Date.now(); }

  function naechstes(von) {
    for (var d = 1; d <= N; d++) {
      var i = (von + d) % N;
      if (!offen(i)) continue;
      if (runden === 0 ? antwort[i] === null : !geaendert[i]) return i;
    }
    return -1;
  }
  function oeffne(i, vonHand) {
    aktuell = i; manuell = !!vonHand && antwort[i] !== null;
    var a = AUFGABEN[i];
    entwurf[i] = a.typ === 'zahl' ? (antwort[i] ? String(antwort[i].wert) : '') : a.typ === 'ordnen' ? (antwort[i] ? antwort[i].werte.slice() : [null, null, null]) : antwort[i];
    perleSeit = Date.now(); leerTipps = 0; sperre = Date.now() + 300; hilfeAn = false;
    markiert = a.typ === 'zahl' && antwort[i] !== null;
    if (a.neu && !beispielGesehen) { starteBeispiel(); return; }
    phase = 'loesen'; zeichnen();
  }
  function weiter() {
    var n = naechstes(aktuell);
    if (n === -1) { phase = 'bereit'; manuell = false; zeichnen(); return; }
    oeffne(n, false);
  }

  // Полёт бусины из лотка в гнездо
  function flug(w, vonEl, nachEl, dann) {
    if (!nachEl || !bewegung()) { dann(); return; }
    fliegt = true;
    var a = vonEl.getBoundingClientRect(), b = nachEl.getBoundingClientRect();
    var g = Math.min(a.width, a.height);
    var el = document.createElement('div'); el.className = 'flug'; el.style.width = g + 'px'; el.style.height = g + 'px';
    el.innerHTML = perle(w); document.body.appendChild(el);
    var x0 = a.left + (a.width - g) / 2, y0 = a.top + (a.height - g) / 2, s1 = b.width / g;
    var mx = (x0 + b.left) / 2, my = Math.min(y0, b.top) - 40;
    vonEl.style.visibility = 'hidden';
    el.animate([
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(1)' },
      { transform: 'translate(' + mx + 'px,' + my + 'px) scale(' + ((1 + s1) / 2 + .08) + ')', offset: .55 },
      { transform: 'translate(' + b.left + 'px,' + b.top + 'px) scale(' + s1 + ')' }
    ], { duration: 500, easing: 'cubic-bezier(.4,.1,.3,1)', fill: 'forwards' }).onfinish = function () {
      el.remove(); fliegt = false; funken(b.left + b.width / 2, b.top + b.height / 2); setTimeout(dann, 150); // мягкая посадка
    };
  }

  // Искры при посадке бусины
  function funken(x, y) {
    if (!bewegung()) return;
    var box = document.createElement('div'); box.className = 'funken'; box.style.left = x + 'px'; box.style.top = y + 'px';
    for (var k = 0; k < 8; k++) { var f = document.createElement('i'); f.style.setProperty('--w', (k * 45) + 'deg'); box.appendChild(f); }
    document.body.appendChild(box); setTimeout(function () { box.remove(); }, 700);
  }
  // Пружинка при нажатии
  function hopp(el) { if (!bewegung()) return; el.classList.remove('hopp'); void el.offsetWidth; el.classList.add('hopp'); }

  // ── Палец ──
  function fingerWeg() { clearTimeout(hilfeTimer); hilfeTimer = null; document.querySelectorAll('.finger').forEach(function (f) { f.remove(); }); }
  // Кончик пальца касается нижнего края цели; ладонь уходит вниз, к краю экрана.
  function fingerAuf(ziel, ms) {
    if (!ziel) return null;
    var f = document.querySelector('.finger');
    if (!f) { f = document.createElement('div'); f.className = 'finger'; f.innerHTML = HAND; document.body.appendChild(f); }
    var r = ziel.getBoundingClientRect();
    f.style.transitionDuration = (ms || 0) + 'ms';
    f.style.left = (r.left + r.width / 2 - 20) + 'px';
    f.style.top = Math.min(r.top + r.height - 8, window.innerHeight - 58) + 'px'; // у нижнего края экрана палец заходит на цель
    return f;
  }
  function fingerStart(ziel, ms) {
    var f = document.createElement('div'); f.className = 'finger'; f.innerHTML = HAND; document.body.appendChild(f);
    f.style.left = (window.innerWidth - 70) + 'px'; f.style.top = (window.innerHeight - 70) + 'px';
    void f.offsetWidth;
    return fingerAuf(ziel, ms);
  }
  function abgabeEl() { return document.querySelector('[data-abgabe]'); }

  // Подсказка в наборе: только выбор и картинка, только пока ребёнок ни разу сам не отправил, 15 с без касаний.
  function hilfePlanen() {
    clearTimeout(hilfeTimer); hilfeTimer = null;
    if (phase !== 'loesen') return;
    var a = AUFGABEN[aktuell];
    if ((a.typ !== 'wahl' && a.typ !== 'tippen') || selbst[a.typ] > 0 || fingerGezeigt[aktuell]) return;
    if (!perlenWert(a, entwurf[aktuell])) return;
    hilfeTimer = setTimeout(function () { fingerGezeigt[aktuell] = true; fingerAuf(abgabeEl()); }, schnelleHilfe ? 3000 : 15000);
  }

  // ── Ветка ──
  function slotHtml(i) {
    var cls = 'slot' + (phase === 'loesen' && i === aktuell ? ' aktuell' : '') + (i === neuIndex ? ' neu' : '') + (runden > 0 && offen(i) && !geaendert[i] ? ' zu-mark' : '');
    return '<button class="' + cls + '" type="button" data-slot="' + i + '" aria-label="Aufgabe ' + (i + 1) + '"><i class="treffer" aria-hidden="true"></i><span class="nest"></span>' + (antwort[i] ? perle(antwort[i]) : '') + '</button>';
  }
  function zeichnenAst() {
    var ast = document.querySelector('.ast'); ast.classList.remove('einzeln');
    var rk = '', rz = '';
    for (var i = 0; i < N; i++) {
      rk += slotHtml(i);
      var zeigen = blatt[i] !== 'zu';
      rz += '<span class="slot"><span class="nest"></span>' + (zeigen ? perle(AUFGABEN[i].loesung) : '') + blattSvg(blatt[i] === 'gold', zeigen ? ' weg' : '') + '</span>';
    }
    var alleDa = antwort.every(function (x, k) { return x !== null || !offen(k); });
    if (alleDa && phase === 'loesen') rk += '<button class="ueberblick" type="button" data-ueberblick="1" aria-label="Zurück zum Vergleichen"><svg width="40" height="28" viewBox="0 0 40 28" aria-hidden="true"><circle cx="12" cy="11" r="9" fill="var(--raupe)"/><circle cx="9" cy="10" r="1.8" fill="#182218"/><circle cx="15" cy="10" r="1.8" fill="#182218"/><path d="M6 19 L18 19 L12 25 Z" fill="var(--tuch)"/><circle cx="28" cy="11" r="9" fill="var(--raupe)"/><circle cx="25" cy="10" r="1.8" fill="#182218"/><circle cx="31" cy="10" r="1.8" fill="#182218"/><path d="M22 21 L28 18 L28 24 Z M34 21 L28 18 L28 24 Z" fill="var(--fliege)"/></svg></button>';
    document.getElementById('app').setAttribute('data-phase', phase);
    document.getElementById('reihe-kind').innerHTML = kopf(false) + rk;
    document.getElementById('reihe-zwilling').innerHTML = kopf(true) + rz;
    document.getElementById('reihe-zwilling').hidden = false; document.getElementById('reihe-zwilling').style.visibility = '';
    korbZeichnen();
    if (neuIndex >= 0) { var kk = document.querySelector('#reihe-kind .kopf'); if (kk) kk.classList.add('freut'); }
    neuIndex = -1;
  }
  // В примере: одно гнездо и один лист, без близнеца, корзинки и ряда набора
  // В примере видна обычная ветка гусеницы: бусина примера садится в первое гнездо; близнеца и корзинки нет
  function zeichnenAstEinzeln(wert, klasse) {
    var app = document.getElementById('app');
    document.querySelector('.ast').classList.remove('einzeln'); app.setAttribute('data-werkzeug', 'voll'); app.setAttribute('data-phase', 'beispiel');
    var r = kopf(false);
    for (var i = 0; i < N; i++) r += '<span class="slot' + (i === 0 ? ' aktuell' + (klasse ? ' ' + klasse : '') : '') + '"' + (i === 0 ? ' id="bsp-nest"' : '') + '><span class="nest"></span>' + (i === 0 && wert ? perle(wert) : '') + '</span>';
    document.getElementById('reihe-kind').innerHTML = r;
    // близнеца в примере не видно, но его место остаётся — окно задания не меняет размер
    var rz = document.getElementById('reihe-zwilling'); rz.innerHTML = r.replace(' id="bsp-nest"', ''); rz.style.visibility = 'hidden';
    if (klasse === 'neu') { var k = document.querySelector('#reihe-kind .kopf'); if (k) k.classList.add('freut'); }
    korbZeichnen();
  }
  function korbZeichnen() {
    var kb = document.getElementById('korb'), war = kb.dataset.zahl || '0';
    kb.innerHTML = korb ? '<img src="' + BILD.korbVoll + '" alt=""><span class="zahl">' + korb + '</span>' : '';
    kb.classList.toggle('kommt', war === '0' && korb > 0); kb.dataset.zahl = String(korb); return;
    document.getElementById('korb').innerHTML = '<svg width="54" height="40" viewBox="0 0 54 40" aria-hidden="true"><path d="M8 14 Q27 -6 46 14" stroke="#9A6A3A" stroke-width="3" fill="none"/><path d="M4 14 H50 L44 38 H10 Z" fill="#C8955C"/><path d="M8 22 H46 M9 30 H45" stroke="#A9773F" stroke-width="2"/>' + (korb ? '<path d="M14 14 C14 6 22 2 30 4 C28 10 22 14 14 14 Z" fill="var(--blatt)"/>' : '') + '</svg><span class="zahl">' + korb + '</span>';
  }

  // ── Лоток: белые плитки с обводкой и кромкой в цвете цифры; жемчужина ответа падает на лист под лотком ──
  var KANTE = ['#8EA3B9','#A0002A','#AC5700','#E3E000','#3AB818','#00602F','#0096DA','#191770','#F31A85','#551F00'];
  var RAND = ['#B9C5D3','#EC003F','#FE8100','#F2DC00','#5CCB3E','#068846','#2BB6F5','#2B289F','#F27DB6','#7A3004'];
  function rgba(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
  function farbStil(d) { return ' style="--rand:' + RAND[d] + ';--kante:' + KANTE[d] + ';--schatten:' + rgba(KANTE[d], .42) + '"'; }
  var zuletztPerle = null, markiert = false;
  function abgabeHtml(w) {
    var key = w ? JSON.stringify(w) : null, wechsel = '';
    if (key && key !== zuletztPerle) wechsel = zuletztPerle === null ? ' faellt' : ' wechselt';
    zuletztPerle = key;
    return '<div class="abgabe-platz"><span class="schale' + (wechsel === ' faellt' ? ' wippt' : '') + '"><button type="button" class="abgabe' + (w ? '' : ' leer') + wechsel + (markiert && w ? ' markiert' : '') + '" data-abgabe="1" aria-label="' + (w ? 'Antwort der Raupe geben' : 'Noch keine Antwort') + '">' + perle(w) + '</button></span></div>';
  }
  // Цифры по порядку числового ряда: 0–4 сверху, 5–9 снизу; «стереть» справа на две строки
  function zifferTasten() {
    var h = '<div class="tasten">';
    for (var d = 0; d <= 9; d++) h += '<button class="mtaste" type="button" data-ziffer="' + d + '" aria-label="' + d + '"' + farbStil(d) + '>' + d + '</button>';
    h += '<button class="loesch-taste" type="button" data-loeschen="1" aria-label="Löschen"><svg viewBox="0 0 60 44" aria-hidden="true"><path d="M20 6 H50 a6 6 0 0 1 6 6 V32 a6 6 0 0 1 -6 6 H20 L5 22 Z" fill="#fff" stroke="#E0457B" stroke-width="3.5" stroke-linejoin="round"/><path d="M30 15 L42 29 M42 15 L30 29" stroke="#E0457B" stroke-width="5" stroke-linecap="round"/></svg></button>';
    return h + '</div>';
  }
  function wahlInhalt(o) {
    if (o.art === 'zahl') return '<span class="wahlzahl">' + o.wert + '</span>';
    return '<svg viewBox="0 0 60 60" aria-hidden="true">' + formPfad(o.form, 30, 32, 20, FORM[o.farbe]) + '</svg>';
  }
  function lotto(a, e) {
    var h = '<div class="lotto"><div class="werkzeug">';
    if (a.typ === 'zahl') h += zifferTasten();
    else if (a.typ === 'wahl') h += '<div class="wahl">' + a.wahl.map(function (o, k) { return '<button type="button" data-k="' + k + '" class="' + (o.art === 'zahl' ? 'kugelwahl' : 'mkarte') + (gleich(o, e) ? ' gewaehlt' : '') + '" aria-label="Antwort ' + (k + 1) + '"' + (o.art === 'zahl' ? farbStil(o.wert % 10) : '') + '>' + wahlInhalt(o) + '</button>'; }).join('') + '</div>';
    else if (a.typ === 'ordnen') {
      var rest = a.karten.map(function (k) { return e.indexOf(k) === -1 ? k : null; });
      h += '<div class="karten">' + rest.map(function (k) { return k === null ? '<span class="karte leer"></span>' : '<button type="button" class="karte" data-karte="' + k + '">' + k + '</button>'; }).join('') + '</div>';
    }
    // у «нажать в картинку» инструмент — сама картинка, в лотке только бусина
    h += '</div>' + abgabeHtml(perlenWert(a, e)) + '</div>';
    return h;
  }

  // ── Стол ──
  function zeichnen() {
    fingerWeg();
    zeichnenAst();
    var t = document.getElementById('tisch');
    if (phase === 'vergleich') return;
    if (phase === 'bereit' || phase === 'fertig') {
      var inhalt = phase === 'fertig'
        ? '<p class="jubel">Beide Raupen sind gleich!</p><div class="ende-wahl">' +
          '<button type="button" class="kachel" data-stub="welt">' + BAUMHAUS + '<span>Meine Welt</span></button>' +
          '<button type="button" class="kachel haupt" data-noch="1"><img src="' + BILD.raupe + '" alt=""><span>Noch ein Satz</span></button>' +
          '<button type="button" class="kachel" data-stub="pause">' + SCHLAF + '<span>Pause</span></button></div>' + blattRegen()
        : '<button class="vergleichen" type="button" data-vergleichen="1">Vergleichen</button>';
      t.innerHTML = '<div class="papier voll"><div class="bereit">' + inhalt + '</div></div>';
      return;
    }
    var a = AUFGABEN[aktuell], e = entwurf[aktuell];
    var notiz = runden > 0 && offen(aktuell) && !geaendert[aktuell] ? 'Hier ist noch ein Blatt. Schau noch einmal.' : '';
    var bildHtml = a.typ === 'ordnen' ? ordnenSlots(e) : hilfeMaske(aktuell, a.bild(e));
    document.getElementById('app').setAttribute('data-werkzeug', a.typ === 'tippen' ? 'leer' : 'voll');
    t.innerHTML = '<div class="papier"><div class="frage-zeile"><span></span><h1 class="frage">' + a.frage + '</h1>' + LATERNE.replace('data-hilfe="1"', 'data-hilfe="1" aria-pressed="' + hilfeAn + '"') + '</div>' +
      '<div class="bild" id="bild">' + bildHtml + '</div>' + (notiz ? '<p class="hinweis">' + notiz + '</p>' : '') + '</div>' + lotto(a, e);
    hilfePlanen();
  }
  var LATERNE = '<button class="laterne" type="button" data-hilfe="1"><span class="rund"><img src="' + BILD.laterne + '" alt=""></span><span class="name">Hilfe</span></button>'; var LATERNE_ALT = '<button class="laterne" type="button" data-hilfe="1" aria-label="Hilfe"><svg width="28" height="32" viewBox="0 0 30 34" aria-hidden="true"><rect x="8" y="2" width="14" height="5" rx="2" fill="#8A5A2B"/><rect x="5" y="7" width="20" height="21" rx="7" fill="#FFF0B8" stroke="#8A5A2B" stroke-width="2.4"/><circle cx="15" cy="17" r="4.5" fill="#FFB800"/><rect x="7" y="28" width="16" height="4" rx="2" fill="#8A5A2B"/></svg></button>';
  function ordnenSlots(werte, attr) {
    var s = '<div class="ordnen">';
    werte.forEach(function (w, k) {
      if (k) s += '<span class="zeichen" aria-hidden="true">&lt;</span>';
      s += '<button type="button" class="oslot' + (w !== null ? ' voll' : '') + '" data-oslot="' + k + '"' + (attr || '') + ' aria-label="Platz ' + (k + 1) + '">' + (w !== null ? w : '') + '</button>';
    });
    return s + '</div>';
  }

  function blattRegen() {
    var s = '<div class="regen" aria-hidden="true">';
    for (var k = 0; k < 9; k++) s += '<img src="' + (k % 4 === 0 ? BILD.blattGold : BILD.blatt) + '" style="--x:' + (6 + k * 11) + '%;--v:' + (k * 0.35) + 's;--d:' + (2.6 + (k % 3) * 0.5) + 's" alt="">';
    return s + '</div>';
  }
  // Пустая бусина: дышит; второе нажатие подряд — палец один раз на инструменты
  function leereBerührung(el, werkzeug) {
    el.classList.remove('atmet'); void el.offsetWidth; el.classList.add('atmet');
    leerTipps++;
    if (leerTipps >= 2) { leerTipps = 0; fingerAuf(werkzeug); hilfeTimer = setTimeout(fingerWeg, 2500); }
  }
  function werkzeugEl(a) {
    if (a.typ === 'zahl') return document.querySelector('.tasten .mtaste');
    if (a.typ === 'wahl') return document.querySelector('.wahl .mkarte');
    if (a.typ === 'ordnen') return document.querySelector('.karten .karte');
    return document.querySelector('#bild [data-raupe]');
  }

  // Отправка в наборе
  function abgeben(el) {
    var i = aktuell, a = AUFGABEN[i], w = perlenWert(a, entwurf[i]);
    if (!w) { leereBerührung(el, werkzeugEl(a)); return; }
    if (Date.now() - perleSeit < 300) return; // бусина только что стала стеклянной или сменила содержимое
    if (a.typ === 'wahl' || a.typ === 'tippen') selbst[a.typ]++;
    flug(w, el, document.querySelector('#reihe-kind [data-slot="' + i + '"]'), function () {
      antwort[i] = w; neuIndex = i; if (runden > 0) geaendert[i] = true;
      if (manuell) { zeichnen(); return; } // сам вернулся к заданию — остаётся на нём
      weiter();
    });
  }

  // ── Общий пример жеста (один раз в начале): выбор, затем двузначное число ──
  var INTRO_FORMEN = [{ art: 'form', form: 'kreis', farbe: 'blau' }, { art: 'form', form: 'dreieck', farbe: 'gelb' }, { art: 'form', form: 'quadrat', farbe: 'rot' }];
  function starteIntro() { phase = 'intro'; intro = { schritt: 1, wahl: null, ziffern: '', blatt: '' }; zeichneIntro(); setTimeout(introFinger, 900); }
  function zeichneIntro() {
    fingerWeg();
    var w = intro.schritt === 1 ? intro.wahl : (intro.ziffern === '' ? null : { art: 'zahl', wert: Number(intro.ziffern) });
    zeichnenAstEinzeln(intro.gesendet || null, intro.blatt);
    var punkte = '';
    var feld, werkzeug;
    if (intro.schritt === 1) {
      feld = '<div class="muster-gross"><div class="vorlage">' + wahlInhalt(INTRO_FORMEN[1]) + '</div><span class="gleich">=</span><div class="ziel">' + (intro.wahl ? wahlInhalt(intro.wahl) : '') + '</div></div>';
      werkzeug = '<div class="wahl">' + INTRO_FORMEN.map(function (o, k) { return '<button type="button" data-ik="' + k + '" class="mkarte' + (gleich(o, intro.wahl) ? ' gewaehlt' : '') + '">' + wahlInhalt(o) + '</button>'; }).join('') + '</div>';
    } else {
      feld = '<div class="muster-gross"><div class="vorlage">24</div><span class="gleich">=</span><div class="ziel">' + intro.ziffern + '</div></div>';
      werkzeug = zifferTasten().replace(/data-ziffer=/g, 'data-iziffer=').replace('data-loeschen=', 'data-iloeschen=');
    }
    document.getElementById('tisch').innerHTML = '<div class="papier"><div class="frage-zeile"><span></span><h1 class="frage">So geht\'s</h1>' + punkte + '</div><div class="bild">' + feld + '</div></div>' +
      '<div class="lotto"><div class="werkzeug">' + werkzeug + '</div>' + abgabeHtml(w) + '</div>';
  }
  // Палец стоит там, куда сейчас нажать: на вариант → на бусину; на 2 → на 4 → на бусину
  function introFinger() {
    if (phase !== 'intro') return;
    var ziel;
    if (intro.schritt === 1) ziel = intro.wahl ? abgabeEl() : document.querySelector('[data-ik="1"]');
    else {
      var z = intro.ziffern;
      if (z === '24') ziel = abgabeEl();
      else if ('24'.indexOf(z) === 0) ziel = document.querySelector('[data-iziffer="' + '24'[z.length] + '"]');
      else ziel = document.querySelector('[data-iloeschen]');
    }
    fingerAuf(ziel, document.querySelector('.finger') ? 450 : 0);
  }
  function introAbgeben(el) {
    var w = intro.schritt === 1 ? intro.wahl : (intro.ziffern === '' ? null : { art: 'zahl', wert: Number(intro.ziffern) });
    if (!w) { leereBerührung(el, intro.schritt === 1 ? document.querySelector('[data-ik="1"]') : document.querySelector('[data-iziffer="2"]')); return; }
    if (Date.now() - perleSeit < 300) return;
    fingerWeg();
    var richtig = intro.schritt === 1 ? gleich(w, INTRO_FORMEN[1]) : w.wert === 24;
    flug(w, el, document.getElementById('bsp-nest'), function () {
      intro.gesendet = w; intro.blatt = richtig ? 'neu' : 'wackelt';
      zeichneIntro();
      if (!richtig) { intro.blatt = ''; intro.gesendet = null; setTimeout(function () { if (phase === 'intro') { zeichneIntro(); introFinger(); } }, 900); return; }
      setTimeout(function () {
        if (phase !== 'intro') return;
        if (intro.schritt === 1) { intro = { schritt: 2, wahl: null, ziffern: '', blatt: '' }; zeichneIntro(); setTimeout(introFinger, 600); }
        else { introGesehen = true; phase = 'loesen'; aktuell = 0; perleSeit = Date.now(); sperre = Date.now() + 300; zeichnen(); }
      }, 1000);
    });
  }

  // ── Пример формата «по порядку»: палец один раз (≤ 1,2 с) к детали и стоит; дальше ребёнок сам, два мини-задания ──
  var BSP_AUFGABEN = [[6, 2, 4], [8, 1, 5]];
  function starteBeispiel() { phase = 'beispiel'; bsp = { nr: 0, slots: [null, null, null], blatt: '', gesendet: null, fingerWeg: false }; zeichneBeispiel(); setTimeout(beispielFinger, 700); }
  function zeichneBeispiel() {
    fingerWeg();
    zeichnenAstEinzeln(bsp.gesendet, bsp.blatt);
    var karten = BSP_AUFGABEN[bsp.nr].map(function (k) { return bsp.slots.indexOf(k) !== -1 ? '<span class="karte leer"></span>' : '<button type="button" class="karte" data-bkarte="' + k + '">' + k + '</button>'; }).join('');
    var w = bsp.slots.indexOf(null) === -1 ? { art: 'folge', werte: bsp.slots.slice() } : null;
    var punkte = '';
    document.getElementById('tisch').innerHTML = '<div class="papier"><div class="frage-zeile"><span></span><h1 class="frage">So geht\'s: Von klein nach groß</h1>' + punkte + '</div><div class="bild">' + ordnenSlots(bsp.slots, ' data-bslot="1"') + '</div></div>' +
      '<div class="lotto"><div class="werkzeug"><div class="karten">' + karten + '</div></div>' + abgabeHtml(w) + '</div>';
  }
  function beispielFinger() {
    if (phase !== 'beispiel' || bsp.nr !== 0 || bsp.fingerWeg) return;
    var kleinste = Math.min.apply(null, BSP_AUFGABEN[0]);
    fingerStart(document.querySelector('[data-bkarte="' + kleinste + '"]'), 1100);
  }
  function beispielAbgeben(el) {
    var w = bsp.slots.indexOf(null) === -1 ? { art: 'folge', werte: bsp.slots.slice() } : null;
    if (!w) { leereBerührung(el, document.querySelector('.karten .karte')); return; }
    if (Date.now() - perleSeit < 300) return;
    var soll = BSP_AUFGABEN[bsp.nr].slice().sort(function (x, y) { return x - y; });
    var richtig = gleich(w.werte, soll);
    flug(w, el, document.getElementById('bsp-nest'), function () {
      bsp.gesendet = w; bsp.blatt = richtig ? 'neu' : 'wackelt'; zeichneBeispiel();
      if (!richtig) { setTimeout(function () { if (phase === 'beispiel') { bsp.gesendet = null; bsp.blatt = ''; zeichneBeispiel(); } }, 900); return; }
      setTimeout(function () {
        if (phase !== 'beispiel') return;
        if (bsp.nr === 0) { bsp = { nr: 1, slots: [null, null, null], blatt: '', gesendet: null, fingerWeg: true }; zeichneBeispiel(); }
        else { beispielGesehen = true; phase = 'loesen'; perleSeit = Date.now(); sperre = Date.now() + 300; zeichnen(); }
      }, 1000);
    });
  }

  // ── Сравнение крупно ──
  function vergleichen() {
    fingerWeg();
    var erste = runden === 0; runden++;
    phase = 'vergleich';
    zeichnenAst();
    var t = document.getElementById('tisch');
    var breit = t.clientWidth - 40, hoch = t.clientHeight;
    var pg = Math.max(26, Math.min(112, Math.floor((breit - 6 * N) / (N + 1.2)), Math.floor((hoch - 60) / 3.6)));
    var rk = '', rz = '';
    for (var i = 0; i < N; i++) {
      rk += '<span class="slot"><span class="nest"></span>' + (antwort[i] ? perle(antwort[i]) : '') + '</span>';
      var zeigen = blatt[i] !== 'zu';
      rz += '<span class="slot" data-gslot="' + i + '"><span class="nest"></span>' + perle(AUFGABEN[i].loesung) + blattSvg(blatt[i] === 'gold', zeigen ? ' weg' : '') + '</span>';
    }
    t.innerHTML = '<div class="papier voll"><div class="gross" id="gross" style="--pg:' + pg + 'px"><div class="reihen"><div class="reihe">' + kopf(false) + rk + '</div><div class="reihe">' + kopf(true) + rz + '</div></div></div></div>';
    var liste = []; for (var j = 0; j < N; j++) if (offen(j)) liste.push(j);
    var bleiben = [], takt = bewegung() ? 380 : 0;
    liste.forEach(function (i, k) {
      setTimeout(function () {
        var g = document.querySelector('[data-gslot="' + i + '"] .blatt');
        if (gleich(antwort[i], AUFGABEN[i].loesung)) {
          blatt[i] = erste ? 'gold' : 'auf'; korb += erste ? 2 : 1;
          if (g) g.classList.add('weg');
          zeichnenAst();
          var kb = document.getElementById('korb'); kb.classList.remove('hupf'); void kb.offsetWidth; kb.classList.add('hupf');
        } else { bleiben.push(i); if (g) g.classList.add('wackelt'); }
      }, 500 + takt * k);
    });
    setTimeout(function () {
      geaendert = geaendert.map(function () { return false; });
      if (!bleiben.length) { phase = 'fertig'; zeichnen(); return; }
      setTimeout(function () {
        var gr = document.getElementById('gross'); if (gr) gr.classList.add('zu');
        setTimeout(function () { oeffne(bleiben[0], false); }, bewegung() ? 300 : 0);
      }, 1500);
    }, 500 + takt * liste.length + 200);
  }

  // ── Касания ──
  document.addEventListener('pointerdown', function () { if (phase === 'loesen') { fingerWeg(); } }, true);
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('button, [data-raupe]');
    if (!el) return;
    var d = el.dataset;
    if (el.matches('.mtaste, .mkarte, .kugelwahl, .karte, .oslot, .loeschen, .loesch-taste, .kachel, .laterne, .knopf')) hopp(el);
    if (d.lotto) { document.getElementById('app').setAttribute('data-lotto', d.lotto); document.querySelectorAll('[data-lotto]').forEach(function (b) { if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.dataset.lotto === d.lotto)); }); return; }
    if (d.auto !== undefined) { autoSenden = d.auto === '1'; document.querySelectorAll('[data-auto]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.auto === d.auto)); }); return; }
    if (d.thema) { themaSetzen(d.thema); return; }
    if (d.panel) { panelAuf(document.getElementById('autor').hidden); return; }
    if (d.weiter) { var ph = document.querySelector('.platzhalter'); if (ph) ph.remove(); return; }
    if (d.zurueck) { aufhoerenFragen(); return; }
    if (d.aufhoeren) { var ph2 = document.querySelector('.platzhalter'); if (ph2) ph2.remove(); platzhalter('regal'); return; }
    if (d.stub) { platzhalter(d.stub); return; }
    if (d.neustart) { neu(true); return; }
    if (d.schnell !== undefined) { schnelleHilfe = d.schnell === '1'; autorZeichnen(); hilfePlanen(); return; }
    if (fliegt || phase === 'vergleich') return;
    if (!d.abgabe && !d.ik && !d.iziffer) leerTipps = 0;

    if (phase === 'intro') {
      if (d.ik !== undefined) { intro.wahl = INTRO_FORMEN[Number(d.ik)]; perleSeit = Date.now(); zeichneIntro(); setTimeout(introFinger, 50); return; }
      if (d.iziffer !== undefined) { var z = intro.ziffern; intro.ziffern = z.length >= 2 ? d.iziffer : (z === '0' ? d.iziffer : z + d.iziffer); perleSeit = Date.now(); zeichneIntro(); setTimeout(introFinger, 50); return; }
      if (d.iloeschen) { intro.ziffern = intro.ziffern.slice(0, -1); perleSeit = Date.now(); zeichneIntro(); setTimeout(introFinger, 50); return; }
      if (d.abgabe) introAbgeben(el);
      return;
    }
    if (phase === 'beispiel') {
      if (d.bkarte !== undefined) { bsp.fingerWeg = true; var f = bsp.slots.indexOf(null); if (f !== -1) { bsp.slots[f] = Number(d.bkarte); perleSeit = Date.now(); zeichneBeispiel(); } return; }
      if (d.bslot !== undefined) { bsp.slots[Number(d.oslot)] = null; perleSeit = Date.now(); zeichneBeispiel(); return; }
      if (d.abgabe) beispielAbgeben(el);
      return;
    }
    if (d.noch) { neu(false); return; }
    if (d.ueberblick) { phase = 'bereit'; zeichnen(); return; }
    if (d.slot !== undefined) { var i = Number(d.slot); if (offen(i)) oeffne(i, true); return; }
    if (d.vergleichen) { vergleichen(); return; }
    if (phase !== 'loesen') return;
    if (Date.now() < sperre && el.closest('#tisch')) return;
    var a = AUFGABEN[aktuell], e = entwurf[aktuell];
    if (d.hilfe) {
      // Ступень 1 для нового формата — его пример; для остальных в пробе — ступень 2: лишнее в полутени, нужное в тёплой рамке
      if (a.typ === 'ordnen') { starteBeispiel(); return; }
      hilfeAn = !hilfeAn; zeichnen(); return;
    }
    if (d.abgabe) { abgeben(el); return; }
    if (d.ziffer !== undefined) { if (markiert) { e = ''; markiert = false; } setzeEntwurf(aktuell, e.length >= 2 ? d.ziffer : (e === '0' ? d.ziffer : e + d.ziffer)); zeichnen(); return; }
    if (d.loeschen) { setzeEntwurf(aktuell, markiert ? '' : e.slice(0, -1)); markiert = false; zeichnen(); return; }
    if (d.karte !== undefined) { var frei = e.indexOf(null); if (frei !== -1) { e[frei] = Number(d.karte); setzeEntwurf(aktuell, e); zeichnen(); } return; }
    if (d.oslot !== undefined) { e[Number(d.oslot)] = null; setzeEntwurf(aktuell, e); zeichnen(); return; }
    var gewaehlt = null;
    if (d.k !== undefined) gewaehlt = a.wahl[Number(d.k)];
    if (d.raupe !== undefined) gewaehlt = raupeWert(Number(d.raupe));
    if (gewaehlt) {
      var weg = gleich(gewaehlt, e);
      setzeEntwurf(aktuell, weg ? null : gewaehlt); zeichnen(); // повтор того же снимает выбор
      // Автоотправка (настройка ребёнка): только выбор и картинка; бусина видна 0,25 с и улетает сама
      if (autoSenden && !weg) { var nr = aktuell; fliegt = true; setTimeout(function () { fliegt = false; if (phase === 'loesen' && aktuell === nr) { perleSeit = 0; abgeben(abgabeEl()); } }, 250); }
    }
  });

  function panelAuf(auf) { document.getElementById('autor').hidden = !auf; document.getElementById('autor-knopf').setAttribute('aria-expanded', String(auf)); }
  function autorZeichnen() {
    document.querySelectorAll('[data-schnell]').forEach(function (b) { b.setAttribute('aria-pressed', String((b.dataset.schnell === '1') === schnelleHilfe)); });
  }
  // ── Помощь на рисунке (ступень 2): нужные места в тёплой рамке, остальное в полутени ──
  var hilfeAn = false;
  var HILFE = [
    [390, 250, [[129, 4, 132, 84], [67, 84, 256, 84]]],          // Zahlenmauer: верхний камень и два под ним
    [430, 120, [[3, 21, 144, 80]]],                               // Muster: первые две плитки — повторяющийся кусок
    [420, 300, [[140, -4, 140, 66]]],                             // Wer ist es?: две подсказки
    null,                                                         // по порядку: помощь — пример
    [420, 220, [[30, 108, 270, 72]]],                             // сидящие птицы
    [420, 140, [[32, 30, 76, 70], [312, 30, 76, 70]]]             // 5 и 7
  ];
  function hilfeMaske(i, svg) {
    var h = HILFE[i];
    if (!hilfeAn || !h) return svg;
    var w = h[0], hh = h[1], d = 'M-60 -60 H' + (w + 60) + ' V' + (hh + 60) + ' H-60 Z', rahmen = '';
    h[2].forEach(function (r) {
      d += ' M' + r[0] + ' ' + r[1] + ' h' + r[2] + ' v' + r[3] + ' h' + (-r[2]) + ' Z';
      rahmen += '<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '" rx="18" fill="none" stroke="#FFB000" stroke-width="5"/>';
    });
    var maske = '<g pointer-events="none"><path d="' + d + '" fill-rule="evenodd" style="fill:var(--brett)" opacity=".78"/>' + rahmen + '</g>';
    var k = svg.lastIndexOf('</svg>');
    return svg.slice(0, k) + maske + svg.slice(k);
  }

  // ── Картинки для конца набора: дом на дереве и спящая гусеница ──
  var BAUMHAUS = '<svg viewBox="0 0 120 110" aria-hidden="true"><rect x="52" y="58" width="16" height="46" rx="5" fill="#9A6A3F"/><ellipse cx="60" cy="104" rx="40" ry="6" fill="#7FCB45"/>' +
    '<circle cx="60" cy="40" r="34" fill="#57B533"/><circle cx="34" cy="50" r="22" fill="#7FCB45"/><circle cx="86" cy="50" r="22" fill="#7FCB45"/><circle cx="60" cy="30" r="22" fill="#8ED24F"/>' +
    '<rect x="44" y="44" width="32" height="26" rx="5" fill="#FFC21F"/><path d="M40 46 L60 30 L80 46 Z" fill="#FF7A59"/><rect x="55" y="54" width="10" height="16" rx="4" fill="#8B5CF6"/>' +
    '<circle cx="28" cy="40" r="4" fill="#FF6FA8"/><circle cx="92" cy="44" r="4" fill="#FFF"/><circle cx="74" cy="18" r="4" fill="#FF6FA8"/></svg>';
  var SCHLAF = '<span style="position:relative;display:inline-block"><img src="' + BILD.raupeLiegt + '" alt="" style="height:min(84px,13vh)">' +
    '<svg viewBox="0 0 40 40" aria-hidden="true" style="position:absolute;right:-18px;top:-10px;width:34px;height:34px;filter:none"><text x="4" y="30" font-size="20" font-weight="800" fill="#7E6CF0" font-family="Inter, system-ui, sans-serif">z</text><text x="18" y="18" font-size="15" font-weight="800" fill="#7E6CF0" font-family="Inter, system-ui, sans-serif">z</text></svg></span>';

  // Заглушка для экранов, которых в пробе ещё нет: ребёнок видит, что кнопка работает, и возвращается
  var STUB = {
    regal: ['Hier kommen später alle Spiele.', function () { return '<img src="' + BILD.korbVoll + '" alt="">'; }],
    welt: ['Hier kommt später deine Welt.', function () { return BAUMHAUS; }],
    pause: ['Pause. Deine Raupe wartet auf dich.', function () { return '<img src="' + BILD.raupeLiegt + '" alt="">'; }]
  };
  function aufhoerenFragen() {
    fingerWeg();
    var el = document.createElement('div'); el.className = 'platzhalter'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="karte-gross"><img src="' + BILD.raupe + '" alt=""><p>Wirklich aufhören?</p><div class="zwei"><button type="button" data-weiter="1">Weiterspielen</button><button type="button" class="leise" data-aufhoeren="1">Aufhören</button></div></div>';
    document.getElementById('app').appendChild(el); el.querySelector('button').focus();
  }
  function platzhalter(art) {
    fingerWeg();
    var st = STUB[art], el = document.createElement('div');
    el.className = 'platzhalter'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="karte-gross">' + st[1]() + '<p>' + st[0] + '</p><button type="button" data-weiter="1">Weiterspielen</button></div>';
    document.getElementById('app').appendChild(el);
    el.querySelector('button').focus();
  }

  // ── Тема: цвета неба, холмов, доски и кнопок; лоток ставится по теме, ребёнок может сменить ──
  var THEMA_LOTTO = { sonnig: 'porzellan', bonbon: 'porzellan', sommer: 'porzellan' };
  function knoepfeMarkieren(attr, wert) {
    document.querySelectorAll('.autor [data-' + attr + ']').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset[attr] === wert)); });
  }
  function themaSetzen(t) {
    if (!THEMA_LOTTO[t]) return;
    var app = document.getElementById('app');
    app.setAttribute('data-thema', t); app.setAttribute('data-lotto', THEMA_LOTTO[t]);
    knoepfeMarkieren('thema', t); knoepfeMarkieren('lotto', THEMA_LOTTO[t]);
  }

  // ── Размеры: один расчёт на все экраны. Расклад (столбик или две колонки) выбирается здесь же, CSS только читает. ──
  function groesse() {
    var app = document.getElementById('app'), cs = getComputedStyle(app);
    var W = app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), H = window.innerHeight;
    var quer = W >= H * 1.05 && W >= 640, niedrig = H < 520;
    app.setAttribute('data-lage', quer ? 'quer' : 'hoch');
    if (niedrig) app.setAttribute('data-niedrig', ''); else app.removeAttribute('data-niedrig');
    var r = document.documentElement.style, px = function (n, v) { r.setProperty(n, Math.round(v) + 'px'); };
    var g = Math.max(8, Math.min(16, H * .014));
    // кнопки верхней полосы и помощи: 56 по STIL, на крупных экранах до 68
    var knopf = Math.max(56, Math.min(68, W * .055, H * .075));
    // бусины на ветке: голова 1,3p, гнёзда p + 0,08p; в две колонки ветки стоят между кнопками
    var astW = quer ? W - 2 * knopf - knopf * 1.9 - 4 * g : W;
    var p = (astW - 24) / (1.3 + N * 1.08);
    p = Math.max(30, Math.min(84, p, H * (niedrig ? .13 : quer ? .075 : .068)));
    // лоток: в две колонки — своя колонка, в столбик — под доской
    var lottoB = quer ? Math.min(480, Math.max(300, W * .34)) : Math.min(W, 640, Math.max(470, W * .62));
    var taste = Math.max(44, Math.min(84, (lottoB - 24 - 30) / 5.95, H * (niedrig ? .125 : quer ? .1 : .062)));
    var ab = Math.max(56, Math.min(96, taste * 1.25));
    px('--g', g); px('--knopf', knopf); px('--p', p); px('--luecke', p * .08); px('--treffer', Math.max(0, (48 - p) / 2));
    px('--lotto-b', lottoB); px('--taste', taste); px('--ab', ab);
  }
  // Фон: луг под открытым небом (картинка луга, если есть; иначе небо и трава кодом)
  function hintergrund() {
    var b = document.body.style;
    if (BILD.wiese) { b.backgroundImage = 'url(' + BILD.wiese + ')'; b.backgroundSize = 'cover'; b.backgroundPosition = 'center'; }
  }
  var _zeichnen = zeichnen;
  zeichnen = function () { _zeichnen(); hintergrund(); };
  window.addEventListener('resize', function () { groesse(); hintergrund(); });
  document.documentElement.style.setProperty('--blatt-bild', 'url(' + BILD.blatt + ')');
  document.documentElement.style.setProperty('--filz-bild', 'url(' + BILD.filz + ')');
  var startThema = (location.hash.match(/thema=(\w+)/) || [])[1];
  if (startThema) themaSetzen(startThema);
  groesse(); autorZeichnen(); neu(true); hintergrund();
})();
</script>
