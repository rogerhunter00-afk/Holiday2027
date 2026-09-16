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
      font-size:19px;font-weight:850;transition:transform .14s ease,background .18s ease,color .18s ease,box-shadow .18s ease;
      backdrop-filter:blur(8px)
    }
    .heart .heart-count{font-size:13px;line-height:1;color:#4b4b4b;min-width:8px;text-align:center}
    .heart.on{background:var(--coral);color:#fff;box-shadow:0 6px 20px #ff385c35}
    .heart.on .heart-count{color:#fff}
    .heart:active{transform:scale(.91)}
    .heart.on{animation:heartPop .24s ease}
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
  `;
  document.head.appendChild(style);

  // Replace the card renderer so the image heart also displays the live vote count,
  // while the three-dot action sits safely beside "Open original".
  card = function(o){
    const voted=!!o.voted;
    const votes=Math.max(0,o.votes||0);
    const img=o.image?`<img src="${esc(o.image)}" alt="">`:`<div style="width:100%;height:100%;display:grid;place-items:center;font-size:42px;color:#aaa;background:#f3f3f3">${o.type==='flight'?'✈':o.type==='stay'?'⌂':'☀'}</div>`;
    return `<article class="card option" data-id="${esc(o.id)}" data-type="${esc(o.type)}" data-votes="${votes}">
      <div class="photo">
        ${img}
        <span class="badge">${esc(o.source||hostLabel(o.url))}</span>
        <button class="heart ${voted?'on':''}" data-vote="${esc(o.id)}" aria-label="${voted?'Remove vote':'Vote for this option'}">
          <span class="heart-glyph">${voted?'♥':'♡'}</span><span class="heart-count">${votes}</span>
        </button>
      </div>
      <div class="body">
        <div class="row"><h3>${esc(o.title||'Untitled option')}</h3><span class="price">${esc(o.price||'')}</span></div>
        ${(o.dates||o.guests)?`<p class="factsline">${[o.dates,o.guests].filter(Boolean).map(esc).join(' · ')}</p>`:''}
        ${o.perPerson?`<p class="factsline pp">${esc(o.perPerson)}</p>`:''}
        ${o.cancellation?`<p class="factsline">✓ ${esc(o.cancellation)}</p>`:''}
        ${o.note?`<p class="sub">${esc(o.note)}</p>`:''}
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
