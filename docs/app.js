/* Road Check — Adra. Map of road shake measured by phone on a bike. */
(function () {
  'use strict';
  var APP = { version: '1.0.0' };
  var D = window.RC_DATA;
  var COL = { smooth: '#6f93ad', mid: '#e0a35a', rough: '#b23a26' };
  var T = {
    title: { bn: 'আদ্রার রাস্তা কেমন?', en: "How are Adra's roads?" },
    sub: { bn: 'বাইকে ফোন নিয়ে মাপা ঝাঁকুনি — আদ্রা, রঘুনাথপুর, আনারা', en: 'Shake measured by phone on a bike — Adra, Raghunathpur, Anara' },
    whole: { bn: 'পুরো রুট', en: 'Whole route' },
    spots: { bn: 'বারবার ধাক্কার জায়গা', en: 'Repeat-hit spots' },
    rough: { bn: 'সবচেয়ে ঝাঁকুনির অংশ', en: 'Roughest bits' },
    h_find: { bn: 'কোন রাস্তায় কত ঝাঁকুনি', en: 'How much each road shakes' },
    barnote: { bn: 'বার যত লম্বা, খারাপ অংশ তত বেশি। এটা ফোনের মাপ, সরকারি জরিপ নয়।', en: 'Longer bar = more rough stretches. A phone measurement, not an official survey.' },
    h_spots: { bn: 'যেখানে বারবার ধাক্কা লেগেছে', en: 'Where we hit hard again and again' },
    spotnote: { bn: 'একাধিক যাত্রায় একই জায়গায় জোরে ধাক্কা। ট্যাপ করলে ম্যাপে দেখাবে।', en: 'The same place gave a hard jolt on more than one ride. Tap to see it on the map.' },
    h_care: { bn: 'একটু সাবধানে পড়ুন', en: 'Read with care' },
    smooth: { bn: 'মসৃণ', en: 'Smooth' }, mid: { bn: 'ঝাঁকুনি', en: 'Bumpy' }, bad: { bn: 'খুব খারাপ', en: 'Very rough' },
    all: { bn: 'সব রাস্তা', en: 'All roads' },
    r0: { bn: 'হাইওয়ে (পশ্চিম)', en: 'Highway west' },
    r1: { bn: 'উত্তরের সংযোগ রাস্তা', en: 'North link road' },
    r2: { bn: 'পূর্বের বাইরের রাস্তা', en: 'East outer road' },
    r3: { bn: 'ভেতরের গলি', en: 'Inner lanes' },
    r4: { bn: 'রঘুনাথপুরের দিকে', en: 'Towards Raghunathpur' }
  };
  var CARE = [
    { bn: 'এটা ফোনের সেন্সরের মাপ। পাকা সরকারি জরিপের বিকল্প নয়।', en: 'This is a phone-sensor reading. It is not a replacement for an official survey.' },
    { bn: 'ঝাঁকুনি কেন হচ্ছে (গর্ত, স্পিড ব্রেকার, রেল ক্রসিং) তা ফোন বলতে পারে না। জায়গাটা নিজের চোখে দেখুন।', en: 'The phone cannot say why a spot shakes (pothole, speed breaker, crossing). Go and look at the place yourself.' },
    { bn: 'পূর্বের বাইরের রাস্তায় মাত্র একটি যাত্রা, ভেতরের গলিতেও বেশির ভাগ জায়গায় একবার-দুবার। তাই এগুলো প্রাথমিক ছবি।', en: 'The east outer road has one ride only, and most inner lanes one or two. Treat those as a first picture.' },
    { bn: 'বেশির ভাগ যাত্রায় ফোন ছিল পকেট বা ব্যাগে। হ্যান্ডেলে থাকলে মাপ প্রায় 9% আলাদা আসে।', en: 'Most rides had the phone in a pocket or bag. On the handlebar the reading differs by about 9%.' },
    { bn: 'গতি আর বাইকের ধরন মাপে কিছুটা প্রভাব ফেলে। তাই সংখ্যার চেয়ে রঙ আর তুলনাই ভরসা।', en: 'Speed and the bike affect the reading a little, so trust the colours and comparisons more than any single number.' }
  ];
  var lang = 'bn';
  try { lang = new URLSearchParams(location.search).get('lang') || localStorage.getItem('rc-lang') || 'bn'; } catch (e) {}
  if (lang !== 'en') lang = 'bn';
  function t(k) { return T[k][lang]; }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  // ---------- map ----------
  var map = L.map('map', { zoomControl: true, preferCanvas: true, attributionControl: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
  var canvas = L.canvas({ padding: 0.4 });
  var segLayer = L.layerGroup().addTo(map);
  var spotLayer = L.layerGroup().addTo(map);
  var roughLayer = L.layerGroup();
  var filter = -1;           // -1 = all
  var ADRA = L.latLngBounds([23.488, 86.658], [23.543, 86.704]);

  function colour(v) { return v < 1.2 ? COL.smooth : v < 2 ? COL.mid : COL.rough; }
  function rideName(i) {
    var r = D.rides[i], p = r.id.split(' ');
    return p[0] + ' Nov ' + p[1] + (r.mount === 'bar' ? (lang === 'bn' ? ' (হ্যান্ডেলে ফোন)' : ' (handlebar)') : (lang === 'bn' ? ' (পকেট/ব্যাগে ফোন)' : ' (pocket/bag)'));
  }
  function bounds(list) { var b = L.latLngBounds([]); list.forEach(function (s) { b.extend([s[0], s[1]]); b.extend([s[2], s[3]]); }); return b; }
  var ALL = bounds(D.seg);

  function drawSegs() {
    segLayer.clearLayers();
    var rows = D.seg.filter(function (s) { return filter < 0 || s[5] === filter; });
    rows.forEach(function (s) { segLayer.addLayer(L.polyline([[s[0], s[1]], [s[2], s[3]]], { renderer: canvas, color: '#fffdf6', weight: 7.5, opacity: 0.95, lineCap: 'round', interactive: false })); });
    rows.slice().sort(function (a, b) { return a[4] - b[4]; }).forEach(function (s) {
      var ln = L.polyline([[s[0], s[1]], [s[2], s[3]]], { renderer: canvas, color: colour(s[4]), weight: 4.5, opacity: 1, lineCap: 'round' });
      ln.on('click', function (e) {
        var box = el('div'); var b = el('b', null, (lang === 'bn' ? 'ঝাঁকুনি ' : 'Shake ') + s[4].toFixed(1)); box.appendChild(b);
        box.appendChild(el('div', null, T['r' + s[5]][lang] + ' · ' + s[6] + ' km/h'));
        box.appendChild(el('div', null, rideName(s[7])));
        L.popup().setLatLng(e.latlng).setContent(box).openOn(map);
      });
      segLayer.addLayer(ln);
    });
  }
  function pin(n, dark) { return L.divIcon({ className: '', html: '<div class="num' + (dark ? ' dk' : '') + '">' + n + '</div>', iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] }); }
  function drawSpots() {
    spotLayer.clearLayers(); roughLayer.clearLayers();
    D.spots.forEach(function (s) {
      if (filter >= 0 && s.road !== filter) return;
      var m = L.marker([s.la, s.lo], { icon: pin(s.n, false), title: '#' + s.n, keyboard: true });
      m.bindPopup(spotPopup(s)); s.marker = m; spotLayer.addLayer(m);
    });
    D.rough.forEach(function (r, i) {
      if (filter >= 0 && r.road !== filter) return;
      var m = L.marker([r.la, r.lo], { icon: pin('~', true), keyboard: true });
      var box = el('div'); box.appendChild(el('b', null, (lang === 'bn' ? 'এখানে 100 মিটার খুব ঝাঁকুনি' : 'Very rough 100 m here')));
      box.appendChild(el('div', null, T['r' + r.road][lang] + ' · ' + (lang === 'bn' ? 'মাপ ' : 'reading ') + r.rms.toFixed(1)));
      box.appendChild(el('div', null, (lang === 'bn' ? 'গিয়েছি একবারই: ' : 'Ridden once: ') + rideName(r.ride)));
      m.bindPopup(box); roughLayer.addLayer(m);
    });
  }
  function spotPopup(s) {
    var box = el('div');
    box.appendChild(el('b', null, '#' + s.n + ' · ' + T['r' + s.road][lang]));
    box.appendChild(el('div', null, lang === 'bn' ? (s.passed + 'টি যাত্রার মধ্যে ' + s.hit + 'টিতে জোরে ধাক্কা') : ('Hard jolt on ' + s.hit + ' of ' + s.passed + ' rides')));
    box.appendChild(el('div', null, (lang === 'bn' ? 'সবচেয়ে জোরে: ' : 'Strongest: ') + s.peak));
    return box;
  }

  // ---------- chips ----------
  function drawChips() {
    var c = document.getElementById('chips'); c.textContent = '';
    [-1, 0, 1, 3, 2, 4].forEach(function (id) {
      var b = el('button', 'chip', id < 0 ? t('all') : t('r' + id));
      b.type = 'button'; b.setAttribute('aria-pressed', String(filter === id));
      b.addEventListener('click', function () { filter = id; drawChips(); drawSegs(); drawSpots(); fit(); });
      c.appendChild(b);
    });
  }
  function fit() {
    var rows = D.seg.filter(function (s) { return filter < 0 || s[5] === filter; });
    map.fitBounds(filter < 0 ? ADRA : bounds(rows), { padding: [24, 24] });
  }

  // ---------- panels ----------
  function drawLegend() {
    var g = document.getElementById('legend'); g.textContent = '';
    [['smooth', COL.smooth], ['mid', COL.mid], ['bad', COL.rough]].forEach(function (p) {
      var d = el('div'); var i = el('i'); i.style.background = p[1]; d.appendChild(i); d.appendChild(el('span', null, t(p[0]))); g.appendChild(d);
    });
  }
  function drawBars() {
    var host = document.getElementById('bars'); host.textContent = '';
    [0, 4, 1, 3, 2].forEach(function (id) {
      var s = D.stats[id];
      var row = el('div', 'bar');
      var nm = el('div', 'nm', t('r' + id));
      nm.appendChild(el('small', null, s.km + ' km · ' + (lang === 'bn' ? s.rides + 'টি যাত্রা' : s.rides + ' ride' + (s.rides > 1 ? 's' : ''))));
      var tr = el('div', 'track'), f = el('div', 'fill'); f.style.width = Math.max(s.rough, 1) + '%';
      f.style.background = s.rough >= 30 ? COL.rough : s.rough >= 5 ? COL.mid : COL.smooth; tr.appendChild(f);
      var v = el('div', 'val'); var b = el('b', null, s.rough + '%');
      v.appendChild(b);
      v.appendChild(document.createTextNode((lang === 'bn' ? ' অংশ খুব খারাপ · প্রতি কিমিতে ' + s.per_km + 'টি বড় ধাক্কা' : ' of stretches very rough · ' + s.per_km + ' hard jolts per km')));
      row.appendChild(nm); row.appendChild(tr); row.appendChild(v); host.appendChild(row);
    });
  }
  function drawList() {
    var ol = document.getElementById('spotlist'); ol.textContent = '';
    D.spots.forEach(function (s) {
      var li = el('li'), b = el('button'); b.type = 'button';
      var n = el('span', 'num', s.n); var tx = el('span');
      tx.appendChild(document.createTextNode(T['r' + s.road][lang]));
      tx.appendChild(el('small', null, lang === 'bn' ? (s.passed + 'টি যাত্রার মধ্যে ' + s.hit + 'টিতে') : (s.hit + ' of ' + s.passed + ' rides')));
      b.appendChild(n); b.appendChild(tx);
      b.addEventListener('click', function () {
        document.getElementById('tSpots').checked = true; map.addLayer(spotLayer);
        document.getElementById('map').scrollIntoView({ block: 'center', behavior: 'smooth' });
        map.setView([s.la, s.lo], 17);
        if (s.marker) s.marker.openPopup(); else { filter = -1; drawChips(); drawSegs(); drawSpots(); map.setView([s.la, s.lo], 17); if (s.marker) s.marker.openPopup(); }
      });
      li.appendChild(b); ol.appendChild(li);
    });
  }
  function drawCare() {
    var ul = document.getElementById('care'); ul.textContent = '';
    CARE.forEach(function (c) { ul.appendChild(el('li', null, c[lang])); });
  }
  function drawText() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-t]').forEach(function (n) { n.textContent = t(n.getAttribute('data-t')); });
    document.getElementById('lang').textContent = lang === 'bn' ? 'English' : 'বাংলা';
    var km = D.rides.reduce(function (a, r) { return a + r.km; }, 0).toFixed(1);
    document.getElementById('built').textContent = lang === 'bn' ? (D.rides.length + 'টি যাত্রা, ' + km + ' কিমি · ' + D.built) : (D.rides.length + ' rides, ' + km + ' km · ' + D.built);
    document.getElementById('credit').textContent = lang === 'bn' ? 'তৈরি: সোমদীপ কুণ্ডু, RuDRA Lab, C-TARA। ভুল বা পরামর্শ থাকলে GitHub-এ জানান।' : 'Made by Somdeep Kundu, RuDRA Lab, C-TARA. Spotted a mistake? Tell us on GitHub.';
    drawLegend(); drawChips(); drawBars(); drawList(); drawCare(); drawSegs(); drawSpots();
  }

  document.getElementById('lang').addEventListener('click', function () {
    lang = lang === 'bn' ? 'en' : 'bn';
    try { localStorage.setItem('rc-lang', lang); } catch (e) {}
    map.closePopup(); drawText();
  });
  document.getElementById('whole').addEventListener('click', function () { filter = -1; drawChips(); drawSegs(); drawSpots(); map.fitBounds(ALL, { padding: [20, 20] }); });
  document.getElementById('tSpots').addEventListener('change', function (e) { e.target.checked ? map.addLayer(spotLayer) : map.removeLayer(spotLayer); });
  document.getElementById('tRough').addEventListener('change', function (e) { e.target.checked ? map.addLayer(roughLayer) : map.removeLayer(roughLayer); });

  map.fitBounds(ADRA);
  drawText();
  window.__rc = { map: map, APP: APP };

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(function () {});
})();
