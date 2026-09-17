(() => {
  const style = document.createElement('style');
  style.textContent = `
    .flightResults{gap:14px!important}
    .flightCard{border-radius:24px!important;border:1px solid #e7e7e7!important;box-shadow:0 6px 20px #00000005;overflow:hidden;background:#fff}
    .flightBody{padding:16px!important}
    .flightTop{align-items:flex-start!important}
    .routeHero{display:flex;align-items:center;gap:9px;min-width:0}
    .airportBlock{min-width:0}.airportCode{font-size:20px;font-weight:900;letter-spacing:-.4px;line-height:1}.airportName{font-size:11px;color:#888;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:115px}
    .routeArrow{font-size:20px;color:#bbb;font-weight:700;flex:0 0 auto}
    .fare{font-size:23px!important;line-height:1!important;text-align:right}.fare small{display:block;font-size:10px;color:#999;font-weight:750;margin-top:5px;text-transform:uppercase;letter-spacing:.04em}
    .tripDates{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-top:15px;background:#fafafa;border:1px solid #f0f0f0;border-radius:18px;padding:12px 13px}
    .tripDate span{display:block;font-size:9px;font-weight:900;color:#a1a1a1;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}.tripDate b{display:block;font-size:14px;line-height:1.2}.tripDate:last-child{text-align:right}.tripDateArrow{color:#bbb;font-weight:800}.nights{text-align:center;margin-top:7px;color:#888;font-size:10px;font-weight:750}
    .outboundRow{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:13px;padding:0 2px}.outboundLabel{font-size:10px;font-weight:900;color:#999;text-transform:uppercase;letter-spacing:.06em}.outboundTimes{font-size:14px;font-weight:850;color:#333;white-space:nowrap}
    .smallFacts{margin-top:12px!important}.fact{font-size:11px!important;padding:7px 9px!important}.fact.airline{background:#f4f4f4}.fact.direct{background:#edf9f1;color:#23613f}.fact.stop{background:#fff7e6;color:#7b5c00}
    .budgetLine{margin-top:12px;border-radius:14px;padding:10px 11px;font-size:11px;font-weight:800}.budgetLine.good{background:#effaf4;color:#23613f}.budgetLine.over{background:#fff1f4;color:#b21f43}.budgetLine.neutral{background:#f7f7f7;color:#666}
    .openFlight{margin-top:13px!important;color:#d91449!important;text-decoration:none!important}
    .liveMeta{font-size:12px!important;line-height:1.4}
    @media(max-width:520px){.airportCode{font-size:18px}.airportName{max-width:92px}.fare{font-size:21px!important}.tripDate b{font-size:13px}.outboundTimes{font-size:13px}}
  `;
  document.head.appendChild(style);

  const airportNames = {
    EDI:'Edinburgh', GLA:'Glasgow', PIK:'Prestwick', ABZ:'Aberdeen', INV:'Inverness', DND:'Dundee',
    MLA:'Malta', FAO:'Faro', PMI:'Palma', ALC:'Alicante', BCN:'Barcelona', AMS:'Amsterdam', CDG:'Paris CDG', ORY:'Paris Orly'
  };

  const safe = (v) => typeof esc === 'function' ? esc(v) : String(v ?? '');
  const moneySymbol = (c) => typeof symbol === 'function' ? symbol(c) : (c === 'GBP' ? '£' : c === 'EUR' ? '€' : c === 'USD' ? '$' : `${c || ''} `);
  const duration = (v) => typeof mins === 'function' ? mins(v) : '';

  function prettyDate(value) {
    if (!value) return '—';
    const d = new Date(`${value}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', timeZone:'UTC' });
  }
  function prettyRange(a, b) {
    if (!a && !b) return 'Not specified';
    if (!b || a === b) return prettyDate(a || b);
    return `${prettyDate(a)} → ${prettyDate(b)}`;
  }
  function nightsBetween(a, b) {
    if (!a || !b) return null;
    const x = Date.parse(`${a}T12:00:00Z`), y = Date.parse(`${b}T12:00:00Z`);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return Math.round((y - x) / 86400000);
  }
  function timeOnly(value) {
    if (!value) return '';
    const match = String(value).match(/(?:T|\s)(\d{1,2}:\d{2})/);
    return match ? match[1] : String(value);
  }
  function airportMarkup(code) {
    const c = String(code || '—').toUpperCase();
    return `<div class="airportBlock"><div class="airportCode">${safe(c)}</div><div class="airportName">${safe(airportNames[c] || c)}</div></div>`;
  }
  function dateStrip(outbound, ret) {
    if (!outbound && !ret) return '';
    const nights = nightsBetween(outbound, ret);
    return `<div class="tripDates">
      <div class="tripDate"><span>Out</span><b>${safe(prettyDate(outbound))}</b></div>
      <div class="tripDateArrow">→</div>
      <div class="tripDate"><span>${ret ? 'Return' : 'One way'}</span><b>${safe(prettyDate(ret || outbound))}</b></div>
    </div>${nights && nights > 0 ? `<div class="nights">${nights} night${nights === 1 ? '' : 's'}</div>` : ''}`;
  }
  function budgetMarkup(r, data) {
    const budget = Number(data?.budget);
    if (!Number.isFinite(budget) || budget <= 0) return '';
    if (r.within_budget === true) return `<div class="budgetLine good">✓ Within your £${budget} budget</div>`;
    if (r.within_budget === false) {
      const diff = Number(r.budget_difference);
      const over = Number.isFinite(diff) ? Math.max(0, diff) : Math.max(0, Number(r.price || 0) - budget);
      return `<div class="budgetLine over">£${Math.round(over)} over your £${budget} budget</div>`;
    }
    return `<div class="budgetLine neutral">Budget target: £${budget}</div>`;
  }

  if (typeof render === 'function') {
    const originalRender = render;
    render = function(data) {
      originalRender(data);
      const i = data.intent || {};
      const depart = document.getElementById('departDates');
      const ret = document.getElementById('returnDates');
      if (depart) depart.textContent = prettyRange(i.outbound_date_start, i.outbound_date_end);
      if (ret) {
        if (i.trip_length_days_min || i.trip_length_days_max) {
          const a = i.trip_length_days_min || i.trip_length_days_max;
          const b = i.trip_length_days_max || i.trip_length_days_min;
          ret.textContent = a === b ? `${a} nights` : `${a}–${b} nights`;
        } else ret.textContent = prettyRange(i.return_date_start, i.return_date_end);
      }
      const prefs = document.getElementById('prefs');
      if (prefs) prefs.innerHTML = prefs.innerHTML.replace(/round_trip/g, 'return trip').replace(/one_way/g, 'one way');
    };
  }

  renderFlights = function(data) {
    const rows = Array.isArray(data.results) ? data.results : [];
    const meta = document.getElementById('liveMeta');
    const results = document.getElementById('flightResults');
    if (!meta || !results) return;

    const searchCount = data.searches_used ? ` · ${data.searches_used} sampled date searches` : '';
    meta.textContent = `${rows.length} flight option${rows.length === 1 ? '' : 's'}${searchCount} · ${(Number(data.elapsed_ms || 0)/1000).toFixed(1)}s`;
    meta.classList.add('show');

    if (!rows.length) {
      results.innerHTML = '<div class="emptyFlights">No flights came back for those dates. Try a wider date window, another departure airport, or a higher budget.</div>';
      return;
    }

    results.innerHTML = rows.map((r) => {
      if (r.kind === 'deal') {
        const facts = [];
        if (r.airline) facts.push(`<span class="fact airline">${safe(r.airline)}</span>`);
        if (typeof r.stops === 'number') facts.push(`<span class="fact ${r.stops === 0 ? 'direct' : 'stop'}">${r.stops === 0 ? 'Direct' : `${r.stops} stop${r.stops === 1 ? '' : 's'}`}</span>`);
        if (r.duration_minutes) facts.push(`<span class="fact">${safe(duration(r.duration_minutes))}</span>`);
        return `<article class="flightCard">
          ${r.image ? `<img class="flightImg" src="${safe(r.image)}" alt="">` : ''}
          <div class="flightBody">
            <div class="flightTop"><div class="routeHero">${airportMarkup(r.departure_airport)}<div class="routeArrow">→</div>${airportMarkup(r.arrival_airport)}</div><div class="fare">${moneySymbol(r.currency)}${Number(r.price).toLocaleString('en-GB')}<small>return</small></div></div>
            ${dateStrip(r.outbound_date, r.return_date)}
            <div class="smallFacts">${facts.join('')}</div>
            ${budgetMarkup(r, data)}
            ${r.google_flights_url ? `<a class="openFlight" target="_blank" rel="noopener" href="${safe(r.google_flights_url)}">Open in Google Flights ↗</a>` : ''}
          </div>
        </article>`;
      }

      const facts = [];
      if (r.airline) facts.push(`<span class="fact airline">${safe(r.airline)}</span>`);
      if (typeof r.stops === 'number') facts.push(`<span class="fact ${r.stops === 0 ? 'direct' : 'stop'}">${r.stops === 0 ? 'Direct' : `${r.stops} stop${r.stops === 1 ? '' : 's'}`}</span>`);
      if (r.total_duration) facts.push(`<span class="fact">${safe(duration(r.total_duration))}</span>`);
      const dep = timeOnly(r.departure_time), arr = timeOnly(r.arrival_time);
      const fareLabel = r.return_date ? 'return' : 'one way';
      return `<article class="flightCard"><div class="flightBody">
        <div class="flightTop"><div class="routeHero">${airportMarkup(r.departure_airport)}<div class="routeArrow">→</div>${airportMarkup(r.arrival_airport)}</div><div class="fare">${moneySymbol(r.currency)}${Number(r.price).toLocaleString('en-GB')}<small>${fareLabel}</small></div></div>
        ${dateStrip(r.outbound_date, r.return_date)}
        ${(dep || arr) ? `<div class="outboundRow"><span class="outboundLabel">Outbound flight</span><span class="outboundTimes">${safe(dep || '—')} → ${safe(arr || '—')}</span></div>` : ''}
        <div class="smallFacts">${facts.join('')}</div>
        ${budgetMarkup(r, data)}
        ${r.google_flights_url ? `<a class="openFlight" target="_blank" rel="noopener" href="${safe(r.google_flights_url)}">Open in Google Flights ↗</a>` : ''}
      </div></article>`;
    }).join('');
  };
})();
