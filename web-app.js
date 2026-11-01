/* =====================================================================
   SIZER web edition — app shell
   ---------------------------------------------------------------------
   Adds what a browser needs on top of the shared app code:
     • phone/tablet step navigation
     • touch gestures for the sheet and the attire editor
     • install (PWA) button and instructions
     • service worker registration
     • small web-only conveniences
   ===================================================================== */
(function () {
  'use strict';

  var cfg = window.IDPL_WEB_CONFIG || {};
  var isFile = location.protocol === 'file:';
  var mobileQuery = window.matchMedia('(max-width: 1039px)');
  var coarse = window.matchMedia('(pointer: coarse)');

  if (isFile) document.body.classList.add('web-file-mode');

  /* ==================================================================
     Step navigation
     ================================================================== */
  var stepbar = document.getElementById('webStepbar');
  var setPanel = document.querySelector('.wrap > .set-panel');
  var cols = document.querySelector('.wrap > .cols');
  var panels = [];
  if (cols) {
    Array.prototype.forEach.call(cols.children, function (el) {
      if (el.classList && el.classList.contains('panel')) panels.push(el);
    });
  }

  if (setPanel) setPanel.setAttribute('data-mpanel', '1');
  if (panels[0]) panels[0].setAttribute('data-mpanel', '2');
  if (panels[1]) panels[1].setAttribute('data-mpanel', '3');

  var currentStep = 1;

  function setStep(step, opts) {
    step = Math.max(1, Math.min(3, +step || 1));
    currentStep = step;
    document.body.setAttribute('data-mstep', String(step));

    if (stepbar) {
      var buttons = stepbar.querySelectorAll('[data-go-step]');
      Array.prototype.forEach.call(buttons, function (b) {
        var on = +b.getAttribute('data-go-step') === step;
        b.classList.toggle('active', on);
        if (on) b.setAttribute('aria-current', 'step');
        else b.removeAttribute('aria-current');
      });
    }

    if (opts && opts.scroll) {
      // The sticky header is part of the page; starting at the top is the
      // most predictable place to land when a panel is swapped in.
      window.scrollTo({ top: 0, behavior: opts.instant ? 'auto' : 'smooth' });
    }

    if (opts && opts.hash) {
      try {
        var hash = '#step-' + step;
        // The app declares its own `history` array for undo/redo, which
        // shadows window.history in the shared global scope.
        if (location.hash !== hash) window.history.replaceState(null, '', hash);
      } catch (e) { /* ignore */ }
    }
  }

  function isMobile() {
    return mobileQuery.matches;
  }

  // Short, translated labels keep the bottom bar readable on narrow phones.
  // The full step title stays available to screen readers and as a tooltip.
  var STEP_SHORT = {
    en:  ['Set', 'Photo', 'Sheet'],
    tl:  ['Set', 'Larawan', 'Sheet'],
    id:  ['Set', 'Foto', 'Sheet'],
    ceb: ['Set', 'Litrato', 'Sheet'],
    ko:  ['세트', '사진', '시트']
  };

  // On phones the full trial sentence is hidden by the app's own CSS.
  // Replace it with a one-word badge instead of showing a bare dot.
  var TRIAL_SHORT = {
    en: 'Trial', tl: 'Trial', id: 'Uji coba', ceb: 'Trial', ko: '체험판'
  };

  function currentLang() {
    var lang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
    if (!STEP_SHORT[lang]) {
      try { lang = (localStorage.getItem('idpl_lang') || '').toLowerCase(); } catch (e) { lang = ''; }
    }
    return STEP_SHORT[lang] ? lang : 'en';
  }

  function syncTrialPill() {
    var pill = document.getElementById('trialPill');
    if (!pill) return;

    // The translations carry HTML entities such as &mdash;. The shared app
    // applies them as a text node, so decode them for this visible label.
    var span = pill.querySelector('span[data-i18n], span:last-child');
    if (span && /&[a-z]+;/i.test(span.textContent || '')) {
      var decoder = document.createElement('textarea');
      decoder.innerHTML = span.textContent;
      span.textContent = decoder.value;
    }

    var full = (pill.textContent || '').replace(/\s+/g, ' ').trim();
    pill.setAttribute('data-short', TRIAL_SHORT[currentLang()] || 'Trial');
    if (full) {
      pill.setAttribute('aria-label', full);
      pill.title = full;
    }
  }

  if (stepbar) {
    stepbar.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('[data-go-step]') : null;
      if (!btn) return;
      setStep(btn.getAttribute('data-go-step'), { scroll: true, hash: true });
    });

    var syncStepLabels = function () {
      var shortLabels = STEP_SHORT[currentLang()];
      [1, 2, 3].forEach(function (n) {
        var source = document.querySelector('.panel h2[data-step="' + n + '"], .set-panel h2[data-step="' + n + '"]');
        var target = stepbar.querySelector('[data-step-label="' + n + '"]');
        var button = stepbar.querySelector('[data-go-step="' + n + '"]');
        if (source && target) {
          var full = (source.textContent || '').trim();
          target.textContent = shortLabels[n - 1];
          if (button) {
            button.title = full;
            button.setAttribute('aria-label', n + '. ' + full);
          }
        }
      });
    };
    syncStepLabels();
    syncTrialPill();
    var langSelect = document.getElementById('langSelect');
    if (langSelect) {
      langSelect.addEventListener('change', function () {
        setTimeout(function () { syncStepLabels(); syncTrialPill(); }, 0);
        setTimeout(function () { syncStepLabels(); syncTrialPill(); }, 80);
      });
    }
  }

  // Restore a step from the URL, useful when the site is opened from a shortcut.
  var startMatch = /^#step-([123])$/.exec(location.hash || '');
  setStep(startMatch ? +startMatch[1] : 1, { instant: true });

  // On mobile, the natural next action should bring the next panel into view.
  if (isMobile()) {
    var fileInput = document.getElementById('fileInput');
    if (fileInput) {
      fileInput.addEventListener('change', function () {
        if (fileInput.files && fileInput.files.length) {
          setTimeout(function () { setStep(2, { scroll: true }); }, 30);
        }
      });
    }

    ['customApplyBtn', 'b2bApplyBtn', 'polApplyBtn'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', function () {
          setTimeout(function () { setStep(2, { scroll: true }); }, 60);
        });
      }
    });

    var applyBtn = document.getElementById('applyBtn');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        setTimeout(function () { setStep(3, { scroll: true }); }, 80);
      });
    }
  }

  /* ==================================================================
     Touch → mouse bridge
     ------------------------------------------------------------------
     The shared app was written for mouse events. On the two canvases
     the browser would otherwise scroll or only fire a click at the
     end, so translate one-finger gestures into the mouse events the
     app already understands.
     ================================================================== */
  function makeMouse(type, target, touch, extra) {
    var opts = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      button: 0,
      buttons: type === 'mouseup' ? 0 : 1
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) { opts[k] = extra[k]; });
    }
    var ev;
    try {
      ev = new MouseEvent(type, opts);
    } catch (e) {
      ev = document.createEvent('MouseEvents');
      ev.initMouseEvent(type, true, true, window, 0, opts.screenX, opts.screenY,
        opts.clientX, opts.clientY, false, false, false, false, 0, null);
    }
    target.dispatchEvent(ev);
  }

  function installCanvasTouch(canvas, options) {
    if (!canvas) return;
    options = options || {};
    var start = null;
    var last = null;
    var moved = false;
    var longPressTimer = null;
    var lastTapTime = 0;
    var lastTapX = 0;
    var lastTapY = 0;

    function clearLongPress() {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }

    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) {
        clearLongPress();
        return;
      }
      var t = e.touches[0];
      start = { x: t.clientX, y: t.clientY };
      last = start;
      moved = false;
      makeMouse('mousedown', canvas, t);
      e.preventDefault();

      if (options.longPress) {
        clearLongPress();
        longPressTimer = setTimeout(function () {
          if (moved || !start) return;
          makeMouse('contextmenu', canvas, {
            clientX: start.x, clientY: start.y, screenX: start.x, screenY: start.y
          });
          longPressTimer = null;
        }, 550);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', function (e) {
      if (!start || e.touches.length !== 1) return;
      var t = e.touches[0];
      if (Math.abs(t.clientX - start.x) > 5 || Math.abs(t.clientY - start.y) > 5) {
        moved = true;
        clearLongPress();
      }
      last = { x: t.clientX, y: t.clientY };
      makeMouse('mousemove', window, t);
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', function (e) {
      if (!start) return;
      clearLongPress();
      var t = (e.changedTouches && e.changedTouches[0]) || { clientX: last.x, clientY: last.y, screenX: last.x, screenY: last.y };
      makeMouse('mouseup', window, t);

      if (!moved && options.doubleTap) {
        var now = Date.now();
        if (now - lastTapTime < 330 &&
            Math.abs(t.clientX - lastTapX) < 26 &&
            Math.abs(t.clientY - lastTapY) < 26) {
          makeMouse('dblclick', canvas, t);
          lastTapTime = 0;
        } else {
          lastTapTime = now;
          lastTapX = t.clientX;
          lastTapY = t.clientY;
        }
      }
      start = null;
      last = null;
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchcancel', function () {
      clearLongPress();
      if (start && last) {
        makeMouse('mouseup', window, {
          clientX: last.x, clientY: last.y, screenX: last.x, screenY: last.y
        });
      }
      start = null;
      last = null;
    });
  }

  installCanvasTouch(document.getElementById('pageCanvas'), {
    longPress: true,
    doubleTap: true
  });
  installCanvasTouch(document.getElementById('attireCanvas'), {});

  /* ==================================================================
     Touch wording
     ================================================================== */
  if (coarse.matches) {
    var combineHint = document.getElementById('combineHint');
    if (combineHint) {
      combineHint.innerHTML = combineHint.innerHTML
        .replace(/Double-click/gi, 'Double-tap')
        .replace(/Right-click/gi, 'Long-press');
    }
    var page = document.getElementById('pageCanvas');
    if (page) {
      page.title = page.title
        .replace(/Double-click/gi, 'Double-tap')
        .replace(/Right-click/gi, 'Long-press');
    }
    var b2bHint = document.querySelector('#b2bForm .group-note');
    if (b2bHint && /Ctrl\+Z/i.test(b2bHint.textContent)) {
      b2bHint.innerHTML = b2bHint.innerHTML.replace(/Ctrl\+Z undoes\.?/gi, 'Drag any card to arrange it.');
    }
  }

  /* ==================================================================
     Device id copy button
     ================================================================== */
  (function () {
    var out = document.getElementById('deviceIdOut');
    if (!out || !out.parentNode) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Copy';
    btn.className = 'btn-secondary btn-small';
    btn.style.cssText = 'margin:0 0 0 8px;padding:3px 9px;font-size:11px;min-height:0;';
    btn.addEventListener('click', function () {
      var text = out.textContent.trim();
      if (!text || text === '—') return;
      var done = function () {
        btn.textContent = 'Copied';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallback(); });
      } else {
        fallback();
      }
      function fallback() {
        try {
          var range = document.createRange();
          range.selectNodeContents(out);
          var sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          document.execCommand('copy');
          sel.removeAllRanges();
          done();
        } catch (e) { /* selection is enough */ }
      }
    });
    out.parentNode.appendChild(btn);
  })();

  /* ==================================================================
     Install / PWA
     ================================================================== */
  var installBtn = document.getElementById('webInstallBtn');
  var installTip = document.getElementById('webInstallTip');
  var tipSteps = document.getElementById('webTipSteps');
  var tipClose = document.getElementById('webTipClose');
  var deferredPrompt = null;
  var isStandalone = false;
  try {
    isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  } catch (e) { /* ignore */ }

  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);

  function showInstallBtn() {
    if (installBtn && !isStandalone) installBtn.style.display = '';
  }

  if (installTip && tipClose) {
    tipClose.addEventListener('click', function () { installTip.classList.remove('show'); });
    installTip.addEventListener('click', function (e) {
      if (e.target === installTip) installTip.classList.remove('show');
    });
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBtn();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    if (installBtn) installBtn.style.display = 'none';
    if (installTip) installTip.classList.remove('show');
  });

  if (installBtn) {
    if (isIOS && !isStandalone) {
      // Safari has no install prompt; show the Share-sheet instructions.
      showInstallBtn();
    }

    installBtn.addEventListener('click', function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function (choice) {
          if (choice && choice.outcome === 'accepted') {
            installBtn.style.display = 'none';
          }
          deferredPrompt = null;
        }).catch(function () {});
        return;
      }

      if (installTip && tipSteps) {
        if (isIOS) {
          tipSteps.innerHTML =
            '<li>Tap the <strong>Share</strong> button in Safari.</li>' +
            '<li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>' +
            '<li>Tap <strong>Add</strong>.</li>';
        } else if (isAndroid) {
          tipSteps.innerHTML =
            '<li>Open the browser menu (the three dots).</li>' +
            '<li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>' +
            '<li>Confirm to add SIZER to your home screen.</li>';
        } else {
          tipSteps.innerHTML =
            '<li>Open your browser menu or the install icon in the address bar.</li>' +
            '<li>Choose <strong>Install</strong> (Chrome / Edge).</li>' +
            '<li>On Safari for Mac, use <strong>File &rsaquo; Add to Dock</strong>.</li>';
        }
        installTip.classList.add('show');
      }
    });
  }

  /* ==================================================================
     Service worker (offline app shell)
     ================================================================== */
  if ('serviceWorker' in navigator && !isFile) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
        .catch(function () { /* offline features unavailable */ });
    });
  }

  /* ==================================================================
     Sharper print dialog hint on touch devices
     ================================================================== */
  if (coarse.matches) {
    var note = document.querySelector('.print-note');
    if (note) {
      var extra = document.createElement('p');
      extra.style.cssText = 'margin:8px 0 0;font-weight:600;';
      extra.textContent = 'On a phone or tablet, choose AirPrint / your printer app, then set the paper size and scale as above.';
      note.appendChild(extra);
    }
  }

  // Expose a tiny API for debugging / embedding.
  window.SIZERWeb = {
    version: cfg.version || '4.7.5',
    setStep: setStep,
    isStandalone: function () { return isStandalone; }
  };
})();
