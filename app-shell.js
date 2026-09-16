(() => {
  const PROFILE_KEY = 'holiday2027-profile-v2';
  const OPTIONS_KEY = 'holiday2027-options-v2';
  let lastMainNav = 'explore';
  let pendingAvatar = null;

  const esc2 = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[ch]));

  function getProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); }
    catch { return null; }
  }

  function getOptions() {
    try { return JSON.parse(localStorage.getItem(OPTIONS_KEY) || '[]'); }
    catch { return []; }
  }

  function injectStyles() {
    if (document.getElementById('holidayAppShellStyles')) return;
    const style = document.createElement('style');
    style.id = 'holidayAppShellStyles';
    style.textContent = `
      /* The trip belongs to everybody, so the personal "Roger's trip board" strip is redundant. */
      .top > .people{display:none!important}
      .top .chips{padding-top:14px}

      /* Make the top-right control the signed-in person's avatar. */
      #profile{padding:0!important;overflow:hidden;display:grid;place-items:center;background:#fff;color:#333;font-weight:900;box-shadow:0 2px 10px #00000008}
      #profile img{width:100%;height:100%;object-fit:cover;display:block}
      #profile .profile-letter{width:100%;height:100%;display:grid;place-items:center}

      /* Keep bottom navigation state visually consistent. */
      .nav button{transition:color .14s ease,transform .12s ease}
      .nav button:active{transform:scale(.95)}
      .nav button.active{color:var(--pink)!important}

      body.profile-open{overflow:hidden}
      .profile-screen{position:fixed;inset:0;z-index:80;background:#fff;display:none;overflow:auto;overscroll-behavior:contain;padding-bottom:calc(30px + env(safe-area-inset-bottom))}
      .profile-screen.open{display:block;animation:profileIn .18s ease-out}
      @keyframes profileIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
      .profile-page{max-width:620px;margin:0 auto;padding:calc(16px + env(safe-area-inset-top)) 18px 34px}
      .profile-top{display:flex;align-items:center;gap:12px;position:sticky;top:0;z-index:2;padding:4px 0 14px;background:rgba(255,255,255,.94);backdrop-filter:blur(14px)}
      .profile-back{width:42px;height:42px;border-radius:50%;border:1px solid #e8e8e8;background:#fff;display:grid;place-items:center;font-size:22px;color:#333;flex:0 0 auto}
      .profile-top h1{margin:0;font-size:26px;letter-spacing:-.8px}.profile-top p{margin:2px 0 0;color:#888;font-size:12px}
      .profile-hero{border:1px solid #ffd7e1;background:linear-gradient(145deg,#fff7f9,#fff);border-radius:28px;padding:22px;text-align:center;position:relative;overflow:hidden}
      .profile-hero:before{content:'';position:absolute;width:190px;height:190px;border-radius:50%;background:#fff0f4;left:-110px;top:-105px}
      .profile-big-avatar{position:relative;z-index:1;width:96px;height:96px;border-radius:50%;margin:0 auto 13px;display:grid;place-items:center;overflow:hidden;font-size:32px;font-weight:900;border:4px solid #fff;box-shadow:0 5px 22px #00000012}
      .profile-big-avatar img{width:100%;height:100%;object-fit:cover}
      .profile-hero h2{position:relative;z-index:1;margin:0;font-size:25px;letter-spacing:-.7px}.profile-hero p{position:relative;z-index:1;margin:6px 0 0;color:#777;font-size:13px}
      .profile-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:16px}
      .profile-stat{border:1px solid #ececec;border-radius:18px;padding:14px 9px;text-align:center;background:#fff}.profile-stat b{display:block;font-size:20px;letter-spacing:-.5px}.profile-stat span{display:block;color:#888;font-size:10px;margin-top:3px}
      .profile-section{margin-top:23px}.profile-section h3{margin:0 0 11px;font-size:19px;letter-spacing:-.4px}
      .profile-edit-card{border:1px solid #e9e9e9;border-radius:24px;padding:17px;background:#fff}
      .profile-photo-edit{display:flex;align-items:center;gap:13px;margin-bottom:16px}
      .profile-photo-picker{width:64px;height:64px;border-radius:50%;overflow:hidden;display:grid;place-items:center;position:relative;font-size:20px;font-weight:900;border:2px solid #fff;box-shadow:0 0 0 1px #e7e7e7;flex:0 0 auto}
      .profile-photo-picker img{width:100%;height:100%;object-fit:cover}.profile-photo-picker input{position:absolute;inset:0;opacity:0;cursor:pointer}
      .profile-photo-copy b{display:block;font-size:13px}.profile-photo-copy span{display:block;color:#888;font-size:11px;line-height:1.35;margin-top:4px}
      .profile-label{display:block;font-size:11px;font-weight:850;color:#555;margin-bottom:6px}
      .profile-name-input{width:100%;border:1px solid #d8d8d8;border-radius:14px;padding:13px 14px;background:#fff;outline:none}.profile-name-input:focus{border-color:#aaa;box-shadow:0 0 0 3px #00000007}
      .profile-colour-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 2px 2px;color:#666;font-size:12px}.profile-swatch{width:28px;height:28px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px #ddd}
      .profile-save{width:100%;border:0;border-radius:16px;padding:14px 16px;margin-top:15px;background:linear-gradient(90deg,#ff385c,#e31c5f);color:#fff;font-weight:850}
      .profile-note{color:#999;font-size:11px;line-height:1.45;text-align:center;margin-top:14px}
      @media(min-width:760px){.profile-screen{z-index:90}.profile-page{padding-bottom:45px}}
    `;
    document.head.appendChild(style);
  }

  function setNav(destination) {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    nav.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
    if (destination === 'shortlist') document.getElementById('navShort')?.classList.add('active');
    else if (destination === 'people') document.getElementById('peopleBtn')?.classList.add('active');
    else nav.querySelector('button:first-child')?.classList.add('active');
    if (destination === 'explore' || destination === 'shortlist') lastMainNav = destination;
  }
  window.holidaySetNav = setNav;

  function renderProfileButton() {
    const btn = document.getElementById('profile');
    if (!btn) return;
    const me = getProfile();
    if (!me) { btn.textContent = '☺'; return; }
    btn.setAttribute('aria-label', 'Open my profile');
    btn.title = 'My profile';
    btn.style.background = me.colour || '#DFE7FD';
    btn.innerHTML = me.avatar
      ? `<img src="${esc2(me.avatar)}" alt="${esc2(me.name || 'Profile')}">`
      : `<span class="profile-letter">${esc2((me.name || '?').charAt(0).toUpperCase())}</span>`;
  }

  function profileStats(me) {
    const all = getOptions();
    const mine = all.filter((o) => !o.addedBy || o.addedBy === me?.name);
    return {
      ideas: mine.length,
      shortlisted: all.filter((o) => !!o.voted).length,
      stays: mine.filter((o) => o.type === 'stay').length
    };
  }

  function avatarHtml(me, id, picker = false) {
    const image = pendingAvatar ?? me?.avatar ?? '';
    const bg = me?.colour || '#DFE7FD';
    const letter = esc2((me?.name || '?').charAt(0).toUpperCase());
    return `<div class="${picker ? 'profile-photo-picker' : 'profile-big-avatar'}" id="${id}" style="background:${esc2(bg)}">${image ? `<img src="${esc2(image)}" alt="">` : letter}${picker ? '<input id="profileAvatarInput" type="file" accept="image/*" aria-label="Change profile photo">' : ''}</div>`;
  }

  function buildProfileScreen() {
    if (document.getElementById('profileScreen')) return;
    const section = document.createElement('section');
    section.className = 'profile-screen';
    section.id = 'profileScreen';
    section.innerHTML = `<div class="profile-page"><div class="profile-top"><button class="profile-back" id="profileBack" aria-label="Back">‹</button><div><h1>My profile</h1><p>Your identity on this holiday board</p></div></div><div id="profileContent"></div></div>`;
    document.body.appendChild(section);
    document.getElementById('profileBack')?.addEventListener('click', closeProfile);
  }

  function renderProfileScreen() {
    const me = getProfile();
    const content = document.getElementById('profileContent');
    if (!me || !content) return;
    pendingAvatar = null;
    const stats = profileStats(me);
    content.innerHTML = `
      <div class="profile-hero">
        ${avatarHtml(me, 'profileHeroAvatar')}
        <h2>${esc2(me.name)}</h2>
        <p>Potential traveller · signed in to have a say</p>
      </div>
      <div class="profile-stats">
        <div class="profile-stat"><b>${stats.ideas}</b><span>ideas added</span></div>
        <div class="profile-stat"><b>${stats.shortlisted}</b><span>shortlisted</span></div>
        <div class="profile-stat"><b>${stats.stays}</b><span>stays shared</span></div>
      </div>
      <div class="profile-section">
        <h3>Edit profile</h3>
        <div class="profile-edit-card">
          <div class="profile-photo-edit">
            ${avatarHtml(me, 'profilePhotoPicker', true)}
            <div class="profile-photo-copy"><b>Profile picture</b><span>Tap your picture to choose a different photo.</span></div>
          </div>
          <label class="profile-label" for="profileNameInput">Name</label>
          <input class="profile-name-input" id="profileNameInput" value="${esc2(me.name)}" maxlength="40" autocomplete="name">
          <div class="profile-colour-row"><span>Your randomly assigned board colour</span><span class="profile-swatch" style="background:${esc2(me.colour || '#DFE7FD')}"></span></div>
          <button class="profile-save" id="profileSave" type="button">Save profile</button>
        </div>
        <div class="profile-note">Your profile is used to show who added each idea and who is taking part in the group decision.</div>
      </div>`;

    document.getElementById('profileAvatarInput')?.addEventListener('change', onAvatarChange);
    document.getElementById('profileSave')?.addEventListener('click', saveProfile);
  }

  function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read that photo'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not open that photo'));
        img.onload = () => {
          const size = 320;
          const canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext('2d');
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', .82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function onAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      pendingAvatar = await compressImageFile(file);
      const me = getProfile();
      ['profilePhotoPicker','profileHeroAvatar'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const input = id === 'profilePhotoPicker' ? '<input id="profileAvatarInput" type="file" accept="image/*" aria-label="Change profile photo">' : '';
        el.innerHTML = `<img src="${esc2(pendingAvatar)}" alt="">${input}`;
      });
      document.getElementById('profileAvatarInput')?.addEventListener('change', onAvatarChange);
    } catch (err) {
      if (typeof toast === 'function') toast(err.message || 'Could not use that photo');
    }
  }

  function saveProfile() {
    const me = getProfile();
    if (!me) return;
    const name = (document.getElementById('profileNameInput')?.value || '').trim();
    if (!name) { document.getElementById('profileNameInput')?.focus(); return; }
    const oldName = me.name;
    const updated = { ...me, name, avatar: pendingAvatar ?? me.avatar ?? '' };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated));

    const opts = getOptions().map((o) => o.addedBy === oldName ? { ...o, addedBy:name, avatar:updated.avatar, colour:updated.colour } : o);
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(opts));
    try { profile = updated; } catch {}
    try { options = opts; } catch {}
    try { if (typeof renderProfile === 'function') renderProfile(); } catch {}
    try { if (typeof render === 'function') render(); } catch {}
    renderProfileButton();
    renderProfileScreen();
    if (typeof toast === 'function') toast('Profile updated');
  }

  function openProfile() {
    buildProfileScreen();
    renderProfileScreen();
    document.getElementById('profileScreen')?.classList.add('open');
    document.body.classList.add('profile-open');
  }

  function closeProfile() {
    document.getElementById('profileScreen')?.classList.remove('open');
    document.body.classList.remove('profile-open');
  }

  function wireNavigation() {
    const nav = document.querySelector('.nav');
    if (!nav) return;
    const explore = nav.querySelector('button:first-child');
    if (explore) explore.id = explore.id || 'navExplore';

    explore?.addEventListener('click', () => {
      try {
        currentFilter = 'all';
        document.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x.dataset.f === 'all'));
        if (typeof render === 'function') render();
      } catch {}
      setNav('explore');
    });

    document.getElementById('navShort')?.addEventListener('click', () => setNav('shortlist'));
    document.getElementById('peopleBtn')?.addEventListener('click', () => {
      window.__holidayPreviousNav = lastMainNav;
      setNav('people');
    });
    document.getElementById('peopleBack')?.addEventListener('click', () => setNav(window.__holidayPreviousNav || 'explore'));

    document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => {
      setNav(chip.dataset.f === 'shortlist' ? 'shortlist' : 'explore');
    }));

    setNav('explore');
  }

  injectStyles();
  buildProfileScreen();
  renderProfileButton();
  wireNavigation();

  // Replace the old destructive reset action with a normal profile page.
  const profileBtn = document.getElementById('profile');
  if (profileBtn) profileBtn.onclick = openProfile;

  document.getElementById('joinBtn')?.addEventListener('click', () => setTimeout(renderProfileButton, 80));
})();
