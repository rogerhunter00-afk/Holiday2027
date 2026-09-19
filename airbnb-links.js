(() => {
  const SUPABASE_URL='https://bpqmcjbnaukbejznzqwr.supabase.co';
  const SUPABASE_KEY='sb_publishable_pxoVfbfSnRRU3nFr-FHzfA_3GOJQxId';
  const FN=SUPABASE_URL+'/functions/v1/test-airbnb-url';
  let client=null, sessionPromise=null;
  const $=id=>document.getElementById(id);
  function isAirbnb(url){try{return /(^|\.)airbnb\./i.test(new URL(url).hostname)}catch{return false}}
  async function loadSupabase(){
    if(window.supabase?.createClient)return;
    await new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload=resolve;s.onerror=()=>reject(new Error('Could not load Supabase'));
      document.head.appendChild(s);
    });
  }
  async function session(){
    if(sessionPromise)return sessionPromise;
    sessionPromise=(async()=>{
      await loadSupabase();
      client ||= window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
      const {data:cur,error:e1}=await client.auth.getSession(); if(e1)throw e1;
      if(cur?.session)return cur.session;
      const {data,error}=await client.auth.signInAnonymously(); if(error)throw error;
      return data.session;
    })();
    try{return await sessionPromise}catch(e){sessionPromise=null;throw e}
  }
  async function call(url,mode='direct'){
    const s=await session();
    const r=await fetch(FN,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+s.access_token,'apikey':SUPABASE_KEY},body:JSON.stringify({url,mode})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||('Airbnb reader returned '+r.status));
    return d;
  }
  async function readAirbnb(url){
    let d=await call(url,'direct');
    let image=d.image||'';
    let title=d.title||'';
    if(!image){
      try{
        const rendered=await call(url,'rendered');
        image=rendered.screenshot_url||image;
        title=rendered.gemini?.title||rendered.rendered_title||title;
        d={...d,...rendered,image,title};
      }catch{}
    }
    return {...d,image,title};
  }
  function setStatus(text,kind=''){
    const s=$('status'); if(!s)return;
    s.textContent=text;s.className='status show'+(kind?' '+kind:'');
  }
  function apply(data,url){
    const title=(data.title||'').trim()||($('nt')?.value||'Airbnb stay');
    const image=data.image||'';
    try{
      if(image) draftImage=image;
      draftSource='Airbnb';
      draftTravelMeta={...(draftTravelMeta||{}),location:data.location||draftTravelMeta?.location||''};
    }catch{}
    if($('nt')&&title&&(!$('nt').value.trim()||/^Airbnb stay(?:\s*#\d+)?$/i.test($('nt').value.trim())))$('nt').value=title;
    if($('type'))$('type').value='stay';
    if($('prevTitle'))$('prevTitle').textContent=title;
    if($('prevSource'))$('prevSource').textContent='Airbnb'+(data.room_id?' · listing '+data.room_id:'');
    if($('prevImg')){
      if(image){$('prevImg').src=image;$('prevImg').style.display='block';}
      else{$('prevImg').removeAttribute('src');$('prevImg').style.display='none';}
    }
    $('linkPreview')?.classList.add('show');
    if($('link')) $('link').dataset.airbnbFetchedUrl=url;
    setStatus(image?'Airbnb listing found with property image. Add the booking screenshot for dates and price.':'Airbnb listing found, but no listing image was returned.','ok');
  }
  async function handle(e){
    const url=$('link')?.value.trim()||''; if(!isAirbnb(url))return false;
    e?.preventDefault?.();e?.stopImmediatePropagation?.();
    const b=$('parseBtn');if(b){b.disabled=true;b.textContent='Finding…'}
    setStatus('Reading the Airbnb listing…');
    try{const d=await readAirbnb(url);apply(d,url);}catch(err){setStatus('Could not read the Airbnb listing. '+(err?.message||err),'err');}
    finally{if(b){b.disabled=false;b.textContent='Fetch'}}
    return true;
  }
  async function repair(){
    let rows=[];try{rows=typeof options!=='undefined'?options:JSON.parse(localStorage.getItem('holiday2027-options-v2')||'[]')}catch{}
    const targets=(Array.isArray(rows)?rows:[]).filter(o=>o?.type==='stay'&&isAirbnb(o?.url||'')&&(!o?.image||!o?.location)).slice(0,3);
    if(!targets.length)return;
    let changed=false;
    for(const o of targets){
      try{
        const d=await readAirbnb(o.url);
        if(d.image&&!o.image){o.image=d.image;changed=true;}
        if(d.location&&!o.location){o.location=d.location;changed=true;}
        if(d.title&&/^Airbnb stay(?:\s*#\d+)?$/i.test(String(o.title||''))){o.title=d.title;changed=true;}
      }catch{}
    }
    if(changed){
      localStorage.setItem('holiday2027-options-v2',JSON.stringify(rows));
      try{options=rows}catch{}
      try{render()}catch{}
      try{window.holidaySharedSync?.()}catch{}
    }
  }
  function bind(){
    const b=$('parseBtn');if(b&&b.dataset.airbnbReaderBound!=='1'){
      b.dataset.airbnbReaderBound='1';
      const prev=b.onclick;
      b.onclick=async function(e){if(await handle(e))return;if(typeof prev==='function')return prev.call(this,e);};
    }
    setTimeout(repair,700);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();