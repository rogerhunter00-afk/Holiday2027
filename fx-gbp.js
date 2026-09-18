(() => {
  const API = 'https://api.frankfurter.dev/v2/rate';
  const OPTIONS_KEY = 'holiday2027-options-v2';
  const CACHE_KEY = 'holiday2027-fx-gbp-v1';
  const MAX_AGE = 12 * 60 * 60 * 1000;
  const pending = new Map();

  function detectCurrency(value = '', explicit = '') {
    const code = String(explicit || '').trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(code)) return code;
    const s = String(value || '').toUpperCase();
    if (s.includes('€') || /\bEUR\b/.test(s)) return 'EUR';
    if (s.includes('£') || /\bGBP\b/.test(s)) return 'GBP';
    if (/\bCHF\b/.test(s)) return 'CHF';
    if (/\bCAD\b/.test(s)) return 'CAD';
    if (/\bAUD\b/.test(s)) return 'AUD';
    if (/\bNZD\b/.test(s)) return 'NZD';
    if (/\bSEK\b/.test(s)) return 'SEK';
    if (/\bNOK\b/.test(s)) return 'NOK';
    if (/\bDKK\b/.test(s)) return 'DKK';
    if (/\bPLN\b/.test(s)) return 'PLN';
    if (/\bCZK\b/.test(s)) return 'CZK';
    if (/\bHUF\b/.test(s)) return 'HUF';
    if (s.includes('$') || /\bUSD\b/.test(s)) return 'USD';
    return 'GBP';
  }

  function numeric(value = '') {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const n = Number(String(value).replace(/,/g, '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  function moneyGBP(value, suffix = '') {
    return '£' + Number(value).toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + suffix;
  }

  function readCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
    catch { return {}; }
  }
  function writeCache(cache) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
  }

  async function rateToGBP(currency) {
    const c = String(currency || 'GBP').toUpperCase();
    if (c === 'GBP') return { rate: 1, date: new Date().toISOString().slice(0,10) };

    const cache = readCache();
    const hit = cache[c];
    if (hit && Date.now() - Number(hit.savedAt || 0) < MAX_AGE && Number(hit.rate) > 0) {
      return { rate: Number(hit.rate), date: hit.date || '' };
    }
    if (pending.has(c)) return pending.get(c);

    const work = (async () => {
      const r = await fetch(`${API}/${encodeURIComponent(c.toLowerCase())}/gbp`, { headers: { 'Accept':'application/json' } });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !Number.isFinite(Number(d.rate))) throw new Error(`Could not convert ${c} to GBP`);
      const out = { rate: Number(d.rate), date: d.date || new Date().toISOString().slice(0,10) };
      const next = readCache();
      next[c] = { ...out, savedAt: Date.now() };
      writeCache(next);
      return out;
    })().finally(() => pending.delete(c));

    pending.set(c, work);
    return work;
  }

  async function convertOption(o) {
    if (!o || typeof o !== 'object') return false;
    const sourceCurrency = detectCurrency(o.price || o.perPerson, o.currency || o.originalCurrency || '');
    if (sourceCurrency === 'GBP') {
      o.currency = 'GBP';
      return false;
    }

    const total = numeric(o.price);
    const pp = numeric(o.perPerson);
    if (total == null && pp == null) return false;

    try {
      const fx = await rateToGBP(sourceCurrency);
      if (!o.fxOriginal) {
        o.fxOriginal = {
          currency: sourceCurrency,
          price: o.price || '',
          perPerson: o.perPerson || ''
        };
      }
      if (total != null) o.price = moneyGBP(total * fx.rate, /total/i.test(String(o.price)) ? ' total' : '');
      if (pp != null) o.perPerson = moneyGBP(pp * fx.rate, /pp|per person/i.test(String(o.perPerson)) ? ' pp' : '');
      o.currency = 'GBP';
      o.fxConversion = { from: sourceCurrency, to: 'GBP', rate: fx.rate, date: fx.date };
      return true;
    } catch (e) {
      console.warn('Holiday GBP conversion failed', sourceCurrency, e);
      return false;
    }
  }

  async function normalizeOptions(rows) {
    if (!Array.isArray(rows) || !rows.length) return false;
    const results = await Promise.all(rows.map(convertOption));
    return results.some(Boolean);
  }
  window.holidayNormalizeGBPOptions = normalizeOptions;

  async function normalizeLocal() {
    let rows = [];
    try {
      rows = typeof options !== 'undefined' ? options : JSON.parse(localStorage.getItem(OPTIONS_KEY) || '[]');
    } catch {}
    const changed = await normalizeOptions(rows);
    if (changed) {
      try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(rows)); } catch {}
      try { options = rows; } catch {}
      try { if (typeof render === 'function') render(); } catch {}
    }
    return changed;
  }

  async function convertForm() {
    const price = document.getElementById('np');
    const pp = document.getElementById('npp');
    const currencySelect = document.getElementById('hvCurrency');
    if (!price && !pp) return false;

    const source = detectCurrency(price?.value || pp?.value || '', currencySelect?.value || '');
    if (source === 'GBP') return false;

    const total = numeric(price?.value);
    const each = numeric(pp?.value);
    if (total == null && each == null) return false;

    const fx = await rateToGBP(source);
    if (price && total != null) price.value = moneyGBP(total * fx.rate, /total/i.test(price.value) ? ' total' : '');
    if (pp && each != null) pp.value = moneyGBP(each * fx.rate, ' pp');
    if (currencySelect) currencySelect.value = 'GBP';

    const perPersonPreview = document.getElementById('hvPerPerson');
    if (perPersonPreview && each != null) perPersonPreview.textContent = moneyGBP(each * fx.rate, ' pp');

    const found = document.getElementById('ocrFound');
    if (found?.classList.contains('show')) {
      const note = document.createElement('div');
      note.style.cssText = 'margin-top:7px;color:#6b7280;font-size:11px';
      note.textContent = `Converted from ${source} to GBP using the latest reference rate.`;
      if (!found.querySelector('[data-fx-note]')) {
        note.dataset.fxNote = '1';
        found.appendChild(note);
      }
    }
    return true;
  }
  window.holidayConvertFormToGBP = convertForm;

  function wrapSave() {
    const save = document.getElementById('save');
    if (!save || save.dataset.gbpWrapped === '1') return;
    const original = save.onclick;
    if (typeof original !== 'function') return;
    save.dataset.gbpWrapped = '1';
    save.onclick = async function(event) {
      event?.preventDefault?.();
      if (save.disabled) return;
      const old = save.textContent;
      try {
        const currencySelect = document.getElementById('hvCurrency');
        const source = detectCurrency(document.getElementById('np')?.value || '', currencySelect?.value || '');
        if (source !== 'GBP') {
          save.disabled = true;
          save.textContent = 'Converting to GBP…';
          await convertForm();
        }
        return original.call(this, event);
      } catch (e) {
        console.warn('Could not convert price to GBP before saving', e);
        if (typeof toast === 'function') toast('Could not convert currency — try again');
      } finally {
        save.disabled = false;
        if (document.body.contains(save)) save.textContent = old;
      }
    };
  }

  async function init() {
    wrapSave();
    return normalizeLocal();
  }

  window.holidayGBPReady = document.readyState === 'loading'
    ? new Promise(resolve => document.addEventListener('DOMContentLoaded', () => init().then(resolve), { once:true }))
    : init();
})();