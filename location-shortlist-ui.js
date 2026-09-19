(() => {
  const COUNTRIES={
    'United Kingdom':['GB',['united kingdom','england','scotland','wales','northern ireland','glasgow','edinburgh','aberdeen','london']],
    'Malta':['MT',['malta','sliema','valletta','st julian','st. julian','gozo','mdina']],
    'Italy':['IT',['italy','italia','rome','roma','milan','milano','venice','venezia','florence','firenze','naples','napoli','sicily','sorrento']],
    'Spain':['ES',['spain','españa','espana','barcelona','madrid','alicante','malaga','málaga','seville','sevilla','ibiza','mallorca','majorca','palma','tenerife','gran canaria']],
    'Portugal':['PT',['portugal','lisbon','lisboa','porto','faro','algarve','madeira']],
    'France':['FR',['france','paris','nice','lyon','marseille','bordeaux']],
    'Greece':['GR',['greece','athens','santorini','mykonos','crete','rhodes','corfu']],
    'Croatia':['HR',['croatia','dubrovnik','split','zadar']],
    'Cyprus':['CY',['cyprus']],
    'Turkey':['TR',['turkey','türkiye','turkiye','istanbul','antalya','bodrum']],
    'Germany':['DE',['germany','deutschland','berlin','munich','münchen','hamburg','frankfurt']],
    'Netherlands':['NL',['netherlands','holland','amsterdam','rotterdam']],
    'Belgium':['BE',['belgium']],
    'Austria':['AT',['austria']],
    'Switzerland':['CH',['switzerland']],
    'Ireland':['IE',['ireland']],
    'Iceland':['IS',['iceland']],
    'Norway':['NO',['norway']],
    'Sweden':['SE',['sweden']],
    'Denmark':['DK',['denmark']],
    'Finland':['FI',['finland']],
    'Poland':['PL',['poland']],
    'Czechia':['CZ',['czechia','czech republic']],
    'Hungary':['HU',['hungary']],
    'Romania':['RO',['romania']],
    'Bulgaria':['BG',['bulgaria']],
    'Albania':['AL',['albania']],
    'Montenegro':['ME',['montenegro']],
    'Morocco':['MA',['morocco']],
    'Egypt':['EG',['egypt']],
    'United Arab Emirates':['AE',['united arab emirates','uae','dubai','abu dhabi']],
    'United States':['US',['united states','usa']],
    'Canada':['CA',['canada']],
    'Thailand':['TH',['thailand']],
    'Japan':['JP',['japan']],
    'Australia':['AU',['australia']],
    'New Zealand':['NZ',['new zealand']]
  };
  function flag(code){return code.replace(/[A-Z]/g,c=>String.fromCodePoint(127397+c.charCodeAt()))}
  function countryInfo(o){
    if(typeof window.holidayResolveCountry==='function'){
      const hit=window.holidayResolveCountry(o);
      if(hit)return hit;
    }
    const t=[o.location,o.title,o.description,o.note].filter(Boolean).join(' ').toLowerCase();
    for(const [name,[code,keys]] of Object.entries(COUNTRIES)){if(keys.some(k=>t.includes(k)))return{name,code,flag:flag(code)}}
    return null;
  }
  window.holidayCountryInfo=countryInfo;
  function styles(){
    if(document.getElementById('locationShortlistStyles'))return;
    const s=document.createElement('style');s.id='locationShortlistStyles';
    s.textContent=[
      '.country-pill{position:absolute;right:12px;bottom:12px;z-index:3;min-height:40px;padding:0 13px;border:0;border-radius:999px;background:rgba(255,255,255,.96);box-shadow:0 4px 18px #00000014;display:flex;align-items:center;gap:7px;color:#333;font-size:12px;font-weight:850;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}',
      '.country-pill .flag{font-size:19px;line-height:1}.country-pill .name{white-space:nowrap}.country-pill:active{transform:scale(.96)}.country-add{color:#777}.country-add .flag{font-size:17px}',
      '.shortlist-quick{display:none;margin:-2px 0 18px;border:1px solid #ececec;border-radius:22px;background:linear-gradient(180deg,#fff,#fffafb);overflow:hidden}.shortlist-quick.show{display:block}',
      '.shortlist-quick-head{padding:14px 15px 10px}.shortlist-quick-head b{display:block;font-size:14px}.shortlist-quick-head span{display:block;margin-top:2px;color:#888;font-size:10px}',
      '.shortlist-quick-list{padding:0 8px 8px}.shortlist-quick-row{width:100%;border:0;background:#fff;border-top:1px solid #f0f0f0;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:9px;align-items:center;padding:10px 7px;text-align:left;color:#222}',
      '.shortlist-quick-row:first-child{border-top:0}.shortlist-quick-row:active{background:#fafafa}.shortlist-quick-place{width:30px;height:30px;border-radius:10px;background:#f7f7f7;display:grid;place-items:center;font-size:18px}',
      '.shortlist-quick-main{min-width:0}.shortlist-quick-title{display:block;font-size:12px;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.shortlist-quick-sub{display:block;margin-top:2px;color:#888;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.shortlist-quick-price{font-size:11px;font-weight:850;white-space:nowrap}.shortlist-quick-votes{min-width:34px;height:28px;padding:0 8px;border-radius:999px;background:#fff1f4;color:#d91449;display:flex;align-items:center;justify-content:center;gap:3px;font-size:10px;font-weight:900}',
      '@media(min-width:760px){.shortlist-quick-list{display:grid;grid-template-columns:1fr 1fr;gap:0 10px;padding:0 12px 12px}.shortlist-quick-row{border:1px solid #f0f0f0!important;border-radius:14px!important;margin-top:8px}}'
    ].join('');document.head.appendChild(s);
  }
  function rows(){try{return typeof options!=='undefined'&&Array.isArray(options)?options:JSON.parse(localStorage.getItem('holiday2027-options-v2')||'[]')}catch{return[]}}
  function pills(){ /* Country controls are rendered directly by ui-polish.js. */ }
  function summaryBox(){let e=document.getElementById('shortlistQuick');if(e)return e;const g=document.getElementById('grid');if(!g)return null;e=document.createElement('section');e.id='shortlistQuick';e.className='shortlist-quick';g.parentNode.insertBefore(e,g);return e}
  function summary(){
    const e=summaryBox();if(!e)return;let f='all';try{f=currentFilter}catch{}
    if(f!=='shortlist'){e.classList.remove('show');e.innerHTML='';return}
    const a=rows().filter(o=>!!o.voted).sort((x,y)=>Number(y.votes||0)-Number(x.votes||0)||Number(y.createdAt||0)-Number(x.createdAt||0));
    if(!a.length){e.classList.remove('show');e.innerHTML='';return}
    const total=a.reduce((n,o)=>n+Number(o.votes||0),0);
    const html=a.map(o=>{const c=countryInfo(o),icon=c?c.flag:(o.type==='flight'?'✈️':o.type==='activity'?'☀️':'🏨'),sub=[c?.name||'',o.dates||''].filter(Boolean).join(' · ');return '<button class="shortlist-quick-row" type="button" data-jump="'+esc(o.id)+'"><span class="shortlist-quick-place">'+icon+'</span><span class="shortlist-quick-main"><span class="shortlist-quick-title">'+esc(o.title||'Untitled option')+'</span>'+(sub?'<span class="shortlist-quick-sub">'+esc(sub)+'</span>':'')+'</span><span class="shortlist-quick-price">'+esc(o.price||'')+'</span><span class="shortlist-quick-votes">♥ '+Number(o.votes||0)+'</span></button>'}).join('');
    e.innerHTML='<div class="shortlist-quick-head"><b>Shortlist at a glance</b><span>'+a.length+' option'+(a.length===1?'':'s')+' · '+total+' vote'+(total===1?'':'s')+'</span></div><div class="shortlist-quick-list">'+html+'</div>';e.classList.add('show');
    e.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>document.querySelector('.card.option[data-id="'+CSS.escape(b.dataset.jump)+'"]')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  function enhance(){pills();summary()}
  function wrap(){if(typeof render!=='function'||window.__locationShortlistWrapped)return;const base=render;render=function(){const r=base.apply(this,arguments);requestAnimationFrame(enhance);return r};window.__locationShortlistWrapped=true}
  function init(){styles();wrap();document.querySelectorAll('.chip,[data-f],#navShort').forEach(x=>x.addEventListener('click',()=>requestAnimationFrame(()=>requestAnimationFrame(enhance))));window.addEventListener('holiday-shared-board-updated',()=>requestAnimationFrame(enhance));enhance()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();