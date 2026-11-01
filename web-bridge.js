/* =====================================================================
   SIZER web edition — browser bridge
   ---------------------------------------------------------------------
   The desktop build gets window.idpl from Electron's preload script.
   This file provides the same small API using standard browser features:

     deviceId        a stable id saved in this browser
     activationUrl   from idpl-config.js
     printer         browser print fallback
     attire          outfit library persisted in localStorage

   Loaded synchronously in <head>, before the app's inline script.
   ===================================================================== */
(function () {
  'use strict';

  var CFG = window.IDPL_WEB_CONFIG || {};
  window.IDPL_WEB = true;

  /* ---------------------------------------------------------------
     Stable per-browser device id
     Random, not a fingerprint. Stored in localStorage so a code can
     stay locked to this browser/profile.
     --------------------------------------------------------------- */
  var DEVICE_KEY = 'idpl_web_device_v1';

  function randomId() {
    try {
      var a = new Uint8Array(16);
      (window.crypto || window.msCrypto).getRandomValues(a);
      var s = '';
      for (var i = 0; i < a.length; i++) s += ('0' + a[i].toString(16)).slice(-2);
      return 'web' + s;
    } catch (e) {
      return 'web' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  }

  function deviceId() {
    try {
      var v = localStorage.getItem(DEVICE_KEY);
      if (!v) {
        v = randomId();
        localStorage.setItem(DEVICE_KEY, v);
      }
      return v;
    } catch (e) {
      // Private mode / blocked storage: remains stable for this page load.
      if (!deviceId._fallback) deviceId._fallback = randomId();
      return deviceId._fallback;
    }
  }

  /* ---------------------------------------------------------------
     Formal attire library
     The desktop preload reads/writes PNG files in %APPDATA%/SIZER.
     Browsers cannot expose a sync filesystem, so outfits are stored as
     data URLs in localStorage. A memory copy keeps imports working if
     the 5 MB quota is reached; they last for the session.
     --------------------------------------------------------------- */
  var ATTIRE_KEY = 'idpl_web_attire_v1';
  var attire = Object.create(null);

  function loadAttire() {
    try {
      var raw = localStorage.getItem(ATTIRE_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      Object.keys(parsed).forEach(function (k) {
        if (typeof parsed[k] === 'string' && /^data:image\//i.test(parsed[k])) {
          attire[k] = parsed[k];
        }
      });
    } catch (e) { /* start empty */ }
  }

  function persistAttire() {
    try {
      localStorage.setItem(ATTIRE_KEY, JSON.stringify(attire));
      return true;
    } catch (e) {
      // Quota exceeded. Keep the item in memory for this session.
      try { console.warn('[SIZER] Outfit storage is full; keeping this outfit for the current session only.'); } catch (_) {}
      return false;
    }
  }

  function safeName(name) {
    var safe = String(name || 'attire').replace(/[^A-Za-z0-9._ -]/g, '_');
    if (!/\.png$/i.test(safe)) safe += '.png';
    return safe;
  }

  loadAttire();

  window.idpl = {
    deviceId: deviceId(),
    activationUrl: typeof CFG.activationUrl === 'string' ? CFG.activationUrl : '',
    arch: 'web',
    platform: 'web',
    web: true,

    printer: {
      list: function () {
        return Promise.resolve([]);
      },
      print: function () {
        return new Promise(function (resolve) {
          try {
            window.print();
            resolve({ success: true });
          } catch (e) {
            resolve({ success: false, failureReason: String(e) });
          }
        });
      }
    },

    attire: {
      list: function () {
        return Object.keys(attire).map(function (name) {
          return { name: name, dataURL: attire[name] };
        });
      },
      save: function (name, dataURL) {
        var safe = safeName(name);
        var url = String(dataURL || '');
        if (!/^data:image\//i.test(url)) return safe;
        attire[safe] = url;
        persistAttire();
        return safe;
      },
      remove: function (name) {
        try {
          delete attire[safeName(name)];
          persistAttire();
          return true;
        } catch (e) {
          return false;
        }
      },
      dir: 'Browser storage'
    }
  };
})();
