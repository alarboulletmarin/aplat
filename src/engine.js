/* ==========================================================================
   Aplat — moteur génératif.
   Tout est calculé ici, dans le navigateur. Aucune requête, aucune donnée
   qui sort. Le rendu est déterministe : (famille, palette, densité, graine)
   donne toujours la même image, à n'importe quelle résolution.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------- données ---------------------------------------------------- */

  var PALETTES = {
    lime:    {fr:'Lime & crème', en:'Lime & cream', bg:'#F7F3E6', cols:['#DFF478','#92BAD5','#17243F','#FF6648']},
    soleil:  {fr:'Soleil',       en:'Sun',          bg:'#F6E6B4', cols:['#EFA22B','#17243F','#788CE3','#F7F3E6']},
    argile:  {fr:'Argile',       en:'Clay',         bg:'#F0E2D2', cols:['#C9552F','#17243F','#E9B44C','#788CE3']},
    corail:  {fr:'Corail',       en:'Coral',        bg:'#F7F3E6', cols:['#FF6648','#17243F','#DFF478','#788CE3']},
    menthe:  {fr:'Menthe',       en:'Mint',         bg:'#E2EFE4', cols:['#4E9B7C','#17243F','#DFF478','#92BAD5']},
    ciel:    {fr:'Ciel',         en:'Sky',          bg:'#92BAD5', cols:['#F7F3E6','#788CE3','#17243F','#DFF478']},
    ardoise: {fr:'Ardoise',      en:'Slate',        bg:'#DFE2E6', cols:['#4A5773','#92BAD5','#DFF478','#17243F']},
    prune:   {fr:'Prune',        en:'Plum',         bg:'#EEE0EA', cols:['#6E3B63','#788CE3','#DFF478','#F7F3E6']},
    nuit:    {fr:'Nuit',         en:'Night',        bg:'#17243F', cols:['#788CE3','#DFF478','#92BAD5','#F7F3E6']},
    orage:   {fr:'Orage',        en:'Storm',        bg:'#1D2140', cols:['#788CE3','#FF6648','#92BAD5','#F7F3E6']},
    encre:   {fr:'Encre',        en:'Ink',          bg:'#101A2E', cols:['#F7F3E6','#92BAD5','#DFF478','#FF6648']}
  };
  var PAL_ORDER = ['lime','soleil','argile','corail','menthe','ciel','ardoise','prune','nuit','orage','encre'];

  var FAMILIES = [
    {id:'vagues',    g:'abs', fr:'Vagues',           en:'Waves'},
    {id:'blobs',     g:'abs', fr:'Blobs',            en:'Blobs'},
    {id:'arches',    g:'abs', fr:'Arches',           en:'Arches'},
    {id:'decoupes',  g:'abs', fr:'Découpes',         en:'Cut-outs'},
    {id:'obliques',  g:'abs', fr:'Obliques',         en:'Diagonals'},
    {id:'ondes',     g:'abs', fr:'Ondes',            en:'Ripples'},
    {id:'pointille', g:'abs', fr:'Fondu pointillé',  en:'Dotted fade'},
    {id:'trame',     g:'abs', fr:'Trame',            en:'Dither'},
    {id:'colonnes',  g:'abs', fr:'Colonnes',         en:'Columns'},
    {id:'ecailles',  g:'abs', fr:'Écailles',         en:'Scales'},
    {id:'terrazzo',  g:'abs', fr:'Terrazzo',         en:'Terrazzo'},
    {id:'confettis', g:'abs', fr:'Confettis',        en:'Confetti'},
    {id:'fleurs',    g:'fig', fr:'Marguerites',      en:'Daisies'},
    {id:'tournesol', g:'fig', fr:'Tournesol',        en:'Sunflower'},
    {id:'etoiles',   g:'fig', fr:'Étoiles',          en:'Stars'},
    {id:'rayons',    g:'fig', fr:'Rayons',           en:'Sunbeams'},
    {id:'lunes',     g:'fig', fr:'Lunes',            en:'Moons'},
    {id:'feuilles',  g:'fig', fr:'Feuilles',         en:'Leaves'}
  ];

  var RADII = ['50%','3px','50% 50% 50% 0','3px 11px 3px 11px','50% 0 50% 0','2px'];

  /* ---------- aléatoire déterministe -------------------------------------- */

  /* Accès par index sur liste blanche : PALETTES['constructor'] est « vrai »,
     et suffisait à faire lever le rendu tout entier. */
  function has(obj, k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(obj, k); }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) h = (Math.imul(h ^ s.charCodeAt(i), 16777619)) >>> 0;
    return h % 9973;
  }

  /* La graine de dessin ne dépend jamais de la résolution : la même image
     sort à l'identique en aperçu et à l'export. */
  function drawSeed(family, dens, seed) {
    return (seed * 7919 + dens * 131 + hash(family) * 23) >>> 0;
  }

  /* ---------- luminance ---------------------------------------------------- */

  function lum(r, g, b) {
    function f(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }

  /* ---------- primitives de tracé ----------------------------------------- */

  function blobPath(ctx, cx, cy, r, n, rnd, jit) {
    var j = jit === undefined ? 0.6 : jit, P = [], i;
    for (i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2, rr = r * (1 - j / 2 + j * rnd());
      P.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
    var m0 = mid(P[n - 1], P[0]);
    ctx.beginPath(); ctx.moveTo(m0[0], m0[1]);
    for (i = 0; i < n; i++) {
      var c = P[i], nx = P[(i + 1) % n], m = mid(c, nx);
      ctx.quadraticCurveTo(c[0], c[1], m[0], m[1]);
    }
    ctx.closePath(); ctx.fill();
  }

  function archPath(ctx, cx, baseY, w, h) {
    var r = w / 2, hh = Math.max(h, r * 1.02);
    ctx.beginPath(); ctx.moveTo(cx - r, baseY); ctx.lineTo(cx - r, baseY - hh + r);
    ctx.arc(cx, baseY - hh + r, r, Math.PI, 0); ctx.lineTo(cx + r, baseY); ctx.closePath(); ctx.fill();
  }

  function daisy(ctx, cx, cy, R, n, rot, petal, core) {
    ctx.fillStyle = petal;
    for (var i = 0; i < n; i++) {
      var a = rot + i / n * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * R * 0.56, cy + Math.sin(a) * R * 0.56, R * 0.46, R * 0.26, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.32, 0, Math.PI * 2); ctx.fill();
  }

  function pillPath(ctx, x, y, w, h) {
    var r = Math.min(w, h) / 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else {
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    }
    ctx.closePath(); ctx.fill();
  }

  function starPath(ctx, cx, cy, R, pts, inner, rot) {
    ctx.beginPath();
    for (var i = 0; i < pts * 2; i++) {
      var a = rot + i * Math.PI / pts, r = (i % 2) ? R * inner : R;
      var x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill();
  }

  function leafPath(ctx, x, y, len, wid, a) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.42, -wid, len, 0);
    ctx.quadraticCurveTo(len * 0.42, wid, 0, 0);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function crescent(ctx, cx, cy, R, a, cut) {
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.moveTo(cx + Math.cos(a) * R * cut + R * 0.9, cy + Math.sin(a) * R * cut);
    ctx.arc(cx + Math.cos(a) * R * cut, cy + Math.sin(a) * R * cut, R * 0.9, 0, Math.PI * 2);
    ctx.fill('evenodd');
  }

  function sunflower(ctx, cx, cy, R, rnd, petal, petal2, core, seedCol, U) {
    var n = 13 + Math.floor(rnd() * 6), rot = rnd() * Math.PI * 2, i, a;
    ctx.fillStyle = petal2;
    for (i = 0; i < n; i++) {
      a = rot + (i + 0.5) / n * Math.PI * 2;
      leafPath(ctx, cx + Math.cos(a) * R * 0.3, cy + Math.sin(a) * R * 0.3, R * 0.62, R * 0.19, a);
    }
    ctx.fillStyle = petal;
    for (i = 0; i < n; i++) {
      a = rot + i / n * Math.PI * 2;
      leafPath(ctx, cx + Math.cos(a) * R * 0.26, cy + Math.sin(a) * R * 0.26, R * 0.76, R * 0.25, a);
    }
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = seedCol;
    /* plancher relatif : en pixels absolus il mordait dans les vignettes, dont
       le cœur paraissait plus dense que l'image réellement exportée */
    var g = 2.39996, k = R * 0.29 / Math.sqrt(72), dot = Math.max((U || R * 12) * 0.0008, R * 0.021);
    for (i = 1; i <= 72; i++) {
      var rr = k * Math.sqrt(i), aa = i * g;
      ctx.beginPath(); ctx.arc(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr, dot, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ---------- familles ----------------------------------------------------- */

  function shapes(ctx, W, H, fam, C, dens, rnd, U) {
    function col(i) { return C[((i % C.length) + C.length) % C.length]; }
    var i, j, k, r, c, n, x, y, s;

    if (fam === 'blobs') {
      n = [3, 6, 10][dens];
      for (i = 0; i < n; i++) {
        ctx.fillStyle = col(i);
        blobPath(ctx, W * (0.08 + 0.84 * rnd()), H * (0.07 + 0.86 * rnd()),
          U * (0.15 + 0.22 * rnd()), 7 + Math.floor(rnd() * 3), rnd);
      }
      return;
    }

    if (fam === 'arches') {
      n = [2, 3, 5][dens];
      var cw = W / n;
      for (j = 0; j < n; j++) {
        var cx = cw * (j + 0.5), up = rnd() > 0.32;
        var base = up ? H * (0.62 + 0.38 * rnd()) : H * (0.02 + 0.1 * rnd());
        var hgt = H * (0.3 + 0.34 * rnd());
        for (k = 0; k < 3; k++) {
          ctx.fillStyle = col(j + k);
          var w = cw * (0.94 - k * 0.26);
          if (up) archPath(ctx, cx, base, w, hgt - k * hgt * 0.2);
          else {
            ctx.save(); ctx.translate(cx, base); ctx.scale(1, -1); ctx.translate(-cx, 0);
            archPath(ctx, cx, 0, w, hgt - k * hgt * 0.2); ctx.restore();
          }
        }
      }
      return;
    }

    if (fam === 'fleurs') {
      n = [2, 3, 5][dens];
      var fcw = W / n, frows = Math.max(2, Math.round(H / fcw)), fch = H / frows;
      for (r = 0; r < frows; r++) for (c = 0; c < n; c++) {
        i = r * n + c;
        var R = Math.min(fcw, fch) * 0.42 * (0.78 + 0.34 * rnd());
        daisy(ctx, fcw * (c + 0.5) + (rnd() - 0.5) * fcw * 0.18, fch * (r + 0.5) + (rnd() - 0.5) * fch * 0.18,
          R, 6 + Math.floor(rnd() * 3), rnd() * Math.PI, col(i), col(i + 2));
      }
      return;
    }

    if (fam === 'tournesol') {
      n = [1, 3, 7][dens];
      /* borné par n : sinon, en densité calme (n = 1) et sur un format large,
         la grille passait à deux colonnes et la fleur unique se retrouvait
         centrée sur le quart gauche, la moitié droite restant nue */
      var tcols = Math.min(n, Math.max(1, Math.round(Math.sqrt(n * W / H)))), trows = Math.max(1, Math.ceil(n / tcols));
      var tcw = W / tcols, tch = H / trows;
      for (i = 0; i < n; i++) {
        c = i % tcols; r = Math.floor(i / tcols);
        var TR = Math.min(tcw, tch) * (n === 1 ? 0.46 : 0.36) * (0.88 + 0.26 * rnd());
        sunflower(ctx, tcw * (c + 0.5) + (rnd() - 0.5) * tcw * 0.18, tch * (r + 0.5) + (rnd() - 0.5) * tch * 0.18,
          TR, rnd, col(i), col(i + 3), col(i + 1), col(i + 2), U);
      }
      return;
    }

    if (fam === 'etoiles') {
      n = [5, 11, 22][dens];
      for (i = 0; i < n; i++) {
        ctx.fillStyle = col(i);
        starPath(ctx, W * (0.05 + 0.9 * rnd()), H * (0.04 + 0.92 * rnd()),
          U * (0.06 + 0.17 * rnd()), 4 + Math.floor(rnd() * 5), 0.36 + 0.16 * rnd(), rnd() * Math.PI * 2);
      }
      return;
    }

    if (fam === 'rayons') {
      n = [8, 14, 24][dens];
      var ax = W * (rnd() < 0.5 ? 0.1 : 0.9), ay = H * (rnd() < 0.5 ? 0.08 : 0.92);
      var rot = rnd() * Math.PI * 2, RR = Math.hypot(W, H) * 1.4, step = Math.PI * 2 / n;
      for (i = 0; i < n; i++) {
        ctx.fillStyle = col(i);
        var a0 = rot + i * step, a1 = a0 + step * 0.97;
        ctx.beginPath(); ctx.moveTo(ax, ay);
        ctx.lineTo(ax + Math.cos(a0) * RR, ay + Math.sin(a0) * RR);
        ctx.lineTo(ax + Math.cos(a1) * RR, ay + Math.sin(a1) * RR);
        ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = col(n + 1);
      ctx.beginPath(); ctx.arc(ax, ay, U * 0.12, 0, Math.PI * 2); ctx.fill();
      return;
    }

    if (fam === 'ecailles') {
      var ecols = [3, 5, 8][dens], er = W / ecols / 2, estep = er * 0.72;
      var erows = Math.ceil(H / estep) + 2;
      for (var row = 0; row < erows; row++) {
        y = -er * 0.5 + row * estep;
        var off = (row % 2) ? er : 0;
        ctx.fillStyle = col(row);
        for (c = -1; c <= ecols + 1; c++) {
          ctx.beginPath(); ctx.arc(off + c * er * 2 + er, y, er, 0, Math.PI * 2); ctx.fill();
        }
      }
      return;
    }

    if (fam === 'lunes') {
      n = [3, 6, 11][dens];
      for (i = 0; i < n; i++) {
        ctx.fillStyle = col(i);
        crescent(ctx, W * (0.1 + 0.8 * rnd()), H * (0.06 + 0.88 * rnd()),
          U * (0.1 + 0.17 * rnd()), rnd() * Math.PI * 2, 0.26 + 0.32 * rnd());
      }
      return;
    }

    if (fam === 'feuilles') {
      n = [4, 9, 18][dens];
      for (i = 0; i < n; i++) {
        x = W * (0.06 + 0.88 * rnd()); y = H * (0.05 + 0.9 * rnd());
        var len = U * (0.16 + 0.2 * rnd()), la = rnd() * Math.PI * 2;
        ctx.fillStyle = col(i);
        leafPath(ctx, x, y, len, len * 0.34, la);
        ctx.fillStyle = col(i + 2);
        leafPath(ctx, x, y, len * 0.46, len * 0.14, la);
      }
      return;
    }

    if (fam === 'colonnes') {
      n = [3, 5, 9][dens];
      var gap = W * 0.014;
      x = gap; i = 0;
      while (x < W - gap && i < 48) {
        var pw = Math.max(U * 0.05, (W / n) * (0.5 + 0.8 * rnd()) - gap);
        var ph = H * (0.34 + 0.62 * rnd());
        ctx.fillStyle = col(i);
        pillPath(ctx, x, rnd() < 0.5 ? -H * 0.07 : H - ph + H * 0.07, pw, ph);
        x += pw + gap; i++;
      }
      return;
    }

    if (fam === 'confettis') {
      n = [24, 55, 120][dens];
      for (i = 0; i < n; i++) {
        s = U * (0.016 + 0.03 * rnd());
        ctx.fillStyle = col(i);
        ctx.save(); ctx.translate(W * rnd(), H * rnd()); ctx.rotate(rnd() * Math.PI);
        k = Math.floor(rnd() * 4);
        if (k === 0) { ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill(); }
        else if (k === 1) { pillPath(ctx, -s * 2.2, -s * 0.5, s * 4.4, s); }
        else if (k === 2) { starPath(ctx, 0, 0, s * 1.6, 4, 0.4, 0); }
        else { ctx.beginPath(); ctx.moveTo(0, -s * 1.4); ctx.lineTo(s * 1.3, s); ctx.lineTo(-s * 1.3, s); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      }
      return;
    }

    if (fam === 'decoupes') {
      n = [2, 3, 5][dens];
      for (i = 0; i < n; i++) {
        ctx.fillStyle = col(i);
        blobPath(ctx, W * (0.08 + 0.84 * rnd()), H * (0.08 + 0.84 * rnd()),
          U * (0.46 + 0.46 * rnd()), 6 + Math.floor(rnd() * 4), rnd, 0.85);
      }
      return;
    }

    if (fam === 'obliques') {
      n = [3, 6, 11][dens];
      var D = Math.hypot(W, H);
      var oa = (rnd() < 0.5 ? 1 : -1) * (Math.PI / 4 + (rnd() - 0.5) * 0.5);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(oa); ctx.translate(-D / 2, -D / 2);
      y = 0; i = 0;
      while (y < D && i < 64) {
        var oh = D / n * (0.45 + 0.95 * rnd());
        ctx.fillStyle = col(i);
        ctx.fillRect(-D * 0.2, y, D * 1.4, oh);
        y += oh + D * 0.007; i++;
      }
      ctx.restore();
      return;
    }

    if (fam === 'ondes') {
      n = [5, 9, 16][dens];
      var ocx = W * (0.14 + 0.72 * rnd()), ocy = H * (0.12 + 0.76 * rnd());
      var oR = Math.hypot(Math.max(ocx, W - ocx), Math.max(ocy, H - ocy)) * 1.02;
      for (i = n; i >= 1; i--) {
        ctx.fillStyle = col(i);
        ctx.beginPath(); ctx.arc(ocx, ocy, oR * i / n, 0, Math.PI * 2); ctx.fill();
      }
      return;
    }

    if (fam === 'pointille') {
      var pcols = [9, 15, 24][dens];
      s = W / pcols;
      var prows = Math.ceil(H / s) + 1;
      var flip = rnd() < 0.5, diag = rnd() < 0.5, sw = rnd() < 0.5;
      var main = col(0), accent = col(1);
      for (r = 0; r < prows; r++) for (c = 0; c < pcols; c++) {
        x = s * (c + 0.5); y = s * (r + 0.5);
        var t = diag ? ((sw ? W - x : x) / W * 0.5 + y / (prows * s) * 0.5) : y / (prows * s);
        if (flip) t = 1 - t;
        var rr2 = s * 0.78 * Math.max(0, Math.min(1, t * 1.22 - 0.1));
        if (rr2 < s * 0.04) continue;
        ctx.fillStyle = ((r * 3 + c) % 9 === 0) ? accent : main;
        ctx.beginPath(); ctx.arc(x, y, rr2, 0, Math.PI * 2); ctx.fill();
      }
      return;
    }

    if (fam === 'trame') {
      var dcols = [12, 20, 32][dens];
      s = W / dcols;
      var drows = Math.ceil(H / s) + 1;
      var B = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      var dcx = W * (0.2 + 0.6 * rnd()), dcy = H * (0.14 + 0.72 * rnd()), dR = Math.hypot(W, H) * (0.5 + 0.32 * rnd());
      var core = col(0), fringe = col(1);
      /* Les cellules sont calées sur des bornes entières : pas de couture
         ni de bord adouci quand on zoome dans l'export. */
      for (r = 0; r < drows; r++) {
        var y0 = Math.round(r * s), y1 = Math.round((r + 1) * s);
        for (c = 0; c < dcols; c++) {
          var x0 = Math.round(c * s), x1 = Math.round((c + 1) * s);
          var t2 = Math.max(0, Math.min(1, 1 - Math.hypot(c * s + s / 2 - dcx, r * s + s / 2 - dcy) / dR));
          var th = (B[r % 4][c % 4] + 0.5) / 16;
          if (t2 > th) {
            ctx.fillStyle = (t2 > th + 0.3) ? core : fringe;
            ctx.fillRect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0));
          }
        }
      }
      return;
    }

    if (fam === 'terrazzo') {
      n = [30, 70, 150][dens];
      for (i = 0; i < n; i++) {
        ctx.fillStyle = col(i + (i % 3));
        blobPath(ctx, W * rnd(), H * rnd(), U * (0.014 + 0.032 * rnd()), 5 + Math.floor(rnd() * 3), rnd, 0.95);
      }
      return;
    }

    /* vagues — famille par défaut.
       Le pas d'échantillonnage suit la largeur : la courbe reste lisse
       même quand on zoome à 100 % dans un fond d'écran 4K. */
    n = [4, 7, 11][dens];
    var stp = Math.max(0.75, W / 2400);
    for (i = 0; i < n; i++) {
      y = H * (0.14 + 0.88 * i / n);
      var amp = H * (0.012 + 0.032 * rnd());
      var per = W / (0.5 + 1.7 * rnd()), ph = rnd() * Math.PI * 2;
      ctx.fillStyle = col(i);
      ctx.beginPath(); ctx.moveTo(0, y + Math.sin(ph) * amp);
      for (x = 0; x <= W; x += stp) ctx.lineTo(x, y + Math.sin(ph + x / per * Math.PI * 2) * amp);
      ctx.lineTo(W, y + Math.sin(ph + Math.PI * 2 * W / per) * amp);
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
    }
  }

  /* ---------- grain -------------------------------------------------------- */

  /* Grain papier. Il fait deux choses : il donne la texture de la direction
     artistique, et il trame le voile — sans lui, une marche d'un cran sur 255
     s'étale parfois sur plusieurs centaines de lignes et se lit comme une
     bande, surtout sur les palettes très sombres.

     Trois choix, tous mesurés :
     - mouchetis blanc / noir / transparent en source-over, et non un bruit gris
       en overlay : l'overlay ne bouge quasiment pas sur un fond sombre, donc il
       ne tramait rien là où c'était le plus nécessaire, tout en pesant trois
       fois plus lourd ;
     - amplitude de trois niveaux crête à crête, la même sur toute la gamme :
       assez pour casser la marche, 1,2 % sur un ton moyen, invisible à l'œil ;
     - petite tuile de 8 px, un pixel d'appareil par grain : la tuile se répète
       dans la ligne, donc le PNG la retrouve au lieu de la recoder, et le grain
       ne fait jamais de blocs quand on zoome. */

  var GRAIN_TILE = 8, GRAIN_ALPHA = 3;   /* 3/255 */
  var _grain = null;

  function grainTile() {
    if (_grain) return _grain;
    var n = document.createElement('canvas');
    n.width = n.height = GRAIN_TILE;
    var c = n.getContext('2d');
    var img = c.createImageData(GRAIN_TILE, GRAIN_TILE), d = img.data;
    var r = rng(0x41504C41);
    for (var i = 0; i < d.length; i += 4) {
      var k = Math.floor(r() * 3);
      if (k === 0) { d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = GRAIN_ALPHA; }
      else if (k === 1) { d[i] = d[i + 1] = d[i + 2] = 0; d[i + 3] = GRAIN_ALPHA; }
      else { d[i + 3] = 0; }
    }
    c.putImageData(img, 0, 0);
    _grain = n;
    return _grain;
  }

  function paintGrain(ctx, W, H) {
    var pat = ctx.createPattern(grainTile(), 'repeat');
    if (!pat) return;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ---------- sonde de lisibilité ------------------------------------------ */

  /* On mesure la luminance de la zone des icônes sur une petite sonde, jamais
     sur l'image finale : mêmes chiffres pour l'aperçu et pour l'export, et
     aucun getImageData de 100 Mo sur un fond d'écran 4K. */
  var _probe = null, _probeCache = Object.create(null), _probeKeys = [];

  function probeCanvas(w, h) {
    if (!_probe) _probe = document.createElement('canvas');
    if (_probe.width !== w || _probe.height !== h) { _probe.width = w; _probe.height = h; }
    return _probe;
  }

  /* On borne la surface de la sonde, pas son grand côté : borner le grand côté
     écrasait le rapport d'aspect au-delà de 3,44:1, si bien qu'un format
     panoramique était mesuré sur une autre composition que celle exportée — le
     voile brûlé dans le PNG et le contraste annoncé portaient alors sur une
     image qui n'existait pas. */
  var PROBE_AREA = 200000, PROBE_SIDE_MAX = 4000;

  function measure(family, palId, dens, seed, w, h) {
    var P = has(PALETTES, palId) ? PALETTES[palId] : PALETTES.lime;
    var ar = (w > 0 && h > 0) ? w / h : 0.5;
    var key = family + '|' + palId + '|' + dens + '|' + seed + '|' + Math.round(ar * 1000);
    if (_probeCache[key]) return _probeCache[key];

    var PH = Math.max(24, Math.min(PROBE_SIDE_MAX, Math.round(Math.sqrt(PROBE_AREA / ar))));
    var PW = Math.max(24, Math.min(PROBE_SIDE_MAX, Math.round(PH * ar)));

    var c = probeCanvas(PW, PH);
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, PW, PH);
    shapes(ctx, PW, PH, family, P.cols, dens, rng(drawSeed(family, dens, seed)), Math.min(PW, PH));

    var L = 0.4;
    try {
      var y0 = Math.round(PH * 0.24), y1 = Math.round(PH * 0.92);
      var d = ctx.getImageData(0, y0, PW, Math.max(1, y1 - y0)).data;
      var px = d.length / 4, step = Math.max(1, Math.floor(px / 2600)) * 4;
      var sum = 0, k = 0;
      for (var i = 0; i < d.length; i += step) { sum += lum(d[i], d[i + 1], d[i + 2]); k++; }
      if (k) L = sum / k;
    } catch (e) { /* canvas verrouillé : on garde la valeur neutre */ }

    var mode = L > 0.5 ? 'dark' : 'light';
    var a = 0, tg;
    if (mode === 'light') { tg = 0.17; if (L > tg) a = Math.min(0.5, (L - tg) / Math.max(0.05, L - 0.02)); }
    else { tg = 0.68; if (L < tg) a = Math.min(0.44, (tg - L) / Math.max(0.05, 0.96 - L)); }

    var L2 = mode === 'light' ? L * (1 - a) + 0.018 * a : L * (1 - a) + 0.95 * a;
    var ratio = mode === 'light' ? 1.05 / (L2 + 0.05) : (L2 + 0.05) / 0.068;

    var out = { mode: mode, veil: a, ratio: ratio };
    _probeCache[key] = out;
    _probeKeys.push(key);
    if (_probeKeys.length > 400) { delete _probeCache[_probeKeys.shift()]; }
    return out;
  }

  /* ---------- voile de lisibilité ------------------------------------------ */

  /* Le voile pousse le fond vers la couleur de libellé la plus sûre, juste ce
     qu'il faut pour tenir sous les icônes.

     Il est peint en bandes à opacité constante, jamais avec un
     createLinearGradient : le navigateur tramait le dégradé pixel par pixel,
     ce qui empêchait toute compression et triplait le poids du PNG. Avec
     320 bandes, aucune marche ne dépasse un cran sur 255, et le grain
     ci-dessous se charge de la casser. */

  var VEIL_STOPS = [[0, 0.90], [0.2, 0.78], [0.78, 0.96], [1, 1.14]];
  var VEIL_BANDS = 320;

  function veilAlphaAt(u, a) {
    var i = 1;
    while (i < VEIL_STOPS.length - 1 && u > VEIL_STOPS[i][0]) i++;
    var p = VEIL_STOPS[i - 1], q = VEIL_STOPS[i];
    var k = q[0] === p[0] ? 0 : (u - p[0]) / (q[0] - p[0]);
    var mul = p[1] + (q[1] - p[1]) * Math.max(0, Math.min(1, k));
    return Math.min(0.62, a * mul);
  }

  function applyVeil(ctx, W, H, m) {
    var a = m.veil;
    if (!(a > 0.004)) return;
    var rgb = m.mode === 'light' ? '11,18,33' : '250,247,236';
    var bands = Math.max(2, Math.min(H, VEIL_BANDS));
    var prev = 0;
    for (var i = 0; i < bands; i++) {
      var y0 = prev;
      var y1 = (i === bands - 1) ? H : Math.round((i + 1) * H / bands);
      if (y1 <= y0) continue;
      prev = y1;
      ctx.fillStyle = 'rgba(' + rgb + ',' + veilAlphaAt((y0 + y1) / 2 / H, a).toFixed(4) + ')';
      ctx.fillRect(0, y0, W, y1 - y0);
    }
  }

  /* ---------- rendu complet ------------------------------------------------ */

  function draw(ctx, W, H, family, palId, dens, seed) {
    var P = has(PALETTES, palId) ? PALETTES[palId] : PALETTES.lime;
    var m = measure(family, palId, dens, seed, W, H);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);

    shapes(ctx, W, H, family, P.cols, dens, rng(drawSeed(family, dens, seed)), Math.min(W, H));

    applyVeil(ctx, W, H, m);
    paintGrain(ctx, W, H);
    ctx.restore();
    return m;
  }

  global.APLAT_ENGINE = {
    PALETTES: PALETTES,
    PAL_ORDER: PAL_ORDER,
    FAMILIES: FAMILIES,
    RADII: RADII,
    rng: rng,
    measure: measure,
    draw: draw,
    _shapes: shapes,
    _applyVeil: applyVeil,
    _paintGrain: paintGrain,
    _drawSeed: drawSeed
  };
})(typeof window !== 'undefined' ? window : this);
