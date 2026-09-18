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
      script.onload = () => window.supabase?.createClient
        ? resolve(window.supabase)
        : reject(new Error('Supabase library did not load'));
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
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[ch]));
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
      .hv-autofill-head{margin:2px 0 11px}
      .hv-autofill-head b{font-size:13px;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      .hv-recommended{display:inline-flex;align-items:center;border-radius:999px;background:#fff0f3;color:#d91449;padding:4px 8px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}
      .hv-autofill-head p{margin:5px 0 0;color:#777;font-size:11px;line-height:1.4}

      .hv-manual-fallback{margin-top:14px;border:1px solid #e8e8e8;border-radius:16px;background:#fff;overflow:hidden}
      .hv-manual-fallback summary{list-style:none;cursor:pointer;padding:13px 14px;font-size:12px;font-weight:850;display:flex;align-items:center;justify-content:space-between;gap:10px;color:#444;-webkit-tap-highlight-color:transparent}
      .hv-manual-fallback summary::-webkit-details-marker{display:none}
      .hv-manual-fallback summary:after{content:'▾';color:#999;font-size:13px;transition:transform .16s}
      .hv-manual-fallback[open] summary:after{transform:rotate(180deg)}
      .hv-manual-fallback[open] summary{border-bottom:1px solid #eee}
      .hv-manual{padding:14px;background:#fff}
      .hv-manual-title{font-size:13px;font-weight:850;margin:0 0 3px}
      .hv-manual-sub{font-size:11px;color:#888;line-height:1.35;margin:0 0 13px}
      .hv-date-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .hv-field{margin-top:10px}.hv-field:first-child{margin-top:0}
      .hv-field label{display:block;font-size:11px;font-weight:800;margin-bottom:6px;color:#555}
      .hv-field input,.hv-field select{width:100%;border:1px solid #d8d8d8;border-radius:13px;padding:12px;background:#fff;color:#222;outline:none;min-height:46px}
      .hv-money{display:grid;grid-template-columns:92px 1fr;gap:8px}
      .hv-summary{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;padding:11px 12px;background:#f7f7f7;border-radius:13px;font-size:12px;color:#666}
      .hv-summary strong{color:#222;font-size:15px;white-space:nowrap}

      .hv-review{display:none;margin-top:16px;border:1px solid #e8e8e8;border-radius:20px;padding:15px;background:#fff}
      .hv-review.show{display:block;animation:hvReveal .2s ease-out}
      .hv-review-head{margin-bottom:4px}
      .hv-review-head b{display:block;font-size:15px;letter-spacing:-.2px}
      .hv-review-head span{display:block;color:#777;font-size:11px;line-height:1.4;margin-top:4px}
      .hv-review .field{margin-top:12px}
      .hv-review .field input[readonly]{background:#f7f7f7;color:#555}
      .hv-review .primary{margin-top:16px}
      @keyframes hvReveal{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

      .hv-link-ok{display:flex;align-items:center;gap:7px;color:#22543d;font-weight:750}
      .hv-link-ok:before{content:'✓';display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#dff5e8;font-size:11px}

      .steps .step:nth-child(2) .shotbox{min-height:102px;padding:12px;background:#fafafa}
      .steps .step:nth-child(2) .shotbox.has{background:#fff}
      .steps .step:nth-child(2) .shotthumb{width:62px;height:78px}
      .steps .step:nth-child(2) .ocrrow{grid-template-columns:1fr;margin-top:9px}
      .steps .step:nth-child(2) .ocrrow .mutednote{display:none}
      .steps .step:nth-child(2) .ocrrow .parse{width:100%;min-height:46px;background:linear-gradient(90deg,#ff385c,#e31c5f)}
      .steps .step:nth-child(2) .privacy{margin-top:8px}

      @media(max-width:390px){.hv-date-grid{grid-template-columns:1fr}.hv-money{grid-template-columns:84px 1fr}}
    `;
    document.head.appendChild(style);
  }

  function isAirbnbUrl(url = '') {
    try { return /(^|\.)airbnb\./i.test(new URL(url).hostname); }
    catch { return false; }
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

  function weekdayIndex(name = '') {
    const key = name.toLowerCase().replace(/\./g, '').slice(0, 3);
    return ({ sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 })[key] ?? null;
  }

  function inferYearForWeekday(day, month, weekday, startYear = new Date().getFullYear()) {
    const wanted = weekdayIndex(weekday);
    if (wanted == null) return startYear;
    for (let y = startYear - 1; y <= startYear + 4; y++) {
      const d = new Date(y, month - 1, day, 12);
      if (d.getMonth() === month - 1 && d.getDate() === day && d.getDay() === wanted) return y;
    }
    return startYear;
  }

  function parseDateRange(text = '') {
    const t = text.replace(/[–—]/g, '-').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

    // 8–15 May 2027
    let m = t.match(/(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})/i);
    if (m) {
      const month = monthNum(m[3]);
      if (month) return [toISO(+m[4], month, +m[1]), toISO(+m[4], month, +m[2])];
    }

    // 8 May–15 Jun 2027
    m = t.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})/i);
    if (m) {
      const m1 = monthNum(m[2]), m2 = monthNum(m[4]);
      if (m1 && m2) return [toISO(+m[5], m1, +m[1]), toISO(+m[5], m2, +m[3])];
    }

    // Booking-style ranges often omit the year:
    // Tue 22 Sep - Sun 27 Sep
    m = t.match(/(?:(Sun|Mon|Tue|Wed|Thu|Fri|Sat)[A-Za-z]*\s+)?(\d{1,2})\s+([A-Za-z]{3,9})\s*-\s*(?:(Sun|Mon|Tue|Wed|Thu|Fri|Sat)[A-Za-z]*\s+)?(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(20\d{2}))?/i);
    if (m) {
      const d1 = +m[2], d2 = +m[5], mo1 = monthNum(m[3]), mo2 = monthNum(m[6]);
      if (mo1 && mo2) {
        let y1 = m[7] ? +m[7] : inferYearForWeekday(d1, mo1, m[1] || '', new Date().getFullYear());
        let y2 = mo2 < mo1 ? y1 + 1 : y1;
        if (!m[7] && m[4]) {
          const wanted2 = weekdayIndex(m[4]);
          if (wanted2 != null && new Date(y2, mo2 - 1, d2, 12).getDay() !== wanted2) {
            // If weekday 1 was absent/ambiguous, use the return weekday to find the year.
            const inferred2 = inferYearForWeekday(d2, mo2, m[4], y1);
            y2 = inferred2;
            if (mo2 >= mo1) y1 = inferred2;
          }
        }
        return [toISO(y1, mo1, d1), toISO(y2, mo2, d2)];
      }
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

  function currencySymbol(code = 'GBP') {
    return moneySymbols[code] || `${code} `;
  }

  function revealReview(source = 'gemini', scroll = true) {
    const review = $('hvReview');
    if (!review) return;
    const note = $('hvReviewNote');
    if (note) {
      note.textContent = source === 'manual'
        ? 'Check the details below, then edit anything you want before adding it to the board.'
        : 'Gemini filled these from the screenshot. Check them before adding the option.';
    }
    review.classList.add('show');
    if (scroll) setTimeout(() => review.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 180);
  }

  function hideReview() {
    $('hvReview')?.classList.remove('show');
  }

  function syncManualToLegacy() {
    const ci = $('hvCheckin')?.value || '';
    const co = $('hvCheckout')?.value || '';
    // Do not erase a Gemini-read date string just because the manual ISO fields
    // could not be derived from it. Only overwrite Dates when both ISO dates exist.
    if ($('nd') && ci && co) $('nd').value = prettyDateRange(ci, co);

    const guests = Math.max(1, parseInt($('hvGuests')?.value || '1', 10) || 1);
    if ($('ng')) $('ng').value = `${guests} ${guests === 1 ? 'adult' : 'adults'}`;

    const total = numericPrice($('hvTotal')?.value || '');
    const currency = $('hvCurrency')?.value || 'GBP';
    const sym = currencySymbol(currency);
    if ($('np')) $('np').value = total != null
      ? `${sym}${total.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})} total`
      : '';
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
    if (data.currency && $('hvCurrency') && ['GBP','EUR','USD'].includes(data.currency.toUpperCase())) {
      $('hvCurrency').value = data.currency.toUpperCase();
    }
    syncManualToLegacy();
  }

  function openManualFallback() {
    const details = $('hvManualFallback');
    if (details) {
      details.open = true;
      revealReview('manual', false);
      setTimeout(() => details.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
    }
  }

  function buildReviewUI() {
    if ($('hvReview')) return;
    const steps = document.querySelector('.steps');
    if (!steps) return;

    const ids = ['type','nt','nd','ng','np','npp','nn'];
    const fields = ids.map(id => $(id)?.closest('.field')).filter(Boolean);
    if (!fields.length) return;

    const review = document.createElement('div');
    review.id = 'hvReview';
    review.className = 'hv-review';
    review.innerHTML = `
      <div class="hv-review-head">
        <b>Check the details</b>
        <span id="hvReviewNote">Review the populated details before adding this option.</span>
      </div>
    `;
    steps.insertAdjacentElement('afterend', review);

    fields.forEach(field => {
      field.style.display = '';
      review.appendChild(field);
    });

    if ($('npp')) $('npp').readOnly = true;
    const save = $('save');
    if (save) review.appendChild(save);
  }

  function buildTripDetailsUI() {
    const steps = document.querySelectorAll('.steps .step');
    if (steps.length < 2 || $('hvManualFallback')) return;

    const intro = document.querySelector('.sheet > p');
    if (intro) intro.textContent = 'Paste a travel link and we’ll pull in the useful listing details. For dates and price, upload the booking summary or use the manual backup.';

    const h1 = steps[0].querySelector('.stephead');
    if (h1) h1.innerHTML = '<span class="stepnum">1</span><div><b>Paste the link</b><span>For Airbnb we pull the real listing title, photo and property details directly.</span></div>';

    const h2 = steps[1].querySelector('.stephead');
    if (h2) h2.innerHTML = '<span class="stepnum">2</span><div><b>Add dates and price</b><span>Upload the booking summary and Gemini will fill these for you. Manual entry is available as a backup.</span></div>';

    const shotBox = $('shotBox');
    if (!shotBox) return;

    const autofillHead = document.createElement('div');
    autofillHead.className = 'hv-autofill-head';
    autofillHead.innerHTML = '<b>Upload booking screenshot <span class="hv-recommended">Recommended</span></b><p>Gemini 3.1 Flash-Lite reads the dates, guests, total price, cancellation terms and rating.</p>';
    steps[1].insertBefore(autofillHead, shotBox);

    if ($('shotName')) $('shotName').textContent = 'Choose booking screenshot';
    const shotCopy = steps[1].querySelector('.shotcopy span');
    if (shotCopy) shotCopy.textContent = 'Pick it from Photos. The booking-summary section is enough.';
    if ($('ocrBtn')) $('ocrBtn').textContent = 'Autofill from screenshot';
    const privacy = steps[1].querySelector('.privacy');
    if (privacy) privacy.textContent = 'Sent securely through Supabase to Google Gemini for analysis. Avoid screenshots containing card or payment details.';

    const details = document.createElement('details');
    details.id = 'hvManualFallback';
    details.className = 'hv-manual-fallback';
    details.innerHTML = `
      <summary>Enter manually instead</summary>
      <div class="hv-manual" id="hvManual">
        <div class="hv-manual-title">Trip details</div>
        <p class="hv-manual-sub">Use this if you do not have a screenshot, or if Gemini misses anything.</p>
        <div class="hv-date-grid">
          <div class="hv-field"><label for="hvCheckin">Check-in</label><input id="hvCheckin" type="date"></div>
          <div class="hv-field"><label for="hvCheckout">Check-out</label><input id="hvCheckout" type="date"></div>
        </div>
        <div class="hv-field"><label for="hvGuests">Guests</label><input id="hvGuests" type="number" min="1" max="30" value="1" inputmode="numeric"></div>
        <div class="hv-field"><label for="hvTotal">Total price</label><div class="hv-money"><select id="hvCurrency"><option value="GBP">£ GBP</option><option value="EUR">€ EUR</option><option value="USD">$ USD</option></select><input id="hvTotal" type="text" inputmode="decimal" placeholder="e.g. 2227.50"></div></div>
        <div class="hv-summary"><span>Approx. per person</span><strong id="hvPerPerson">—</strong></div>
      </div>
    `;

    const privacyNode = steps[1].querySelector('.privacy');
    if (privacyNode) privacyNode.insertAdjacentElement('afterend', details);
    else steps[1].appendChild(details);

    ['hvCheckin','hvCheckout','hvGuests','hvTotal','hvCurrency'].forEach(id => {
      $(id)?.addEventListener('input', () => {
        syncManualToLegacy();
        revealReview('manual', false);
      });
    });
    $('hvCurrency')?.addEventListener('change', () => {
      syncManualToLegacy();
      revealReview('manual', false);
    });
    details.addEventListener('toggle', () => {
      if (details.open) revealReview('manual', false);
    });

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

      try { draftImage = image; draftSource = 'Airbnb'; } catch (_) {}

      if (typeof setStatus === 'function') {
        setStatus('Airbnb listing found.', 'ok');
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
    return `${currencySymbol(code)}${value.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2})} total`;
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
    const confidence = typeof data.confidence === 'number'
      ? ` <span style="color:#6b8d79">${Math.round(data.confidence*100)}% confidence</span>`
      : '';
    setFound(`<b>Filled from screenshot</b>${confidence}<br>${pieces.length ? pieces.map(escapeHtml).join(' · ') : 'Screenshot read — check the details before adding.'}`);

    revealReview('gemini', true);
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
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_KEY
        },
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
        setFound(`<b>Gemini could not read this screenshot.</b><br>${escapeHtml(message)}<br><span style="display:inline-block;margin-top:5px">The manual backup has been opened below.</span>`, 'error');
      }
      openManualFallback();
      setProgress(0, false);
    } finally {
      reading = false;
      if (button) { button.disabled = false; button.textContent = 'Re-read with Gemini'; }
      setTimeout(() => setProgress(0, false), 700);
    }
  }

  function resetV2Fields() {
    if ($('nd')) $('nd').value = '';
    if ($('hvCheckin')) $('hvCheckin').value = '';
    if ($('hvCheckout')) $('hvCheckout').value = '';
    if ($('hvGuests')) $('hvGuests').value = '1';
    if ($('hvTotal')) $('hvTotal').value = '';
    if ($('hvCurrency')) $('hvCurrency').value = 'GBP';
    if ($('hvPerPerson')) $('hvPerPerson').textContent = '—';
    if ($('hvManualFallback')) $('hvManualFallback').open = false;
    hideReview();
    syncManualToLegacy();
  }

  function bind() {
    injectStyles();
    buildTripDetailsUI();
    buildReviewUI();
    hideReview();

    const parseButton = $('parseBtn');
    if (parseButton) parseButton.onclick = tidyFetchPreview;
    $('link')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopImmediatePropagation();
        tidyFetchPreview(e);
      }
    }, true);

    const input = $('screenshot');
    const button = $('ocrBtn');
    if (input && button && input.dataset.geminiBound !== '1') {
      input.dataset.geminiBound = '1';
      button.onclick = (event) => {
        event.preventDefault();
        parseWithGemini();
      };
      button.textContent = 'Autofill from screenshot';
      input.addEventListener('change', () => {
        if (!input.files?.[0]) return;
        hideReview();
        setFound('<b>Screenshot selected.</b><br>Reading the booking details with Gemini…');
        setTimeout(parseWithGemini, 120);
      });
    }

    $('save')?.addEventListener('click', () => setTimeout(() => {
      if (!$('modal')?.classList.contains('open')) resetV2Fields();
    }, 80));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
