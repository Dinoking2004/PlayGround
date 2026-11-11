(() => {
  'use strict';
  const SAVE_KEY = 'everlife-save-v1';
  const $ = (selector) => document.querySelector(selector);
  const els = {
    setup: $('#setup-screen'), game: $('#game-screen'), nameInput: $('#player-name'), begin: $('#begin-button'),
    displayName: $('#display-name'), displayAge: $('#display-age'), displayCity: $('#display-city'),
    displayRole: $('#display-role'), displayYear: $('#display-year'), yearSeason: $('#year-season'), avatar: $('#avatar'),
    stage: $('#life-stage'), stats: $('#stat-list'), actions: $('#action-grid'), count: $('#choice-count'),
    people: $('#people-list'), peopleCount: $('#people-count'), story: $('#story-list'), ageButton: $('#age-button'),
    meet: $('#meet-button'), restart: $('#restart-button'), resetSave: $('#reset-save'), toast: $('#toast'),
    modal: $('#modal-backdrop'), modalContent: $('#modal-content'), modalClose: $('#modal-close'),
  };
  const actionCatalog = [
    { id:'read', icon:'📚', title:'Get lost in a book', desc:'A little perspective goes a long way.', effect:{happiness:5, smarts:5, health:1}, result:'Found a new favorite.' },
    { id:'move', icon:'🏃', title:'Go for a run', desc:'Clear your head and feel your body.', effect:{health:7, happiness:3}, result:'Came back feeling lighter.' },
    { id:'create', icon:'🎨', title:'Make something', desc:'Try an idea, no pressure attached.', effect:{happiness:7, smarts:2}, result:'Made something all your own.' },
    { id:'connect', icon:'💌', title:'Check in with family', desc:'The people who know your whole story.', effect:{happiness:5, relationships:4}, result:'A lovely catch-up made your day.' },
    { id:'study', icon:'✏️', title:'Learn something new', desc:'A skill you might use someday.', effect:{smarts:7, happiness:1}, result:'You picked up a useful new skill.' },
    { id:'rest', icon:'☕', title:'Take a slow day', desc:'You are allowed to do nothing.', effect:{happiness:4, health:4}, result:'A little breathing room helped.' },
    { id:'volunteer', icon:'🌱', title:'Help out nearby', desc:'Show up for your community.', effect:{relationships:5, happiness:4}, result:'You made someone feel seen.' },
    { id:'save', icon:'🪙', title:'Put a little aside', desc:'Future you will be glad you did.', effect:{money:5, happiness:1}, result:'You tucked away some money.' },
    { id:'work', icon:'🧰', title:'Pick up a small job', desc:'Earn a little and build experience.', effect:{money:9, smarts:2, happiness:-1}, result:'A little work paid off.' },
  ];
  const names = {
    Portland:['Maya','Theo','Juniper','Elliot','Sage','Milo','Nora','Rory','Wren','Avery'],
    Brooklyn:['Zoe','Miles','Iris','Jules','Noah','Simone','Leo','Remy','Amara','Ezra'],
    'Santa Fe':['Luz','Mateo','Rosa','Emilio','Cleo','Santiago','Alma','Rafael','Sol','Nico'],
  };
  const jobs = ['a neighborhood bookstore','a tiny coffee shop','the local library','a community garden','a friendly design studio','a busy little bakery','a neighborhood clinic','the city museum'];
  const partners = ['a kind, funny person','someone who loves a long walk','a friend who became something more','someone who sees the best in you'];
  let state = null;
  let toastTimer;
  let selectedCity = 'Portland';
  let soundOn = false;

  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }
  function freshState(name, city) {
    const normalized = name.trim().slice(0,24) || 'Alex';
    return {
      name: normalized, city, age: 0, year: 2000, happiness: 72, health: 88,
      smarts: 50, relationships: 55, money: 22, education: 'Starting life', occupation: 'Just arrived',
      actions: [], people: [
        {name:'Mom', role:'Your biggest fan', icon:'🌼', closeness:78},
        {name:'Dad', role:'Always in your corner', icon:'☀️', closeness:72},
      ], story:[{age:0, text:`<b>${escapeHtml(normalized)}</b> was born in <b>${escapeHtml(city)}</b>. The whole world was brand new.`}],
      stage:'A LIFE IN PROGRESS', ended:false, cause:'', lastEvent:null,
    };
  }
  function escapeHtml(str) { return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {} }
  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved && saved.name && Number.isFinite(saved.age) && Array.isArray(saved.story) && Array.isArray(saved.people)) {
        state = saved;
        if (!Array.isArray(state.actions)) state.actions = [];
        if (typeof state.money !== 'number') state.money = 22;
        return true;
      }
    } catch (_) {}
    return false;
  }
  function showGame() { els.setup.classList.add('hidden'); els.game.classList.remove('hidden'); render(); }
  function addStory(text, age = state.age) { state.story.unshift({age, text}); state.story = state.story.slice(0,24); }
  function showToast(message) {
    els.toast.textContent = message; els.toast.classList.add('show'); clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2400);
  }
  function modal(html) { els.modalContent.innerHTML = html; els.modal.classList.remove('hidden'); }
  function closeModal() { els.modal.classList.add('hidden'); }
  function playNote() {
    if (!soundOn) return;
    try { const AudioContext = window.AudioContext || window.webkitAudioContext; const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.frequency.value=523; gain.gain.value=.035; osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime+.09); osc.onended=()=>ctx.close(); } catch (_) {}
  }
  function getStats() { return [
    ['happiness','♡','Happiness',state.happiness],['health','✚','Health',state.health],
    ['smarts','✦','Smarts',state.smarts],['relationships','⌂','Relationships',state.relationships],
  ]; }
  function statWord(value) { return value>=80?'Thriving':value>=60?'Doing well':value>=40?'Getting by':value>=20?'Needs care':'Very low'; }
  function getStage() {
    if (state.ended) return 'A LIFE REMEMBERED';
    if (state.age<2) return 'THE VERY BEGINNING'; if (state.age<5) return 'LITTLE YEARS';
    if (state.age<13) return 'GROWING UP'; if (state.age<18) return 'THE TEEN YEARS';
    if (state.age<25) return 'FINDING YOUR WAY'; if (state.age<40) return 'BUILDING A LIFE';
    if (state.age<60) return 'IN YOUR OWN RHYTHM'; if (state.age<75) return 'THE WISER YEARS'; return 'GOLDEN YEARS';
  }
  function roleForAge() {
    if (state.ended) return state.cause || 'Remembered with love';
    if (state.age<2) return 'Just arrived'; if (state.age<5) return 'A curious little one';
    if (state.age<13) return 'Grade school'; if (state.age<18) return 'Finding your feet';
    if (state.age<22) return 'Figuring it out'; if (state.age<65) return state.occupation;
    return 'Taking life a little slower';
  }
  function renderStats() {
    els.stats.innerHTML = getStats().map(([key,icon,label,value]) => `<div class="stat-row"><span class="stat-icon">${icon}</span><span class="stat-name">${label}</span><span class="stat-value">${value} · ${statWord(value)}</span><div class="stat-track"><div class="stat-fill" style="width:${value}%"></div></div></div>`).join('');
  }
  function renderActions() {
    const available = actionCatalog.filter(a => (a.minAge == null || state.age>=a.minAge) && (a.id!=='work' || state.age>=16));
    els.actions.innerHTML = available.map((a,i) => {
      const done = state.actions.includes(a.id);
      const capped = state.actions.length >= 2 && !done;
      return `<button class="action-card ${done?'done':''} ${i>=4?'extra-action':''}" data-action="${a.id}" ${done||capped||state.ended?'disabled':''}><span class="action-icon">${a.icon}</span><strong>${a.title}</strong><small class="${done?'action-result':''}">${done?a.result:capped?'You have done enough for this year.':a.desc}</small></button>`;
    }).join('');
    els.actions.querySelectorAll('.action-card').forEach(button => button.addEventListener('click',()=>takeAction(button.dataset.action)));
    if (window.innerWidth<=680 && available.length>4) {
      const extras=[...els.actions.querySelectorAll('.extra-action')];
      const more=document.createElement('button'); more.className='action-card more-actions'; more.innerHTML='<span class="action-icon">＋</span><strong>See all ideas</strong><small>There is more than one way to spend a year.</small>';
      more.addEventListener('click',()=>{extras.forEach(x=>x.classList.toggle('expanded'));more.classList.toggle('expanded');more.querySelector('strong').textContent=more.classList.contains('expanded')?'Show fewer':'See all ideas';});
      els.actions.appendChild(more);
    }
  }
  function renderPeople() {
    els.peopleCount.textContent=state.people.length;
    els.people.innerHTML=state.people.length ? state.people.slice(-4).reverse().map(p=>`<div class="person"><span class="person-avatar">${p.icon||'✿'}</span><div><b>${escapeHtml(p.name)}</b><small>${escapeHtml(p.role)}</small></div></div>`).join('') : '<p class="empty-people">Your story is just beginning. There are so many people you have yet to meet.</p>';
  }
  function renderStory() {
    els.story.innerHTML=state.story.length ? state.story.slice(0,10).map(item=>`<div class="story-item"><span class="story-age">AGE ${item.age}</span><div class="story-copy">${item.text}</div></div>`).join('') : '<p class="story-empty">The first page is still blank. Live a little and see what happens.</p>';
  }
  function render() {
    if (!state) return;
    els.displayName.textContent=state.name; els.avatar.textContent=state.name.charAt(0).toUpperCase();
    els.displayAge.textContent=state.ended?`age ${state.age}`:`age ${state.age}`; els.displayCity.textContent=state.city;
    els.displayRole.textContent=roleForAge(); els.displayYear.textContent=state.year; els.stage.textContent=getStage();
    els.yearSeason.textContent=state.ended?'A life well lived':state.age===0?'A fresh start':state.age<18?'Growing into yourself':state.age<40?'Making it your own':'Every year is a gift';
    renderStats(); renderActions(); renderPeople(); renderStory();
    els.ageButton.disabled=state.ended; els.ageButton.innerHTML=state.ended?'Life complete <span>✦</span>':'Live another year <span>→</span>';
    els.meet.disabled=state.ended; els.count.textContent=state.ended?'Your story is complete':`${state.actions.length} of 2 little things done`;
  }
  function takeAction(id) {
    if (state.ended || state.actions.includes(id) || state.actions.length>=2) return;
    const action=actionCatalog.find(a=>a.id===id); if(!action) return;
    Object.entries(action.effect).forEach(([key,amount])=>{if(typeof state[key]==='number')state[key]=clamp(state[key]+amount)});
    state.actions.push(id); addStory(`<b>${escapeHtml(state.name)}</b> ${action.result.charAt(0).toLowerCase()+action.result.slice(1)}`);
    persist(); render(); showToast(action.result); playNote();
  }
  function randomFrom(arr) { return arr[Math.floor(Math.random()*arr.length)]; }
  function findName() { const pool=names[state.city]||names.Portland; const available=pool.filter(n=>!state.people.some(p=>p.name===n)); return randomFrom(available.length?available:pool); }
  function meetSomeone() {
    if(state.ended) return;
    if(state.age<4){showToast('You will meet more people as you grow.');return;}
    if(state.people.length>=8){showToast('Your circle is already full of good people.');return;}
    const options=[
      {name:findName(),role:state.age<13?'A new school friend':'A new friend',icon:'✿',closeness:45},
      {name:findName(),role:state.age<18?'A teammate':'A neighbor',icon:'☀',closeness:40},
      {name:findName(),role:'Someone with a good story',icon:'✧',closeness:38},
    ];
    modal(`<div class="modal-kicker">A NEW FACE IN YOUR STORY</div><h2>Someone caught your eye.</h2><p>Every connection starts with a little hello. Who might you get to know?</p><div class="meet-options">${options.map((p,i)=>`<button class="meet-option" data-meet="${i}"><b>${p.icon} ${p.name}</b><small>${p.role} · Say hello</small></button>`).join('')}</div>`);
    els.modalContent.querySelectorAll('[data-meet]').forEach(button=>button.addEventListener('click',()=>{
      const p=options[Number(button.dataset.meet)]; state.people.push(p); state.relationships=clamp(state.relationships+4); state.happiness=clamp(state.happiness+2);
      addStory(`<b>${escapeHtml(state.name)}</b> met <b>${escapeHtml(p.name)}</b>. It felt like the start of a good friendship.`); closeModal(); persist(); render(); showToast(`You and ${p.name} hit it off!`); playNote();
    }));
  }
  function getMilestone() {
    const age=state.age;
    if(age===1)return 'Your first birthday brought a very messy cake and a room full of people who adore you.';
    if(age===5){state.education='Starting school';return 'A backpack almost bigger than you. Today was your first day of school.';}
    if(age===10)return 'You found a favorite place to daydream, and a few new favorite people too.';
    if(age===13)return 'The world feels a little bigger now. You are growing into your own ideas.';
    if(age===16)return 'A little more independence, a lot more questions. The future is starting to feel real.';
    if(age===18){state.education='High school graduate';return 'You finished high school. There are so many directions you could go from here.';}
    if(age===21){state.education='College graduate';return 'You made it through college. All those late nights led somewhere.';}
    if(age===25 && state.occupation==='Finding your way')return 'You landed your first steady job. It is a start, and that is more than enough.';
    if(age===30)return 'Thirty looks good on you. Your life does not have to look like anyone else’s.';
    if(age===40)return 'A new decade, a new kind of confidence. You know yourself better now.';
    if(age===50)return 'You have lived a lot of life, and there is still plenty left to discover.';
    if(age===65)return 'You can finally take a breath and choose how you want to spend your time.';
    if(age===80)return 'Eighty candles, countless memories. You are still the heart of every room.';
    return null;
  }
  function maybeStoryEvent() {
    const age=state.age;
    if(age===6 && !state.people.some(p=>p.role==='A lifelong friend')) {
      const name=findName();state.people.push({name,role:'A lifelong friend',icon:'🌿',closeness:58});state.relationships=clamp(state.relationships+5);
      return `You became inseparable from <b>${escapeHtml(name)}</b> in class. Some friendships just feel like home.`;
    }
    if(age===18 && state.smarts>=67 && Math.random()<.58){state.education='College student';state.smarts=clamp(state.smarts+4);return 'A college acceptance letter arrived. You decided to give it a shot.';}
    if(age>=22 && age<=35 && state.occupation==='Finding your way'){
      const job=randomFrom(jobs);state.occupation=job;state.money=clamp(state.money+8);return `You found a job at ${job}. The people seem nice, and the coffee is free.`;
    }
    if(age>=23 && age<=40 && state.people.length>=3 && !state.people.some(p=>p.role==='Your partner') && Math.random()<.34){
      const person={name:findName(),role:'Your partner',icon:'♡',closeness:60};state.people.push(person);state.relationships=clamp(state.relationships+9);state.happiness=clamp(state.happiness+8);
      return `You met ${escapeHtml(person.name)}, ${randomFrom(partners)}. It is nice to imagine what comes next.`;
    }
    if(age>=30 && age<=55 && !state.people.some(p=>p.role==='Your child') && Math.random()<.16){
      const child={name:findName(),role:'Your child',icon:'🌼',closeness:65};state.people.push(child);state.relationships=clamp(state.relationships+8);state.happiness=clamp(state.happiness+6);
      return `A new little person, <b>${escapeHtml(child.name)}</b>, joined your family. Everything feels different now.`;
    }
    if(age>=12 && age<70 && Math.random()<.30){
      const pleasant=[
        ()=>{state.happiness=clamp(state.happiness+7);return 'A small, ordinary moment turned out to be exactly what you needed.';},
        ()=>{state.health=clamp(state.health+5);return 'You found a routine that made you feel more like yourself.';},
        ()=>{state.relationships=clamp(state.relationships+5);return `${escapeHtml(state.people[Math.floor(Math.random()*state.people.length)].name)} showed up for you in a way you will not forget.`;},
        ()=>{state.money=clamp(state.money+6);return 'A little bit of good luck gave your savings a welcome boost.';},
        ()=>{state.smarts=clamp(state.smarts+4);return 'A conversation changed the way you think about something important.';},
      ]; return randomFrom(pleasant)();
    }
    return null;
  }
  function ageUp() {
    if(state.ended)return;
    const spent=state.actions.length;
    const sleepBonus=spent===0?-3:spent>=2?1:0;
    state.age++;state.year++;state.actions=[];
    state.health=clamp(state.health-(state.age>55?2:1)+sleepBonus);
    state.happiness=clamp(state.happiness-1+(state.relationships<20?-2:0));
    if(state.age>=18){state.money=clamp(state.money+(state.occupation==='Finding your way'?1:2));}
    let event=getMilestone();
    const randomEvent=maybeStoryEvent(); if(randomEvent)event=randomEvent;
    if(!event && state.age>=45 && Math.random()<.12){state.health=clamp(state.health-7);event='Your body asked you to slow down for a while. A few quiet days helped you recover.';}
    const risk=state.age>80?Math.min(.045,(state.age-80)*.003):0;
    if((state.health<=0 || (risk>0&&Math.random()<risk)) && state.age>=45){
      state.ended=true;state.cause=state.health<=0?'A long, full life':'At peace after a long life';
      if(state.health<=0)event=`After <b>${state.age}</b> years, ${escapeHtml(state.name)} passed away. A long life, full of people and moments that mattered.`;
      else event=`At <b>${state.age}</b>, ${escapeHtml(state.name)} passed peacefully, surrounded by the memories and people they loved.`;
    }
    if(!event)event=randomFrom([
      'Nothing extraordinary happened, and that was its own kind of lovely.',
      'You made it through another year. Some years, that is the whole story.',
      'The days were ordinary, the small moments were yours.',
      'You found a little more room to be yourself.',
      'You kept showing up for the life you are building.',
      'A familiar place felt a little different this year. You did too.',
    ]);
    addStory(event);persist();render();
    const milestone=state.ended?'Your life story is complete.':state.age===18?'You are an adult now. The choices are yours.':`You turned ${state.age}.`;
    showToast(milestone);playNote();
    if(state.ended)setTimeout(showEndCard,500);
  }
  function showEndCard() {
    modal(`<div class="modal-kicker">A LIFE REMEMBERED</div><h2>${escapeHtml(state.name)}’s story</h2><p>${escapeHtml(state.name)} lived for <b>${state.age} years</b> in ${escapeHtml(state.city)}. This story was made up of little choices, people who mattered, and moments that were entirely their own.</p><p><b>${state.people.length}</b> people were part of the journey. Thank you for living this life.</p><button class="primary-button" id="end-restart">Begin a new life <span>→</span></button>`);
    $('#end-restart').addEventListener('click',()=>{closeModal();newLife();});
  }
  function newLife() {
    const ok=state ? window.confirm('Start a new life? Your current story will be replaced.') : true;
    if(!ok)return;
    state=null;localStorage.removeItem(SAVE_KEY);els.nameInput.value='';els.game.classList.add('hidden');els.setup.classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'});
  }
  document.querySelectorAll('.city-option').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('.city-option').forEach(x=>x.classList.remove('selected'));button.classList.add('selected');selectedCity=button.dataset.city;
  }));
  els.begin.addEventListener('click',()=>{
    state=freshState(els.nameInput.value,selectedCity);persist();showGame();showToast(`A new life begins in ${state.city}!`);
  });
  els.nameInput.addEventListener('keydown',e=>{if(e.key==='Enter')els.begin.click();});
  els.ageButton.addEventListener('click',ageUp);els.meet.addEventListener('click',meetSomeone);els.restart.addEventListener('click',newLife);
  els.resetSave.addEventListener('click',()=>{
    if(!localStorage.getItem(SAVE_KEY)){showToast('There is no saved life to reset.');return;}
    if(window.confirm('Reset your saved life on this device? This cannot be undone.')){localStorage.removeItem(SAVE_KEY);state=null;location.reload();}
  });
  els.modalClose.addEventListener('click',closeModal);els.modal.addEventListener('click',e=>{if(e.target===els.modal)closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  $('#stats-info').addEventListener('click',()=>{
    modal('<div class="modal-kicker">A QUICK NOTE</div><h2>The things that shape a life.</h2><p><b>Happiness</b> grows when you make time for what matters. <b>Health</b> changes with the years and your choices. <b>Smarts</b> open doors as you grow up. <b>Relationships</b> are your people, and the care you put into them.</p><p>Your choices are small on purpose. There is no perfect way to live a life.</p><button class="primary-button" id="stats-done">Got it <span>✓</span></button>');
    $('#stats-done').addEventListener('click',closeModal);
  });
  $('#sound-toggle').addEventListener('click',e=>{soundOn=!soundOn;e.currentTarget.textContent=soundOn?'♫':'♫';e.currentTarget.title=soundOn?'Sound is on':'Sound is off';e.currentTarget.style.background=soundOn?'#e7efe7':'';if(soundOn)playNote();});
  if(load())showGame();
})();
