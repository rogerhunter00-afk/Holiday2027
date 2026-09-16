(() => {
  const SUPABASE_URL = 'https://bpqmcjbnaukbejznzqwr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_pxoVfbfSnRRU3nFr-FHzfA_3GOJQxId';
  const SCREENSHOT_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/parse-travel-screenshot`;
  const AIRBNB_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/test-airbnb-url`;

  let sb = null;
  let sessionPromise = null;
  let reading = false;

  const $ = (id) => document.getElementById(id);
  const moneySymbols = { GBP: '£', EUR: '€', USD: '$' };

  function loadSupabase() {
    if (window.supabase?.createClient) return Promise.resolve(window.supabase);
    if (window.__holidaySupabaseLoading) return window.__holidaySupabaseLoading;
    window.__holidaySupabaseLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => window.supabase?.createClient ? resolve(window.supabase) : reject(new Error('Supabase library did not load'));
      script.onerror = () => reject(new Error('Could not load Supabase'));
      document.head.appendChild(script);
    });
    return window.__holidaySupabaseLoading;
  }

  async function getSession() {
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async () => {
      await loadSupabase();
      if (!sb) sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data: current, error: currentError } = await sb.auth.getSession();
      if (currentError) throw currentError;
      if (current?.session) return current.session;
      const { data, error } = await sb.auth.signInAnonymously();
      if (error) {
        const err = new Error(error.message || 'Anonymous sign-in is not enabled');
        err.code = 'ANON_AUTH_DISABLED';
        throw err;
      }
      return data.session;
    })();
    try {
      return await sessionPromise;
    } catch (err) {
      sessionPromise = null;
      throw err;
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  }

  function setFound(html, kind = '') {
    const found = $('ocrFound');
    if (!found) return;
    found.innerHTML = html;
    found.classList.add('show');
    found.style.background = kind === 'error' ? '#fff3f3' : '#effaf4';
    found.style.color = kind === 'error' ? '#9b2c2c' : '#22543d';
  }

  function setProgress(percent, visible = true) {
    const progress = $('ocrProgress');
    const bar = $('ocrBar');
    if (progress) progress.classList.toggle('show', visible);
    if (bar) bar.style.width = `${percent}%`;
  }

  function injectStyles() {
    if ($('holidayFlowStyles')) return;
    const style = document.createElement('style');
    style.id = 'holidayFlowStyles';
    style.textContent = `
      .hv-manual{margin:4px 0 16px;padding:15px;border:1px solid #e8e8e8;border-radius:18px;background:#fff}
      .hv-manual-title{font-size:13px;font-weight:850;margin:0 0 3px}
      .hv-manual-sub{font-size:11px;color:#888;line-height:1.35;margin:0 0 13px}
      .hv-date-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .hv-field{margin-top:10px}.hv-field:first-child{margin-top:0}
      .hv-field label{display:block;font-size:11px;font-weight:800;margin-bottom:6px;color:#555}
      .hv-field input,.hv-field select{width:100%;border:1px solid #d8d8d8;border-radius:13px;padding:12px 12px;background:#fff;color:#222;outline:none;min-height:46px}
      .hv-money{display:grid;grid-template-columns:92px 1fr;gap:8px}
      .hv-summary{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;padding:11px 12px;background:#f7f7f7;border-radius:13px;font-size:12px;color:#666}
      .hv-summary strong{color:#222;font-size:15px;white-space:nowrap}
      .hv-divider{display:flex;align-items:center;gap:10px;margin:15px 0 11px;color:#999;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em}
      .hv-divider:before,.hv-divider:after{content:'';height:1px;background:#e8e8e8;flex:1}
      .hv-autofill-note{font-size:11px;color:#888;line-height:1.4;margin:8px 0 0}
      .hv-link-ok{display:flex;align-items:center;gap:7px;color:#22543d;font-weight:750}
      .hv-link-ok:before{content:'✓';display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#dff5e8;font-size:11px}
      .steps .step:nth-child(2) .shotbox{min-height:88px;padding:11px}.steps .step:nth-child(2) .shotthumb{width:58px;height:72px}
      .steps .step:nth-child(2) .ocrrow{grid-template-columns:1fr}.steps .step:nth-child(2) .ocrrow .mutednote{display:none}
      .steps .step:nth-child(2) .ocrrow .parse{width:100%;min-height:45px}
      .steps .step:nth-child(2) .privacy{margin-top:8px}
      @media(max-width:390px){.hv-date-grid{grid-template-columns:1fr}.hv-money{grid-template-columns:84px 1fr}}
    `;
    document.head.appendChild(style);
  }

  function isAirbnbUrl(url = '') {
    try { return /(^|\.)airbnb\./i.test(new URL(url).hostname); } catch { return false; }
  }

  function isGenericTitle(title = '') {
    return !title || /^Airbnb stay #/i.test(title) || /^Airbnb:/i.test(title) || /holiday rentals|vacation rentals|cabins, beach houses/i.test(title);
  }

  function monthNum(name = '') {
    const key = name.toLowerCase().replace(/\./g, '').slice(0, 3);
    return ({ jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 })[key] || null;
  }

  function toISO(y, m, d) {
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function parseDateRange(text = '') {
    const t = text.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
    let m = t.match(/(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})/i);
    if (m) {
      const month = monthNum(m[3]);
      if (month) return [toISO(+m[4], month, +m[1]), toISO(+m[4], month, +m[2])];
    }
    m = t.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})/i);
    if (m) {
      const m1 = monthNum(m[2]), m2 = monthNum(m[4]);
      if (m1 && m2) return [toISO(+m[5], m1, +m[1]), toISO(+m[5], m2, +m[3])];
    }
    return null;
  }

  function prettyDateRange(a, b) {
    if (!a || !b) return '';
    const [ya, ma, da] = a.split('-').map(Number);
    const [yb, mb, db] = b.split('-').map(Number);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
    if (ya === yb && ma === mb) return `${da}–${db} ${months[ma-1]} ${ya}`;
    if (ya === yb) return `${da} ${months[ma-1]}–${db} ${months[mb-1]} ${ya}`;
    return `${da} ${months[ma-1]} ${ya}–${db} ${months[mb-1]} ${yb}`;
  }

  function numericPrice(value = '') {
    const n = parseFloat(String(value).replace(/,/g,'').replace(/[^0-9.]/g,''));
    return Number.isFinite(n) ? n : null;
  }

  function currencySymbol(code = 'GBP') { return moneySymbols[code] || `${code} `; }

  function syncManualToLegacy() {
    const ci = $('hvCheckin')?.value || '';
    const co = $('hvCheckout')?.value || '';
    if ($('nd') && ci && co) $('nd').value = prettyDateRange(ci, co);

    const guests = Math.max(1, parseInt($('hvGuests')?.value || '1', 10) || 1);
    if ($('ng')) $('ng').value = `${guests} ${guests === 1 ? 'adult' : 'adults'}`;

    const total = numericPrice($('hvTotal')?.value || '');
    const currency = $('hvCurrency')?.value || 'GBP';
    const sym = currencySymbol(currency);
    if ($('np')) $('np').value = total != null ? `${sym}${total.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})} total` : '';
    const pp = total != null ? total / guests : null;
    if ($('npp')) $('npp').value = pp != null ? `${sym}${pp.toFixed(2)} pp` : '';
    if ($('hvPerPerson')) $('hvPerPerson').textContent = pp != null ? `${sym}${pp.toFixed(2)} pp` : '—';
  }

  function syncLegacyToManual(data = {}) {
    if (data.date_text) {
      const r = parseDateRange(data.date_text);
      if (r) {
        if ($('hvCheckin')) $('hvCheckin').value = r[0];
        if ($('hvCheckout')) $('hvCheckout').value = r[1];
      }
    }
    const gc = data.guests_count || parseInt((data.guests_text || '').match(/\d+/)?.[0] || '', 10);
    if (gc && $('hvGuests')) $('hvGuests').value = gc;
    if (typeof data.total_price === 'number' && $('hvTotal')) $('hvTotal').value = data.total_price.toFixed(2);
    if (data.currency && $('hvCurrency') && ['GBP','EUR','USD'].includes(data.currency.toUpperCase())) $('hvCurrency').value = data.currency.toUpperCase();
    syncManualToLegacy();
  }

  function buildManualUI() {
    const steps = document.querySelectorAll('.steps .step');
    if (steps.length < 2 || $('hvManual')) return;

    const intro = document.querySelector('.sheet > p');
    if (intro) intro.textContent = 'Paste a travel link and we’ll pull in the useful listing details. Add the trip dates and price manually, or let Gemini fill them from a screenshot.';

    const h1 = steps[0].querySelector('.stephead');
    if (h1) h1.innerHTML = '<span class="stepnum">1</span><div><b>Paste the link</b><span>For Airbnb we now pull the real listing title, photo and property details directly.</span></div>';

    const h2 = steps[1].querySelector('.stephead');
    if (h2) h2.innerHTML = '<span class="stepnum">2</span><div><b>Add dates and price</b><span>Enter them here, or upload the booking summary and Gemini will fill them for you.</span></div>';

    const manual = document.createElement('div');
    manual.id = 'hvManual';
    manual.className = 'hv-manual';
    manual.innerHTML = `
      <div class="hv-manual-title">Trip details</div>
      <p class="hv-manual-sub">This is the quickest reliable way to compare options. You can still overwrite it with a screenshot below.</p>
      <div class="hv-date-grid">
        <div class="hv-field"><label for="hvCheckin">Check-in</label><input id="hvCheckin" type="date"></div>
        <div class="hv-field"><label for="hvCheckout">Check-out</label><input id="hvCheckout" type="date"></div>
      </div>
      <div class="hv-field"><label for="hvGuests">Guests</label><input id="hvGuests" type="number" min="1" max="30" value="1" inputmode="numeric"></div>
      <div class="hv-field"><label for="hvTotal">Total price</label><div class="hv-money"><select id="hvCurrency"><option value="GBP">£ GBP</option><option value="EUR">€ EUR</option><option value="USD">$ USD</option></select><input id="hvTotal" type="text" inputmode="decimal" placeholder="e.g. 2227.50"></div></div>
      <div class="hv-summary"><span>Approx. per person</span><strong id="hvPerPerson">—</strong></div>
    `;

    const shotBox = $('shotBox');
    steps[1].insertBefore(manual, shotBox);
    const divider = document.createElement('div');
    divider.className = 'hv-divider';
    divider.textContent = 'or autofill';
    steps[1].insertBefore(divider, shotBox);

    if ($('shotName')) $('shotName').textContent = 'Upload booking screenshot';
    const shotCopy = steps[1].querySelector('.shotcopy span');
    if (shotCopy) shotCopy.textContent = 'Gemini 3.1 Flash-Lite can read dates, guests, total price and cancellation details.';
    if ($('ocrBtn')) $('ocrBtn').textContent = 'Autofill from screenshot';
    const privacy = steps[1].querySelector('.privacy');
    if (privacy) privacy.textContent = 'Screenshot analysis is handled securely through Supabase and Google Gemini. Avoid screenshots containing card or payment details.';

    ['nd','ng','np','npp'].forEach(id => {
      const el = $(id);
      if (el?.closest('.field')) el.closest('.field').style.display = 'none';
    });

    ['hvCheckin','hvCheckout','hvGuests','hvTotal','hvCurrency'].forEach(id => $(id)?.addEventListener('input', syncManualToLegacy));
    $('hvCurrency')?.addEventListener('change', syncManualToLegacy);
    syncManualToLegacy();
  }

  async function fetchAirbnbDirect(url) {
    const session = await getSession();
    const response = await fetch(AIRBNB_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({ url, mode: 'direct' })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || `Airbnb parser returned ${response.status}`);
    return payload;
  }

  async function tidyFetchPreview(event) {
    event?.preventDefault?.();
    const url = $('link')?.value.trim() || '';
    if (!/^https?:\/\//i.test(url)) {
      if (typeof setStatus === 'function') setStatus('Paste a full link beginning with http:// or https://', 'err');
      return;
    }

    if (!isAirbnbUrl(url)) {
      if (typeof fetchPreview === 'function') return fetchPreview();
      return;
    }

    const button = $('parseBtn');
    if (button) { button.disabled = true; button.textContent = 'Finding…'; }
    if (typeof setStatus === 'function') setStatus('Finding the Airbnb listing…');

    try {
      const d = await fetchAirbnbDirect(url);
      const title = d.title || `Airbnb stay #${d.room_id}`;
      const image = d.image || '';

      if ($('nt')) $('nt').value = title;
      if ($('type')) $('type').value = 'stay';
      if ($('prevTitle')) $('prevTitle').textContent = title;
      if ($('prevSource')) $('prevSource').textContent = `Airbnb · listing ${d.room_id}`;
      if ($('prevImg')) {
        if (image) { $('prevImg').src = image; $('prevImg').style.display = 'block'; }
        else { $('prevImg').removeAttribute('src'); $('prevImg').style.display = 'none'; }
      }
      $('linkPreview')?.classList.add('show');

      // Reuse the main page's draft variables so the saved card gets the real property image.
      try { draftImage = image; draftSource = 'Airbnb'; } catch (_) {}

      if (typeof setStatus === 'function') {
        setStatus(`Airbnb listing found in ${d.elapsed_ms || 'under a second'}${typeof d.elapsed_ms === 'number' ? ' ms' : ''}. Add dates and price below.`, 'ok');
        const status = $('status');
        if (status) status.innerHTML = `<span class="hv-link-ok">Listing found</span><div style="margin-top:5px;color:#47705a">Real Airbnb title and property photo loaded${d.elapsed_ms ? ` in ${d.elapsed_ms} ms` : ''}.</div>`;
      }
    } catch (err) {
      if (typeof setStatus === 'function') setStatus(`Could not automatically read this Airbnb listing. You can still fill the details manually. ${err.message}`, 'err');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Fetch'; }
    }
  }

  function money(value, currency) {
    if (typeof value !== 'number') return '';
    const code = (currency || 'GBP').toUpperCase();
    const sym = currencySymbol(code);
    return `${sym}${value.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})} total`;
  }

  function perPerson(value, currency) {
    if (typeof value !== 'number') return '';
    const code = (currency || 'GBP').toUpperCase();
    return `${currencySymbol(code)}${value.toFixed(2)} pp`;
  }

  function fillForm(data) {
    if (!data) return;
    if (data.item_type && ['stay','flight','activity'].includes(data.item_type) && $('type')) $('type').value = data.item_type;
    if (data.title && $('nt') && isGenericTitle($('nt').value.trim())) $('nt').value = data.title;
    if (data.date_text && $('nd')) $('nd').value = data.date_text;
    if ($('ng')) {
      if (data.guests_text) $('ng').value = data.guests_text;
      else if (data.guests_count) $('ng').value = `${data.guests_count} ${data.guests_count === 1 ? 'adult' : 'adults'}`;
    }
    if (typeof data.total_price === 'number' && $('np')) $('np').value = money(data.total_price, data.currency);
    if (typeof data.per_person_price === 'number' && $('npp')) $('npp').value = perPerson(data.per_person_price, data.currency);

    syncLegacyToManual(data);

    const details = [];
    if (data.cancellation_text) details.push(data.cancellation_text);
    else if (data.free_cancellation === true) details.push('Free cancellation');
    if (typeof data.rating === 'number') details.push(`Rating ${data.rating}${data.review_count ? ` (${data.review_count} reviews)` : ''}`);
    if (data.airline) details.push(data.airline);
    if (data.departure || data.arrival) details.push([data.departure, data.arrival].filter(Boolean).join(' → '));
    if ($('nn') && details.length) {
      const existing = $('nn').value.trim();
      const extra = details.join(' · ');
      if (!existing) $('nn').value = extra;
      else if (!existing.includes(extra)) $('nn').value = `${existing}\n${extra}`;
    }

    const pieces = [];
    if (data.date_text) pieces.push(data.date_text);
    if (data.guests_text) pieces.push(data.guests_text);
    else if (data.guests_count) pieces.push(`${data.guests_count} guests`);
    if (typeof data.total_price === 'number') pieces.push(money(data.total_price, data.currency));
    if (typeof data.per_person_price === 'number') pieces.push(perPerson(data.per_person_price, data.currency));
    if (data.free_cancellation === true) pieces.push('Free cancellation');
    const confidence = typeof data.confidence === 'number' ? ` <span style="color:#6b8d79">${Math.round(data.confidence*100)}% confidence</span>` : '';
    setFound(`<b>Filled from screenshot</b>${confidence}<br>${pieces.length ? pieces.map(escapeHtml).join(' · ') : 'Screenshot read — check the fields above.'}`);
  }

  async function parseWithGemini() {
    const input = $('screenshot');
    const button = $('ocrBtn');
    const file = input?.files?.[0];
    if (!file || reading) return;
    reading = true;
    if (button) { button.disabled = true; button.textContent = 'Reading with Gemini…'; }
    setFound('<b>Reading booking screenshot…</b><br>Gemini 3.1 Flash-Lite normally takes a couple of seconds.');
    setProgress(12, true);

    try {
      const session = await getSession();
      setProgress(35, true);
      const body = new FormData();
      body.append('image', file, file.name || 'booking-screenshot.png');
      const response = await fetch(SCREENSHOT_FUNCTION_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'apikey': SUPABASE_KEY },
        body
      });
      setProgress(82, true);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `Screenshot parser returned ${response.status}`);
      fillForm(payload.data);
      setProgress(100, true);
    } catch (err) {
      const message = err?.message || String(err);
      if (err?.code === 'ANON_AUTH_DISABLED' || /anonymous.*disabled|anonymous sign-ins/i.test(message)) {
        setFound('<b>Anonymous sign-in is disabled.</b><br>Enable it in Supabase Authentication settings and try again.', 'error');
      } else {
        setFound(`<b>Gemini could not read this screenshot.</b><br>${escapeHtml(message)}`, 'error');
      }
      setProgress(0, false);
    } finally {
      reading = false;
      if (button) { button.disabled = false; button.textContent = 'Re-read with Gemini'; }
      setTimeout(() => setProgress(0, false), 700);
    }
  }

  function bind() {
    injectStyles();
    buildManualUI();

    const parseButton = $('parseBtn');
    if (parseButton) parseButton.onclick = tidyFetchPreview;
    $('link')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); tidyFetchPreview(e); }
    }, true);

    const input = $('screenshot');
    const button = $('ocrBtn');
    if (input && button && input.dataset.geminiBound !== '1') {
      input.dataset.geminiBound = '1';
      button.onclick = (event) => { event.preventDefault(); parseWithGemini(); };
      button.textContent = 'Autofill from screenshot';
      input.addEventListener('change', () => {
        if (!input.files?.[0]) return;
        setFound('<b>Screenshot selected.</b><br>Reading the booking details with Gemini…');
        setTimeout(parseWithGemini, 120);
      });
    }

    // Keep the manual controls correct after the original page resets its hidden fields.
    const originalReset = typeof resetForm === 'function' ? resetForm : null;
    if (originalReset && !window.__holidayResetWrapped) {
      window.__holidayResetWrapped = true;
      window.resetHolidayFlowV2 = () => {
        originalReset();
        if ($('hvCheckin')) $('hvCheckin').value = '';
        if ($('hvCheckout')) $('hvCheckout').value = '';
        if ($('hvGuests')) $('hvGuests').value = '1';
        if ($('hvTotal')) $('hvTotal').value = '';
        if ($('hvCurrency')) $('hvCurrency').value = 'GBP';
        syncManualToLegacy();
      };
    }

    // The old resetForm is called lexically by the existing save handler, so also watch modal close and clear V2 controls when a save completes.
    $('save')?.addEventListener('click', () => setTimeout(() => {
      if (!$('modal')?.classList.contains('open')) {
        if ($('hvCheckin')) $('hvCheckin').value = '';
        if ($('hvCheckout')) $('hvCheckout').value = '';
        if ($('hvGuests')) $('hvGuests').value = '1';
        if ($('hvTotal')) $('hvTotal').value = '';
        if ($('hvCurrency')) $('hvCurrency').value = 'GBP';
        if ($('hvPerPerson')) $('hvPerPerson').textContent = '—';
      }
    }, 80));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
