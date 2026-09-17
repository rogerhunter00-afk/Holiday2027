(() => {
  const style = document.createElement('style');
  style.textContent = `
    .autoPriceCheck{margin-top:12px;border:1px solid #dff2e7;background:#f4fbf7;border-radius:16px;padding:11px 12px;color:#245a3b}
    .autoPriceCheck .pcLabel{font-size:9px;font-weight:900;letter-spacing:.08em;text-transform:uppercase;color:#4d8a66;margin-bottom:5px}
    .autoPriceCheck .pcMain{font-size:12px;font-weight:850;line-height:1.35;color:#244f36}
    .autoPriceCheck .pcSub{font-size:11px;line-height:1.4;color:#63806d;margin-top:3px}
    .autoPriceCheck .pcBags{font-size:10px;line-height:1.4;color:#71857a;margin-top:6px}
    .autoPriceCheck .pcTick{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:999px;background:#dff3e7;margin-right:6px;font-size:11px;vertical-align:-2px}
  `;
  document.head.appendChild(style);

  const baseRenderFlights = typeof renderFlights === 'function' ? renderFlights : null;
  const sym = (c) => c === 'GBP' ? '£' : c === 'EUR' ? '€' : c === 'USD' ? '$' : `${c || ''} `;
  const safeText = (v) => String(v ?? '');

  function baggageText(check) {
    const b = check?.baggage_prices;
    if (!b || typeof b !== 'object') return '';
    const rows = [...(Array.isArray(b.together) ? b.together : []), ...(Array.isArray(b.departing) ? b.departing : []), ...(Array.isArray(b.returning) ? b.returning : [])];
    return [...new Set(rows.map(safeText).filter(Boolean))].slice(0, 2).join(' · ');
  }

  function priceCheckMarkup(row) {
    const check = row?.price_check;
    if (!check?.checked) return '';
    const cheapest = check.cheapest;
    const direct = check.direct;
    const currency = cheapest?.currency || direct?.currency || row.currency || 'GBP';
    const s = sym(currency);
    let main = 'Booking prices checked automatically';
    let sub = '';

    if (cheapest && direct) {
      const samePrice = Math.abs(Number(direct.price) - Number(cheapest.price)) < 0.01;
      if (samePrice && direct.airline_direct) {
        main = `Best price is direct · ${s}${Number(direct.price).toLocaleString('en-GB')}`;
        sub = direct.seller || 'Airline direct';
      } else {
        main = `Cheapest ${s}${Number(cheapest.price).toLocaleString('en-GB')} · ${safeText(cheapest.seller)}`;
        const premium = Number(check.direct_premium);
        sub = `Airline direct ${s}${Number(direct.price).toLocaleString('en-GB')} · ${safeText(direct.seller)}${Number.isFinite(premium) && premium > 0 ? ` · +${s}${premium.toLocaleString('en-GB')}` : ''}`;
      }
    } else if (cheapest) {
      main = `Best booking price ${s}${Number(cheapest.price).toLocaleString('en-GB')}`;
      sub = `${safeText(cheapest.seller)}${cheapest.airline_direct ? ' · airline direct' : ''}`;
    } else {
      sub = 'Google Flights returned no seller-level booking prices for this itinerary.';
    }

    const bags = baggageText(check);
    return `<div class="autoPriceCheck"><div class="pcLabel"><span class="pcTick">✓</span>Auto price check</div><div class="pcMain">${main}</div>${sub ? `<div class="pcSub">${sub}</div>` : ''}${bags ? `<div class="pcBags">${bags}</div>` : ''}</div>`;
  }

  if (baseRenderFlights) {
    renderFlights = function(data) {
      baseRenderFlights(data);
      const rows = Array.isArray(data?.results) ? data.results : [];
      const cards = [...document.querySelectorAll('#flightResults .flightCard')];
      cards.forEach((card, i) => {
        const markup = priceCheckMarkup(rows[i]);
        if (!markup) return;
        const body = card.querySelector('.flightBody') || card;
        const open = body.querySelector('.openFlight');
        const holder = document.createElement('div');
        holder.innerHTML = markup;
        const node = holder.firstElementChild;
        if (open) body.insertBefore(node, open);
        else body.appendChild(node);
      });
      const meta = document.getElementById('liveMeta');
      if (meta && data?.booking_checks_loaded) meta.textContent += ` · ${data.booking_checks_loaded} auto price check${data.booking_checks_loaded === 1 ? '' : 's'}`;
    };
  }
})();
