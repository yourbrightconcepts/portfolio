/* Alex Walker — portfolio interactions
   Motion layer: Lenis (smooth scroll) + GSAP ScrollTrigger (scroll-linked effects).
   If either library fails to load, the page falls back to simpler built-in effects. */
(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reduceMQ.matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var clamp = function (v, min, max) { return Math.min(max, Math.max(min, v)); };

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Smooth scrolling ---------------- */
  var lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var lenisRaf = function (t) { lenis.raf(t); requestAnimationFrame(lenisRaf); };
      requestAnimationFrame(lenisRaf);
    }
  }

  // Pinned sections are wrapped in a spacer; scroll to the spacer so the offset is right
  function scrollToTarget(target) {
    if (target !== 0 && target.parentElement && target.parentElement.classList.contains('pin-spacer')) {
      target = target.parentElement;
    }
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.6 });
    } else if (target === 0) {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    } else {
      target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  /* ---------------- Theme ---------------- */
  var themeBtn = document.querySelector('[data-theme-toggle]');
  var themeLabel = document.querySelector('[data-theme-label]');
  var metaTheme = document.querySelector('meta[name="theme-color"]');

  function syncTheme() {
    var dark = root.getAttribute('data-theme') === 'dark';
    // Accessible name reads "Switch to Night mode" / "Switch to Day mode",
    // which contains the visible label (WCAG 2.5.3 Label in Name)
    themeLabel.textContent = dark ? 'Day' : 'Night';
    metaTheme.setAttribute('content', dark ? '#121211' : '#ECE9E5');
  }
  themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('aw-theme', next); } catch (e) {}
    syncTheme();
  });
  syncTheme();

  /* ---------------- Menu ---------------- */
  var menu = document.getElementById('site-menu');
  var menuBtn = document.querySelector('[data-menu-toggle]');
  // While the overlay is open, the page behind it can't be reached by keyboard or screen reader
  var behindMenu = document.querySelectorAll('.skip-link, main, .site-footer');

  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!open));
    behindMenu.forEach(function (el) {
      if (open) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
    if (open) {
      if (lenis) lenis.stop();
      menu.removeAttribute('inert');
      setTimeout(function () {
        var first = menu.querySelector('[data-menu-link]');
        if (first) first.focus({ preventScroll: true });
      }, 300);
    } else {
      if (lenis) lenis.start();
      menu.setAttribute('inert', '');
    }
  }
  menuBtn.addEventListener('click', function () {
    setMenu(!menu.classList.contains('is-open'));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) {
      setMenu(false);
      menuBtn.focus();
    }
  });

  // In-page links scroll smoothly (and close the menu first)
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a || a.classList.contains('skip-link')) return;
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    var target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    if (menu.classList.contains('is-open')) setMenu(false);
    scrollToTarget(target);
    // Move keyboard focus with the scroll so the next Tab continues from the target
    if (!target.matches('a[href], button, input, select, textarea, [tabindex]')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });
  });

  // Links that open a new tab say so to screen readers
  document.querySelectorAll('a[target="_blank"]').forEach(function (a) {
    var hint = document.createElement('span');
    hint.className = 'visually-hidden';
    hint.textContent = ' (opens in a new tab)';
    a.appendChild(hint);
  });

  /* ---------------- Text splitting ---------------- */
  var hero = document.querySelector('.hero');
  var title = document.querySelector('.hero__title');
  var titleInner = document.querySelector('[data-split]');

  // Headline → characters, grouped into words so a multi-line title never breaks inside a
  // word (punctuation stays with the word before it). Text inside <em> is the highlighted
  // part (the name) and is kept on one line.
  (function () {
    var src = titleInner.cloneNode(true);
    titleInner.textContent = '';
    titleInner.setAttribute('aria-hidden', 'true');
    var i = 0, word = null;
    function addText(text, hl) {
      if (hl) text = text.replace(/\s+/g, ' ');
      // Break only on ordinary whitespace (\s would also match the non-breaking spaces above)
      text.split(/([ \t\r\n\f]+)/).forEach(function (tok) {
        if (!tok) return;
        if (/^[ \t\r\n\f]+$/.test(tok)) { titleInner.appendChild(document.createTextNode(' ')); word = null; return; }
        if (!word) { word = document.createElement('span'); word.className = 'word'; titleInner.appendChild(word); }
        Array.from(tok).forEach(function (ch) { // Array.from keeps emoji in one piece
          var wrap = document.createElement('span');
          wrap.className = 'char-wrap';
          var c = document.createElement('span');
          c.className = hl ? 'char is-hl' : 'char';
          c.style.setProperty('--i', i++);
          c.textContent = ch;
          wrap.appendChild(c);
          word.appendChild(wrap);
        });
      });
    }
    Array.prototype.forEach.call(src.childNodes, function (n) { addText(n.textContent, n.nodeType !== 3); });
  })();

  // Section headings → masked lines
  document.querySelectorAll('.display, .contact__title').forEach(function (el) {
    var parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map(function (p, i) {
      return '<span class="line-mask"><span class="line" style="--li:' + i + '">' + p.trim() + '</span></span>';
    }).join(' '); // keep a space between lines so the heading reads "case studies", not "casestudies"
    el.classList.add('split-lines');
  });

  // Statement → words (only used by the scroll-scrubbed fill)
  function appendWords(parent, text) {
    text.split(/(\s+)/).forEach(function (tok) {
      if (!tok) return;
      if (/^\s+$/.test(tok)) { parent.appendChild(document.createTextNode(' ')); return; }
      var s = document.createElement('span');
      s.className = 'word';
      s.textContent = tok;
      parent.appendChild(s);
    });
  }
  function splitWords(el) {
    if (el.dataset.split) return;
    el.dataset.split = '1';
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.textContent = '';
    nodes.forEach(function (n) {
      if (n.nodeType === 3) appendWords(el, n.textContent);
      else if (n.nodeType === 1) {
        var clone = n.cloneNode(false);
        appendWords(clone, n.textContent);
        el.appendChild(clone);
      }
    });
  }

  /* ---------------- Hero headline fit + entrance ---------------- */
  function fitTitle() {
    if (title.classList.contains('hero__title--intro')) return; // the sentence heading wraps at a set size
    var container = title.parentElement;
    var cs = getComputedStyle(container);
    var available = container.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var current = parseFloat(getComputedStyle(title).fontSize);
    var width = titleInner.getBoundingClientRect().width;
    if (!width) return;
    title.style.fontSize = (current * available / width * 0.995).toFixed(2) + 'px';
  }

  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  var started = false;
  function startHero() {
    if (started) return;
    started = true;
    fitTitle();
    if (hasGsap) ScrollTrigger.refresh();
    requestAnimationFrame(function () { hero.classList.add('is-ready'); });
    hero.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('is-in'); });
  }
  fontsReady.then(startHero);
  setTimeout(startHero, 1200); // never wait forever on fonts

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      fitTitle();
      if (hasGsap) ScrollTrigger.refresh();
      onScroll();
    }, 150);
  });

  /* ---------------- Reveal on enter ---------------- */
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) {
      if (child.hasAttribute('data-reveal') && !child.style.getPropertyValue('--d')) {
        child.style.setProperty('--d', (i * 0.09).toFixed(2) + 's');
      }
    });
  });
  document.querySelectorAll('[data-timeline]').forEach(function (tl) {
    Array.prototype.forEach.call(tl.children, function (item, i) { item.style.setProperty('--i', i); });
  });

  var metrics = Array.prototype.slice.call(document.querySelectorAll('.metric'));

  function runCounter(el, delay) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (reduced) { el.textContent = target; return; }
    var duration = 1700;
    setTimeout(function () {
      var start = performance.now();
      (function tick(now) {
        var t = clamp((now - start) / duration, 0, 1);
        var eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        el.textContent = Math.round(target * eased);
        if (t < 1) requestAnimationFrame(tick);
      })(start);
    }, delay);
  }

  if ('IntersectionObserver' in window) {
    // The HTML holds the real values (so they're right without JS); start from 0 to count up
    if (!reduced) document.querySelectorAll('[data-count]').forEach(function (el) { el.textContent = '0'; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('is-in');
        io.unobserve(el);
        var count = el.querySelector('[data-count]');
        if (count) runCounter(count, 250 + Math.max(0, metrics.indexOf(el)) * 120);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    document.querySelectorAll('[data-reveal], [data-timeline]').forEach(function (el) {
      if (!hero.contains(el)) io.observe(el);
    });
  } else {
    document.querySelectorAll('[data-reveal], [data-timeline]').forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------- Marquee pause control (WCAG 2.2.2) ---------------- */
  var marqueeEl = document.querySelector('.marquee');
  var marqueeBtn = document.querySelector('[data-marquee-toggle]');
  marqueeBtn.addEventListener('click', function () {
    var paused = marqueeEl.classList.toggle('is-paused');
    marqueeBtn.querySelector('.marquee__toggle-text').textContent = paused ? 'Play animation' : 'Pause animation';
  });

  /* ---------------- Scroll-linked effects (GSAP) ---------------- */
  if (hasGsap) {
    var mm = gsap.matchMedia();
    mm.add({
      motion: '(prefers-reduced-motion: no-preference)',
      desktop: '(min-width: 821px)'
    }, function (ctx) {
      var c = ctx.conditions;
      if (!c.motion) return;
      var vh = function () { return window.innerHeight; };

      // 1 — Pinned sections: each stays put while the next section slides over it,
      //     receding (scale, fade, blur) as it gets covered. The fade is eased in
      //     (power3.in) so the part still on screen stays clear until the section is
      //     almost covered; a linear fade left the visible strip (e.g. the hero name)
      //     washed out and blurred when scrolling back up.
      [['.hero', '.hero > .container'], ['.works', '.works > .container'], ['.about', '.about > .container']]
        .forEach(function (pair) {
          var sec = document.querySelector(pair[0]);
          var inner = document.querySelector(pair[1]);
          sec.classList.add('pin-under');
          gsap.fromTo(inner,
            { scale: 1, opacity: 1, filter: 'blur(0px)' },
            {
              scale: 0.9,
              opacity: 0.1,
              filter: c.desktop ? 'blur(10px)' : 'blur(0px)',
              transformOrigin: '50% 100%',
              ease: 'power3.in',
              scrollTrigger: {
                trigger: sec,
                start: 'bottom bottom',
                end: function () { return '+=' + vh(); },
                pin: true,
                pinSpacing: false,
                scrub: true,
                invalidateOnRefresh: true
              }
            });
        });

      // 2 — Hero headline letters drift upward at different speeds
      // (for the sentence heading, whole words drift gently so it stays readable)
      var introTitle = title.classList.contains('hero__title--intro');
      gsap.to(introTitle ? '.hero__title .word' : '.hero__title .char-wrap', {
        yPercent: function (i) { return introTitle ? -(6 + (i % 3) * 4) : -(18 + ((i * 7) % 5) * 14); },
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });

      // 3 — Full-bleed image grows from an inset card to edge-to-edge, with parallax
      gsap.fromTo('.bleed',
        { clipPath: 'inset(0% 8% 0% 8% round 24px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
          scrollTrigger: { trigger: '.bleed', start: 'top bottom', end: 'top 15%', scrub: true } });
      gsap.fromTo('.bleed:not(.bleed--portrait) img',
        { yPercent: -8, scale: 1.18 },
        { yPercent: 8, scale: 1, ease: 'none',
          scrollTrigger: { trigger: '.bleed', start: 'top bottom', end: 'bottom top', scrub: true } });
      // Portrait: zoom out from the top edge only, so the head is never cropped
      gsap.fromTo('.bleed--portrait img',
        { scale: 1.12 },
        { scale: 1, ease: 'none',
          scrollTrigger: { trigger: '.bleed', start: 'top bottom', end: 'top 15%', scrub: true } });

      // 4 — Case studies: the pixel arrow slides in from the left as it scrolls up
      gsap.fromTo('.works__arrow svg', { xPercent: -100 }, {
        xPercent: 0, ease: 'none',
        scrollTrigger: { trigger: '.works__more', start: 'top bottom', end: 'top 55%', scrub: 0.6 }
      });

      // 5 — Statement fills in word by word
      var statement = document.querySelector('[data-words]');
      splitWords(statement);
      statement.classList.add('words-ready');
      gsap.fromTo(statement.querySelectorAll('.word'), { opacity: 0.12 }, {
        opacity: 1, stagger: 0.05, ease: 'none',
        scrollTrigger: { trigger: statement, start: 'top 85%', end: 'bottom 50%', scrub: true }
      });

      // 6 — Expertise images unmask upward as each row enters
      gsap.utils.toArray('.service__media').forEach(function (m) {
        gsap.fromTo(m, { clipPath: 'inset(100% 0% 0% 0%)' }, {
          clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
          scrollTrigger: { trigger: m, start: 'top 98%', end: 'top 55%', scrub: 0.6 }
        });
      });

      // 7 — Timeline rules draw down with the scroll
      var timelines = gsap.utils.toArray('[data-timeline]');
      timelines.forEach(function (tl) {
        tl.classList.add('tl-scrub');
        ScrollTrigger.create({
          trigger: tl, start: 'top 80%', end: 'bottom 55%', scrub: true,
          onUpdate: function (s) { tl.style.setProperty('--tl', s.progress.toFixed(3)); }
        });
      });

      // 8 — Disciplines marquee: speeds up with scroll velocity, follows scroll direction
      var marquee = document.querySelector('.marquee');
      var track = marquee.querySelector('.marquee__track');
      marquee.classList.add('is-driven');
      var x = 0, dir = 1, lastY = window.scrollY;
      function marqueeTick(time, dt) {
        var y = window.scrollY;
        var delta = y - lastY;
        lastY = y;
        if (delta) dir = delta > 0 ? 1 : -1;
        if (marquee.classList.contains('is-paused') || marquee.matches(':hover')) return;
        var half = track.scrollWidth / 2;
        x -= (0.045 * dt + Math.min(Math.abs(delta), 60) * 0.9) * dir;
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        gsap.set(track, { x: x });
      }
      gsap.ticker.add(marqueeTick);

      return function cleanup() {
        gsap.ticker.remove(marqueeTick);
        marquee.classList.remove('is-driven');
        gsap.set(track, { clearProps: 'transform' });
        timelines.forEach(function (tl) { tl.classList.remove('tl-scrub'); });
        document.querySelectorAll('.pin-under').forEach(function (s) { s.classList.remove('pin-under'); });
      };
    });
  }

  /* ---------------- Header, edge blur, approach, fallback parallax ---------------- */
  var header = document.querySelector('.site-header');
  var edgeBlur = document.querySelector('.edge-blur');
  var lastHeaderY = window.scrollY;

  function updateHeader(y) {
    header.classList.toggle('is-scrolled', y > 24);
    if (body.classList.contains('menu-open')) return;
    var delta = y - lastHeaderY;
    if (y > 480 && delta > 4) header.classList.add('is-hidden');
    else if (delta < -4 || y < 480) header.classList.remove('is-hidden');
    lastHeaderY = y;
  }

  var bleedImgs = document.querySelectorAll('[data-parallax]');
  // Approach: one screen of scroll per stage. Crossing a step opens that stage's image from
  // the centre and slides the titles up (CSS transitions do the motion).
  var approach = document.querySelector('.approach');
  var slides = approach.querySelectorAll('.approach__slide');
  var titles = approach.querySelectorAll('.approach__title');
  var counterEl = approach.querySelector('[data-approach-current]');
  var bar = approach.querySelector('[data-approach-bar]');
  var activeStage = null;

  function setStage(stage) {
    if (stage === activeStage) return;
    activeStage = stage;
    slides.forEach(function (s, i) { s.classList.toggle('is-open', i <= Math.max(stage, 0)); });
    titles.forEach(function (t, i) {
      t.classList.toggle('is-current', i === stage);
      t.classList.toggle('is-past', i < stage);
    });
    counterEl.textContent = ('0' + (Math.max(stage, 0) + 1)).slice(-2);
  }

  function onScroll() {
    var y = window.scrollY;
    var vh = window.innerHeight;
    updateHeader(y);
    edgeBlur.classList.toggle('is-off', y + vh > document.documentElement.scrollHeight - 200);

    // Simple parallax when GSAP isn't available
    if (!hasGsap && !reduced) {
      bleedImgs.forEach(function (img) {
        var r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = (vh - r.top) / (vh + r.height);
        img.style.setProperty('--py', ((p - 0.5) * r.height * -0.18).toFixed(1) + 'px');
      });
    }

    // Approach: progress bar follows the scroll; the stage steps once per screen.
    // The first title rises in as the section settles at the top (stage -1 before that).
    var ar = approach.getBoundingClientRect();
    if (ar.bottom > 0 && ar.top < vh) {
      var total = approach.offsetHeight - vh;
      var p = clamp(-ar.top / total, 0, 1);
      bar.style.setProperty('--ap', p.toFixed(4));
      var n = titles.length;
      setStage(ar.top > vh * 0.2 ? -1 : Math.min(n - 1, Math.floor(p * n)));
    }
  }

  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();

  /* ---------------- Hero slideshow (Elementor projects) ---------------- */
  // Autoplays every DELAY ms. It holds while the pointer or keyboard focus is inside it,
  // while it is off screen or the tab is hidden, and never autoplays for reduced motion.
  // The pause button stops it for good; prev/next and swipe move one slide.
  (function () {
    var show = document.querySelector('[data-showcase]');
    if (!show) return;
    var slides = show.querySelectorAll('.showcase__slide');
    var list = show.querySelector('.showcase__slides');
    var counter = show.querySelector('[data-showcase-current]');
    var toggle = show.querySelector('[data-showcase-toggle]');
    var toggleText = show.querySelector('[data-showcase-toggle-text]');
    var timerEl = show.querySelector('.showcase__timer');
    var n = slides.length;
    var DELAY = 5000;
    var index = 0, timer = null, leaveTimer = null;
    var userPaused = reduced, hovered = false, keyFocus = false, onScreen = true, swiped = false;

    show.style.setProperty('--showcase-delay', DELAY + 'ms');
    show.classList.add('is-static'); // first slide shows without the wipe (the card already fades in)

    function setHidden(slide, hidden) {
      slide.setAttribute('aria-hidden', hidden ? 'true' : 'false');
      slide.inert = hidden;
    }
    Array.prototype.forEach.call(slides, function (s, i) { setHidden(s, i !== 0); });

    function preload(i) {
      var img = slides[i].querySelector('img');
      if (img) { var p = new Image(); p.src = img.getAttribute('src'); }
    }

    function playing() { return !userPaused && !hovered && !keyFocus && onScreen && !document.hidden; }

    function schedule() {
      clearTimeout(timer);
      timerEl.classList.remove('is-running');
      if (!playing() || n < 2) return;
      void timerEl.offsetWidth; // restart the timer line
      timerEl.classList.add('is-running');
      timer = setTimeout(function () { go(index + 1, 1); }, DELAY);
    }

    function go(to, dir) {
      to = (to + n) % n;
      if (to === index) return;
      show.classList.remove('is-static');
      var from = slides[index], next = slides[to];
      var hadFocus = from.contains(document.activeElement);
      Array.prototype.forEach.call(slides, function (s) { s.classList.remove('is-leaving'); });
      from.classList.remove('is-current', 'is-back');
      from.classList.add('is-leaving');
      setHidden(from, true);
      next.classList.toggle('is-back', dir < 0);
      next.classList.add('is-current');
      setHidden(next, false);
      if (hadFocus) next.querySelector('a').focus({ preventScroll: true });
      index = to;
      counter.textContent = ('0' + (to + 1)).slice(-2);
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(function () { from.classList.remove('is-leaving'); }, reduced ? 0 : 1000);
      preload((to + 1) % n);
      schedule();
    }

    function syncToggle() {
      show.classList.toggle('is-paused', userPaused);
      toggleText.textContent = userPaused ? 'Play slideshow' : 'Pause slideshow';
      // Announce slide changes only when the visitor is driving it
      list.setAttribute('aria-live', userPaused ? 'polite' : 'off');
      schedule();
    }

    show.querySelector('[data-showcase-prev]').addEventListener('click', function () { go(index - 1, -1); });
    show.querySelector('[data-showcase-next]').addEventListener('click', function () { go(index + 1, 1); });
    toggle.addEventListener('click', function () { userPaused = !userPaused; syncToggle(); });

    // Hold while hovered, or while keyboard focus is inside (a mouse click on a button
    // focuses it too, but that should not stop autoplay once the pointer leaves)
    show.addEventListener('mouseenter', function () { hovered = true; schedule(); });
    show.addEventListener('mouseleave', function () { hovered = false; schedule(); });
    show.addEventListener('focusin', function (e) {
      var kb = true;
      try { kb = e.target.matches(':focus-visible'); } catch (err) { /* older browsers: treat as keyboard */ }
      if (kb !== keyFocus) { keyFocus = kb; schedule(); }
    });
    show.addEventListener('focusout', function (e) {
      if (show.contains(e.relatedTarget)) return;
      keyFocus = false; schedule();
    });

    // Hold while off screen or in a background tab
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { onScreen = entries[0].isIntersecting; schedule(); }, { threshold: 0.25 }).observe(show);
    }
    document.addEventListener('visibilitychange', schedule);

    // Swipe on touch screens; a swipe must not also open the link
    var startX = null, startY = null;
    list.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { startX = e.clientX; startY = e.clientY; } });
    list.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      startX = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { swiped = true; go(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1); }
    });
    list.addEventListener('click', function (e) { if (swiped) { e.preventDefault(); swiped = false; } }, true);

    // Arrow keys move between slides while focus is inside
    show.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(index + 1, 1); }
      else if (e.key === 'ArrowLeft') { go(index - 1, -1); }
    });

    preload(1);
    syncToggle();
  })();

  /* ---------------- Case studies: hover details ---------------- */
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // Image sequences step through their frames while hovered (like a flip-book)
  document.querySelectorAll('[data-seq]').forEach(function (seq) {
    var frames = seq.querySelectorAll('img');
    var link = seq.closest('a');
    var timer = null, i = 0;
    if (frames.length < 2 || !link || reduced || !finePointer) return;
    function show(n) {
      frames.forEach(function (f, k) { f.classList.toggle('is-current', k === n); });
    }
    link.addEventListener('mouseenter', function () {
      seq.classList.add('is-cycling');
      i = 0; show(0);
      timer = setInterval(function () { i = (i + 1) % frames.length; show(i); }, 330);
    });
    link.addEventListener('mouseleave', function () {
      clearInterval(timer);
      seq.classList.remove('is-cycling');
    });
  });

  // Large cards: the preview panel drifts toward the pointer
  if (finePointer && !reduced) {
    document.querySelectorAll('[data-peek]').forEach(function (media) {
      var peek = media.querySelector('.case__peek');
      media.addEventListener('mousemove', function (e) {
        var r = media.getBoundingClientRect();
        var dx = (e.clientX - r.left) / r.width - 0.5;
        var dy = (e.clientY - r.top) / r.height - 0.5;
        peek.style.setProperty('--px', (dx * r.width * 0.18).toFixed(1) + 'px');
        peek.style.setProperty('--py', (dy * r.height * 0.18).toFixed(1) + 'px');
      });
      media.addEventListener('mouseleave', function () {
        peek.style.setProperty('--px', '0px');
        peek.style.setProperty('--py', '0px');
      });
    });
  }

  // "View work" bubble trailing the pointer (mouse users only; decorative)
  var bubble = document.querySelector('.cursor-bubble');
  if (finePointer && !reduced && bubble) {
    var bubbleText = bubble.querySelector('[data-cursor-text]');
    var bx = 0, by = 0, tx = 0, ty = 0, bs = 0, ts = 0, running = false;
    function bubbleLoop() {
      bx += (tx - bx) * 0.2;
      by += (ty - by) * 0.2;
      bs += (ts - bs) * 0.18;
      bubble.style.transform = 'translate3d(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px,0) scale(' + bs.toFixed(3) + ')';
      if (ts === 0 && bs < 0.01) { running = false; bubble.style.transform = 'scale(0)'; return; }
      requestAnimationFrame(bubbleLoop);
    }
    function wake() { if (!running) { running = true; requestAnimationFrame(bubbleLoop); } }
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (!running && ts === 0) { bx = tx; by = ty; }
    }, { passive: true });
    document.querySelectorAll('[data-cursor]').forEach(function (el) {
      el.addEventListener('mouseenter', function (e) {
        bubbleText.textContent = el.getAttribute('data-cursor');
        if (bs < 0.01) { bx = e.clientX; by = e.clientY; }
        ts = 1; wake();
      });
      el.addEventListener('mouseleave', function () { ts = 0; wake(); });
    });
  }

  // Scrambled-letter reveal for the section number and the tags.
  // Screen readers get the real text; only an aria-hidden copy is scrambled.
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#_';
  function prepScramble(el) {
    var text = el.textContent;
    el.textContent = '';
    var real = document.createElement('span');
    real.className = 'visually-hidden';
    real.textContent = text + ' '; // keeps neighbouring tags from running together when read aloud
    var shown = document.createElement('span');
    shown.setAttribute('aria-hidden', 'true');
    shown.textContent = text;
    el.appendChild(real);
    el.appendChild(shown);
    return { el: shown, text: text };
  }
  function runScramble(item, delay) {
    var text = item.text, el = item.el, duration = 650;
    setTimeout(function () {
      var start = performance.now();
      (function frame(now) {
        var p = clamp((now - start) / duration, 0, 1);
        var settled = Math.floor(p * text.length);
        var out = '';
        for (var k = 0; k < text.length; k++) {
          var ch = text.charAt(k);
          out += (k < settled || ch === ' ') ? ch : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
        }
        el.textContent = out;
        if (p < 1) requestAnimationFrame(frame);
        else el.textContent = text;
      })(start);
    }, delay);
  }
  if (!reduced && 'IntersectionObserver' in window) {
    var scrambleIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        scrambleIO.unobserve(entry.target);
        (entry.target._scramble || []).forEach(function (item, n) { runScramble(item, 250 + n * 90); });
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('[data-scramble]').forEach(function (el) {
      el._scramble = [prepScramble(el)];
      scrambleIO.observe(el);
    });
    document.querySelectorAll('[data-scramble-group]').forEach(function (group) {
      group._scramble = Array.prototype.map.call(group.children, prepScramble);
      scrambleIO.observe(group);
    });
  }

  /* ---------------- Back to top ---------------- */
  document.querySelector('[data-to-top]').addEventListener('click', function () {
    scrollToTarget(0);
    document.querySelector('.wordmark').focus({ preventScroll: true });
  });
})();
