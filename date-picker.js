(() => {
  const $ = (id) => document.getElementById(id);
  const TRIP_MONTH = new Date(2027, 4, 1);
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const WEEKDAYS = ['M','T','W','T','F','S','S'];

  let start = null;
  let end = null;
  let viewMonth = new Date(TRIP_MONTH);
  let overlay = null;

  function localDate(y,m,d){ return new Date(y,m,d,12,0,0,0); }
  function iso(d){
    if (!d) return '';
    return [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
  }
  function sameDay(a,b){ return !!a && !!b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
  function before(a,b){ return a && b && a.getTime() < b.getTime(); }
  function after(a,b){ return a && b && a.getTime() > b.getTime(); }

  function parseISO(v=''){
    const m=String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? localDate(+m[1], +m[2]-1, +m[3]) : null;
  }
  function monthNum(name=''){
    const k=name.toLowerCase().replace(/\./g,'').slice(0,3);
    return ({jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11})[k] ?? null;
  }
  function parseRange(text=''){
    const t=String(text).replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
    let m=t.match(/(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})/);
    if(m){
      const mo=monthNum(m[3]);
      if(mo!=null) return [localDate(+m[4],mo,+m[1]),localDate(+m[4],mo,+m[2])];
    }
    m=t.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s*-\s*(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})/);
    if(m){
      const m1=monthNum(m[2]),m2=monthNum(m[4]);
      if(m1!=null&&m2!=null) return [localDate(+m[5],m1,+m[1]),localDate(+m[5],m2,+m[3])];
    }
    return [null,null];
  }
  function pretty(a,b){
    if(!a&&!b) return '';
    if(a&&!b) return a.getDate()+' '+MONTHS[a.getMonth()].slice(0,3)+' '+a.getFullYear();
    if(a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth()) return a.getDate()+'–'+b.getDate()+' '+MONTHS[a.getMonth()].slice(0,3)+' '+a.getFullYear();
    if(a.getFullYear()===b.getFullYear()) return a.getDate()+' '+MONTHS[a.getMonth()].slice(0,3)+'–'+b.getDate()+' '+MONTHS[b.getMonth()].slice(0,3)+' '+a.getFullYear();
    return a.getDate()+' '+MONTHS[a.getMonth()].slice(0,3)+' '+a.getFullYear()+'–'+b.getDate()+' '+MONTHS[b.getMonth()].slice(0,3)+' '+b.getFullYear();
  }
  function formatShort(d){ return d ? d.getDate()+' '+MONTHS[d.getMonth()].slice(0,3) : 'Add date'; }

  function injectStyles(){
    if($('holidayCalendarStyles')) return;
    const s=document.createElement('style');
    s.id='holidayCalendarStyles';
    s.textContent=`
      #nd{cursor:pointer;background:#fff!important}
      .hc-backdrop{position:fixed;inset:0;z-index:160;background:#0006;display:none;align-items:flex-end;justify-content:center}
      .hc-backdrop.open{display:flex}
      .hc-sheet{width:100%;max-height:92vh;background:#fff;border-radius:28px 28px 0 0;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 -18px 60px #0002}
      .hc-head{padding:14px 18px 10px;border-bottom:1px solid #eee;background:#fff}
      .hc-handle{width:42px;height:5px;border-radius:999px;background:#ddd;margin:0 auto 15px}
      .hc-titlebar{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .hc-titlebar h3{margin:0;font-size:20px;letter-spacing:-.4px}
      .hc-close{width:38px;height:38px;border:1px solid #eee;border-radius:50%;background:#fff;font-size:21px}
      .hc-summary{display:grid;grid-template-columns:1fr 24px 1fr;gap:7px;align-items:center;margin-top:13px}
      .hc-datebox{border:1px solid #ddd;border-radius:14px;padding:10px 12px;min-width:0}
      .hc-datebox small{display:block;color:#999;font-size:9px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}
      .hc-datebox strong{display:block;margin-top:3px;font-size:13px;white-space:nowrap}
      .hc-arrow{text-align:center;color:#aaa}
      .hc-monthbar{display:grid;grid-template-columns:42px 1fr 42px;align-items:center;padding:13px 16px 6px}
      .hc-monthbar button{width:36px;height:36px;border:1px solid #eee;background:#fff;border-radius:50%;font-size:21px}
      .hc-monthname{text-align:center;font-size:16px;font-weight:850}
      .hc-body{overflow:auto;padding:0 14px 12px}
      .hc-week{display:grid;grid-template-columns:repeat(7,1fr);margin:6px 0 4px}
      .hc-week span{text-align:center;color:#999;font-size:10px;font-weight:800;padding:7px 0}
      .hc-grid{display:grid;grid-template-columns:repeat(7,1fr);row-gap:5px}
      .hc-day{position:relative;aspect-ratio:1;border:0;background:none;padding:0;display:grid;place-items:center;font-size:14px;color:#333;-webkit-tap-highlight-color:transparent}
      .hc-day span{position:relative;z-index:2;width:38px;height:38px;display:grid;place-items:center;border-radius:50%}
      .hc-day.range:before{content:'';position:absolute;z-index:0;left:0;right:0;height:38px;top:50%;transform:translateY(-50%);background:#fff1f4}
      .hc-day.range-start:before{left:50%;border-radius:20px 0 0 20px}
      .hc-day.range-end:before{right:50%;border-radius:0 20px 20px 0}
      .hc-day.selected span{background:#e31c5f;color:#fff;font-weight:900}
      .hc-day.today span{box-shadow:inset 0 0 0 1px #e31c5f}
      .hc-day.blank{pointer-events:none}
      .hc-foot{padding:12px 18px calc(14px + env(safe-area-inset-bottom));border-top:1px solid #eee;background:#fff;display:grid;grid-template-columns:auto 1fr;gap:10px}
      .hc-clear{border:0;background:#fff;color:#555;font-weight:800;padding:12px 10px}
      .hc-done{border:0;border-radius:14px;background:linear-gradient(90deg,#ff385c,#e31c5f);color:#fff;font-weight:900;padding:13px 16px}
      .hc-done:disabled{opacity:.45}
      @media(min-width:760px){.hc-backdrop{align-items:center;padding:24px}.hc-sheet{max-width:520px;border-radius:28px;max-height:760px}.hc-handle{display:none}.hc-head{padding-top:20px}}
    `;
    document.head.appendChild(s);
  }

  function build(){
    if(overlay) return;
    overlay=document.createElement('div');
    overlay.className='hc-backdrop';
    overlay.innerHTML=`
      <div class="hc-sheet" role="dialog" aria-modal="true" aria-label="Choose travel dates">
        <div class="hc-head">
          <div class="hc-handle"></div>
          <div class="hc-titlebar"><h3>Select dates</h3><button class="hc-close" type="button" aria-label="Close">×</button></div>
          <div class="hc-summary">
            <div class="hc-datebox"><small>Check-in</small><strong id="hcStart">Add date</strong></div>
            <div class="hc-arrow">→</div>
            <div class="hc-datebox"><small>Check-out</small><strong id="hcEnd">Add date</strong></div>
          </div>
        </div>
        <div class="hc-monthbar">
          <button id="hcPrev" type="button" aria-label="Previous month">‹</button>
          <div class="hc-monthname" id="hcMonth"></div>
          <button id="hcNext" type="button" aria-label="Next month">›</button>
        </div>
        <div class="hc-body"><div class="hc-week">${WEEKDAYS.map(x=>'<span>'+x+'</span>').join('')}</div><div class="hc-grid" id="hcGrid"></div></div>
        <div class="hc-foot"><button class="hc-clear" id="hcClear" type="button">Clear</button><button class="hc-done" id="hcDone" type="button">Done</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.hc-close').onclick=close;
    overlay.addEventListener('click',e=>{ if(e.target===overlay) close(); });
    $('hcPrev').onclick=()=>{ viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1); render(); };
    $('hcNext').onclick=()=>{ viewMonth=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1); render(); };
    $('hcClear').onclick=()=>{ start=null;end=null;render(); };
    $('hcDone').onclick=applyAndClose;
  }

  function select(d){
    if(!start || end){ start=d; end=null; }
    else if(before(d,start)){ start=d; end=null; }
    else if(sameDay(d,start)){ start=d; end=null; }
    else { end=d; }
    render();
  }

  function render(){
    $('hcMonth').textContent=MONTHS[viewMonth.getMonth()]+' '+viewMonth.getFullYear();
    $('hcStart').textContent=formatShort(start);
    $('hcEnd').textContent=formatShort(end);
    $('hcDone').disabled=!start;
    const first=new Date(viewMonth.getFullYear(),viewMonth.getMonth(),1);
    const days=new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,0).getDate();
    const offset=(first.getDay()+6)%7;
    const today=new Date();
    let html='';
    for(let i=0;i<offset;i++) html+='<button class="hc-day blank" type="button"></button>';
    for(let day=1;day<=days;day++){
      const d=localDate(viewMonth.getFullYear(),viewMonth.getMonth(),day);
      const selected=sameDay(d,start)||sameDay(d,end);
      const inRange=start&&end&&after(d,start)&&before(d,end);
      const rs=start&&end&&sameDay(d,start);
      const re=start&&end&&sameDay(d,end);
      const cls=['hc-day',selected?'selected':'',inRange?'range':'',rs?'range range-start':'',re?'range range-end':'',sameDay(d,today)?'today':''].filter(Boolean).join(' ');
      html+='<button class="'+cls+'" type="button" data-date="'+iso(d)+'"><span>'+day+'</span></button>';
    }
    $('hcGrid').innerHTML=html;
    $('hcGrid').querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>select(parseISO(b.dataset.date)));
  }

  function open(){
    build();
    const manualStart=parseISO($('hvCheckin')?.value||'');
    const manualEnd=parseISO($('hvCheckout')?.value||'');
    const parsed=parseRange($('nd')?.value||'');
    start=manualStart||parsed[0]||null;
    end=manualEnd||parsed[1]||null;
    const anchor=start||TRIP_MONTH;
    viewMonth=new Date(anchor.getFullYear(),anchor.getMonth(),1);
    render();
    overlay.classList.add('open');
    document.body.style.overflow='hidden';
  }
  function close(){ overlay?.classList.remove('open'); document.body.style.overflow=''; }
  function dispatch(el){ if(!el)return; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); }
  function applyAndClose(){
    const nd=$('nd');
    if(nd){ nd.value=start?pretty(start,end):''; dispatch(nd); }
    const ci=$('hvCheckin'),co=$('hvCheckout');
    if(ci){ ci.value=iso(start); dispatch(ci); }
    if(co){ co.value=iso(end); dispatch(co); }
    close();
  }

  function bind(){
    injectStyles();
    const nd=$('nd');
    if(nd && nd.dataset.calendarBound!=='1'){
      nd.dataset.calendarBound='1';
      nd.readOnly=true;
      nd.placeholder='Choose dates';
      nd.setAttribute('aria-haspopup','dialog');
      nd.addEventListener('click',open);
      nd.addEventListener('focus',open);
    }
    ['hvCheckin','hvCheckout'].forEach(id=>{
      const el=$(id);
      if(!el||el.dataset.calendarBound==='1') return;
      el.dataset.calendarBound='1';
      el.type='text';
      el.readOnly=true;
      el.placeholder=id==='hvCheckin'?'Choose check-in':'Choose check-out';
      el.setAttribute('aria-haspopup','dialog');
      el.addEventListener('click',open);
      el.addEventListener('focus',open);
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,0),{once:true});
  else setTimeout(bind,0);
})();