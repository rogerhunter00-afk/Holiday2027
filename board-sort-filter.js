(() => {
  const STATE_KEY = 'holiday2027-sort-filter-v1';
  let state = { sort:'votes', country:'' };
  try { state = { ...state, ...(JSON.parse(localStorage.getItem(STATE_KEY) || '{}') || {}) }; } catch {}

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function save(){ localStorage.setItem(STATE_KEY, JSON.stringify(state)); }
  function rows(){
    try { return typeof options !== 'undefined' && Array.isArray(options) ? options : JSON.parse(localStorage.getItem('holiday2027-options-v2') || '[]'); }
    catch { return []; }
  }
  function money(v){
    const m = String(v ?? '').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);
    const n = m ? Number(m[0]) : NaN;
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  function guestCount(o){
    const m = String(o?.guests || '').match(/\d+/);
    return m ? Math.max(1, Number(m[0])) : null;
  }
  function pp(o){
    const explicit = money(o?.perPerson);
    if (explicit != null) return explicit;
    const total = money(o?.price);
    const guests = guestCount(o);
    if (total != null && guests) return total / guests;
    if (o?.type === 'flight') {
      const flight = Number(o?.flightMeta?.price);
      if (Number.isFinite(flight) && flight >= 0) return flight;
    }
    return null;
  }
  function country(o){
    if (typeof window.holidayResolveCountry === 'function') return window.holidayResolveCountry(o);
    const code = String(o?.countryCode || '').toUpperCase();
    return o?.country ? { name:o.country, code } : null;
  }
  function baseVisible(o){
    if (typeof currentFilter === 'undefined') return true;
    if (currentFilter === 'all') return true;
    if (currentFilter === 'shortlist') return !!o.voted;
    return o.type === currentFilter;
  }
  function activeHere(){
    try { return currentFilter === 'all' || currentFilter === 'stay'; }
    catch { return false; }
  }
  function sortLabel(){
    return ({
      votes:'Top voted',
      ppAsc:'Cheapest pp',
      ppDesc:'Highest pp',
      country:'Country A–Z',
      newest:'Newest'
    })[state.sort] || 'Top voted';
  }

  function styles(){
    if ($('boardSortFilterStyles')) return;
    const s=document.createElement('style');
    s.id='boardSortFilterStyles';
    s.textContent=`
      #sort.board-sort-trigger{
        text-decoration:none!important;border:1px solid #ffd2dd!important;background:#fff7f9!important;color:#d91449!important;
        border-radius:999px;padding:8px 11px!important;display:inline-flex;align-items:center;gap:6px;font-size:11px!important;font-weight:900!important
      }
      #sort.board-sort-trigger:active{transform:scale(.97)}
      .sort-filter-backdrop{position:fixed;inset:0;z-index:135;background:#0007;display:none;align-items:flex-end}
      .sort-filter-backdrop.open{display:flex}
      .sort-filter-sheet{width:100%;max-height:82vh;background:#fff;border-radius:26px 26px 0 0;padding:12px 16px calc(20px + env(safe-area-inset-bottom));overflow:auto}
      .sort-filter-handle{width:42px;height:5px;border-radius:99px;background:#ddd;margin:2px auto 14px}
      .sort-filter-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.sort-filter-head h3{margin:0;font-size:20px}
      .sort-filter-close{width:38px;height:38px;border:1px solid #eee;border-radius:50%;background:#fff;font-size:20px}
      .sort-filter-section{margin-top:17px}.sort-filter-section h4{margin:0 0 8px;font-size:12px;color:#666}
      .sort-filter-options{display:grid;gap:7px}
      .sort-filter-option{width:100%;border:1px solid #ececec;background:#fff;border-radius:15px;padding:12px 13px;display:flex;align-items:center;justify-content:space-between;gap:10px;text-align:left;color:#333;font-size:13px;font-weight:800}
      .sort-filter-option.on{border-color:#ffc7d5;background:#fff4f7;color:#d91449}
      .sort-filter-option .check{opacity:0}.sort-filter-option.on .check{opacity:1}
      .country-filter-wrap{display:flex;gap:7px;overflow:auto;padding:1px 0 4px;scrollbar-width:none}.country-filter-wrap::-webkit-scrollbar{display:none}
      .country-filter-chip{border:1px solid #e8e8e8;background:#fff;border-radius:999px;padding:9px 12px;white-space:nowrap;font-size:11px;font-weight:800;color:#555}
      .country-filter-chip.on{background:#fff2f5;border-color:#ffd0dc;color:#d91449}
      .sort-filter-clear{width:100%;margin-top:18px;border:0;background:#f7f7f7;border-radius:15px;padding:12px;font-size:12px;font-weight:850;color:#555}
      .board-filter-empty{grid-column:1/-1;border:1px dashed #dedede;border-radius:22px;padding:28px 18px;text-align:center;color:#888;font-size:13px}
      @media(min-width:760px){.sort-filter-backdrop{align-items:center;justify-content:center;padding:24px}.sort-filter-sheet{max-width:480px;border-radius:26px;max-height:700px}}
    `;
    document.head.appendChild(s);
  }

  function build(){
    if ($('sortFilterSheet')) return;
    const wrap=document.createElement('div');
    wrap.id='sortFilterSheet';
    wrap.className='sort-filter-backdrop';
    wrap.innerHTML=`
      <div class="sort-filter-sheet" role="dialog" aria-modal="true" aria-label="Sort and filter">
        <div class="sort-filter-handle"></div>
        <div class="sort-filter-head"><h3>Sort & filter</h3><button type="button" class="sort-filter-close" aria-label="Close">×</button></div>
        <section class="sort-filter-section">
          <h4>Sort by</h4>
          <div class="sort-filter-options" id="sortFilterOptions">
            <button class="sort-filter-option" type="button" data-sort="votes"><span>Top voted</span><span class="check">✓</span></button>
            <button class="sort-filter-option" type="button" data-sort="ppAsc"><span>Price per person · low to high</span><span class="check">✓</span></button>
            <button class="sort-filter-option" type="button" data-sort="ppDesc"><span>Price per person · high to low</span><span class="check">✓</span></button>
            <button class="sort-filter-option" type="button" data-sort="country"><span>Country · A to Z</span><span class="check">✓</span></button>
            <button class="sort-filter-option" type="button" data-sort="newest"><span>Newest added</span><span class="check">✓</span></button>
          </div>
        </section>
        <section class="sort-filter-section">
          <h4>Country</h4>
          <div class="country-filter-wrap" id="countryFilterChips"></div>
        </section>
        <button class="sort-filter-clear" id="sortFilterClear" type="button">Reset sort & filters</button>
      </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
    wrap.querySelector('.sort-filter-close').onclick=close;
    wrap.querySelector('#sortFilterOptions').addEventListener('click',e=>{
      const b=e.target.closest('[data-sort]'); if(!b)return;
      state.sort=b.dataset.sort; save(); renderControls(); apply(); 
    });
    wrap.querySelector('#sortFilterClear').onclick=()=>{state={sort:'votes',country:''};save();renderControls();apply();};
    wrap.querySelector('#countryFilterChips').addEventListener('click',e=>{
      const b=e.target.closest('[data-country]'); if(!b)return;
      state.country=b.dataset.country || ''; save(); renderControls(); apply();
    });
  }
  function open(){build();renderControls();$('sortFilterSheet')?.classList.add('open');}
  function close(){$('sortFilterSheet')?.classList.remove('open');}

  function availableCountries(){
    const map=new Map();
    for(const o of rows().filter(baseVisible)){
      const c=country(o); if(c?.code) map.set(c.code,c);
    }
    return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name));
  }

  function renderControls(){
    const trigger=$('sort');
    if(trigger){
      const active=activeHere();
      trigger.style.display=active?'inline-flex':'none';
      trigger.classList.toggle('board-sort-trigger',active);
      if(active){
        const c=availableCountries().find(x=>x.code===state.country);
        trigger.innerHTML=`<span>↕</span><span>${esc(sortLabel())}${c?' · '+esc(c.flag+' '+c.name):''}</span>`;
        trigger.onclick=open;
      }
    }
    const opts=$('sortFilterOptions');
    opts?.querySelectorAll('[data-sort]').forEach(b=>b.classList.toggle('on',b.dataset.sort===state.sort));
    const chips=$('countryFilterChips');
    if(chips){
      const countries=availableCountries();
      chips.innerHTML=`<button type="button" class="country-filter-chip ${state.country?'':'on'}" data-country="">All countries</button>`+
        countries.map(c=>`<button type="button" class="country-filter-chip ${state.country===c.code?'on':''}" data-country="${esc(c.code)}">${c.flag} ${esc(c.name)}</button>`).join('');
      if(state.country && !countries.some(c=>c.code===state.country)){state.country='';save();}
    }
  }

  function compare(a,b){
    if(state.sort==='ppAsc' || state.sort==='ppDesc'){
      const av=pp(a), bv=pp(b), dir=state.sort==='ppAsc'?1:-1;
      if(av==null && bv==null) return Number(b.votes||0)-Number(a.votes||0);
      if(av==null) return 1; if(bv==null) return -1;
      return (av-bv)*dir || Number(b.votes||0)-Number(a.votes||0);
    }
    if(state.sort==='country'){
      const ac=country(a)?.name || 'ZZZZ', bc=country(b)?.name || 'ZZZZ';
      return ac.localeCompare(bc) || String(a.title||'').localeCompare(String(b.title||''));
    }
    if(state.sort==='newest') return Number(b.createdAt||0)-Number(a.createdAt||0);
    return Number(b.votes||0)-Number(a.votes||0) || Number(b.createdAt||0)-Number(a.createdAt||0);
  }

  function apply(){
    renderControls();
    if(!activeHere()) return;
    const grid=$('grid'); if(!grid)return;
    grid.querySelector('.board-filter-empty')?.remove();

    const optionRows=rows().filter(baseVisible).filter(o=>{
      if(!state.country) return true;
      return country(o)?.code===state.country;
    }).sort(compare);

    const cards=new Map([...grid.querySelectorAll('.card.option[data-id]')].map(el=>[String(el.dataset.id),el]));
    grid.querySelectorAll('.card.option[data-id]').forEach(el=>el.style.display='none');
    for(const o of optionRows){
      const card=cards.get(String(o.id)); if(!card)continue;
      card.style.display='';
      grid.appendChild(card);
    }
    if(!optionRows.length){
      const empty=document.createElement('div');
      empty.className='board-filter-empty';
      empty.textContent=state.country?'No options match that country filter.':'No options match these filters.';
      grid.appendChild(empty);
    }
  }

  function wrapRender(){
    if(typeof render!=='function'||window.__holidaySortFilterWrapped)return;
    const base=render;
    render=function(){
      const result=base.apply(this,arguments);
      requestAnimationFrame(apply);
      return result;
    };
    window.__holidaySortFilterWrapped=true;
  }

  function init(){
    styles();build();wrapRender();
    $('sort')?.addEventListener('click',e=>{if(activeHere()){e.preventDefault();open();}});
    document.querySelectorAll('.chip,[data-f],#navShort').forEach(el=>el.addEventListener('click',()=>requestAnimationFrame(()=>requestAnimationFrame(apply))));
    window.addEventListener('holiday-shared-board-updated',()=>requestAnimationFrame(apply));
    apply();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();