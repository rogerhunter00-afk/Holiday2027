(() => {
  const TRIP_ID = 'holiday2027';
  const SUPABASE_URL = 'https://bpqmcjbnaukbejznzqwr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_pxoVfbfSnRRU3nFr-FHzfA_3GOJQxId';
  let peopleClient = null;
  let sessionPromise = null;
  let currentUserId = null;

  const htmlEsc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[ch]));

  function injectStyles() {
    if (document.getElementById('peoplePageStyles')) return;
    const style = document.createElement('style');
    style.id = 'peoplePageStyles';
    style.textContent = `
      html.people-open-root,body.people-open{overflow:hidden!important;overscroll-behavior:none}
      body.people-open{width:100%;max-width:100%;touch-action:pan-y}
      .people-screen{
        position:fixed;inset:0;z-index:24;background:#fff;
        overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;
        overscroll-behavior-y:contain;overscroll-behavior-x:none;
        touch-action:pan-y;width:100%;max-width:100vw;
        display:none;padding-bottom:calc(96px + env(safe-area-inset-bottom));
      }
      .people-screen.open{display:block;animation:peopleIn .18s ease-out}
      @keyframes peopleIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
      .people-page{width:100%;max-width:760px;min-width:0;margin:0 auto;padding:calc(16px + env(safe-area-inset-top)) 18px 28px;overflow-x:hidden}
      .people-page *{min-width:0}
      .people-page img{max-width:100%}
      .people-top,.people-hero,.people-list,.person-card,.person-contribs,.contribution{max-width:100%}
      .people-top{display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:2;background:rgba(255,255,255,.94);backdrop-filter:blur(14px);padding:4px 0 14px}
      .people-back{width:42px;height:42px;border-radius:50%;border:1px solid #e8e8e8;background:#fff;display:grid;place-items:center;font-size:22px;color:#333;flex:0 0 auto}
      .people-top h1{margin:0;font-size:26px;letter-spacing:-.8px}.people-top p{margin:2px 0 0;color:#888;font-size:12px}
      .people-hero{margin-top:8px;border:1px solid #ffd7e1;background:linear-gradient(145deg,#fff7f9,#fff);border-radius:26px;padding:20px;overflow:hidden;position:relative}
      .people-hero:after{content:'';position:absolute;width:160px;height:160px;border-radius:50%;background:#fff0f4;right:-72px;top:-78px}
      .people-hero-main{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:16px}
      .people-hero .eyebrow2{font-size:10px;font-weight:900;letter-spacing:.09em;text-transform:uppercase;color:#d91449;margin-bottom:7px}
      .people-count{font-size:35px;font-weight:900;letter-spacing:-1.5px;line-height:1}.people-count span{font-size:15px;letter-spacing:0;color:#555;font-weight:750;margin-left:6px}
      .people-hero-copy{color:#777;font-size:13px;line-height:1.45;margin-top:8px;max-width:410px}
      .people-stack{display:flex;flex-direction:row-reverse;justify-content:flex-end;padding-left:12px;min-width:96px}
      .people-stack .people-stack-av{width:44px;height:44px;border-radius:50%;border:3px solid #fff;margin-left:-12px;display:grid;place-items:center;font-weight:900;overflow:hidden;box-shadow:0 3px 12px #00000010;background:#eee}
      .people-stack img{width:100%;height:100%;object-fit:cover}
      .people-section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin:24px 2px 12px}
      .people-section-head h2{margin:0;font-size:21px;letter-spacing:-.5px}.people-section-head span{font-size:12px;color:#999}
      .people-list{display:grid;gap:12px}
      .person-card{border:1px solid #ebebeb;border-radius:24px;padding:16px;background:#fff;box-shadow:0 6px 20px #00000005}
      .person-head{display:flex;align-items:center;gap:12px}.person-avatar{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;font-size:18px;font-weight:900;overflow:hidden;flex:0 0 auto;border:2px solid #fff;box-shadow:0 0 0 1px #ededed}.person-avatar img{width:100%;height:100%;object-fit:cover}
      .person-name{min-width:0;flex:1}.person-name-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.person-name b{font-size:16px}.you-pill{background:#fff0f4;color:#d91449;border-radius:999px;padding:4px 7px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.person-name small{display:block;color:#999;font-size:11px;margin-top:4px}
      .person-total{font-size:12px;font-weight:850;color:#555;white-space:nowrap}
      .person-stats{display:flex;gap:7px;flex-wrap:wrap;margin-top:13px}.person-stat{background:#f7f7f7;border-radius:999px;padding:7px 10px;color:#666;font-size:11px;font-weight:750}.person-stat.pink{background:#fff2f5;color:#c91849}
      .person-contribs{margin-top:13px;border-top:1px solid #f0f0f0;padding-top:6px}.person-empty{color:#aaa;font-size:12px;padding:10px 2px 2px}
      .contribution{display:flex;align-items:center;gap:10px;padding:9px 0;text-decoration:none;color:inherit;border-bottom:1px solid #f5f5f5}.contribution:last-child{border-bottom:0;padding-bottom:2px}.contrib-thumb{width:46px;height:46px;border-radius:12px;background:#f2f2f2;display:grid;place-items:center;overflow:hidden;flex:0 0 auto;font-size:20px}.contrib-thumb img{width:100%;height:100%;object-fit:cover}.contrib-copy{min-width:0;flex:1}.contrib-copy b{display:block;font-size:12px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.contrib-copy span{display:block;color:#999;font-size:10px;margin-top:3px;text-transform:capitalize}.contrib-arrow{color:#bbb;font-size:18px}
      .people-loading,.people-error{border:1px solid #ededed;border-radius:20px;padding:22px;text-align:center;color:#777;font-size:13px;line-height:1.45}.people-error{background:#fff7f7;color:#963b3b;border-color:#ffe1e1}
      .people-footnote{color:#999;font-size:11px;line-height:1.45;margin:18px 4px 4px;text-align:center}
      @media(min-width:760px){.people-screen{z-index:50}.people-page{padding-bottom:40px}.people-list{grid-template-columns:1fr 1fr}.people-hero{padding:24px}}
    `;
    document.head.appendChild(style);
  }

  function buildScreen() {
    if (document.getElementById('peopleScreen')) return;
    const screen = document.createElement('section');
    screen.className = 'people-screen';
    screen.id = 'peopleScreen';
    screen.innerHTML = `
      <div class="people-page">
        <div class="people-top">
          <button class="people-back" id="peopleBack" aria-label="Back to ideas">‹</button>
          <div><h1>People</h1><p>Who has joined the board and what they have added</p></div>
        </div>
        <div id="peopleContent"><div class="people-loading">Loading the people on this trip…</div></div>
      </div>`;
    document.body.appendChild(screen);
    document.getElementById('peopleBack')?.addEventListener('click', closePeople);
  }

  async function loadSupabase() {
    if (window.supabase?.createClient) return window.supabase;
    if (window.__holidaySupabaseLoading) return window.__holidaySupabaseLoading;
    window.__holidaySupabaseLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => window.supabase?.createClient ? resolve(window.supabase) : reject(new Error('Supabase did not load'));
      script.onerror = () => reject(new Error('Could not load Supabase'));
      document.head.appendChild(script);
    });
    return window.__holidaySupabaseLoading;
  }

  async function getClientAndSession() {
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async () => {
      await loadSupabase();
      if (!peopleClient) peopleClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data: current, error: currentError } = await peopleClient.auth.getSession();
      if (currentError) throw currentError;
      let session = current?.session;
      if (!session) {
        const { data, error } = await peopleClient.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }
      currentUserId = session?.user?.id || null;
      return { client: peopleClient, session };
    })();
    try { return await sessionPromise; }
    catch (err) { sessionPromise = null; throw err; }
  }

  async function compressAvatar(dataUrl) {
    if (!dataUrl || !String(dataUrl).startsWith('data:image/')) return dataUrl || '';
    if (String(dataUrl).length < 45000) return dataUrl;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const size = 112;
          const canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d');
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', .72));
        } catch { resolve(''); }
      };
      img.onerror = () => resolve('');
      img.src = dataUrl;
    });
  }

  function localProfile() {
    try { return typeof profile !== 'undefined' ? profile : JSON.parse(localStorage.getItem('holiday2027-profile-v2') || 'null'); }
    catch { return null; }
  }

  function localOptions() {
    try { return typeof options !== 'undefined' ? options : JSON.parse(localStorage.getItem('holiday2027-options-v2') || '[]'); }
    catch { return []; }
  }

  async function syncMe() {
    const me = localProfile();
    if (!me?.name) return;
    const { client, session } = await getClientAndSession();
    const userId = session.user.id;
    const avatar = await compressAvatar(me.avatar || '');

    const { error: memberError } = await client.from('trip_members').upsert({
      trip_id: TRIP_ID,
      user_id: userId,
      name: me.name,
      colour: me.colour || '#DFE7FD',
      avatar_data: avatar || null,
      last_seen: new Date().toISOString()
    }, { onConflict: 'trip_id,user_id' });
    if (memberError) throw memberError;

    // Keep the shared contribution summary in step with this device's current board entries.
    await client.from('trip_contributions').delete().eq('trip_id', TRIP_ID).eq('user_id', userId);
    const mine = localOptions().filter((o) => !o.addedBy || o.addedBy === me.name);
    if (mine.length) {
      const rows = mine.map((o) => ({
        trip_id: TRIP_ID,
        user_id: userId,
        option_id: String(o.id),
        title: o.title || 'Untitled option',
        type: ['stay','flight','activity'].includes(o.type) ? o.type : 'activity',
        url: o.url || null,
        image: o.image || null,
        source: o.source || null,
        created_at: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString()
      }));
      const { error } = await client.from('trip_contributions').insert(rows);
      if (error) throw error;
    }
  }

  function iconFor(type) { return type === 'flight' ? '✈' : type === 'stay' ? '⌂' : '☀'; }

  function avatarMarkup(m, cls = 'person-avatar') {
    const bg = htmlEsc(m.colour || '#DFE7FD');
    const letter = htmlEsc((m.name || '?').charAt(0).toUpperCase());
    const image = m.avatar_data ? `<img src="${htmlEsc(m.avatar_data)}" alt="">` : letter;
    return `<div class="${cls}" style="background:${bg}">${image}</div>`;
  }

  function renderPeople(members, contributions) {
    const content = document.getElementById('peopleContent');
    if (!content) return;
    const byUser = new Map();
    contributions.forEach((c) => {
      if (!byUser.has(c.user_id)) byUser.set(c.user_id, []);
      byUser.get(c.user_id).push(c);
    });

    const stack = members.slice(0, 5).reverse().map((m) => avatarMarkup(m, 'people-stack-av')).join('');
    const count = members.length;
    const cards = members.map((m) => {
      const rows = byUser.get(m.user_id) || [];
      const stays = rows.filter((x) => x.type === 'stay').length;
      const flights = rows.filter((x) => x.type === 'flight').length;
      const activities = rows.filter((x) => x.type === 'activity').length;
      const stats = [
        stays ? `<span class="person-stat">${stays} stay${stays === 1 ? '' : 's'}</span>` : '',
        flights ? `<span class="person-stat">${flights} flight${flights === 1 ? '' : 's'}</span>` : '',
        activities ? `<span class="person-stat">${activities} thing${activities === 1 ? '' : 's'} to do</span>` : '',
        rows.length ? `<span class="person-stat pink">${rows.length} contribution${rows.length === 1 ? '' : 's'}</span>` : '<span class="person-stat">No ideas added yet</span>'
      ].filter(Boolean).join('');

      const contrib = rows.length ? rows.slice(0, 4).map((c) => {
        const thumb = c.image ? `<img src="${htmlEsc(c.image)}" alt="">` : iconFor(c.type);
        const inner = `<div class="contrib-thumb">${thumb}</div><div class="contrib-copy"><b>${htmlEsc(c.title)}</b><span>${htmlEsc(c.type === 'activity' ? 'thing to do' : c.type)}${c.source ? ' · ' + htmlEsc(c.source) : ''}</span></div>${c.url ? '<span class="contrib-arrow">›</span>' : ''}`;
        return c.url ? `<a class="contribution" href="${htmlEsc(c.url)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="contribution">${inner}</div>`;
      }).join('') : '<div class="person-empty">They have joined the board but haven’t added anything yet.</div>';

      const joined = m.joined_at ? new Date(m.joined_at).toLocaleDateString(undefined, { day:'numeric', month:'short' }) : '';
      return `<article class="person-card">
        <div class="person-head">
          ${avatarMarkup(m)}
          <div class="person-name"><div class="person-name-row"><b>${htmlEsc(m.name)}</b>${m.user_id === currentUserId ? '<span class="you-pill">You</span>' : ''}</div><small>${joined ? 'Joined ' + joined : 'Joined the trip board'}</small></div>
          <div class="person-total">${rows.length} added</div>
        </div>
        <div class="person-stats">${stats}</div>
        <div class="person-contribs">${contrib}</div>
      </article>`;
    }).join('');

    content.innerHTML = `
      <div class="people-hero">
        <div class="people-hero-main">
          <div><div class="eyebrow2">Potential travellers</div><div class="people-count">${count}<span>${count === 1 ? 'person' : 'people'}</span></div><div class="people-hero-copy">Anyone who joins this board is counted here as potentially coming and has a say in the trip.</div></div>
          <div class="people-stack">${stack}</div>
        </div>
      </div>
      <div class="people-section-head"><h2>Who’s involved</h2><span>${contributions.length} board contribution${contributions.length === 1 ? '' : 's'}</span></div>
      <div class="people-list">${cards || '<div class="people-loading">No one has joined yet.</div>'}</div>
      <div class="people-footnote">Joining the board means someone can contribute and vote; it isn’t a final RSVP.</div>`;
  }

  function renderFallback() {
    const me = localProfile();
    const local = localOptions();
    if (!me) return;
    currentUserId = 'local';
    renderPeople([{ user_id:'local', name:me.name, colour:me.colour, avatar_data:me.avatar || '', joined_at:new Date().toISOString() }],
      local.filter((o) => !o.addedBy || o.addedBy === me.name).map((o) => ({ user_id:'local', title:o.title, type:o.type, url:o.url, image:o.image, source:o.source })));
  }

  async function refreshPeople() {
    const content = document.getElementById('peopleContent');
    if (content) content.innerHTML = '<div class="people-loading">Loading the people on this trip…</div>';
    try {
      await syncMe();
      const { client } = await getClientAndSession();
      const [{ data: members, error: mErr }, { data: contribs, error: cErr }] = await Promise.all([
        client.from('trip_members').select('*').eq('trip_id', TRIP_ID).order('joined_at', { ascending: true }),
        client.from('trip_contributions').select('*').eq('trip_id', TRIP_ID).order('created_at', { ascending: false })
      ]);
      if (mErr) throw mErr;
      if (cErr) throw cErr;
      renderPeople(members || [], contribs || []);
    } catch (err) {
      console.warn('People screen sync failed', err);
      renderFallback();
      const note = document.createElement('div');
      note.className = 'people-footnote';
      note.textContent = 'Showing this device only while the shared list reconnects.';
      document.getElementById('peopleContent')?.appendChild(note);
    }
  }

  function setNavPeople(on) {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    nav.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    if (on) document.getElementById('peopleBtn')?.classList.add('active');
    else nav.querySelector('button')?.classList.add('active');
  }

  function openPeople() {
    buildScreen();
    document.getElementById('peopleScreen')?.classList.add('open');
    document.documentElement.classList.add('people-open-root');
    document.body.classList.add('people-open');
    setNavPeople(true);
    refreshPeople();
  }

  function closePeople() {
    document.getElementById('peopleScreen')?.classList.remove('open');
    document.documentElement.classList.remove('people-open-root');
    document.body.classList.remove('people-open');
    setNavPeople(false);
  }

  injectStyles();
  buildScreen();

  const peopleBtn = document.getElementById('peopleBtn');
  if (peopleBtn) peopleBtn.onclick = openPeople;

  // Navigation stays usable while the People screen is open.
  const nav = document.querySelector('.nav');
  const exploreBtn = nav?.querySelector('button:first-child');
  exploreBtn?.addEventListener('click', closePeople);
  document.getElementById('navShort')?.addEventListener('click', closePeople);
  document.getElementById('navAdd')?.addEventListener('click', closePeople);

  // Keep the shared member/contribution summary fresh after joining or adding an option.
  document.getElementById('joinBtn')?.addEventListener('click', () => setTimeout(() => syncMe().catch(() => {}), 180));
  document.getElementById('save')?.addEventListener('click', () => setTimeout(() => syncMe().catch(() => {}), 220));

  // Existing users are registered automatically when they next load the site.
  setTimeout(() => syncMe().catch(() => {}), 500);
})();
