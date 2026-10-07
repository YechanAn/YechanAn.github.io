/* 이 파일은 홈페이지의 틀입니다. 내용은 content.js 에서 고칩니다. */
(function () {
  'use strict';

  function parse(raw) {
    var site = { info: {}, series: [], cv: [] };
    var mode = 'info', cur = null, sec = null, inNote = false, blank = false;
    var KEYS = ['제목', '연도', '폴더', '노트', '사진'];
    String(raw || '').split(/\r?\n/).forEach(function (line) {
      var t = line.trim();
      if (!t) { blank = true; return; }
      if (t.indexOf('//') === 0) return;
      if (/^\[\s*기본\s*정보\s*\]$/.test(t)) { mode = 'info'; return; }
      if (/^\[\s*시리즈\s*\]$/.test(t)) { inNote = false; mode = 'series'; cur = { notes: [], photos: [] }; site.series.push(cur); return; }
      if (/^\[\s*CV\s*\]$/i.test(t)) { inNote = false; mode = 'cv'; return; }
      if (mode === 'cv') {
        if (t.charAt(0) === '#') {
          var parts = t.replace(/^#+\s*/, '').split(/\s+\/\s+/);
          sec = { title: parts[0], sub: parts.slice(1).join(' / '), rows: [] };
          site.cv.push(sec); return;
        }
        if (!sec) { sec = { title: '', sub: '', rows: [] }; site.cv.push(sec); }
        var b = t.indexOf('|');
        sec.rows.push(b < 0 ? { year: '', text: t } : { year: t.slice(0, b).trim(), text: t.slice(b + 1).trim() });
        return;
      }
      var m = t.match(/^([^:：]+)[:：]\s*(.*)$/);
      var key = m ? m[1].replace(/\s+/g, '') : '', val = m ? m[2].trim() : '';
      if (mode === 'info') { if (m) site.info[key] = val; return; }
      if (!cur) return;
      if (KEYS.indexOf(key) < 0) {
        /* 항목 이름이 없는 줄은 바로 위 노트에 이어 붙입니다. 빈 줄 뒤에서는 새 문단이 됩니다. */
        if (inNote) {
          if (blank || !cur.notes.length) cur.notes.push(t);
          else cur.notes[cur.notes.length - 1] += '\n' + t;
          blank = false;
        }
        return;
      }
      inNote = key === '노트'; blank = false;
      if (key === '노트') { if (val) cur.notes.push(val); }
      else if (key === '사진') {
        var f = val.split('|').map(function (s) { return s.trim(); });
        var r = f[0].match(/^(.*?)(\d+)(\.\w+)\s*~\s*.*?(\d+)(?:\.\w+)?$/);
        if (r) {
          /* "01.jpg ~ 20.jpg" 처럼 적으면 번호 순서대로 한꺼번에 등록합니다. */
          for (var k = parseInt(r[2], 10); k <= parseInt(r[4], 10); k++) {
            var num = String(k); while (num.length < r[2].length) num = '0' + num;
            cur.photos.push({ file: r[1] + num + r[3], title: f[1] || '', year: f[2] || '', medium: f[3] || '', size: f[4] || '' });
          }
        }
        else if (f[0]) cur.photos.push({ file: f[0], title: f[1] || '', year: f[2] || '', medium: f[3] || '', size: f[4] || '' });
      }
      else if (key === '제목') cur.title = val;
      else if (key === '연도') cur.year = val;
      else if (key === '폴더') cur.folder = val.replace(/^\/+|\/+$/g, '');
    });
    site.series = site.series.filter(function (s) { return s.folder; });
    return site;
  }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function src(folder, file) { return 'images/' + encodeURI(folder) + '/' + encodeURI(file); }
  function seriesUrl(s) { return 'series.html?s=' + encodeURIComponent(s.folder); }

  var contentMissing = typeof window.SITE_CONTENT !== 'string';
  var site = parse(window.SITE_CONTENT);
  var info = site.info;
  var page = document.body.getAttribute('data-page');
  var name = info['이름'] || '';
  var currentFolder = null;
  try { currentFolder = new URLSearchParams(location.search).get('s'); } catch (e) {}
  if (page === 'series' && !currentFolder && site.series[0]) currentFolder = site.series[0].folder;

  /* 왼쪽 메뉴 */
  function buildSide() {
    var side = document.getElementById('side');
    var narrow = window.matchMedia && window.matchMedia('(max-width: 700px)').matches;
    var btn = el('button', { type: 'button', class: 'menu-btn', 'aria-label': '메뉴 열기 또는 닫기', 'aria-expanded': String(!narrow), 'aria-controls': 'menu' });
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" aria-hidden="true"><path d="M2 6h20M2 12h20M2 18h20"/></svg>';

    var sub = el('ul', { class: 'submenu', id: 'works-list' }, site.series.map(function (s) {
      var isCur = page === 'series' && s.folder === currentFolder;
      return el('li', {}, [el('a', { href: seriesUrl(s), text: s.title || s.folder, class: isCur ? 'current' : '', 'aria-current': isCur ? 'page' : false })]);
    }));
    sub.hidden = page !== 'series';
    var worksBtn = el('button', { type: 'button', text: 'Works', class: page !== 'cv' ? 'current' : '', 'aria-expanded': String(!sub.hidden), 'aria-controls': 'works-list' });
    worksBtn.addEventListener('click', function () {
      sub.hidden = !sub.hidden;
      worksBtn.setAttribute('aria-expanded', String(!sub.hidden));
    });

    var menu = el('ul', { class: 'menu' }, [
      el('li', {}, [worksBtn, sub]),
      el('li', {}, [el('a', { href: 'cv.html', text: 'CV', class: page === 'cv' ? 'current' : '', 'aria-current': page === 'cv' ? 'page' : false })])
    ]);
    var nav = el('nav', { id: 'menu', 'aria-label': '주 메뉴' }, [menu]);
    nav.hidden = narrow;
    btn.addEventListener('click', function () {
      nav.hidden = !nav.hidden;
      btn.setAttribute('aria-expanded', String(!nav.hidden));
    });
    side.appendChild(btn);
    side.appendChild(nav);
  }

  function buildFooter() {
    var f = document.getElementById('footer');
    f.appendChild(el('a', { href: 'index.html', text: '© ' + new Date().getFullYear() + ' ' + name }));
    if (info['이메일']) f.appendChild(el('a', { href: 'mailto:' + info['이메일'], text: info['이메일'] }));
  }

  function notice(text) { return el('p', { class: 'notice', text: text }); }

  /* 메인 화면: 대표 이미지 한 장 */
  function buildHome(main) {
    document.title = name + (info['영문이름'] ? ' ' + info['영문이름'] : '');
    var path = info['메인이미지'] || '';
    var s = null, file = '';
    if (path.indexOf('/') > 0) {
      var folder = path.slice(0, path.lastIndexOf('/'));
      file = path.slice(path.lastIndexOf('/') + 1);
      s = site.series.filter(function (x) { return x.folder === folder; })[0] || null;
      if (!s) s = { folder: folder, title: '', year: '', external: true };
    } else if (site.series[0] && site.series[0].photos[0]) {
      s = site.series[0]; file = s.photos[0].file;
    }
    if (!s || !file) { main.appendChild(notice('content.js 파일의 "메인이미지" 줄에 대표 이미지를 적어 주세요. 예) 메인이미지: series-1/01.jpg')); return; }
    var img = el('img', { src: src(s.folder, file), alt: (s.title || name) + ' 대표 이미지' });
    var cap = el('div', { class: 'cap-row small' }, [el('span', { text: s.title || '' }), el('span', { text: s.year || '' })]);
    var fig = el('figure', { class: 'home-figure' }, [img, cap]);
    main.appendChild(s.external ? fig : el('a', { href: seriesUrl(s), 'aria-label': (s.title || '시리즈') + ' 보기' }, [fig]));
    if (!s.external) { main.firstChild.style.display = 'inline-block'; main.firstChild.style.maxWidth = '100%'; }
  }

  /* 시리즈 상세: 사진을 한 장씩 넘겨 봅니다 */
  function buildSeries(main) {
    var idx = -1;
    site.series.forEach(function (x, i) { if (x.folder === currentFolder) idx = i; });
    if (idx < 0) { main.appendChild(notice('시리즈를 찾을 수 없습니다. content.js 파일의 [시리즈] 묶음과 "폴더" 이름을 확인해 주세요.')); return; }
    var s = site.series[idx];
    var n = s.photos.length, i = 0;
    document.title = (s.title || '') + ' | ' + name;
    var wrap = el('div', { class: 'series' });

    var counter = el('span', { class: 'small counter', 'aria-live': 'polite' });
    var prevB = el('button', { type: 'button', class: 'step', text: '이전' });
    var nextB = el('button', { type: 'button', class: 'step', text: '다음' });
    wrap.appendChild(el('div', { class: 'series-head' }, [
      el('h1', {}, [document.createTextNode((s.title || '') + ' '), s.year ? el('span', { class: 'series-year soft', text: s.year }) : null]),
      n > 1 ? el('div', { class: 'series-ctrl' }, [prevB, counter, nextB]) : null
    ]));

    if (n) {
      var img = el('img', { alt: '' });
      var cap = el('figcaption', { class: 'small' });
      wrap.appendChild(el('figure', { class: 'slide' }, [img, cap]));
      var show = function (k) {
        i = Math.max(0, Math.min(n - 1, k));
        var p = s.photos[i];
        img.src = src(s.folder, p.file);
        img.alt = p.title || ((s.title || '') + ' ' + (i + 1));
        cap.textContent = '';
        var l1 = [p.title, p.year].filter(Boolean).join(', ');
        var l2 = [p.medium, p.size].filter(Boolean).join(', ');
        if (l1) cap.appendChild(el('div', { text: l1 }));
        if (l2) cap.appendChild(el('div', { class: 'soft', text: l2 }));
        counter.textContent = (i + 1) + ' / ' + n;
        prevB.disabled = i === 0;
        nextB.disabled = i === n - 1;
        if (i + 1 < n) { new Image().src = src(s.folder, s.photos[i + 1].file); }
      };
      prevB.addEventListener('click', function () { show(i - 1); });
      nextB.addEventListener('click', function () { show(i + 1); });
      /* 사진의 왼쪽 절반을 누르면 이전, 오른쪽 절반을 누르면 다음 */
      img.addEventListener('click', function (e) {
        var r = img.getBoundingClientRect();
        show(e.clientX - r.left < r.width / 2 ? i - 1 : i + 1);
      });
      img.addEventListener('mousemove', function (e) {
        var r = img.getBoundingClientRect();
        img.style.cursor = n < 2 ? 'default' : (e.clientX - r.left < r.width / 2 ? 'w-resize' : 'e-resize');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') show(i - 1);
        else if (e.key === 'ArrowRight') show(i + 1);
      });
      /* 휴대폰에서는 좌우로 밀어서 넘깁니다 */
      var x0 = null;
      img.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      img.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) { e.preventDefault(); show(dx < 0 ? i + 1 : i - 1); }
      });
      show(0);
    }

    if (s.notes.length) wrap.appendChild(el('div', { class: 'series-note' }, s.notes.map(function (t) { return el('p', { text: t }); })));
    if (site.series.length > 1) {
      var m = site.series.length;
      var prev = site.series[(idx - 1 + m) % m], next = site.series[(idx + 1) % m];
      wrap.appendChild(el('nav', { class: 'series-nav', 'aria-label': '시리즈 이동' }, [
        el('a', { href: seriesUrl(prev), text: '이전 시리즈: ' + (prev.title || prev.folder) }),
        el('a', { href: seriesUrl(next), text: '다음 시리즈: ' + (next.title || next.folder) })
      ]));
    }
    main.appendChild(wrap);
  }

  /* CV */
  function buildCV(main) {
    document.title = 'CV | ' + name;
    var contact = [];
    if (info['이메일']) contact.push(el('a', { href: 'mailto:' + info['이메일'], text: info['이메일'] }));
    var ig = info['인스타그램'];
    if (ig) {
      var isUrl = /^https?:\/\//i.test(ig);
      var id = isUrl ? ig.replace(/\/+$/, '').split('/').pop() : ig.replace(/^@/, '');
      contact.push(el('a', { href: isUrl ? ig : 'https://www.instagram.com/' + encodeURIComponent(id) + '/', text: 'Instagram @' + id, target: '_blank', rel: 'noopener' }));
    }
    var about = el('div', { class: 'cv-about' }, [
      el('div', {}, [
        el('h1', {}, [document.createTextNode(name + (info['영문이름'] ? ' ' : '')), info['영문이름'] ? el('span', { class: 'soft', text: info['영문이름'] }) : null]),
        info['소개'] ? el('p', { class: 'small', text: info['소개'], style: 'margin-top: 12px' }) : null
      ]),
      contact.length ? el('div', { class: 'cv-contact' }, [el('h2', { style: 'margin: 0' }, [document.createTextNode('연락처 '), el('span', { text: 'Contact' })])].concat(contact)) : null
    ]);
    var list = el('div', { class: 'cv-list' }, site.cv.map(function (sec) {
      var rows = el('div', { class: 'rows' });
      sec.rows.forEach(function (r) {
        if (r.year) { rows.appendChild(el('span', { class: 'year', text: r.year })); rows.appendChild(el('span', { text: r.text })); }
        else rows.appendChild(el('span', { class: 'wide', text: r.text }));
      });
      return el('section', {}, [
        el('h2', {}, [document.createTextNode(sec.title + (sec.sub ? ' ' : '')), sec.sub ? el('span', { text: sec.sub }) : null]),
        rows
      ]);
    }));
    main.appendChild(el('div', { class: 'cv' }, [about, list]));
  }

  buildSide();
  buildFooter();
  var main = document.getElementById('content');
  if (contentMissing) main.appendChild(notice('content.js 파일을 읽지 못했습니다. 파일 이름이 content.js 인지, 맨 첫 줄과 맨 마지막 줄(`;)이 그대로 있는지 확인해 주세요.'));
  else if (page === 'series') buildSeries(main);
  else if (page === 'cv') buildCV(main);
  else buildHome(main);
})();
