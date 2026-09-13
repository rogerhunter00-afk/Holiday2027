(() => {
  const SUPABASE_URL = 'https://bpqmcjbnaukbejznzqwr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_pxoVfbfSnRRU3nFr-FHzfA_3GOJQxId';
  const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/parse-travel-screenshot`;

  let sb = null;
  let sessionPromise = null;
  let reading = false;

  const $ = (id) => document.getElementById(id);

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

  function setFound(html, kind = '') {
    const found = $('ocrFound');
    if (!found) return;
    found.innerHTML = html;
    found.classList.add('show');
    if (kind === 'error') {
      found.style.background = '#fff3f3';
      found.style.color = '#9b2c2c';
    } else {
      found.style.background = '#f5f8ff';
      found.style.color = '';
    }
  }

  function setProgress(percent, visible = true) {
    const progress = $('ocrProgress');
    const bar = $('ocrBar');
    if (progress) progress.classList.toggle('show', visible);
    if (bar) bar.style.width = `${percent}%`;
  }

  function money(value, currency) {
    if (typeof value !== 'number') return '';
    if ((currency || '').toUpperCase() === 'GBP') return `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total`;
    return `${currency || ''} ${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
  }

  function perPerson(value, currency) {
    if (typeof value !== 'number') return '';
    if ((currency || '').toUpperCase() === 'GBP') return `£${value.toFixed(2)} pp`;
    return `${currency || ''} ${value.toFixed(2)} pp`.trim();
  }

  function isGenericTitle(title = '') {
    return !title || /^Airbnb stay #/i.test(title) || /^Airbnb:/i.test(title) || /holiday rentals/i.test(title);
  }

  function fillForm(data) {
    if (!data) return;

    if (data.item_type && ['stay', 'flight', 'activity'].includes(data.item_type) && $('type')) $('type').value = data.item_type;
    if (data.title && $('nt') && isGenericTitle($('nt').value.trim())) $('nt').value = data.title;
    if (data.date_text && $('nd')) $('nd').value = data.date_text;

    if ($('ng')) {
      if (data.guests_text) $('ng').value = data.guests_text;
      else if (data.guests_count) $('ng').value = `${data.guests_count} ${data.guests_count === 1 ? 'guest' : 'guests'}`;
    }

    if (typeof data.total_price === 'number' && $('np')) $('np').value = money(data.total_price, data.currency);
    if (typeof data.per_person_price === 'number' && $('npp')) $('npp').value = perPerson(data.per_person_price, data.currency);

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

    const confidence = typeof data.confidence === 'number' ? ` <span style="color:#888">(${Math.round(data.confidence * 100)}% confidence)</span>` : '';
    setFound(`<b>Gemini found:</b>${confidence}<br>${pieces.length ? pieces.map(escapeHtml).join(' · ') : 'Screenshot read — check the fields below.'}`);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  }

  async function parseWithGemini() {
    const input = $('screenshot');
    const button = $('ocrBtn');
    const file = input?.files?.[0];
    if (!file || reading) return;

    reading = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'Reading with Gemini…';
    }
    setFound('<b>Reading screenshot with Gemini 3.1 Flash-Lite…</b><br>This normally takes a few seconds.');
    setProgress(12, true);

    try {
      const session = await getSession();
      if (!session?.access_token) throw new Error('Could not create a secure session');
      setProgress(35, true);

      const body = new FormData();
      body.append('image', file, file.name || 'booking-screenshot.png');

      const response = await fetch(FUNCTION_URL, {
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
        setFound('<b>One Supabase setting is still off.</b><br>Enable Anonymous Sign-Ins in Supabase → Authentication → Providers → Anonymous, then try the screenshot again.', 'error');
      } else {
        setFound(`<b>Gemini could not read this screenshot.</b><br>${escapeHtml(message)}`, 'error');
      }
      setProgress(0, false);
    } finally {
      reading = false;
      if (button) {
        button.disabled = false;
        button.textContent = 'Re-read with Gemini';
      }
      setTimeout(() => setProgress(0, false), 700);
    }
  }

  function bind() {
    const input = $('screenshot');
    const button = $('ocrBtn');
    if (!input || !button || input.dataset.geminiBound === '1') return;
    input.dataset.geminiBound = '1';

    // Replace the old Tesseract click handler completely.
    button.onclick = (event) => {
      event.preventDefault();
      parseWithGemini();
    };
    button.textContent = 'Read with Gemini';

    // Uploading a screenshot now triggers Gemini automatically.
    input.addEventListener('change', () => {
      if (!input.files?.[0]) return;
      setFound('<b>Screenshot uploaded.</b><br>Sending it securely to Gemini for the booking details…');
      setTimeout(parseWithGemini, 120);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
