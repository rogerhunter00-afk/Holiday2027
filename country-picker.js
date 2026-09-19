(() => {
  let activeId = null;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function injectStyles(){
    if(document.getElementById('countryPickerStyles')) return;
    const s=document.createElement('style');
    s.id='countryPickerStyles';
    s.textContent=`
      .country-picker-backdrop{position:fixed;inset:0;z-index:130;background:#0007;display:none;align-items:flex-end}
      .country-picker-backdrop.open{display:flex}
      .country-picker-sheet{width:100%;max-height:78vh;background:#fff;border-radius:26px 26px 0 0;padding:12px 16px calc(20px + env(safe-area-inset-bottom));box-shadow:0 -12px 35px #0002}
      .country-picker-handle{width:42px;height:5px;border-radius:99px;background:#ddd;margin:2px auto 14px}
      .country-picker-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .country-picker-head h3{margin:0;font-size:20px;letter-spacing:-.4px}
      .country-picker-close{width:38px;height:38px;border:1px solid #eee;border-radius:50%;background:#fff;font-size:20px}
      .country-picker-search{width:100%;margin-top:13px;border:1px solid #ddd;border-radius:15px;padding:12px 14px;outline:none}
      .country-picker-list{margin-top:10px;max-height:52vh;overflow:auto;border-top:1px solid #f0f0f0}
      .country-choice{width:100%;border:0;border-bottom:1px solid #f1f1f1;background:#fff;display:flex;align-items:center;gap:12px;padding:12px 4px;text-align:left}
      .country-choice:active{background:#fafafa}.country-choice .flag{font-size:23px;width:30px;text-align:center}.country-choice b{font-size:14px}
      .country-picker-note{color:#888;font-size:10px;line-height:1.4;margin-top:8px}
      @media(min-width:760px){.country-picker-backdrop{align-items:center;justify-content:center;padding:24px}.country-picker-sheet{max-width:460px;border-radius:26px;max-height:680px}}
    `;
    document.head.appendChild(s);
  }

  function build(){
    if(document.getElementById('countryPicker')) return;
    const wrap=document.createElement('div');
    wrap.id='countryPicker';
    wrap.className='country-picker-backdrop';
    wrap.innerHTML=`
      <div class="country-picker-sheet" role="dialog" aria-modal="true" aria-label="Choose country">
        <div class="country-picker-handle"></div>
        <div class="country-picker-head"><h3>Choose country</h3><button type="button" class="country-picker-close" aria-label="Close">×</button></div>
        <input id="countryPickerSearch" class="country-picker-search" type="search" placeholder="Search countries">
        <div id="countryPickerList" class="country-picker-list"></div>
        <div class="country-picker-note">Anyone on the trip can correct this. The country is saved to the shared card for everyone.</div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click',e=>{ if(e.target===wrap) close(); });
    wrap.querySelector('.country-picker-close').onclick=close;
    wrap.querySelector('#countryPickerSearch').addEventListener('input',renderList);
  }

  function list(){
    return Array.isArray(window.holidayCountryList) ? window.holidayCountryList : [];
  }

  function renderList(){
    const q=(document.getElementById('countryPickerSearch')?.value||'').trim().toLowerCase();
    const rows=list().filter(x=>!q || x.name.toLowerCase().includes(q) || x.code.toLowerCase().includes(q));
    const el=document.getElementById('countryPickerList');
    if(!el) return;
    el.innerHTML=rows.map(x=>`<button type="button" class="country-choice" data-country-code="${esc(x.code)}" data-country-name="${esc(x.name)}"><span class="flag">${x.flag}</span><b>${esc(x.name)}</b></button>`).join('');
  }

  function open(id){
    activeId=id;
    build();
    const wrap=document.getElementById('countryPicker');
    const search=document.getElementById('countryPickerSearch');
    if(search) search.value='';
    renderList();
    wrap?.classList.add('open');
    setTimeout(()=>search?.focus(),80);
  }

  function close(){
    document.getElementById('countryPicker')?.classList.remove('open');
    activeId=null;
  }

  async function choose(name,code){
    if(!activeId) return;
    const id=activeId;
    const button=document.querySelector('[data-country-edit="'+CSS.escape(String(id))+'"]');
    if(button){button.disabled=true;button.style.opacity='.65'}
    try{
      if(typeof window.holidaySetCountry!=='function') throw new Error('Shared country editor is not ready');
      await window.holidaySetCountry(id,name,code);
      close();
      if(typeof toast==='function') toast('Country updated');
    }catch(e){
      if(typeof toast==='function') toast('Could not update country');
      console.warn('Country update failed',e);
    }finally{
      if(button){button.disabled=false;button.style.opacity=''}
    }
  }

  document.addEventListener('click',e=>{
    const edit=e.target.closest?.('[data-country-edit]');
    if(edit){ e.preventDefault(); e.stopPropagation(); open(edit.dataset.countryEdit); return; }
    const choice=e.target.closest?.('.country-choice');
    if(choice){ e.preventDefault(); choose(choice.dataset.countryName,choice.dataset.countryCode); }
  });

  injectStyles();
  build();
})();