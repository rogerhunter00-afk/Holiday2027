(() => {
  const SUPABASE_URL = 'https://bpqmcjbnaukbejznzqwr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_pxoVfbfSnRRU3nFr-FHzfA_3GOJQxId';
  const TRIP_ID = '9ec00f2b-9ee5-4bb9-81ab-69f6c7533189';
  const SHARE_URL = `${SUPABASE_URL}/functions/v1/share-shortlist`;
  const WRITE_URL = `${SUPABASE_URL}/functions/v1/shared-board-write`;
  const PROFILE_KEY = 'holiday2027-profile-v2';
  const OPTIONS_KEY = 'holiday2027-options-v2';

  let sb = null;
  let sessionPromise = null;
  let userId = null;
  let realtime = null;
  let applyingRemote = false;
  let pushTimer = null;
  let reloadTimer = null;
  let syncBusy = false;
  const lastPushed = new Map();
  const pendingVotes = new Map();
  const voteTimers = new Map();
  const voteVersions = new Map();

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const html = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function localProfile() {
    try { return typeof profile !== 'undefined' ? profile : JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); }
    catch { return null; }
  }
  function localOptions() {
    try { return typeof options !== 'undefined' ? options : JSON.parse(localStorage.getItem(OPTIONS_KEY) || '[]'); }
    catch { return []; }
  }
  function storeOptions(rows) {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(rows));
    try { options = rows; } catch {}
  }
  function newUuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  function numberFrom(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const m = String(value ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    const n = m ? Number(m[0]) : NaN;
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  function currencyFrom(value) {
    const s = String(value ?? '');
    if (s.includes('€') || /\bEUR\b/i.test(s)) return 'EUR';
    if (s.includes('$') || /\bUSD\b/i.test(s)) return 'USD';
    return 'GBP';
  }
  function formatMoney(value, currency = 'GBP', suffix = '') {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    const sym = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£';
    return `${sym}${n.toLocaleString('en-GB', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}${suffix}`;
  }
  function cleanPayload(o) {
    const p = { ...o };
    delete p.votes; delete p.voted; delete p._shared; delete p._sharedBy;
    return p;
  }
  function fingerprint(o) {
    try { return JSON.stringify(cleanPayload(o)); }
    catch { return `${o.id}|${o.title}|${o.url}|${o.image}|${o.price}|${o.note}`; }
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

  async function getSession() {
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async () => {
      await loadSupabase();
      sb ||= window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data: current, error: currentError } = await sb.auth.getSession();
      if (currentError) throw currentError;
      let s = current?.session;
      if (!s) {
        const { data, error } = await sb.auth.signInAnonymously();
        if (error) throw error;
        s = data.session;
      }
      userId = s?.user?.id || null;
      return s;
    })();
    try { return await sessionPromise; }
    catch (e) { sessionPromise = null; throw e; }
  }

  async function writeShared(action, payload = {}) {
    const s = await getSession();
    const me = localProfile();
    const r = await fetch(WRITE_URL, {
      method: 'POST',
      headers: {
        'Content-Type':'application/json',
        'Authorization': `Bearer ${s.access_token}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({
        action,
        profile: me ? { name:me.name, colour:me.colour, avatar:me.avatar } : null,
        ...payload
      })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(data.error || `Shared board write returned ${r.status}`);
      err.code = data.code || r.status;
      throw err;
    }
    return data;
  }

  async function ensureProfile() {
    const s = await getSession();
    const me = localProfile();
    if (!me?.name) return;
    const avatar = String(me.avatar || '');
    const { error } = await sb.from('profiles').upsert({
      user_id: s.user.id,
      trip_id: TRIP_ID,
      display_name: String(me.name).slice(0, 60),
      pastel_color: me.colour || '#DFE7FD',
      avatar_url: avatar || null
    }, { onConflict: 'user_id' });
    if (error) throw error;
  }

  function normalizeIds() {
    const rows = localOptions();
    let changed = false;
    const seen = new Set();
    for (const o of rows) {
      if (!uuidRe.test(String(o.id || '')) || seen.has(o.id)) {
        o.id = newUuid(); changed = true;
      }
      seen.add(o.id);
    }
    if (changed) storeOptions(rows);
    return rows;
  }

  function dbRowFromLocal(o) {
    const guests = numberFrom(o.guests);
    const total = numberFrom(o.price);
    const pp = numberFrom(o.perPerson);
    return {
      id: o.id,
      trip_id: TRIP_ID,
      added_by: userId,
      option_type: ['stay','flight','activity','other'].includes(o.type) ? o.type : 'other',
      source: o.source || null,
      source_url: o.url || 'https://rogerhunter00-afk.github.io/Holiday2027/',
      title: o.title || 'Untitled option',
      image_url: o.image || null,
      date_text: o.dates || null,
      guests_count: guests && guests > 0 ? Math.round(guests) : null,
      guests_text: o.guests || null,
      total_price: total,
      currency: currencyFrom(o.price || o.perPerson),
      per_person_price: pp,
      cancellation_text: o.cancellation || null,
      rating: typeof o.rating === 'number' ? o.rating : null,
      review_count: o.reviewCount != null ? Number(o.reviewCount) : null,
      notes: o.note || null,
      parsed_data: cleanPayload(o),
      created_at: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString()
    };
  }

  async function pushLocalOptions(force = false) {
    if (syncBusy || applyingRemote) return;
    const s = await getSession();
    if (!s?.user?.id) return;
    syncBusy = true;
    try {
      await writeShared('sync_profile');
      const rows = normalizeIds();
      const mine = rows.filter(o => !o._sharedBy || o._sharedBy === userId);
      const changed = mine.filter(o => force || !o._shared || lastPushed.get(o.id) !== fingerprint(o));
      for (const o of changed) {
        try {
          await writeShared('upsert_option', { option: dbRowFromLocal(o) });
        } catch (error) {
          console.warn('Holiday shared option sync failed', error);
          continue;
        }
        o._shared = true;
        o._sharedBy = userId;
        lastPushed.set(o.id, fingerprint(o));
        if (o.voted) {
          try { await writeShared('set_vote', { option_id:o.id, voted:true }); }
          catch (voteError) { console.warn('Holiday vote migration failed', voteError); }
        }
      }
      storeOptions(rows);
    } finally { syncBusy = false; }
  }

  function localFromDb(row, votes, profiles) {
    const payload = row.parsed_data && typeof row.parsed_data === 'object' ? { ...row.parsed_data } : {};
    const p = profiles.get(row.added_by) || {};
    const voteRows = votes.get(row.id) || [];
    const voted = voteRows.some(v => v.user_id === userId);
    const currency = row.currency || 'GBP';
    const created = row.created_at ? Date.parse(row.created_at) : Date.now();
    return {
      ...payload,
      id: row.id,
      type: row.option_type === 'other' ? (payload.type || 'activity') : row.option_type,
      url: row.source_url || payload.url || '',
      title: row.title || payload.title || 'Untitled option',
      dates: row.date_text ?? payload.dates ?? '',
      guests: row.guests_text ?? payload.guests ?? '',
      price: payload.price || formatMoney(row.total_price, currency, row.total_price != null ? ' total' : ''),
      perPerson: payload.perPerson || formatMoney(row.per_person_price, currency, row.per_person_price != null ? ' pp' : ''),
      note: row.notes ?? payload.note ?? '',
      cancellation: row.cancellation_text ?? payload.cancellation ?? '',
      rating: row.rating != null ? Number(row.rating) : (payload.rating ?? null),
      reviewCount: row.review_count ?? payload.reviewCount ?? null,
      location: payload.location || '',
      description: payload.description || '',
      image: row.image_url || payload.image || '',
      source: row.source || payload.source || '',
      addedBy: payload.addedBy || p.display_name || 'Someone',
      colour: payload.colour || p.pastel_color || '#DFE7FD',
      avatar: payload.avatar || p.avatar_url || '',
      votes: voteRows.length,
      voted,
      createdAt: Number.isFinite(created) ? created : Date.now(),
      _shared: true,
      _sharedBy: row.added_by
    };
  }

  async function loadRemoteBoard({ quiet = false } = {}) {
    if (!sb || !userId) return;
    try {
      const [{ data: optionRows, error: optionsError }, { data: voteRows, error: votesError }, { data: profileRows }] = await Promise.all([
        sb.from('options').select('*').eq('trip_id', TRIP_ID).order('created_at', { ascending: false }),
        sb.from('votes').select('option_id,user_id'),
        sb.from('profiles').select('user_id,display_name,pastel_color,avatar_url').eq('trip_id', TRIP_ID)
      ]);
      if (optionsError) throw optionsError;
      if (votesError) throw votesError;
      const voteMap = new Map();
      for (const v of voteRows || []) {
        if (!voteMap.has(v.option_id)) voteMap.set(v.option_id, []);
        voteMap.get(v.option_id).push(v);
      }
      const profileMap = new Map((profileRows || []).map(p => [p.user_id, p]));
      const next = (optionRows || []).map(r => localFromDb(r, voteMap, profileMap));
      for (const row of next) {
        if (!pendingVotes.has(row.id)) continue;
        const desired = pendingVotes.get(row.id);
        const serverVoted = !!row.voted;
        if (desired !== serverVoted) row.votes = Math.max(0, Number(row.votes || 0) + (desired ? 1 : -1));
        row.voted = desired;
      }
      if (typeof window.holidayNormalizeGBPOptions === 'function') await window.holidayNormalizeGBPOptions(next);
      applyingRemote = true;
      storeOptions(next);
      for (const o of next) if (o._sharedBy === userId) lastPushed.set(o.id, fingerprint(o));
      try { if (typeof render === 'function') render(); } catch {}
      applyingRemote = false;
      updateShareButton();
      window.dispatchEvent(new CustomEvent('holiday-shared-board-updated', { detail: { count: next.length } }));
    } catch (e) {
      applyingRemote = false;
      console.warn('Could not refresh shared holiday board', e);
      if (!quiet && typeof toast === 'function') toast('Could not refresh shared board');
    }
  }

  function schedulePush() {
    if (applyingRemote) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushLocalOptions(false).then(() => loadRemoteBoard({ quiet: true })).catch(console.warn), 180);
  }
  function scheduleReload() {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => loadRemoteBoard({ quiet: true }), 220);
  }
  window.holidaySharedSync = schedulePush;

  function paintVoteInstant(id, voted, votes) {
    document.querySelectorAll('[data-vote]').forEach(btn => {
      if (btn.dataset.vote !== id) return;
      btn.classList.toggle('on', voted);
      btn.setAttribute('aria-label', voted ? 'Remove vote' : 'Vote for this option');
      const glyph = btn.querySelector('.heart-glyph');
      const count = btn.querySelector('.heart-count');
      if (glyph) glyph.textContent = voted ? '♥' : '♡';
      if (count) count.textContent = String(Math.max(0, votes || 0));
      btn.classList.remove('vote-tap');
      void btn.offsetWidth;
      btn.classList.add('vote-tap');
    });
  }

  function queueVoteSync(id) {
    const version = (voteVersions.get(id) || 0) + 1;
    voteVersions.set(id, version);
    clearTimeout(voteTimers.get(id));

    const timer = setTimeout(async () => {
      const latest = localOptions().find(x => x.id === id);
      if (!latest || voteVersions.get(id) !== version) return;
      const desired = !!latest.voted;
      pendingVotes.set(id, desired);

      try {
        // Network work happens after the UI has already changed.
        await writeShared('upsert_option', { option: dbRowFromLocal(latest) });
        if (voteVersions.get(id) !== version) return;
        await writeShared('set_vote', { option_id:id, voted:desired });
        if (voteVersions.get(id) !== version) return;

        latest._shared = true;
        latest._sharedBy = userId;
        lastPushed.set(latest.id, fingerprint(latest));
        pendingVotes.delete(id);
        voteTimers.delete(id);
        scheduleReload();
      } catch (e) {
        if (voteVersions.get(id) !== version) return;
        console.warn('Vote sync failed', e);
        pendingVotes.delete(id);
        voteTimers.delete(id);
        await loadRemoteBoard({ quiet:true });
        if (typeof toast === 'function') toast('Vote sync failed: ' + (e?.message || 'try again'));
      }
    }, 120);

    voteTimers.set(id, timer);
  }

  function sharedToggleVote(id) {
    const rows = localOptions();
    const o = rows.find(x => x.id === id);
    if (!o) return;

    const next = !o.voted;
    const beforeVotes = Number(o.votes || 0);
    o.voted = next;
    o.votes = Math.max(0, beforeVotes + (next ? 1 : -1));
    pendingVotes.set(id, next);

    // Immediate feedback: no authentication, Supabase or network await before the heart changes.
    paintVoteInstant(id, next, o.votes);
    storeOptions(rows);

    // Re-render on the next frame so shortlist filtering / vote ordering also stays correct.
    requestAnimationFrame(() => {
      applyingRemote = true;
      try { if (typeof render === 'function') render(); } catch {}
      applyingRemote = false;
    });

    // Coalesce rapid tick/untick taps and sync only the final state.
    queueVoteSync(id);
  }

  async function sharedRemoveOption(id) {
    const o = localOptions().find(x => x.id === id);
    if (!o) return;
    if (o._sharedBy && o._sharedBy !== userId) {
      if (typeof toast === 'function') toast('Only the person who added this can remove it');
      return;
    }
    if (!confirm(`Remove "${o.title}" from the shared board?`)) return;
    const previous = localOptions();
    const next = previous.filter(x => x.id !== id);
    storeOptions(next);
    applyingRemote = true;
    try { if (typeof render === 'function') render(); } catch {}
    applyingRemote = false;
    if (!o._shared) return;
    try {
      await writeShared('delete_option', { option_id:id });
    } catch (error) {
      storeOptions(previous);
      try { if (typeof render === 'function') render(); } catch {}
      if (typeof toast === 'function') toast('Could not remove that option');
    }
  }

  function injectStyles() {
    if (document.getElementById('sharedBoardStyles')) return;
    const style = document.createElement('style');
    style.id = 'sharedBoardStyles';
    style.textContent = `
      .holiday-title-actions{display:flex;align-items:center;gap:7px;margin-left:auto}
      .holiday-title-actions #sort{white-space:nowrap}
      .share-poll-btn{border:1px solid #ffd1dc!important;background:#fff4f7!important;color:#d91449!important;text-decoration:none!important;border-radius:999px;padding:8px 10px!important;font-size:11px!important;font-weight:900!important;display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
      .share-poll-btn:active{transform:scale(.97)}.share-poll-btn[disabled]{opacity:.55}
      .shared-board-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:#effaf4;color:#2d6a48;padding:5px 8px;font-size:9px;font-weight:850;margin-left:6px;vertical-align:2px}
      @media(max-width:390px){.share-poll-btn{padding:8px!important}.share-poll-btn .share-label{display:none}.holiday-title-actions{gap:3px}}
    `;
    document.head.appendChild(style);
  }

  function buildShareButton() {
    if (document.getElementById('sharePoll')) return;
    const title = document.querySelector('.title');
    const sort = document.getElementById('sort');
    if (!title || !sort) return;
    const actions = document.createElement('div');
    actions.className = 'holiday-title-actions';
    sort.parentNode.insertBefore(actions, sort);
    actions.appendChild(sort);
    const btn = document.createElement('button');
    btn.id = 'sharePoll';
    btn.className = 'share-poll-btn';
    btn.type = 'button';
    btn.innerHTML = '<span>↗</span><span class="share-label">Share poll</span>';
    btn.addEventListener('click', shareCurrentShortlist);
    actions.appendChild(btn);
  }

  function updateShareButton() {
    const btn = document.getElementById('sharePoll');
    if (!btn) return;
    const rows = localOptions();
    const shortlisted = rows.filter(o => Number(o.votes || 0) > 0);
    const totalVotes = shortlisted.reduce((n, o) => n + Number(o.votes || 0), 0);
    btn.title = shortlisted.length ? `Share ${shortlisted.length} shortlisted option${shortlisted.length === 1 ? '' : 's'} with ${totalVotes} vote${totalVotes === 1 ? '' : 's'}` : 'Share the current Holiday 2027 poll';
  }

  async function shareCurrentShortlist() {
    const btn = document.getElementById('sharePoll');
    const old = btn?.innerHTML;
    try {
      if (btn) { btn.disabled = true; btn.innerHTML = '<span>…</span><span class="share-label">Building poll</span>'; }
      await pushLocalOptions(false);
      const s = await getSession();
      const r = await fetch(SHARE_URL, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${s.access_token}`, 'apikey':SUPABASE_KEY },
        body: JSON.stringify({ trip_id: TRIP_ID })
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `Share service returned ${r.status}`);
      const shareData = { title: data.title || 'Holiday 2027 · current shortlist', text: data.description || 'See our current Holiday 2027 shortlist and vote.', url: data.share_url };
      if (navigator.share) {
        try { await navigator.share(shareData); }
        catch (e) { if (e?.name !== 'AbortError') throw e; }
      } else {
        await navigator.clipboard.writeText(data.share_url);
        if (typeof toast === 'function') toast('Poll link copied');
      }
    } catch (e) {
      console.warn('Could not share shortlist', e);
      if (typeof toast === 'function') toast('Could not create share poll');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = old || '<span>↗</span><span class="share-label">Share poll</span>'; }
    }
  }

  function wrapRender() {
    if (typeof render !== 'function' || window.__holidaySharedRenderWrapped) return;
    const baseRender = render;
    render = function() {
      const result = baseRender.apply(this, arguments);
      updateShareButton();
      if (!applyingRemote) schedulePush();
      return result;
    };
    window.__holidaySharedRenderWrapped = true;
  }

  function installSharedActions() {
    try { toggleVote = sharedToggleVote; } catch {}
    try { removeOption = sharedRemoveOption; } catch {}
  }

  function subscribeRealtime() {
    if (!sb || realtime) return;
    realtime = sb.channel('holiday-2027-shared-board')
      .on('postgres_changes', { event:'*', schema:'public', table:'options', filter:`trip_id=eq.${TRIP_ID}` }, scheduleReload)
      .on('postgres_changes', { event:'*', schema:'public', table:'votes' }, scheduleReload)
      .subscribe();
  }

  function applyRequestedView() {
    const params = new URLSearchParams(location.search);
    if (params.get('view') !== 'shortlist') return;
    try {
      currentFilter = 'shortlist';
      document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.f === 'shortlist'));
      if (typeof window.holidaySetNav === 'function') window.holidaySetNav('shortlist');
      applyingRemote = true;
      if (typeof render === 'function') render();
      applyingRemote = false;
    } catch {}
  }

  async function init() {
    injectStyles();
    buildShareButton();
    wrapRender();
    installSharedActions();
    try {
      if (window.holidayGBPReady) await window.holidayGBPReady;
      await getSession();
      await writeShared('sync_profile');
      await pushLocalOptions(true); // one-time migration of this browser's existing board into Supabase
      await loadRemoteBoard({ quiet:true });
      subscribeRealtime();
      applyRequestedView();
      document.addEventListener('visibilitychange', () => { if (!document.hidden) loadRemoteBoard({ quiet:true }); });
      window.addEventListener('focus', () => loadRemoteBoard({ quiet:true }));
      if (typeof toast === 'function' && !sessionStorage.getItem('holiday-shared-board-ready')) {
        sessionStorage.setItem('holiday-shared-board-ready','1');
      }
    } catch (e) {
      console.warn('Shared board could not start; local board remains available.', e);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();