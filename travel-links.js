(() => {
  const SUPABASE_URL = 'https://bpqmcjbnaukbejznzqwr.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_pxoVfbfSnRRU3nFr-FHzfA_3GOJQxId';
  const TRAVEL_URL_FUNCTION = `${SUPABASE_URL}/functions/v1/parse-travel-url`;

  let client = null;
  let sessionPromise = null;
  let repairing = false;
  const $ = (id) => document.getElementById(id);

  const supported = [
    /(^|\.)booking\.com$/i, /(^|\.)booking\.page\.link$/i, /(^|\.)b\.com$/i,
    /(^|\.)hotels\.com$/i, /(^|\.)expedia\.(com|co\.uk|ie)$/i,
    /(^|\.)vrbo\.(com|co\.uk)$/i, /(^|\.)abritel\.fr$/i,
    /(^|\.)agoda\.com$/i, /(^|\.)tripadvisor\.(com|co\.uk)$/i,
    /(^|\.)loveholidays\.com$/i, /(^|\.)onthebeach\.co\.uk$/i,
    /(^|\.)lastminute\.com$/i, /(^|\.)jet2holidays\.com$/i,
    /(^|\.)tui\.(co\.uk|com)$/i, /(^|\.)hostelworld\.com$/i,
    /(^|\.)trivago\.com$/i, /(^|\.)kayak\.(com|co\.uk)$/i,
    /(^|\.)skyscanner\.(net|com)$/i
  ];

  function isAirbnb(url) {
    try { return /(^|\.)airbnb\./i.test(new URL(url).hostname); }
    catch { return false; }
  }
  function isBooking(url) {
    try { return /(^|\.)booking\.com$/i.test(new URL(url).hostname); }
    catch { return false; }
  }
  function isSupported(url) {
    try {
      const h = new URL(url).hostname.replace(/^www\./i, '');
      return supported.some((re) => re.test(h));
    } catch { return false; }
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  async function loadSupabase() {
    if (window.supabase?.createClient) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Could not load the travel link service.'));
      document.head.appendChild(script);
    });
  }
  async function session() {
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async () => {
      await loadSupabase();
      client ||= window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data: current, error: currentError } = await client.auth.getSession();
      if (currentError) throw currentError;
      if (current?.session) return current.session;
      const { data, error } = await client.auth.signInAnonymously();
      if (error) throw error;
      return data.session;
    })();
    try { return await sessionPromise; }
    catch (err) { sessionPromise = null; throw err; }
  }

  function setLinkStatus(text, kind = '') {
    if (typeof setStatus === 'function') {
      setStatus(text, kind);
      return;
    }
    const s = $('status');
    if (!s) return;
    s.textContent = text;
    s.className = `status show${kind ? ` ${kind}` : ''}`;
  }

  function setPreview(data) {
    const title = data.title || data.provider || 'Travel option';
    const provider = data.provider || 'Travel site';
    const image = data.image || '';
    const description = data.description || '';
    const itemType = ['stay','flight','activity'].includes(data.item_type) ? data.item_type : 'stay';

    if ($('nt')) $('nt').value = title;
    if ($('type')) $('type').value = itemType;
    if ($('prevTitle')) $('prevTitle').textContent = title;
    if ($('prevSource')) {
      const details = [provider, data.location, typeof data.rating === 'number' ? `★ ${data.rating}${data.review_count ? ` (${data.review_count})` : ''}` : ''].filter(Boolean);
      $('prevSource').textContent = details.join(' · ');
    }
    if ($('prevImg')) {
      if (image) {
        $('prevImg').src = image;
        $('prevImg').style.display = 'block';
      } else {
        $('prevImg').removeAttribute('src');
        $('prevImg').style.display = 'none';
      }
    }
    $('linkPreview')?.classList.add('show');

    // Keep the provider description as structured metadata instead of stuffing a long paragraph into Quick note.
    // This gives the main card a cleaner hierarchy while preserving the useful listing context.
    try {
      draftImage = image;
      draftSource = provider;
      draftTravelMeta = {
        location: data.location || '',
        rating: typeof data.rating === 'number' ? data.rating : null,
        reviewCount: data.review_count ?? null,
        description: description || '',
        finalUrl: data.final_url || ''
      };
    } catch {}
  }

  async function parseTravelLink(url) {
    const s = await session();
    const r = await fetch(TRAVEL_URL_FUNCTION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${s.access_token}`,
        'apikey': SUPABASE_KEY
      },
      body: JSON.stringify({ url })
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `Travel link reader returned ${r.status}`);
    return data;
  }

  async function handleTravelFetch(event) {
    const url = $('link')?.value.trim() || '';
    if (!/^https?:\/\//i.test(url) || isAirbnb(url) || !isSupported(url)) return false;

    event?.preventDefault?.();
    event?.stopImmediatePropagation?.();
    const button = $('parseBtn');
    if (button) { button.disabled = true; button.textContent = 'Finding…'; }
    setLinkStatus('Reading the travel listing…');

    try {
      const data = await parseTravelLink(url);
      setPreview(data);
      const fallbackText = data.social_preview_used ? ' · share preview loaded' : (data.used_fallback ? ' · browser fallback used' : '');
      setLinkStatus(`${data.provider || 'Travel'} listing found${fallbackText}. Upload the booking summary next for the exact dates and total price.`, 'ok');
      const status = $('status');
      if (status) {
        const imageNote = data.image ? 'property photo' : 'listing details';
        const method = data.social_preview_used ? ' from the share preview' : '';
        status.innerHTML = `<span class="hv-link-ok">${esc(data.provider || 'Travel')} listing found</span><div style="margin-top:5px;color:#47705a">Real title and ${imageNote}${method}${data.location ? ', plus location' : ''} loaded${data.elapsed_ms ? ` in ${data.elapsed_ms} ms` : ''}. Add the booking screenshot for exact dates and price.</div>`;
      }
    } catch (err) {
      setLinkStatus(`Could not automatically read this link. You can still add it manually below. ${err?.message || err}`, 'err');
    } finally {
      if (button) { button.disabled = false; button.textContent = 'Fetch'; }
    }
    return true;
  }

  async function repairMissingImages() {
    if (repairing) return;
    let all;
    try { all = typeof options !== 'undefined' ? options : JSON.parse(localStorage.getItem('holiday2027-options-v2') || '[]'); }
    catch { return; }
    const targets = (Array.isArray(all) ? all : []).filter(o => o?.type === 'stay' && !o?.image && o?.url && isBooking(o.url)).slice(0, 3);
    if (!targets.length) return;
    repairing = true;
    let changed = false;
    try {
      for (const o of targets) {
        try {
          const data = await parseTravelLink(o.url);
          if (data?.image || data?.title) {
            if (data.image) o.image = data.image;
            // Booking screenshots often identify the room type (e.g. "Superior Double Room").
            // The social share preview gives us the actual property name, which is the correct card title.
            if (data.title && !/^Booking\.com$/i.test(data.title)) o.title = data.title;
            if (data.provider) o.source = data.provider;
            if (data.location) o.location = data.location;
            if (typeof data.rating === 'number') o.rating = data.rating;
            if (data.review_count != null) o.reviewCount = data.review_count;
            if (data.description) o.description = data.description;
            changed = true;
          }
        } catch {}
      }
      if (changed) {
        localStorage.setItem('holiday2027-options-v2', JSON.stringify(all));
        try { options = all; } catch {}
        try { if (typeof render === 'function') render(); } catch {}
        try { if (typeof window.holidaySharedSync === 'function') window.holidaySharedSync(); } catch {}
        try { if (typeof toast === 'function') toast('Booking property details refreshed'); } catch {}
      }
    } finally {
      repairing = false;
    }
  }

  function polishCopy() {
    const steps = document.querySelectorAll('.steps .step');
    const h1 = steps?.[0]?.querySelector('.stephead');
    if (h1) h1.innerHTML = '<span class="stepnum">1</span><div><b>Paste the link</b><span>Airbnb, Booking.com, Hotels.com, Expedia, Vrbo, Agoda and other major travel sites.</span></div>';
    const link = $('link');
    if (link) link.placeholder = 'Paste Airbnb, Booking.com, Hotels.com, Expedia, Vrbo…';
  }

  function bind() {
    polishCopy();
    const button = $('parseBtn');
    if (button && button.dataset.travelLinksBound !== '1') {
      button.dataset.travelLinksBound = '1';
      const existing = button.onclick;
      button.onclick = async function(event) {
        const url = $('link')?.value.trim() || '';
        if (isSupported(url) && !isAirbnb(url)) {
          await handleTravelFetch(event);
          return;
        }
        if (typeof existing === 'function') return existing.call(this, event);
      };
    }
    setTimeout(repairMissingImages, 900);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once:true });
  else bind();
})();