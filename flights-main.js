(() => {
  const SUPABASE_URL = 'https://bpqmcjbnaukbejznzqwr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_pxoVfbfSnRRU3nFr-FHzfA_3GOJQxId';
  const PARSE_URL = `${SUPABASE_URL}/functions/v1/parse-flight-request`;
  const SEARCH_URL = `${SUPABASE_URL}/functions/v1/search-flights`;
  const PROFILE_KEY = 'holiday2027-profile-v2';

  let client = null;
  let sessionPromise = null;
  let parsed = null;
  let live = null;
  let visibleResults = 6;

  const airportNames = {
    EDI:'Edinburgh', GLA:'Glasgow', PIK:'Prestwick', ABZ:'Aberdeen', INV:'Inverness', DND:'Dundee',
    MLA:'Malta', FAO:'Faro', PMI:'Palma', ALC:'Alicante', BCN:'Barcelona', AMS:'Amsterdam', CDG:'Paris CDG', ORY:'Paris Orly'
  };

  const html = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const moneySymbol = (c) => c === 'GBP' ? '£' : c === 'EUR' ? '€' : c === 'USD' ? '$' : `${c || ''} `;

  function injectStyles() {
    if (document.getElementById('mainFlightSearchStyles')) return;
    const style = document.createElement('style');
    style.id = 'mainFlightSearchStyles';
    style.textContent = `
      .flight-hub{display:none;margin:22px 0 4px}.flight-hub.show{display:block}
      .flight-search-card{border:1px solid #e9e9e9;border-radius:28px;padding:18px;background:linear-gradient(145deg,#fff,#fffafb);box-shadow:0 8px 28px #00000006}
      .flight-search-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.flight-search-kicker{font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#d91449}.flight-search-head h2{margin:5px 0 5px;font-size:23px;letter-spacing:-.7px}.flight-search-head p{margin:0;color:#777;font-size:12px;line-height:1.45;max-width:490px}.flight-search-icon{width:48px;height:48px;border-radius:17px;background:#fff0f4;color:#ff385c;display:grid;place-items:center;font-size:22px;flex:0 0 auto}
      .flight-query{width:100%;min-height:112px;border:1px solid #ddd;border-radius:18px;padding:14px 15px;margin-top:15px;background:#fff;resize:vertical;outline:none;font:inherit;font-size:15px;line-height:1.45}.flight-query:focus{border-color:#aaa;box-shadow:0 0 0 4px #00000006}
      .flight-examples{display:flex;gap:7px;overflow:auto;scrollbar-width:none;padding:9px 0 1px}.flight-examples::-webkit-scrollbar{display:none}.flight-example{flex:0 0 auto;border:1px solid #e9e9e9;background:#fff;border-radius:999px;padding:8px 10px;font-size:10px;font-weight:800;color:#555}.flight-example:active{transform:scale(.97)}
      .flight-search-btn{width:100%;border:0;border-radius:17px;padding:14px 16px;margin-top:12px;background:linear-gradient(90deg,#ff385c,#e31c5f);color:#fff;font-weight:900;font-size:14px}.flight-search-btn[disabled]{opacity:.55}.flight-search-note{margin:9px 2px 0;color:#999;font-size:10px;line-height:1.4}
      .flight-search-status{display:none;margin-top:12px;border-radius:16px;padding:12px 13px;background:#f7f7f7;color:#666;font-size:12px;line-height:1.45}.flight-search-status.show{display:block}.flight-search-status.error{background:#fff2f2;color:#a12f2f}.flight-search-status.ok{background:#effaf4;color:#285c3e}
      .flight-understood{display:none;margin-top:14px;border:1px solid #f0f0f0;border-radius:19px;padding:13px;background:#fff}.flight-understood.show{display:block}.flight-understood-label{font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#a1a1a1}.flight-understood-main{font-size:13px;font-weight:800;line-height:1.4;margin-top:4px}.flight-understood-facts{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.flight-understood-fact{border-radius:999px;background:#f6f6f6;padding:6px 8px;font-size:10px;font-weight:750;color:#666}
      .flight-live-results{display:none;margin-top:18px}.flight-live-results.show{display:block}.flight-results-head{display:flex;justify-content:space-between;align-items:end;gap:10px;margin-bottom:10px}.flight-results-head h3{margin:0;font-size:19px;letter-spacing:-.5px}.flight-results-head span{color:#999;font-size:10px;text-align:right}
      .main-flight-results{display:grid;gap:12px}.main-flight-result{border:1px solid #e7e7e7;border-radius:24px;background:#fff;padding:16px;box-shadow:0 5px 18px #00000004;position:relative}.main-flight-result.best{border-color:#ffd4df;box-shadow:0 7px 22px #ff385c0d}.flight-best-badge{display:inline-flex;border-radius:999px;background:#fff0f4;color:#d91449;padding:5px 8px;font-size:9px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;margin-bottom:11px}
      .main-flight-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.main-flight-route{display:flex;align-items:center;gap:8px;min-width:0}.main-flight-airport b{display:block;font-size:19px;line-height:1}.main-flight-airport span{display:block;font-size:10px;color:#888;margin-top:4px;max-width:86px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.main-flight-arrow{color:#bbb;font-size:18px;font-weight:800}.main-flight-price{text-align:right;font-size:22px;font-weight:900;line-height:1;white-space:nowrap}.main-flight-price small{display:block;color:#999;font-size:9px;letter-spacing:.05em;text-transform:uppercase;margin-top:5px}
      .main-flight-dates{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;background:#fafafa;border:1px solid #f0f0f0;border-radius:17px;padding:11px 12px;margin-top:13px}.main-flight-date span{display:block;color:#aaa;font-size:8px;text-transform:uppercase;font-weight:900;letter-spacing:.08em}.main-flight-date b{display:block;font-size:12px;margin-top:3px}.main-flight-date:last-child{text-align:right}.main-flight-nights{text-align:center;color:#999;font-size:9px;font-weight:750;margin-top:5px}
      .main-flight-leg{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 1px 0}.main-flight-leg.return{border-top:1px solid #f2f2f2;margin-top:8px}.main-flight-leg span{font-size:9px;font-weight:900;color:#999;text-transform:uppercase;letter-spacing:.06em}.main-flight-leg b{font-size:12px;white-space:nowrap}.main-flight-facts{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px}.main-flight-fact{border-radius:999px;background:#f5f5f5;padding:6px 8px;font-size:10px;font-weight:800;color:#555}.main-flight-fact.direct{background:#edf9f1;color:#23613f}.main-flight-fact.stop{background:#fff7e6;color:#775900}
      .main-price-check{margin-top:11px;border:1px solid #dff2e7;background:#f4fbf7;border-radius:15px;padding:10px 11px}.main-price-check-label{font-size:8px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#4d8a66}.main-price-check-main{font-size:11px;font-weight:850;line-height:1.35;color:#244f36;margin-top:4px}.main-price-check-sub{font-size:10px;line-height:1.4;color:#63806d;margin-top:3px}.main-price-check-bags{font-size:9px;color:#71857a;margin-top:5px;line-height:1.35}
      .main-flight-budget{margin-top:10px;border-radius:13px;padding:9px 10px;font-size:10px;font-weight:800}.main-flight-budget.good{background:#effaf4;color:#23613f}.main-flight-budget.over{background:#fff1f4;color:#b21f43}
      .main-flight-actions{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:12px}.main-flight-add{border:0;border-radius:14px;background:#fff0f4;color:#d91449;padding:11px 13px;font-weight:900;font-size:11px}.main-flight-add.added{background:#effaf4;color:#24613e}.main-flight-open{border:1px solid #e8e8e8;border-radius:14px;background:#fff;color:#555;padding:11px 12px;font-size:11px;font-weight:800;text-decoration:none;white-space:nowrap}.main-flight-more{width:100%;border:1px solid #e9e9e9;border-radius:15px;background:#fff;color:#555;padding:11px;margin-top:11px;font-size:11px;font-weight:850}

      /* Saved flight ideas use a compact travel card instead of a giant empty image. */
      .saved-flight-card{border:1px solid #e7e7e7;border-radius:26px;padding:16px;background:#fff;box-shadow:0 6px 20px #00000005;position:relative}.saved-flight-card .heart{position:absolute;right:14px;top:14px;z-index:2}.saved-flight-source{display:inline-flex;border-radius:999px;background:#f7f7f7;padding:6px 9px;font-size:9px;font-weight:850;color:#666;margin-bottom:16px}.saved-flight-top{padding-right:74px}.saved-flight-top h3{margin:0;font-size:17px;letter-spacing:-.3px;line-height:1.25}.saved-flight-price{font-size:20px;font-weight:900;margin-top:5px}.saved-flight-price small{font-size:10px;color:#999;font-weight:750;margin-left:3px}.saved-flight-card .cardlinks{margin-top:13px}.saved-flight-card .meta{margin-top:10px}.saved-flight-note{font-size:11px;color:#777;line-height:1.45;margin:10px 0 0}
      @media(min-width:760px){.flight-search-card{padding:22px}.main-flight-results{grid-template-columns:1fr 1fr}.flight-hub{margin-top:28px}}
    `;
    document.head.appendChild(style);
  }

  function prettyDate(value) {
    if (!value) return '—';
    const d = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', timeZone:'UTC' });
  }
  function nightsBetween(a, b) {
    if (!a || !b) return null;
    const x = Date.parse(`${a}T12:00:00Z`), y = Date.parse(`${b}T12:00:00Z`);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return Math.round((y - x) / 86400000);
  }
  function timeOnly(value) {
    if (!value) return '';
    const m = String(value).match(/(?:T|\s)(\d{1,2}:\d{2})/);
    return m ? m[1] : String(value);
  }
  function airportName(code) { return airportNames[String(code || '').toUpperCase()] || String(code || ''); }
  function formatPriceCheck(row) {
    const check = row?.price_check;
    if (!check?.checked) return '';
    const cheapest = check.cheapest, direct = check.direct;
    const currency = cheapest?.currency || direct?.currency || row.currency || 'GBP';
    const s = moneySymbol(currency);
    let main = 'Booking prices checked automatically', sub = '';
    if (cheapest && direct) {
      const same = Math.abs(Number(cheapest.price) - Number(direct.price)) < .01;
      if (same) { main = `Best price is direct · ${s}${Number(direct.price).toLocaleString('en-GB')}`; sub = direct.seller || 'Airline direct'; }
      else { main = `Cheapest ${s}${Number(cheapest.price).toLocaleString('en-GB')} · ${html(cheapest.seller)}`; const premium = Number(check.direct_premium); sub = `Airline direct ${s}${Number(direct.price).toLocaleString('en-GB')} · ${html(direct.seller)}${Number.isFinite(premium) && premium > 0 ? ` · +${s}${premium.toLocaleString('en-GB')}` : ''}`; }
    } else if (cheapest) { main = `Best booking price ${s}${Number(cheapest.price).toLocaleString('en-GB')}`; sub = `${html(cheapest.seller)}${cheapest.airline_direct ? ' · airline direct' : ''}`; }
    else sub = 'No seller-level booking price was returned.';
    const bagRows = check?.baggage_prices && typeof check.baggage_prices === 'object'
      ? [...(check.baggage_prices.together || []), ...(check.baggage_prices.departing || []), ...(check.baggage_prices.returning || [])]
      : [];
    const bags = [...new Set(bagRows.map(String).filter(Boolean))].slice(0,2).join(' · ');
    return `<div class="main-price-check"><div class="main-price-check-label">✓ Auto price check</div><div class="main-price-check-main">${main}</div>${sub ? `<div class="main-price-check-sub">${sub}</div>` : ''}${bags ? `<div class="main-price-check-bags">${html(bags)}</div>` : ''}</div>`;
  }

  async function loadSupabase() {
    if (window.supabase?.createClient) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load flight search service.'));
      document.head.appendChild(script);
    });
  }
  async function session() {
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async () => {
      await loadSupabase();
      client ||= window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data: current, error: currentError } = await client.auth.getSession();
      if (currentError) throw currentError;
      if (current?.session) return current.session;
      const { data, error } = await client.auth.signInAnonymously();
      if (error) throw error;
      return data.session;
    })();
    try { return await sessionPromise; } catch (e) { sessionPromise = null; throw e; }
  }

  function buildHub() {
    if (document.getElementById('flightHub')) return;
    const title = document.querySelector('.title');
    if (!title) return;
    const hub = document.createElement('section');
    hub.id = 'flightHub';
    hub.className = 'flight-hub';
    hub.innerHTML = `
      <div class="flight-search-card">
        <div class="flight-search-head"><div><div class="flight-search-kicker">Live flight search</div><h2>What kind of flights work?</h2><p>Write it normally. We’ll understand the dates, airports, trip length and budget, search live Google Flights data, then automatically price-check the best two options.</p></div><div class="flight-search-icon">✈</div></div>
        <textarea id="mainFlightQuery" class="flight-query" placeholder="e.g. Return flights to Malta from any Scottish airport between 3 and 10 May 2027 for 7 nights, preferably early flights, under £150 per person."></textarea>
        <div class="flight-examples">
          <button class="flight-example" type="button" data-flight-example="Find return flights to Malta from any Scottish airport leaving between 3 and 10 May 2027 for 7 nights, ideally early morning flights, under £150 per person.">Malta · flexible</button>
          <button class="flight-example" type="button" data-flight-example="Find return flights from Glasgow or Prestwick sometime in May 2027 for 4 to 5 nights, cheapest first, under £120 each. I don't mind where we go.">Anywhere · cheap</button>
          <button class="flight-example" type="button" data-flight-example="Find return flights to Faro from Glasgow or Edinburgh between 8 and 15 May 2027 for 5 nights, direct if possible, under £130 per person.">Faro · direct</button>
        </div>
        <button id="mainFlightSearch" class="flight-search-btn" type="button">Find flights</button>
        <div class="flight-search-note">Live prices can change. The strongest two results are automatically checked against Google Flights booking options, including airline-direct pricing where available.</div>
        <div id="mainFlightStatus" class="flight-search-status"></div>
        <div id="mainFlightUnderstood" class="flight-understood"></div>
      </div>
      <div id="mainFlightLiveResults" class="flight-live-results"><div class="flight-results-head"><h3>Best options</h3><span id="mainFlightMeta"></span></div><div id="mainFlightResults" class="main-flight-results"></div><button id="mainFlightMore" class="main-flight-more" type="button" style="display:none">Show more flights</button></div>`;
    title.parentNode.insertBefore(hub, title);

    hub.querySelectorAll('[data-flight-example]').forEach((button) => button.addEventListener('click', () => {
      document.getElementById('mainFlightQuery').value = button.dataset.flightExample || '';
    }));
    document.getElementById('mainFlightSearch')?.addEventListener('click', runFlightSearch);
    document.getElementById('mainFlightMore')?.addEventListener('click', () => { visibleResults += 6; renderLiveResults(); });
  }

  function setStatus(text, kind='') {
    const el = document.getElementById('mainFlightStatus');
    if (!el) return;
    el.textContent = text;
    el.className = `flight-search-status show${kind ? ' ' + kind : ''}`;
  }

  function understoodMarkup(data) {
    const i = data?.intent || {};
    const origins = (i.departure_airports || []).join(', ') || 'departure airport';
    const dest = i.destination_text || 'anywhere';
    const depart = i.outbound_date_start ? (i.outbound_date_end && i.outbound_date_end !== i.outbound_date_start ? `${prettyDate(i.outbound_date_start)} – ${prettyDate(i.outbound_date_end)}` : prettyDate(i.outbound_date_start)) : 'dates not specified';
    const trip = i.trip_length_days_min ? (i.trip_length_days_max && i.trip_length_days_max !== i.trip_length_days_min ? `${i.trip_length_days_min}–${i.trip_length_days_max} nights` : `${i.trip_length_days_min} nights`) : (i.trip_type === 'one_way' ? 'one way' : 'return trip');
    const facts = [];
    facts.push(origins);
    facts.push(depart);
    facts.push(trip);
    if (typeof i.max_price === 'number') facts.push(`${moneySymbol(i.currency)}${i.max_price} max`);
    if (i.time_preference && i.time_preference !== 'any') facts.push(`${i.time_preference} preferred`);
    if (i.stops === 'nonstop') facts.push('direct only');
    return `<div class="flight-understood-label">What we understood</div><div class="flight-understood-main">${html(origins)} → ${html(dest)}</div><div class="flight-understood-facts">${facts.map((x) => `<span class="flight-understood-fact">${html(x)}</span>`).join('')}</div>`;
  }

  async function runFlightSearch() {
    const input = document.getElementById('mainFlightQuery');
    const button = document.getElementById('mainFlightSearch');
    const query = String(input?.value || '').trim();
    if (query.length < 8) { input?.focus(); return; }
    button.disabled = true;
    button.textContent = 'Understanding your trip…';
    document.getElementById('mainFlightLiveResults')?.classList.remove('show');
    document.getElementById('mainFlightUnderstood')?.classList.remove('show');
    parsed = null; live = null; visibleResults = 6;
    try {
      const s = await session();
      setStatus('Understanding airports, dates, budget and preferences…');
      const parseResponse = await fetch(PARSE_URL, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.access_token}`,'apikey':SUPABASE_KEY}, body:JSON.stringify({ query }) });
      const parseData = await parseResponse.json().catch(() => ({}));
      if (!parseResponse.ok) throw new Error(parseData.error || `Could not understand the request (${parseResponse.status})`);
      if (!parseData.live_search_ready) throw new Error(`A little more information is needed: ${(parseData.blocking_fields || []).join(', ') || 'check the request'}.`);
      parsed = parseData;
      const understood = document.getElementById('mainFlightUnderstood');
      understood.innerHTML = understoodMarkup(parseData);
      understood.classList.add('show');

      button.textContent = 'Searching live flights…';
      setStatus('Searching Google Flights and checking return legs…');
      const searchResponse = await fetch(SEARCH_URL, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${s.access_token}`,'apikey':SUPABASE_KEY}, body:JSON.stringify({ serpapi_plan:parseData.serpapi_plan, intent:parseData.intent }) });
      const searchData = await searchResponse.json().catch(() => ({}));
      if (!searchResponse.ok) throw new Error(searchData.error || `Flight search failed (${searchResponse.status})`);
      live = searchData;
      renderLiveResults();
      setStatus(`Found ${searchData.result_count || 0} live option${searchData.result_count === 1 ? '' : 's'}. The top ${searchData.booking_checks_loaded || 0} were automatically price-checked.`, 'ok');
    } catch (e) {
      setStatus(e?.message || String(e), 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Find flights';
    }
  }

  function resultFingerprint(row) {
    return [row.departure_airport,row.arrival_airport,row.outbound_date,row.return_date,row.departure_time,row.return_departure_time,row.flight_number].filter(Boolean).join('|');
  }
  function isAdded(row) {
    const fp = resultFingerprint(row);
    try { return options.some((o) => o.type === 'flight' && o.flightMeta?.fingerprint === fp); } catch { return false; }
  }

  function resultCard(row, index) {
    const dep = String(row.departure_airport || '—').toUpperCase();
    const arr = String(row.arrival_airport || '—').toUpperCase();
    const nights = nightsBetween(row.outbound_date, row.return_date);
    const outA = timeOnly(row.departure_time), outB = timeOnly(row.arrival_time);
    const retA = timeOnly(row.return_departure_time), retB = timeOnly(row.return_arrival_time);
    const facts = [];
    if (row.airline) facts.push(`<span class="main-flight-fact">${html(row.airline)}</span>`);
    if (typeof row.stops === 'number') facts.push(`<span class="main-flight-fact ${row.stops === 0 ? 'direct' : 'stop'}">${row.stops === 0 ? 'Direct' : `${row.stops} stop${row.stops === 1 ? '' : 's'}`}</span>`);
    if (row.total_duration) { const h = Math.floor(row.total_duration / 60), m = row.total_duration % 60; facts.push(`<span class="main-flight-fact">${h}h${m ? ` ${m}m` : ''}</span>`); }
    const budget = Number(live?.budget);
    let budgetLine = '';
    if (Number.isFinite(budget) && budget > 0) budgetLine = row.within_budget === true ? `<div class="main-flight-budget good">✓ Within your ${moneySymbol(row.currency)}${budget} budget</div>` : row.within_budget === false ? `<div class="main-flight-budget over">${moneySymbol(row.currency)}${Math.max(0,Math.round(Number(row.price)-budget))} over your ${moneySymbol(row.currency)}${budget} budget</div>` : '';
    const added = isAdded(row);
    return `<article class="main-flight-result ${index < 2 ? 'best' : ''}" data-live-flight="${index}">
      ${index < 2 ? `<div class="flight-best-badge">${index === 0 ? 'Best match' : 'Next best'}${row.price_check?.checked ? ' · price checked' : ''}</div>` : ''}
      <div class="main-flight-top"><div class="main-flight-route"><div class="main-flight-airport"><b>${html(dep)}</b><span>${html(airportName(dep))}</span></div><div class="main-flight-arrow">→</div><div class="main-flight-airport"><b>${html(arr)}</b><span>${html(airportName(arr))}</span></div></div><div class="main-flight-price">${moneySymbol(row.currency)}${Number(row.price || 0).toLocaleString('en-GB')}<small>${row.return_date ? 'return' : 'one way'}</small></div></div>
      <div class="main-flight-dates"><div class="main-flight-date"><span>Out</span><b>${html(prettyDate(row.outbound_date))}</b></div><div class="main-flight-arrow">→</div><div class="main-flight-date"><span>${row.return_date ? 'Return' : 'One way'}</span><b>${html(prettyDate(row.return_date || row.outbound_date))}</b></div></div>
      ${nights ? `<div class="main-flight-nights">${nights} night${nights === 1 ? '' : 's'}</div>` : ''}
      ${(outA || outB) ? `<div class="main-flight-leg"><span>Outbound</span><b>${html(outA || '—')} → ${html(outB || '—')}</b></div>` : ''}
      ${row.return_date ? `<div class="main-flight-leg return"><span>Return</span><b>${retA || retB ? `${html(retA || '—')} → ${html(retB || '—')}` : 'Open result for times'}</b></div>` : ''}
      <div class="main-flight-facts">${facts.join('')}</div>
      ${budgetLine}
      ${formatPriceCheck(row)}
      <div class="main-flight-actions"><button class="main-flight-add ${added ? 'added' : ''}" type="button" data-add-live-flight="${index}" ${added ? 'disabled' : ''}>${added ? '✓ Added to board' : '＋ Add to board'}</button>${row.google_flights_url ? `<a class="main-flight-open" href="${html(row.google_flights_url)}" target="_blank" rel="noopener">Google Flights ↗</a>` : ''}</div>
    </article>`;
  }

  function renderLiveResults() {
    const wrap = document.getElementById('mainFlightLiveResults');
    const results = document.getElementById('mainFlightResults');
    const meta = document.getElementById('mainFlightMeta');
    const more = document.getElementById('mainFlightMore');
    if (!wrap || !results || !live) return;
    const rows = Array.isArray(live.results) ? live.results : [];
    const shown = rows.slice(0, visibleResults);
    results.innerHTML = shown.length ? shown.map(resultCard).join('') : '<div class="empty" style="grid-column:1/-1"><div class="bubble">✈</div><h3>No matching flights</h3><p>Try widening the dates, increasing the budget, or removing a time/stop preference.</p></div>';
    meta.textContent = `${rows.length} live option${rows.length === 1 ? '' : 's'}${live.searches_used ? ` · ${live.searches_used} date searches` : ''}${live.booking_checks_loaded ? ` · ${live.booking_checks_loaded} price checked` : ''}`;
    wrap.classList.add('show');
    more.style.display = visibleResults < rows.length ? 'block' : 'none';
    more.textContent = `Show ${Math.min(6, rows.length-visibleResults)} more flight${rows.length-visibleResults === 1 ? '' : 's'}`;
    results.querySelectorAll('[data-add-live-flight]').forEach((button) => button.addEventListener('click', () => addFlightToBoard(Number(button.dataset.addLiveFlight))));
  }

  function addFlightToBoard(index) {
    const row = live?.results?.[index];
    if (!row) return;
    const me = (() => { try { return profile || JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); } catch { return null; } })();
    const dep = String(row.departure_airport || '').toUpperCase(), arr = String(row.arrival_airport || '').toUpperCase();
    const nights = nightsBetween(row.outbound_date, row.return_date);
    const outA=timeOnly(row.departure_time), outB=timeOnly(row.arrival_time), retA=timeOnly(row.return_departure_time), retB=timeOnly(row.return_arrival_time);
    const direct = row.stops === 0 ? 'Direct' : (typeof row.stops === 'number' ? `${row.stops} stop${row.stops === 1 ? '' : 's'}` : '');
    const checked = row.price_check?.checked;
    let checkNote = '';
    if (checked?.cheapest) {
      const cheapest = checked.cheapest, directPrice = checked.direct;
      checkNote = `Price checked: cheapest ${moneySymbol(cheapest.currency || row.currency)}${Number(cheapest.price).toLocaleString('en-GB')} via ${cheapest.seller}${directPrice ? `; airline direct ${moneySymbol(directPrice.currency || row.currency)}${Number(directPrice.price).toLocaleString('en-GB')} via ${directPrice.seller}` : ''}.`;
    }
    const note = [
      outA || outB ? `Outbound ${outA || '—'}–${outB || '—'}` : '',
      retA || retB ? `Return ${retA || '—'}–${retB || '—'}` : '',
      row.airline || '', direct, checkNote
    ].filter(Boolean).join(' · ');
    const option = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`,
      type:'flight',
      url: row.google_flights_url || 'https://www.google.com/travel/flights',
      title:`${airportName(dep) || dep} ↔ ${airportName(arr) || arr}${row.airline ? ` · ${row.airline}` : ''}`,
      dates:[prettyDate(row.outbound_date), prettyDate(row.return_date)].filter(Boolean).join(' – '),
      guests: parsed?.intent ? `${parsed.intent.adults || 1} adult${(parsed.intent.adults || 1) === 1 ? '' : 's'}${parsed.intent.children ? ` · ${parsed.intent.children} child${parsed.intent.children === 1 ? '' : 'ren'}` : ''}` : '',
      price:`${moneySymbol(row.currency)}${Number(row.price || 0).toLocaleString('en-GB')} return`,
      perPerson:'', note,
      cancellation:'', image:'', source:'Google Flights',
      addedBy:me?.name || 'You', colour:me?.colour || '#DFE7FD', avatar:me?.avatar || '',
      votes:0, voted:false, createdAt:Date.now(),
      flightMeta:{
        fingerprint:resultFingerprint(row), departure_airport:dep, arrival_airport:arr, outbound_date:row.outbound_date, return_date:row.return_date,
        departure_time:row.departure_time, arrival_time:row.arrival_time, return_departure_time:row.return_departure_time, return_arrival_time:row.return_arrival_time,
        airline:row.airline, stops:row.stops, total_duration:row.total_duration, return_total_duration:row.return_total_duration, price:row.price, currency:row.currency,
        price_check:row.price_check || null, nights:nights || null
      }
    };
    options.unshift(option);
    persist();
    render();
    renderLiveResults();
    if (typeof toast === 'function') toast('Flight added to the board');
  }

  function priceCheckSavedMarkup(meta) {
    return meta?.price_check?.checked ? formatPriceCheck({ price_check:meta.price_check, currency:meta.currency }) : '';
  }

  function savedFlightCard(o) {
    const m = o.flightMeta || {};
    const voted = !!o.voted, votes = Math.max(0, o.votes || 0);
    const dep = m.departure_airport || '', arr = m.arrival_airport || '';
    const outA=timeOnly(m.departure_time), outB=timeOnly(m.arrival_time), retA=timeOnly(m.return_departure_time), retB=timeOnly(m.return_arrival_time);
    const facts=[];
    if(m.airline)facts.push(`<span class="main-flight-fact">${html(m.airline)}</span>`);
    if(typeof m.stops==='number')facts.push(`<span class="main-flight-fact ${m.stops===0?'direct':'stop'}">${m.stops===0?'Direct':`${m.stops} stop${m.stops===1?'':'s'}`}</span>`);
    if(m.total_duration){const h=Math.floor(m.total_duration/60),mm=m.total_duration%60;facts.push(`<span class="main-flight-fact">${h}h${mm?` ${mm}m`:''}</span>`)}
    return `<article class="saved-flight-card option" data-id="${html(o.id)}" data-type="flight" data-votes="${votes}">
      <span class="saved-flight-source">Google Flights</span>
      <button class="heart ${voted?'on':''}" data-vote="${html(o.id)}" aria-label="${voted?'Remove vote':'Vote for this option'}"><span class="heart-glyph">${voted?'♥':'♡'}</span><span class="heart-count">${votes}</span></button>
      <div class="saved-flight-top"><h3>${html(o.title || `${dep} ↔ ${arr}`)}</h3><div class="saved-flight-price">${html(o.price || '')}<small>${m.nights ? ` · ${m.nights} nights` : ''}</small></div></div>
      <div class="main-flight-dates"><div class="main-flight-date"><span>Out</span><b>${html(prettyDate(m.outbound_date))}</b></div><div class="main-flight-arrow">→</div><div class="main-flight-date"><span>Return</span><b>${html(prettyDate(m.return_date))}</b></div></div>
      ${(outA||outB)?`<div class="main-flight-leg"><span>Outbound</span><b>${html(outA||'—')} → ${html(outB||'—')}</b></div>`:''}
      ${(retA||retB)?`<div class="main-flight-leg return"><span>Return</span><b>${html(retA||'—')} → ${html(retB||'—')}</b></div>`:''}
      <div class="main-flight-facts">${facts.join('')}</div>
      ${priceCheckSavedMarkup(m)}
      ${o.note ? `<p class="saved-flight-note">${html(o.note)}</p>` : ''}
      <div class="cardlinks"><a class="openlink" href="${html(o.url)}" target="_blank" rel="noopener">Open Google Flights ↗</a><button class="more cardmore" data-delete="${html(o.id)}" aria-label="More options">⋯</button></div>
      <div class="meta"><div class="who"><span class="mini" style="background:${html(o.colour)}">${o.avatar?`<img src="${html(o.avatar)}" alt="">`:html((o.addedBy||'?')[0].toUpperCase())}</span>Added by ${html(o.addedBy||'Someone')}</div></div>
    </article>`;
  }

  function installSavedCardRenderer() {
    if (typeof card !== 'function' || window.__holidayFlightCardWrapped) return;
    const baseCard = card;
    card = function(o) { return o?.type === 'flight' && o?.flightMeta ? savedFlightCard(o) : baseCard(o); };
    window.__holidayFlightCardWrapped = true;
  }

  function syncFlightMode() {
    const hub = document.getElementById('flightHub');
    const title = document.querySelector('.title h2');
    const isFlight = typeof currentFilter !== 'undefined' && currentFilter === 'flight';
    hub?.classList.toggle('show', isFlight);
    if (title) title.textContent = isFlight ? 'Saved flight ideas' : 'Ideas';
  }

  function wrapRender() {
    if (typeof render !== 'function' || window.__holidayFlightRenderWrapped) return;
    const baseRender = render;
    render = function() { baseRender(); syncFlightMode(); };
    window.__holidayFlightRenderWrapped = true;
  }

  injectStyles();
  buildHub();
  installSavedCardRenderer();
  wrapRender();
  document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => setTimeout(syncFlightMode, 0)));
  try { render(); } catch { syncFlightMode(); }
})();