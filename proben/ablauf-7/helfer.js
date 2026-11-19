  var FARBE = ['#EEF1F4','#EC003F','#FE8100','#FFFD4F','#71E053','#068846','#42C4FF','#2B289F','#F598C6','#7A3004'];
  var WEISS = [false,true,false,false,false,true,false,true,false,true]; // белая цифра на этом цвете
  var FORM = { rot: '#EC003F', blau: '#42C4FF', gelb: '#FFD43B', gruen: '#068846' };
  var TON = '#2A2F4F'; // тёмные чернила на белой глине (без коричневого)

  // Смешать цвет с белым (k>0) или чёрным (k<0)
  function mische(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var z = k > 0 ? 255 : 0, a = Math.abs(k);
    var f = function (c) { return Math.round(c + (z - c) * a); };
    return 'rgb(' + f(r) + ',' + f(g) + ',' + f(b) + ')';
  }
  var uid = 0;
  function formPfad(f, cx, cy, s, c) {
    if (f === 'kreis') return '<circle cx="' + cx + '" cy="' + cy + '" r="' + s + '" fill="' + c + '"/>';
    if (f === 'quadrat') return '<rect x="' + (cx - s) + '" y="' + (cy - s) + '" width="' + 2 * s + '" height="' + 2 * s + '" rx="' + s * .25 + '" fill="' + c + '"/>';
    return '<path d="M' + cx + ' ' + (cy - s * 1.1) + 'L' + (cx + s * 1.1) + ' ' + (cy + s * .85) + 'L' + (cx - s * 1.1) + ' ' + (cy + s * .85) + 'Z" fill="' + c + '" stroke="' + c + '" stroke-width="' + s * .22 + '" stroke-linejoin="round"/>';
  }
  // Пухлая фигура: заливка с мягким объёмом
  function formPlastisch(f, cx, cy, s, c) {
    var id = 'f' + (++uid);
    return '<defs><radialGradient id="' + id + '" cx="38%" cy="30%" r="80%"><stop offset="0" stop-color="' + mische(c, .45) + '"/><stop offset=".55" stop-color="' + c + '"/><stop offset="1" stop-color="' + mische(c, -.25) + '"/></radialGradient></defs>' +
      formPfad(f, cx, cy, s, 'url(#' + id + ')');
  }
  function hut(x, y, s, farbe) { return '<path d="M' + (x - s) + ' ' + y + ' Q' + x + ' ' + (y - s * 1.6) + ' ' + (x + s) + ' ' + y + ' Z" fill="' + farbe + '"/><rect x="' + (x - s * 1.25) + '" y="' + (y - s * .15) + '" width="' + s * 2.5 + '" height="' + s * .35 + '" rx="' + s * .17 + '" fill="' + farbe + '"/>'; }
  function ziffer(n, x, y, gr, farbeIdx) {
    var weiss = WEISS[farbeIdx];
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="' + gr + '" font-weight="800" fill="' + (weiss ? '#fff' : '#1E1A12') + '" stroke="' + (weiss ? 'rgba(20,20,40,.55)' : 'rgba(255,255,255,.85)') + '" stroke-width="' + gr * .12 + '" paint-order="stroke" stroke-linejoin="round" font-family="Inter, system-ui, sans-serif">' + n + '</text>';
  }

  // Стеклянная бусина ответа. Пустая (null) — пунктирное гнездо.
  function perle(w) {
    var id = 'p' + (++uid), s = '', d = '';
    if (!w) return '<svg class="perle" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="38" fill="rgba(255,255,255,.4)" stroke="#fff" stroke-width="5" stroke-dasharray="8.92 6"/></svg>';
    var glas = function (gid, c) { return '<radialGradient id="' + gid + '" cx="40%" cy="32%" r="75%"><stop offset="0" stop-color="' + mische(c, .35) + '"/><stop offset=".55" stop-color="' + c + '"/><stop offset="1" stop-color="' + mische(c, -.32) + '"/></radialGradient>'; };
    d += '<linearGradient id="' + id + 'l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity=".15"/></linearGradient>';
    if (w.art === 'zahl') {
      var n = w.wert, e = n % 10, z = Math.floor(n / 10);
      if (n >= 10) {
        d += glas(id + 'r', FARBE[z]) + glas(id + 'k', FARBE[e]);
        s += '<circle cx="50" cy="50" r="46" fill="url(#' + id + 'r)"/><circle cx="50" cy="51" r="31" fill="url(#' + id + 'k)" stroke="rgba(20,20,30,.4)" stroke-width="2.5"/>';
      } else { d += glas(id + 'k', FARBE[e]); s += '<circle cx="50" cy="50" r="46" fill="url(#' + id + 'k)"/>'; }
      s += ziffer(n, 50, n >= 10 ? 62 : 66, n >= 10 ? 30 : 46, e);
    } else {
      // Бусина без числа: янтарно-сливочная, а не белая таблетка
      d += glas(id + 'k', '#FFE7B0');
      s += '<circle cx="50" cy="50" r="46" fill="url(#' + id + 'k)"/>';
      if (w.art === 'form') s += formPlastisch(w.form, 50, 53, 24, FORM[w.farbe]);
      if (w.art === 'raupe') s += '<circle cx="50" cy="60" r="23" fill="#7CC24A"/><circle cx="42" cy="58" r="3.2" fill="#182218"/><circle cx="58" cy="58" r="3.2" fill="#182218"/>' +
        (w.brille ? '<circle cx="42" cy="58" r="7.5" fill="none" stroke="#182218" stroke-width="2.5"/><circle cx="58" cy="58" r="7.5" fill="none" stroke="#182218" stroke-width="2.5"/>' : '') + hut(50, 39, 15, FORM[w.hut]);
      if (w.art === 'folge') w.werte.forEach(function (zz, k) { s += zz === null ? '<circle cx="' + (26 + k * 24) + '" cy="52" r="4" fill="#B9A27E"/>' : '<text x="' + (26 + k * 24) + '" y="63" text-anchor="middle" font-size="30" font-weight="800" fill="' + TON + '" font-family="Inter, system-ui, sans-serif">' + zz + '</text>'; });
    }
    // Стекло: ясный блик сверху слева, светлый отсвет по нижнему краю
    s += '<path d="M24 36 C26 22 40 13 54 14 C44 18 33 26 30 40 C29 44 23 43 24 36 Z" fill="url(#' + id + 'l)"/><circle cx="66" cy="22" r="3.5" fill="#fff" opacity=".85"/>';
    s += '<path d="M22 66 C30 82 56 90 74 78" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3" stroke-linecap="round"/>';
    return '<svg class="perle" viewBox="0 0 100 100" aria-hidden="true"><defs>' + d + '</defs>' + s + '</svg>';
  }
  // Матовый крашеный шарик-клавиша: объём есть, блика нет
  function kugel(n, farbeIdx, inhalt) {
    var id = 'k' + (++uid), c = FARBE[farbeIdx];
    return '<svg class="kugel" viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="' + id + '" cx="40%" cy="32%" r="75%"><stop offset="0" stop-color="' + mische(c, .3) + '"/><stop offset=".55" stop-color="' + c + '"/><stop offset="1" stop-color="' + mische(c, -.3) + '"/></radialGradient></defs>' +
      '<ellipse cx="50" cy="90" rx="34" ry="7" fill="rgba(0,40,40,.28)"/><circle cx="50" cy="48" r="42" fill="url(#' + id + ')"/>' +
      (inhalt || ziffer(n, 50, 63, 44, farbeIdx)) + '</svg>';
  }
  function kopf(zwilling) { return '<img class="kopf" src="' + (zwilling ? BILD.zwilling : BILD.raupe) + '" alt="">'; }
  function blattSvg(gold, extra) { return '<img class="blatt' + (extra || '') + '" src="' + (gold ? BILD.blattGold : BILD.blatt) + '" alt="">'; }
  var HAND = '<svg viewBox="0 0 64 76" width="64" height="76" aria-hidden="true"><path d="M22 6 C22 1 30 1 30 6 L30 34 L33 33 C34 28 41 28 41 33 L43 34 C44 30 51 30 51 35 L52 37 C53 33 60 34 60 39 L60 52 C60 66 51 74 39 74 L33 74 C24 74 18 69 14 62 L5 46 C3 41 9 37 13 41 L22 50 Z" fill="#FFE1C4" stroke="#8A5A2B" stroke-width="3" stroke-linejoin="round"/></svg>';

  // ── Задания: белая глина на персиковом войлоке ──
  function stein(x, y, w, h, inhalt, leer, antwort) {
    // Камень ответа с числом: белый с оранжевой рамкой; при возврате к заданию число «выделено» — первая цифра его заменит
    if (antwort && !leer) return '<rect x="' + x + '" y="' + (y + 6) + '" width="' + w + '" height="' + h + '" rx="18" fill="#E9C46A"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="18" fill="' + (markiert ? '#D6E8FF' : '#FFFFFF') + '" stroke="#FFB000" stroke-width="5"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 15) + '" text-anchor="middle" font-size="44" font-weight="800" fill="' + TON + '" font-family="Inter, system-ui, sans-serif">' + inhalt + '</text>';
    if (leer) return '<rect x="' + x + '" y="' + (y + 3) + '" width="' + w + '" height="' + h + '" rx="18" fill="rgba(40,50,90,.10)"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="18" style="fill:color-mix(in srgb, var(--brett-kante) 16%, #fff);stroke:var(--brett-kante)" stroke-width="3.5" stroke-dasharray="10 7"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 15) + '" text-anchor="middle" font-size="44" font-weight="800" fill="' + TON + '" font-family="Inter, system-ui, sans-serif">' + inhalt + '</text>';
    return '<rect x="' + x + '" y="' + (y + 6) + '" width="' + w + '" height="' + h + '" rx="18" fill="#D9CDBD"/>' +
      '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="18" fill="url(#lehm)"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 15) + '" text-anchor="middle" font-size="44" font-weight="800" fill="' + TON + '" font-family="Inter, system-ui, sans-serif">' + inhalt + '</text>';
  }
  var LEHM = '<defs><linearGradient id="lehm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".7" stop-color="#F7F2EA"/><stop offset="1" stop-color="#EDE5D8"/></linearGradient></defs>';
  var RAUPEN = [['rot', false], ['blau', true], ['rot', false], ['gelb', true], ['rot', true], ['blau', false]];
  function raupeWert(nr) { return { art: 'raupe', nr: nr, hut: RAUPEN[nr - 1][0], brille: RAUPEN[nr - 1][1] }; }

  var AUFGABEN = [
    { typ: 'zahl', frage: 'Welche Zahl fehlt?', loesung: { art: 'zahl', wert: 8 },
      bild: function (v) { var t = v === '' ? '?' : v; return '<svg viewBox="0 0 390 250" preserveAspectRatio="xMidYMid meet">' + LEHM + stein(135, 10, 120, 68, t, v === '', true) + stein(73, 90, 120, 68, 3) + stein(197, 90, 120, 68, 5) + stein(11, 170, 120, 68, 1) + stein(135, 170, 120, 68, 2) + stein(259, 170, 120, 68, 3) + '</svg>'; } },
    { typ: 'wahl', frage: 'Wie geht es weiter?', loesung: { art: 'form', form: 'quadrat', farbe: 'blau' },
      wahl: [{ art: 'form', form: 'dreieck', farbe: 'gelb' }, { art: 'form', form: 'quadrat', farbe: 'blau' }, { art: 'form', form: 'kreis', farbe: 'blau' }, { art: 'form', form: 'quadrat', farbe: 'gruen' }],
      bild: function (a) {
        var reihe = ['dreieck', 'quadrat', 'dreieck', 'quadrat', 'dreieck'], s = '<svg viewBox="0 0 430 120" preserveAspectRatio="xMidYMid meet">' + LEHM +
          '<rect x="2" y="70" width="426" height="34" rx="17" style="fill:color-mix(in srgb, var(--brett-kante) 45%, #fff)"/><rect x="2" y="96" width="426" height="8" rx="4" style="fill:var(--brett-kante)"/>';
        reihe.forEach(function (f, i) { var x = 40 + i * 70; s += '<rect x="' + (x - 31) + '" y="' + 32 + '" width="62" height="62" rx="16" fill="#D9CDBD"/><rect x="' + (x - 31) + '" y="27" width="62" height="62" rx="16" fill="url(#lehm)"/>' + formPlastisch(f, x, 59, 19, f === 'dreieck' ? FORM.gelb : FORM.blau); });
        var x = 390;
        s += a ? '<rect x="' + (x - 31) + '" y="32" width="62" height="62" rx="16" fill="#D9CDBD"/><rect x="' + (x - 31) + '" y="27" width="62" height="62" rx="16" fill="url(#lehm)"/>' + formPlastisch(a.form, x, 59, 19, FORM[a.farbe])
          : '<rect x="' + (x - 31) + '" y="27" width="62" height="62" rx="16" style="fill:color-mix(in srgb, var(--brett-kante) 16%, #fff);stroke:var(--brett-kante)" stroke-width="3.5" stroke-dasharray="9 6"/><text x="' + x + '" y="73" text-anchor="middle" font-size="38" font-weight="800" fill="' + TON + '" font-family="Inter, system-ui, sans-serif">?</text>';
        return s + '</svg>';
      } },
    { typ: 'tippen', frage: 'Wer ist es?', loesung: raupeWert(5),
      bild: function (a) {
        var s = '<svg viewBox="0 0 420 300" preserveAspectRatio="xMidYMid meet">' + LEHM +
          '<rect x="146" y="2" width="60" height="54" rx="14" fill="url(#lehm)" stroke="#E2D6C6" stroke-width="2"/>' + hut(176, 38, 17, FORM.rot) +
          '<rect x="214" y="2" width="60" height="54" rx="14" fill="url(#lehm)" stroke="#E2D6C6" stroke-width="2"/><circle cx="232" cy="29" r="9" fill="none" stroke="#182218" stroke-width="3"/><circle cx="256" cy="29" r="9" fill="none" stroke="#182218" stroke-width="3"/><path d="M241 29 L247 29" stroke="#182218" stroke-width="3"/>';
        RAUPEN.forEach(function (r, i) {
          var x = 20 + (i % 3) * 132, y = 70 + Math.floor(i / 3) * 114, nr = i + 1, gew = a && a.nr === nr;
          s += '<g data-raupe="' + nr + '"><rect x="' + x + '" y="' + (y + 6) + '" width="116" height="100" rx="18" fill="#D9CDBD"/><rect x="' + x + '" y="' + (gew ? y - 4 : y) + '" width="116" height="100" rx="18" fill="' + (gew ? '#FFFFFF' : 'url(#lehm)') + '"' + (gew ? ' stroke="#F2A900" stroke-width="6"' : '') + '/>';
          var yy = gew ? y - 4 : y;
          s += '<circle cx="' + (x + 40) + '" cy="' + (yy + 68) + '" r="15" fill="#4F8F2C"/><circle cx="' + (x + 60) + '" cy="' + (yy + 66) + '" r="17" fill="#7CC24A"/><circle cx="' + (x + 80) + '" cy="' + (yy + 58) + '" r="21" fill="#86CC52"/>' +
            '<circle cx="' + (x + 74) + '" cy="' + (yy + 56) + '" r="2.8" fill="#182218"/><circle cx="' + (x + 87) + '" cy="' + (yy + 56) + '" r="2.8" fill="#182218"/>' +
            (r[1] ? '<circle cx="' + (x + 74) + '" cy="' + (yy + 56) + '" r="7" fill="none" stroke="#182218" stroke-width="2.4"/><circle cx="' + (x + 88) + '" cy="' + (yy + 56) + '" r="7" fill="none" stroke="#182218" stroke-width="2.4"/>' : '') +
            hut(x + 80, yy + 40, 16, FORM[r[0]]) +
            '<text x="' + (x + 16) + '" y="' + (yy + 28) + '" font-size="21" font-weight="800" fill="' + TON + '" font-family="Inter, system-ui, sans-serif">' + nr + '</text></g>';
        });
        return s + '</svg>';
      } },
    { typ: 'ordnen', frage: 'Von klein nach groß', karten: [7, 3, 5], loesung: { art: 'folge', werte: [3, 5, 7] }, neu: true },
    { typ: 'zahl', frage: 'Wie viele bleiben sitzen?', loesung: { art: 'zahl', wert: 4 },
      bild: function () {
        var s = '<svg viewBox="0 0 420 220" preserveAspectRatio="xMidYMid meet"><path d="M20 172 Q210 150 400 172" stroke="#7A4E2A" stroke-width="12" fill="none" stroke-linecap="round"/><path d="M20 168 Q210 146 400 168" stroke="#9A6A3F" stroke-width="6" fill="none" stroke-linecap="round"/>';
        function vogel(x, y, fliegt) { return '<g transform="translate(' + x + ' ' + y + ')' + (fliegt ? ' rotate(-14)' : '') + '"><ellipse cx="0" cy="0" rx="21" ry="17" fill="' + (fliegt ? '#F58A3A' : '#FFB93E') + '"/><circle cx="12" cy="-11" r="12" fill="' + (fliegt ? '#F58A3A' : '#FFB93E') + '"/><circle cx="16" cy="-13" r="3" fill="#182218"/><circle cx="17" cy="-14" r="1" fill="#fff"/><path d="M23 -10 L32 -7 L23 -4 Z" fill="#E0661A"/>' + (fliegt ? '<path d="M-6 -6 Q-22 -32 -32 -12" fill="#E8742A"/>' : '<path d="M-9 2 Q-2 13 9 4" fill="#F0A030"/>') + '</g>'; }
        [60, 122, 184, 246].forEach(function (x) { s += vogel(x, 147, false); });
        s += vogel(322, 72, true) + vogel(382, 42, true);
        s += '<path d="M300 112 Q330 92 350 62" stroke="' + TON + '" stroke-width="3.5" fill="none" stroke-dasharray="7 6"/><path d="M352 55 L350 68 L339 61 Z" fill="' + TON + '"/>';
        return s + '</svg>';
      } },
    { typ: 'wahl', frage: 'Welche Zahl passt?', loesung: { art: 'zahl', wert: 6 },
      wahl: [{ art: 'zahl', wert: 4 }, { art: 'zahl', wert: 6 }, { art: 'zahl', wert: 8 }],
      bild: function (a) {
        var mitte = a ? '<svg x="160" y="18" width="100" height="100" viewBox="0 0 100 100">' + perle(a).replace(/^<svg[^>]*>/, '') : '<circle cx="210" cy="68" r="44" style="fill:color-mix(in srgb, var(--brett-kante) 16%, #fff);stroke:var(--brett-kante)" stroke-width="3.5" stroke-dasharray="10 7"/><text x="210" y="84" text-anchor="middle" font-size="44" font-weight="800" fill="' + TON + '" font-family="Inter, system-ui, sans-serif">?</text>';
        var z = function (x, t) { return '<text x="' + x + '" y="88" text-anchor="middle" font-size="60" font-weight="800" fill="' + TON + '" font-family="Inter, system-ui, sans-serif">' + t + '</text>'; };
        return '<svg viewBox="0 0 420 140" preserveAspectRatio="xMidYMid meet">' + z(70, '5') + z(130, '&lt;') + mitte + z(290, '&lt;') + z(350, '7') + '</svg>';
      } }
  ];
  var N = AUFGABEN.length;
