(() => {
  const style = document.createElement('style');
  style.textContent = `
    :root{--coral:#ff385c;--coral-deep:#e31c5f;--coral-soft:#fff1f4;--coral-line:#ffd4df}

    /* Softer Airbnb-style controls instead of black pills */
    .chip{background:#fff;border-color:#e6e6e6;color:#4b4b4b;transition:.16s ease}
    .chip.on{background:var(--coral-soft);color:var(--coral-deep);border-color:var(--coral-line);box-shadow:inset 0 0 0 1px #fff}
    .chip:active{transform:scale(.97)}
    .title button{color:var(--coral-deep);text-decoration-color:#ffc1d0;text-underline-offset:3px}

    .stepnum{background:#ffe4eb!important;color:#d91449!important}
    .parse{background:linear-gradient(90deg,var(--coral),var(--coral-deep))!important;color:#fff!important;box-shadow:0 6px 16px #ff385c18}
    .ocrbar{background:linear-gradient(90deg,var(--coral),var(--coral-deep))!important}

    /* Mobile already has Add in bottom navigation: don't cover the cards with a second floating button. */
    .fab{display:none}
    @media(min-width:760px){
      .fab{display:block;background:#fff;color:var(--coral-deep);border:1px solid var(--coral-line);box-shadow:0 10px 30px #d9144918}
      .fab:hover{background:var(--coral-soft)}
    }

    /* Vote lives completely in the image now. */
    .heart{
      right:12px;top:12px;width:auto;min-width:46px;height:46px;padding:0 14px;
      border-radius:999px;display:flex;align-items:center;justify-content:center;gap:7px;
      background:rgba(255,255,255,.96);color:#e31c5f;box-shadow:0 4px 18px #00000014;
      font-size:19px;font-weight:850;transition:transform .09s ease,background .10s ease,color .10s ease,box-shadow .10s ease;touch-action:manipulation;
      backdrop-filter:blur(8px)
    }
    .heart .heart-count{font-size:13px;line-height:1;color:#4b4b4b;min-width:8px;text-align:center}
    .heart.on{background:var(--coral);color:#fff;box-shadow:0 6px 20px #ff385c35}
    .heart.on .heart-count{color:#fff}
    .heart:active{transform:scale(.91)}
    .heart.on,.heart.vote-tap{animation:heartPop .16s ease}
    @keyframes heartPop{0%{transform:scale(.88)}55%{transform:scale(1.08)}100%{transform:scale(1)}}

    /* Put the overflow menu beside the original link, not under the floating Add action. */
    .cardlinks{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:10px}
    .cardlinks .openlink{margin-top:0}
    .more.cardmore{
      width:34px;height:34px;border-radius:50%;display:grid;place-items:center;padding:0;
      background:#f7f7f7;border:1px solid #ededed;color:#777;font-size:20px;line-height:1;flex:0 0 auto
    }
    .more.cardmore:active{transform:scale(.94);background:#f0f0f0}
    .meta{justify-content:flex-start}
    .votes{display:none!important}

    /* Cleaner stay-card information hierarchy */
    .stay-secondary{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:5px;color:#717171;font-size:12px;line-height:1.35}
    .stay-secondary .dot{color:#bbb}
    .stay-facts{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
    .stay-fact{display:inline-flex;align-items:center;gap:5px;background:#f7f7f7;border-radius:999px;padding:7px 10px;font-size:11px;color:#555;font-weight:750}
    .stay-price-detail{margin-top:8px;font-size:12px;color:#555;font-weight:750}
    .stay-cancel{display:inline-flex;align-items:center;margin-top:8px;border-radius:999px;padding:6px 9px;background:#effaf4;color:#2d6a48;font-size:10px;font-weight:850}
    .stay-desc{margin:8px 0 0;color:#777;font-size:12px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .activity-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px;color:#717171;font-size:11px;line-height:1.35}
    .activity-meta .activity-rating{font-weight:800;color:#4c4c4c}
    .activity-facts{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
    .activity-fact{display:inline-flex;align-items:center;gap:5px;background:#f7f7f7;border-radius:999px;padding:7px 10px;font-size:10px;color:#555;font-weight:750}
    .activity-desc{margin:8px 0 0;color:#777;font-size:12px;line-height:1.45;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
  `;
  document.head.appendChild(style);

  // Replace the card renderer so the image heart also displays the live vote count,
  // while the three-dot action sits safely beside "Open original".
  card = function(o){
    const voted=!!o.voted;
    const votes=Math.max(0,o.votes||0);
    const img=o.image?`<img src="${esc(o.image)}" alt="">`:`<div style="width:100%;height:100%;display:grid;place-items:center;font-size:42px;color:#aaa;background:#f3f3f3">${o.type==='flight'?'✈':o.type==='stay'?'⌂':'☀'}</div>`;
    const isBookingStay = o.type==='stay' && (/booking\.com/i.test(String(o.source||'')) || /booking\.com/i.test(String(o.url||'')));
    const ratingText = typeof o.rating==='number'
      ? (isBookingStay
          ? `${Number(o.rating).toFixed(1)}/10${o.reviewCount ? ` · ${esc(o.reviewCount)} reviews` : ''}`
          : `★ ${esc(o.rating)}${o.reviewCount ? ` (${esc(o.reviewCount)})` : ''}`)
      : '';
    const stayMeta = o.type==='stay'
      ? [o.location ? esc(o.location) : '', ratingText].filter(Boolean)
      : [];
    const stayFacts = o.type==='stay'
      ? [o.dates ? `<span class="stay-fact">📅 ${esc(o.dates)}</span>` : '', o.guests ? `<span class="stay-fact">👥 ${esc(o.guests)}</span>` : ''].filter(Boolean).join('')
      : '';
    const activityMeta = o.type==='activity'
      ? [o.category ? esc(o.category) : '', o.location ? esc(o.location) : '', typeof o.rating==='number' ? `<span class="activity-rating">★ ${esc(o.rating)}${o.reviewCount ? ` · ${esc(o.reviewCount)} reviews` : ''}</span>` : ''].filter(Boolean)
      : [];
    const activityFacts = o.type==='activity'
      ? [o.openingHours ? `<span class="activity-fact">🕒 ${esc(o.openingHours)}</span>` : '', o.priceLevel ? `<span class="activity-fact">💰 ${esc(o.priceLevel)}</span>` : '', o.reservationText ? `<span class="activity-fact">✓ ${esc(o.reservationText)}</span>` : ''].filter(Boolean).join('')
      : '';
    const countryInfo = (o.type==='stay' || o.type==='activity') && typeof window.holidayCountryInfo === 'function'
      ? window.holidayCountryInfo(o)
      : null;
    const countryPill = countryInfo
      ? `<div class="country-pill" aria-label="${esc(countryInfo.name)}"><span class="flag">${countryInfo.flag}</span><span class="name">${esc(countryInfo.name)}</span></div>`
      : '';
    return `<article class="card option" data-id="${esc(o.id)}" data-type="${esc(o.type)}" data-votes="${votes}">
      <div class="photo">
        ${img}
        <span class="badge">${esc(o.source||hostLabel(o.url))}</span>
        <button class="heart ${voted?'on':''}" data-vote="${esc(o.id)}" aria-label="${voted?'Remove vote':'Vote for this option'}">
          <span class="heart-glyph">${voted?'♥':'♡'}</span><span class="heart-count">${votes}</span>
        </button>
        ${countryPill}
      </div>
      <div class="body">
        <div class="row"><h3>${esc(o.title||'Untitled option')}</h3><span class="price">${esc(o.price||'')}</span></div>
        ${o.type==='stay' && stayMeta.length ? `<div class="stay-secondary">${stayMeta.map((x,i)=>`${i?'<span class="dot">•</span>':''}<span>${x}</span>`).join('')}</div>` : ''}
        ${o.type==='stay' && stayFacts ? `<div class="stay-facts">${stayFacts}</div>` : ''}
        ${o.type==='activity' && activityMeta.length ? `<div class="activity-meta">${activityMeta.map((x,i)=>`${i?'<span>•</span>':''}<span>${x}</span>`).join('')}</div>` : ''}
        ${o.type==='activity' && activityFacts ? `<div class="activity-facts">${activityFacts}</div>` : ''}
        ${o.type!=='stay' && o.type!=='activity' && (o.dates||o.guests)?`<p class="factsline">${[o.dates,o.guests].filter(Boolean).map(esc).join(' · ')}</p>`:''}
        ${o.perPerson?`<div class="${o.type==='stay'?'stay-price-detail':'factsline pp'}">${esc(o.perPerson)}</div>`:''}
        ${o.cancellation?`<div class="${o.type==='stay'?'stay-cancel':'factsline'}">✓ ${esc(o.cancellation)}</div>`:''}
        ${o.note?`<p class="sub">${esc(o.note)}</p>`:(o.type==='stay'&&o.description?`<p class="stay-desc">${esc(o.description)}</p>`:(o.type==='activity'&&o.description?`<p class="activity-desc">${esc(o.description)}</p>`:''))}
        <div class="cardlinks">
          <a class="openlink" href="${esc(o.url)}" target="_blank" rel="noopener">Open original ↗</a>
          <button class="more cardmore" data-delete="${esc(o.id)}" aria-label="More options">⋯</button>
        </div>
        <div class="meta">
          <div class="who"><span class="mini" style="background:${esc(o.colour)}">${o.avatar?`<img src="${o.avatar}" alt="">`:esc((o.addedBy||'?')[0].toUpperCase())}</span>Added by ${esc(o.addedBy||'Someone')}</div>
        </div>
      </div>
    </article>`;
  };

  // Re-render once with the polished card markup. Existing render() rebinds vote/delete actions.
  if (typeof render === 'function') render();
})();
