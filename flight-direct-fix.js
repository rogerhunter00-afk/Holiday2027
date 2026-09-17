(() => {
  const SUPABASE_URL_FIX = 'https://bpqmcjbnaukbejznzqwr.supabase.co';
  const SUPABASE_KEY_FIX = 'sb_publishable_pxoVfbfSnRRU3nFr-FHzfA_3GOJQxId';
  const SEARCH_URL_FIX = `${SUPABASE_URL_FIX}/functions/v1/search-flights`;
  let clientFix = null;
  let sessionFix = null;

  const el = (id) => document.getElementById(id);
  const escFix = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const symbolFix = (c) => c === 'GBP' ? '£' : c === 'EUR' ? '€' : c === 'USD' ? '$' : `${c || ''} `;

  function prettyDateFix(value) {
    if (!value) return '—';
    const d = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', timeZone:'UTC' });
  }

  async function getSessionFix() {
    if (sessionFix) return sessionFix;
    if (!window.supabase?.createClient) throw new Error('Supabase library did not load. Refresh the page and try again.');
    clientFix ||= window.supabase.createClient(SUPABASE_URL_FIX, SUPABASE_KEY_FIX);
    const { data: current, error: currentError } = await clientFix.auth.getSession();
    if (currentError) throw currentError;
    if (current?.session) {
      sessionFix = current.session;
      return sessionFix;
    }
    const { data, error } = await clientFix.auth.signInAnonymously();
    if (error) throw error;
    sessionFix = data.session;
    return sessionFix;
  }

  function renderFix(data) {
    const result = el('result');
    const results = el('results');
    const summary = el('summary');
    const raw = el('raw');
    if (!result || !results || !summary) return;

    const rows = Array.isArray(data.results) ? data.results : [];
    summary.innerHTML = `<b>${rows.length} result${rows.length === 1 ? '' : 's'}</b> · ${escFix(data.engine || 'google_flights')} · ${Math.round(data.elapsed_ms || 0)} ms`;

    results.innerHTML = rows.slice(0, 12).map((x) => {
      const route = `${escFix(x.departure_airport || el('from')?.value || '')} → ${escFix(x.arrival_airport || el('to')?.value || '')}`;
      const times = x.departure_time && x.arrival_time ? `${escFix(x.departure_time)} → ${escFix(x.arrival_time)}` : '';
      const facts = [x.airline, x.flight_number, times, x.total_duration ? `${Math.floor(x.total_duration/60)}h ${x.total_duration%60 ? `${x.total_duration%60}m` : ''}`.trim() : null, x.stops != null ? (x.stops === 0 ? 'Direct' : `${x.stops} stop${x.stops === 1 ? '' : 's'}`) : null].filter(Boolean);
      return `<article class="flight">
        <div class="top"><div><div class="route">${route}</div><div class="meta">${facts.map(escFix).join(' · ')}</div></div><div class="price">${symbolFix(x.currency || 'GBP')}${Number(x.price || 0).toLocaleString('en-GB')}</div></div>
        <div class="meta" style="margin-top:10px"><b>${prettyDateFix(x.outbound_date || el('out')?.value)}</b> → <b>${prettyDateFix(x.return_date || el('ret')?.value)}</b></div>
      </article>`;
    }).join('') || '<div class="flight">The API call completed but returned no flight cards.</div>';

    if (raw) raw.textContent = JSON.stringify(data, null, 2);
    result.style.display = 'block';
  }

  async function runFix(event) {
    event?.preventDefault?.();
    const button = el('go');
    const status = el('status');
    const errorBox = el('err');
    const result = el('result');
    if (!button || !status || !errorBox) return;

    button.disabled = true;
    button.textContent = 'Testing connection…';
    status.textContent = 'Starting direct Supabase → SerpApi → Google Flights test…';
    status.classList.add('show');
    errorBox.classList.remove('show');
    if (result) result.style.display = 'none';

    try {
      const session = await getSessionFix();
      status.textContent = 'Connected. Asking SerpApi for live Google Flights data…';

      const from = String(el('from')?.value || '').trim().toUpperCase();
      const to = String(el('to')?.value || '').trim().toUpperCase();
      const outbound = el('out')?.value || '';
      const ret = el('ret')?.value || '';
      if (!from || !to || !outbound || !ret) throw new Error('Fill in both airports and both dates first.');

      const plan = {
        mode: 'exact',
        engine: 'google_flights',
        params: {
          engine: 'google_flights',
          departure_id: from,
          arrival_id: to,
          outbound_date: outbound,
          return_date: ret,
          currency: 'GBP',
          gl: 'uk',
          hl: 'en',
          adults: '1',
          type: '1',
          sort_by: '2'
        }
      };

      const response = await fetch(SEARCH_URL_FIX, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_KEY_FIX
        },
        body: JSON.stringify({ serpapi_plan: plan })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
      renderFix(data);
      status.textContent = 'Success — the direct API connection is working.';
    } catch (error) {
      errorBox.textContent = error?.message || String(error);
      errorBox.classList.add('show');
      status.textContent = 'The test stopped before results were returned.';
    } finally {
      button.disabled = false;
      button.textContent = 'Run direct API test';
    }
  }

  const button = el('go');
  if (button) {
    button.onclick = null;
    button.addEventListener('click', runFix);
  }
})();
