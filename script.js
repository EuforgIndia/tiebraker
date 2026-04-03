// =============================================
//   ShuttleScore — Application Logic
//   Badminton Scorer App by Euforg (euforg.com)
// =============================================

// ═══════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════
var currentPage = 'home';
var pages = ['home','score','history','stats','profile'];

function navTo(p) {
  pages.forEach(function(id) {
    document.getElementById('page-'+id).classList.toggle('active', id===p);
    var n = document.getElementById('nav-'+id);
    if(n) n.classList.toggle('active', id===p);
  });
  currentPage = p;
  if(p==='home') refreshHome();
  if(p==='history') renderHistory('all');
  if(p==='stats') renderStats();
  if(p==='score') {
    if(matchLive){
      document.getElementById('scorer-setup').style.display='none';
      document.getElementById('scorer-live').style.display='block';
    } else {
      document.getElementById('scorer-setup').style.display='block';
      document.getElementById('scorer-live').style.display='none';
    }
  }
  window.scrollTo(0,0);
}

// ═══════════════════════════════════════════════════════
// LOCAL STORAGE (match history)
// ═══════════════════════════════════════════════════════
function getMatches() {
  try {
    var raw = localStorage.getItem('shuttlescore_matches');
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch(e) { console.log('getMatches error:', e); return []; }
}
function saveMatches(arr) {
  try {
    localStorage.setItem('shuttlescore_matches', JSON.stringify(arr));
    // Verify it saved
    var verify = localStorage.getItem('shuttlescore_matches');
    if (!verify) console.log('WARNING: localStorage save failed silently');
  } catch(e) {
    console.log('saveMatches error:', e);
    // Show user-facing warning if storage is full
    if (e.name === 'QuotaExceededError') showToast('Storage full — clear old matches');
  }
}
function saveMatchRecord(record) {
  var arr = getMatches();
  arr.unshift(record); // newest first
  if(arr.length > 100) arr = arr.slice(0,100);
  saveMatches(arr);
}
function clearHistory() {
  // confirm() blocked in WebView — just clear directly
  localStorage.removeItem('shuttlescore_matches');
  renderHistory('all');
  refreshHome();
  showToast('History cleared');
}

// ═══════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════
function getProfile() {
  try { return JSON.parse(localStorage.getItem('shuttlescore_profile')||'{}'); } catch(e){return{};}
}
function saveProfileData(p) {
  localStorage.setItem('shuttlescore_profile', JSON.stringify(p));
}
function openProfileSetup() {
  var p = getProfile();
  document.getElementById('profileNameInput').value = p.name||'';
  document.getElementById('profileSubInput').value = p.sub||'';
  document.getElementById('profileSetupOverlay').className='profile-setup-overlay open';
}
function closeProfileSetup() {
  document.getElementById('profileSetupOverlay').className='profile-setup-overlay';
}
function saveProfile() {
  var name = document.getElementById('profileNameInput').value.trim()||'Player';
  var sub  = document.getElementById('profileSubInput').value.trim()||'Badminton Player';
  saveProfileData({name:name,sub:sub});
  closeProfileSetup();
  refreshProfileUI();
  showToast('Profile saved!');
}
function refreshProfileUI() {
  var p = getProfile();
  var n = p.name||'Welcome!', s = p.sub||'Set up your profile';
  document.getElementById('homeBannerName').textContent = n;
  document.getElementById('homeBannerSub').textContent = s;
  document.getElementById('profileName').textContent = n;
  document.getElementById('profileSub').textContent = s;
}

// ═══════════════════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════════════════
function refreshHome() {
  refreshProfileUI();
  var matches = getMatches();
  var profile = getProfile();
  var pname = profile.name || 'Player';
  var total = matches.length;
  var completedWins = matches.filter(function(m){ return m.gameOver && m.winnerId; }).length;
  var winRate = total > 0 ? Math.round(completedWins / total * 100) + '%' : '—';
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statWins').textContent = completedWins;
  document.getElementById('statWinRate').textContent = winRate;

  var recent = matches.slice(0,3);
  var el = document.getElementById('homeRecentMatches');
  if(!recent.length) {
    el.innerHTML='<div class="empty-state"><div class="empty-icon">🏸</div><div class="empty-title">No matches yet</div><div class="empty-sub">Tap the 🏸 button to start</div></div>';
    return;
  }
  el.innerHTML = recent.map(matchCardHtml).join('');
}

function matchCardHtml(m) {
  var dateStr = m.date ? new Date(m.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}) : '';
  var winA = m.winnerId==='A', winB = m.winnerId==='B';
  var badgeClass = m.gameOver ? (winA?'badge-win':'badge-loss') : 'badge-progress';
  var badgeText  = m.gameOver ? (winA?'Win':'Loss') : 'Live';
  var typeBadge  = m.gameType==='doubles'?'Doubles':'Singles';
  var nameA = m.teamA ? (m.gameType==='doubles'?(m.teamA.name||m.teamA.p1):m.teamA.p1) : 'Team A';
  var nameB = m.teamB ? (m.gameType==='doubles'?(m.teamB.name||m.teamB.p1):m.teamB.p1) : 'Team B';
  var subA  = m.teamA&&m.gameType==='doubles' ? (m.teamA.p1+(m.teamA.p2?' & '+m.teamA.p2:'')) : '';
  var subB  = m.teamB&&m.gameType==='doubles' ? (m.teamB.p1+(m.teamB.p2?' & '+m.teamB.p2:'')) : '';
  return '<div class="match-card">'
    +'<div class="match-card-top"><span class="match-date">'+dateStr+'</span><div style="display:flex;gap:6px"><span class="match-badge '+badgeClass+'">'+badgeText+'</span><span class="match-badge badge-singles">'+typeBadge+'</span></div></div>'
    +'<div class="match-teams">'
    +'<div class="match-team"><div class="match-team-name'+(winA?' winner':'')+'">'+esc(nameA)+'</div>'+(subA?'<div class="match-team-sub">'+esc(subA)+'</div>':'')+'</div>'
    +'<div class="match-score"><div class="match-score-num">'+m.scoreA+' — '+m.scoreB+'</div><div class="match-score-label">Final Score</div></div>'
    +'<div class="match-team" style="text-align:right"><div class="match-team-name'+(winB?' winner':'')+'">'+esc(nameB)+'</div>'+(subB?'<div class="match-team-sub">'+esc(subB)+'</div>':'')+'</div>'
    +'</div></div>';
}

// ═══════════════════════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════════════════════
function filterHistory(filter, el) {
  document.querySelectorAll('.filter-chip').forEach(function(c){c.classList.remove('active');});
  el.classList.add('active');
  renderHistory(filter);
}
function renderHistory(filter) {
  var all = getMatches();
  console.log('renderHistory — total matches in storage:', all.length, 'filter:', filter);
  var filtered = all.filter(function(m) {
    if(filter==='all') return true;
    if(filter==='singles') return m.gameType==='singles';
    if(filter==='doubles') return m.gameType==='doubles';
    if(filter==='win') return m.gameOver&&m.winnerId==='A';
    if(filter==='loss') return m.gameOver&&m.winnerId==='B';
    return true;
  });
  var el = document.getElementById('historyList');
  if(!filtered.length) {
    var msg = all.length > 0 ? 'No ' + filter + ' matches found' : 'No matches saved yet';
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div>'
      + '<div class="empty-title">' + msg + '</div>'
      + '<div class="empty-sub">' + (all.length === 0 ? 'Play a match to see history here' : 'Try a different filter') + '</div></div>';
    return;
  }
  el.innerHTML = filtered.map(matchCardHtml).join('');
}

// ═══════════════════════════════════════════════════════
// STATS
// ═══════════════════════════════════════════════════════
function renderStats() {
  var m = getMatches();
  var el = document.getElementById('statsContent');
  if(!m.length) {
    el.innerHTML='<div class="empty-state"><div class="empty-icon">📊</div><div class="empty-title">No data yet</div><div class="empty-sub">Play some matches to see your stats</div></div>';
    return;
  }
  var total=m.length, completed=m.filter(function(x){return x.gameOver;}).length;
  var winsA=m.filter(function(x){return x.gameOver&&x.winnerId==='A';}).length;
  var singles=m.filter(function(x){return x.gameType==='singles';}).length;
  var doubles=m.filter(function(x){return x.gameType==='doubles';}).length;
  var totalRallies=m.reduce(function(s,x){return s+(x.rallies||0);},0);
  var avgRallies = completed>0?Math.round(totalRallies/completed):0;
  el.innerHTML=[
    statsCard('Total Matches',total,'🏸'),
    statsCard('Completed',completed,'✅'),
    statsCard('Singles',singles,'🧍'),
    statsCard('Doubles',doubles,'👥'),
    statsCard('Avg Rallies',avgRallies,'⚡'),
  ].join('');
}
function statsCard(label,val,icon) {
  return '<div class="setup-card" style="display:flex;align-items:center;gap:14px;margin-bottom:10px">'
    +'<span style="font-size:28px">'+icon+'</span>'
    +'<div><div style="font-size:22px;font-weight:900;color:var(--neon)">'+val+'</div>'
    +'<div style="font-size:10px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;font-family:\'Courier New\',monospace">'+label+'</div></div></div>';
}

// ═══════════════════════════════════════════════════════
// SCORER STATE
// ═══════════════════════════════════════════════════════
var scoreA=0,scoreB=0,gameHistory=[],rallyHistory=[],currentServer='A',currentServerName='',gameOver=false,matchSaved=false,gameType='singles';
var numSets=1,setsToWin=1,gamesA=0,gamesB=0,setsHistory=[],firstServer='A';
var teamA={name:'',p1:'',p2:''},teamB={name:'',p1:'',p2:''};
var courtPositions={'A-left':null,'A-right':null,'B-left':null,'B-right':null};
var matchLive=false, _cachedCanvas=null, matchStartTime=null, matchSaved=false;

function teamLabel(t){var o=t==='A'?teamA:teamB;if(gameType==='doubles')return o.name||(t==='A'?'Team A':'Team B');return o.p1.split(' ')[0];}

function selectType(type){
  gameType=type;
  document.getElementById('btn-singles').className='type-btn'+(type==='singles'?' selected':'');
  document.getElementById('btn-doubles').className='type-btn'+(type==='doubles'?' selected':'');
  ['doublesTeamNameA','doublesTeamNameB','doublesA','doublesB'].forEach(function(id){
    document.getElementById(id).className='dbln'+(type==='doubles'?' on':'');
  });
}

function selectSets(n){
    numSets=n;setsToWin=Math.ceil(n/2);
    [1,3,5].forEach(function(v){var el=document.getElementById('sets-btn-'+v);if(el)el.className='sets-sel-btn'+(v===n?' selected':'');});
    var hints={1:'First to win 1 set wins',3:'Best of 3 — first to 2 sets',5:'Best of 5 — first to 3 sets'};
    var h=document.getElementById('setsHint');if(h)h.textContent=hints[n]||'';
  }
  function selectSide(side){
    firstServer=side==='swap'?'B':'A';
    document.getElementById('side-btn-normal').className='sets-sel-btn'+(side==='normal'?' selected':'');
    document.getElementById('side-btn-swap').className='sets-sel-btn'+(side==='swap'?' selected':'');
  }
  function gv(id){var v=document.getElementById(id).value.trim();return v||null;}

function startMatch(){
  var a1=gv('nameA1')||'Player A',b1=gv('nameB1')||'Player B';
  teamA={name:gameType==='doubles'?(gv('teamNameA')||''):'',p1:a1,p2:gameType==='doubles'?(gv('nameA2')||'Partner A'):''};
  teamB={name:gameType==='doubles'?(gv('teamNameB')||''):'',p1:b1,p2:gameType==='doubles'?(gv('nameB2')||'Partner B'):''};
  scoreA=0;scoreB=0;gameHistory=[];rallyHistory=[];gameOver=false;gamesA=0;gamesB=0;setsHistory=[];
  currentServer=firstServer;currentServerName=firstServer==='A'?teamA.p1:teamB.p1;
  matchLive=true;matchStartTime=Date.now();
  // Score 0 (even) → server on RIGHT, receiver diagonal (LEFT)
  var srvTeamInit=firstServer==='A'?teamA:teamB;
  var recvTeamInit=firstServer==='A'?teamB:teamA;
  var recvKeyInit=firstServer==='A'?'B':'A';
  courtPositions={'A-left':null,'A-right':null,'B-left':null,'B-right':null};
  if(gameType==='doubles'){
    courtPositions[firstServer+'-right']=srvTeamInit.p1;
    courtPositions[firstServer+'-left']=srvTeamInit.p2||null;
    courtPositions[recvKeyInit+'-right']=recvTeamInit.p1;
    courtPositions[recvKeyInit+'-left']=recvTeamInit.p2||null;
  } else {
    // Singles: server RIGHT, receiver diagonal LEFT
    courtPositions[firstServer+'-right']=srvTeamInit.p1;
    courtPositions[recvKeyInit+'-left']=recvTeamInit.p1;
  }

  document.getElementById('liveTypeBadge').textContent=gameType==='singles'?'🧍 Singles':'👥 Doubles';
  if(gameType==='doubles'&&teamA.name){document.getElementById('dispA1').textContent=teamA.name;document.getElementById('dispA2').textContent=teamA.p1+' & '+teamA.p2;}
  else{document.getElementById('dispA1').textContent=teamA.p1;document.getElementById('dispA2').textContent=teamA.p2||'';}
  if(gameType==='doubles'&&teamB.name){document.getElementById('dispB1').textContent=teamB.name;document.getElementById('dispB2').textContent=teamB.p1+' & '+teamB.p2;}
  else{document.getElementById('dispB1').textContent=teamB.p1;document.getElementById('dispB2').textContent=teamB.p2||'';}
  document.getElementById('btnLabelA').textContent=teamLabel('A');
  document.getElementById('btnLabelB').textContent=teamLabel('B');
  document.getElementById('legA').textContent=teamLabel('A');
  document.getElementById('legB').textContent=teamLabel('B');
  document.getElementById('courtHint').style.display=gameType==='doubles'?'block':'none';
  document.getElementById('winnerBanner').className='winner-banner';
  document.getElementById('scorer-setup').style.display='none';
  document.getElementById('scorer-live').style.display='block';
  updateDisplay();
}

function goHome(){
  // Always go home — no confirm needed
  pages.forEach(function(id){
    document.getElementById('page-'+id).classList.toggle('active', id==='home');
    var n=document.getElementById('nav-'+id); if(n) n.classList.toggle('active', id==='home');
  });
  currentPage='home';
  refreshHome();
  window.scrollTo(0,0);
}

function confirmNewMatch(){
  // Note: window.confirm() is blocked in WebView — never use it
  matchLive=false; matchSaved=false;
  gameOver=false; scoreA=0; scoreB=0;
  rallyHistory=[]; gameHistory=[];
  // Navigate to score page
  pages.forEach(function(id){
    document.getElementById('page-'+id).classList.toggle('active', id==='score');
    var n=document.getElementById('nav-'+id); if(n) n.classList.toggle('active', id==='score');
  });
  currentPage='score';
  // Reset match options to defaults
  numSets=1; setsToWin=1; firstServer='A';
  gamesA=0; gamesB=0; setsHistory=[];
  // Reset UI option buttons
  [1,3,5].forEach(function(v){
    var el=document.getElementById('sets-btn-'+v);
    if(el) el.className='sets-sel-btn'+(v===1?' selected':'');
  });
  var sn=document.getElementById('side-btn-normal'), ss=document.getElementById('side-btn-swap');
  if(sn) sn.className='sets-sel-btn selected';
  if(ss) ss.className='sets-sel-btn';
  var sh=document.getElementById('setsHint'); if(sh) sh.textContent='First to win 1 set wins';
  // Reset type buttons
  document.getElementById('btn-singles').className='type-btn selected';
  document.getElementById('btn-doubles').className='type-btn';
  gameType='singles';
  ['doublesTeamNameA','doublesTeamNameB','doublesA','doublesB'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.className='dbln';
  });
  // Clear name inputs
  ['nameA1','nameA2','nameB1','nameB2','teamNameA','teamNameB'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  // Show setup, hide live
  document.getElementById('scorer-setup').style.display='block';
  document.getElementById('scorer-live').style.display='none';
  document.getElementById('winnerBanner').className='winner-banner';
  window.scrollTo(0,0);
}

function openPositionPicker(cellId){
  var team=cellId.charAt(0),obj=team==='A'?teamA:teamB,side=cellId.split('-')[1];
  document.getElementById('posSubTitle').textContent=(team==='A'?'Team A':'Team B')+' — '+(side==='left'?'Left box':'Right box');
  var list=document.getElementById('pickList');list.innerHTML='';
  var choices=[obj.p1];
  if(gameType==='doubles'&&obj.p2)choices.push(obj.p2);
  choices.push(null);
  choices.forEach(function(name){
    var ic=(courtPositions[cellId]===name);
    var btn=document.createElement('button');
    btn.className='pick-btn'+(ic?' current':'');
    btn.innerHTML='<div class="pdot"></div><div><div class="pteam">'+(name?(team==='A'?'Team A':'Team B'):'')+
      '</div><div class="pname">'+esc(name||'— Empty —')+'</div></div>';
    btn.onclick=function(){assignPosition(cellId,name);};
    list.appendChild(btn);
  });
  document.getElementById('posOverlay').className='overlay open';
}

function assignPosition(cellId,name){
  var team=cellId.charAt(0),side=cellId.split('-')[1],other=side==='left'?'right':'left';
  var obj=team==='A'?teamA:teamB;
  courtPositions[cellId]=name;
  if(gameType==='doubles'&&obj.p2&&name!==null){
    // Doubles: auto-fill partner in other box
    courtPositions[team+'-'+other]=(name===obj.p1)?obj.p2:obj.p1;
  } else if(gameType==='singles'){
    // Singles: CLEAR the other box so only one player per side
    courtPositions[team+'-'+other]=null;
  }
  var ss=currentServer==='A'?scoreA:scoreB,as=(ss%2===0)?'right':'left';
  var occ=courtPositions[currentServer+'-'+as];if(occ)currentServerName=occ;
  closePosOverlay();updateDisplay();
}

function closePosOverlay(){document.getElementById('posOverlay').className='overlay';}

function openServerPicker(){
  var list=document.getElementById('serverPickList');list.innerHTML='';
  buildAllPlayers().forEach(function(p){
    var ic=(p.name===currentServerName);
    var btn=document.createElement('button');
    btn.className='pick-btn'+(ic?' current':'');
    btn.innerHTML='<div class="pdot"></div><div><div class="pteam">'+esc(p.teamLabel)+'</div><div class="pname">'+esc(p.name)+'</div></div>';
    btn.onclick=function(){selectServer(p);};
    list.appendChild(btn);
  });
  document.getElementById('serverOverlay').className='overlay open';
}

function buildAllPlayers(){
  var l=[],lA=teamLabel('A'),lB=teamLabel('B');
  l.push({name:teamA.p1,team:'A',teamLabel:lA});
  if(gameType==='doubles'&&teamA.p2)l.push({name:teamA.p2,team:'A',teamLabel:lA});
  l.push({name:teamB.p1,team:'B',teamLabel:lB});
  if(gameType==='doubles'&&teamB.p2)l.push({name:teamB.p2,team:'B',teamLabel:lB});
  return l;
}

function selectServer(player){
  currentServer=player.team;currentServerName=player.name;
  var ss=currentServer==='A'?scoreA:scoreB,s=(ss%2===0)?'right':'left',o=s==='right'?'left':'right';
  var st=player.team==='A'?teamA:teamB,rk=player.team==='A'?'B':'A',rt=player.team==='A'?teamB:teamA;
  // Serving team: server on correct side, partner on other side
  courtPositions[player.team+'-'+s]=player.name;
  if(gameType==='doubles'&&st.p2){
    courtPositions[player.team+'-'+o]=(player.name===st.p1)?st.p2:st.p1;
  } else {
    // Singles: clear the other server-side box
    courtPositions[player.team+'-'+o]=null;
  }
  // Receiving team: goes to DIAGONAL (opposite side = o)
  courtPositions[rk+'-'+o]=rt.p1;
  if(gameType==='doubles'&&rt.p2){
    courtPositions[rk+'-'+s]=rt.p2;
  } else {
    // Singles: clear receiver's same-side box
    courtPositions[rk+'-'+s]=null;
  }
  closeServerPicker();updateDisplay();
}

function closeServerPicker(){document.getElementById('serverOverlay').className='overlay';}

function addPoint(player){
  if(gameOver)return;
  gameHistory.push({scoreA:scoreA,scoreB:scoreB,currentServer:currentServer,currentServerName:currentServerName,rally:rallyHistory.slice(),positions:JSON.parse(JSON.stringify(courtPositions)),gamesA:gamesA,gamesB:gamesB,setsHistory:JSON.parse(JSON.stringify(setsHistory))});
  if(player==='A')scoreA++;else scoreB++;
  var newSc=player==='A'?scoreA:scoreB;
  var newSide=(newSc%2===0)?'right':'left';
  var newOther=newSide==='right'?'left':'right';
  var recvKey=player==='A'?'B':'A';
  var srvTeam=player==='A'?teamA:teamB;
  var recvTeam=player==='A'?teamB:teamA;
  if(currentServer!==player){
    // Service changes: server on newSide, receiver on DIAGONAL (newOther)
    currentServer=player;
    courtPositions[player+'-'+newSide]=srvTeam.p1;
    courtPositions[player+'-'+newOther]=gameType==='doubles'?srvTeam.p2||null:null;
    courtPositions[recvKey+'-'+newOther]=recvTeam.p1;
    courtPositions[recvKey+'-'+newSide]=gameType==='doubles'?recvTeam.p2||null:null;
    currentServerName=srvTeam.p1;
  } else {
    // Same server wins point: move to new side
    if(gameType==='doubles'){
      var lk=player+'-left',rk=player+'-right',tmp=courtPositions[lk];
      courtPositions[lk]=courtPositions[rk];courtPositions[rk]=tmp;
    } else {
      // Singles: server moves side, receiver mirrors diagonal
      courtPositions[player+'-'+newSide]=srvTeam.p1;
      courtPositions[player+'-'+newOther]=null;
      courtPositions[recvKey+'-'+newOther]=recvTeam.p1;
      courtPositions[recvKey+'-'+newSide]=null;
    }
    currentServerName=courtPositions[player+'-'+newSide]||currentServerName;
  }
  rallyHistory.push(player);
  var el=document.getElementById(player==='A'?'blockA':'blockB');
  el.className='score-block just-scored'+(player==='A'?(scoreA>scoreB?' leading':''):(scoreB>scoreA?' leading':''));
  setTimeout(function(){
    document.getElementById('blockA').className='score-block'+(scoreA>scoreB?' leading':'');
    document.getElementById('blockB').className='score-block'+(scoreB>scoreA?' leading':'');
  },400);
  checkWinner();updateDisplay();
}

function undo(){
  if(!gameHistory.length)return;
  var last=gameHistory.pop();
  scoreA=last.scoreA;
  scoreB=last.scoreB;
  currentServer=last.currentServer;
  currentServerName=last.currentServerName;
  rallyHistory=last.rally;
  courtPositions=last.positions;
  // Restore set state if saved
  if(last.gamesA !== undefined) gamesA=last.gamesA;
  if(last.gamesB !== undefined) gamesB=last.gamesB;
  if(last.setsHistory !== undefined) setsHistory=last.setsHistory;
  gameOver=false;
  matchSaved=false;
  document.getElementById('winnerBanner').className='winner-banner';
  updateSetsDisplay();
  updateDisplay();
}

function checkWinner(){
  var gameWon=((scoreA>=21||scoreB>=21)&&Math.abs(scoreA-scoreB)>=2)||(scoreA>=30||scoreB>=30);
  if(!gameWon) return;
  if(numSets>1){
    var setWinner=scoreA>scoreB?'A':'B';
    setsHistory.push({scoreA:scoreA,scoreB:scoreB,winner:setWinner});
    if(setWinner==='A')gamesA++;else gamesB++;
    updateSetsDisplay();
    if(gamesA>=setsToWin||gamesB>=setsToWin){
      gameOver=true;
      if(!matchSaved&&rallyHistory.length>0){matchSaved=true;saveMatchToHistory();}
    } else {
      // Next set: reset score, swap server
      scoreA=0;scoreB=0;
      currentServer=currentServer==='A'?'B':'A';
      var sT=currentServer==='A'?teamA:teamB,rT=currentServer==='A'?teamB:teamA,rK=currentServer==='A'?'B':'A';
      currentServerName=sT.p1;
      courtPositions[currentServer+'-right']=sT.p1;
      courtPositions[currentServer+'-left']=gameType==='doubles'?sT.p2||null:null;
      courtPositions[rK+'-left']=rT.p1;
      courtPositions[rK+'-right']=gameType==='doubles'?rT.p2||null:null;
      // Do NOT clear gameHistory — keep it so undo can go back across sets
      showToast('Set '+(setsHistory.length)+' done! Next set starting…');
    }
  } else {
    gameOver=true;
    if(!matchSaved&&rallyHistory.length>0){matchSaved=true;saveMatchToHistory();}
  }
}

function saveMatchToHistory(){
  var wo=scoreA>scoreB?'A':'B';
  saveMatchRecord({
    date:matchStartTime||Date.now(),
    gameType:gameType,
    teamA:{name:teamA.name,p1:teamA.p1,p2:teamA.p2},
    teamB:{name:teamB.name,p1:teamB.p1,p2:teamB.p2},
    scoreA:scoreA,scoreB:scoreB,
    winnerId:wo,
    gameOver:true,
    rallies:rallyHistory.length
  });
}

function updateDisplay(){
  document.getElementById('scoreA').textContent=scoreA;
  document.getElementById('scoreB').textContent=scoreB;
  document.getElementById('blockA').className='score-block'+(scoreA>scoreB?' leading':'');
  document.getElementById('blockB').className='score-block'+(scoreB>scoreA?' leading':'');
  var ss=currentServer==='A'?scoreA:scoreB,side=(ss%2===0)?'Right':'Left';
  document.getElementById('serverInfo').innerHTML='Server: <b>'+esc(currentServerName)+' ('+side+')</b>';
  ['A-left','A-right','B-left','B-right'].forEach(function(cid){
    var assigned=courtPositions[cid],isActive=(cid===currentServer+'-'+side.toLowerCase());
    var hl=document.getElementById('hl-'+cid);if(hl)hl.style.display=isActive?'block':'none';
    var ne=document.getElementById('cell-name-'+cid);
    if(ne){ne.textContent=assigned?shortName(assigned):'—';ne.setAttribute('fill',isActive?'#c8f73a':(assigned?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.25)'));}
  });
  var html='';
  rallyHistory.forEach(function(p){html+='<div class="rdot rdot-'+p.toLowerCase()+'"></div>';});
  document.getElementById('rallyDots').innerHTML=html;
  document.getElementById('btnUndo').disabled=!gameHistory.length;
  document.getElementById('btnA').disabled=gameOver;
  document.getElementById('btnB').disabled=gameOver;
  if(gameOver){
    var wo=scoreA>scoreB?teamA:teamB;
    var wd=gameType==='doubles'?(wo.name||(wo===teamA?'Team A':'Team B')):wo.p1;
    document.getElementById('winnerName').textContent=wd+' Wins!';
    document.getElementById('winnerBanner').className='winner-banner visible';
  }
}

function updateSetsDisplay(){
    var bar=document.getElementById('setsDisplayBar');if(!bar)return;
    if(numSets<=1){bar.style.display='none';return;}
    bar.style.display='flex';
    var html='';
    setsHistory.forEach(function(s){
      var wA=s.winner==='A';
      html+='<div style="background:'+(wA?'var(--neon-dim)':'rgba(255,79,100,0.1)')+';border:1px solid '+(wA?'var(--neon)':'var(--red)')+';border-radius:8px;padding:3px 10px;font-size:11px;font-weight:700;font-family:Courier New,monospace;color:'+(wA?'var(--neon)':'var(--red)')+'">'+(wA?'<b>'+s.scoreA+'</b>-'+s.scoreB:s.scoreA+'-<b>'+s.scoreB+'</b>')+'</div>';
    });
    html+='<div style="background:var(--border);border-radius:8px;padding:3px 10px;font-size:10px;font-weight:700;font-family:Courier New,monospace;color:var(--muted)">Set '+(setsHistory.length+1)+'</div>';
    bar.innerHTML=html;
  }
  function shortName(n){var f=n.split(' ')[0];return f.length>9?f.substring(0,8)+'…':f;}
function esc(s){if(!s)return'';return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ═══════════════════════════════════════════════════════
// SHARE
// ═══════════════════════════════════════════════════════
function openShareModal(){
  document.getElementById('shareStatus').className='share-status';
  document.getElementById('shareStatus').textContent='';
  document.getElementById('shareOverlay').className='overlay open';
}
function closeShareModal(){document.getElementById('shareOverlay').className='overlay';}
function setStatus(msg,type){var el=document.getElementById('shareStatus');el.textContent=msg;el.className='share-status '+type;}

function buildShareCanvas(){
  var W=900,isD=gameType==='doubles';
  var tA=isD?(teamA.name||'Team A'):teamA.p1,tB=isD?(teamB.name||'Team B'):teamB.p1;
  var subA=isD?(teamA.p1+(teamA.p2?' & '+teamA.p2:'')):'' ,subB=isD?(teamB.p1+(teamB.p2?' & '+teamB.p2:'')):'' ;
  var lA=scoreA>scoreB,lB=scoreB>scoreA;
  var wnr='';if(gameOver){var wo2=lA?teamA:teamB;wnr=isD?(wo2.name||(wo2===teamA?'Team A':'Team B')):wo2.p1;}
  var rc=rallyHistory.length,PAD=56,dg=22,dr=7,dpr=Math.floor((W-PAD*2)/dg);
  var drows=rc>0?Math.ceil(rc/dpr):0;
  var yBase=isD?480:460,yW=yBase+10,yRH=gameOver?yW+80:yBase+10;
  var yD=yRH+28,yL=yD+drows*dg+20,H=yL+(rc>0?50:20);
  // 2x pixel density for sharp output on all screens
  var DPR=2;
  var c=document.createElement('canvas');
  c.width=W*DPR; c.height=H*DPR;
  c.style.width=W+'px'; c.style.height=H+'px';
  var x=c.getContext('2d');
  x.scale(DPR,DPR);
  x.imageSmoothingEnabled=true;
  x.imageSmoothingQuality='high';
  x.fillStyle='#0a0c10';x.fillRect(0,0,W,H);
  var g=x.createLinearGradient(0,0,W,0);g.addColorStop(0,'rgba(200,247,58,0)');g.addColorStop(0.5,'#c8f73a');g.addColorStop(1,'rgba(200,247,58,0)');
  x.fillStyle=g;x.fillRect(0,0,W,3);
  x.textAlign='center';x.font='26px serif';x.fillStyle='#c8f73a';x.fillText('🏸',W/2-80,56);
  x.font='bold 34px "Courier New",monospace';x.fillStyle='#c8f73a';x.fillText('BADMINTON',W/2+20,58);
  x.font='13px "Courier New",monospace';x.fillStyle='#5a6478';x.fillText('MATCH  RESULT',W/2,84);
  rRect(x,W/2-65,96,130,26,13);x.fillStyle='#12161e';x.fill();x.strokeStyle='#2a3346';x.lineWidth=1;x.stroke();
  x.font='11px "Courier New",monospace';x.fillStyle='#5a6478';x.fillText(isD?'DOUBLES':'SINGLES',W/2,114);
  x.font='bold 32px Arial,sans-serif';x.fillStyle=lA?'#c8f73a':'#e8edf5';x.textAlign='center';x.fillText(tA,W/4,164);
  x.fillStyle='#2a3346';x.font='bold 14px "Courier New",monospace';x.fillText('VS',W/2,160);
  x.font='bold 32px Arial,sans-serif';x.fillStyle=lB?'#c8f73a':'#e8edf5';x.fillText(tB,W*3/4,164);
  if(isD){x.font='13px Arial,sans-serif';x.fillStyle='#5a6478';x.fillText(subA,W/4,184);x.fillText(subB,W*3/4,184);}
  var ry=isD?200:176;x.strokeStyle='#1e2533';x.lineWidth=1;x.beginPath();x.moveTo(PAD,ry);x.lineTo(W-PAD,ry);x.stroke();
  var sy=isD?330:310;
  x.font='bold 150px Arial,sans-serif';x.fillStyle=lA?'#c8f73a':'rgba(255,255,255,0.15)';x.textAlign='center';x.fillText(String(scoreA),W/4,sy);
  x.font='bold 50px Arial,sans-serif';x.fillStyle='#2a3346';x.fillText('—',W/2,sy-20);
  x.font='bold 150px Arial,sans-serif';x.fillStyle=lB?'#c8f73a':'rgba(255,255,255,0.15)';x.fillText(String(scoreB),W*3/4,sy);
  // Sets detail row
  if(setsHistory.length>0){
    var setsY=isD?350:330;
    x.font='12px "Courier New",monospace';x.fillStyle='#5a6478';x.textAlign='center';
    var setStr=setsHistory.map(function(s){return s.scoreA+'-'+s.scoreB;}).join('   |   ');
    x.fillText('SETS: '+setStr,W/2,setsY);
  }
  var d2=isD?390:370;x.strokeStyle='#1e2533';x.lineWidth=1;x.beginPath();x.moveTo(PAD,d2);x.lineTo(W-PAD,d2);x.stroke();
  if(gameOver&&wnr){x.font='11px "Courier New",monospace';x.fillStyle='#5a6478';x.textAlign='center';x.fillText('🏆  WINNER',W/2,yW+10);x.font='bold 36px Arial,sans-serif';x.fillStyle='#c8f73a';x.fillText(wnr.toUpperCase(),W/2,yW+50);}
  x.font='11px "Courier New",monospace';x.fillStyle='#5a6478';x.textAlign='center';x.fillText('RALLY HISTORY  ·  '+rc+' POINTS',W/2,yRH);
  if(rc>0){
    var rw=Math.min(rc,dpr)*dg,sx=W/2-rw/2+dr;
    for(var i=0;i<rc;i++){var cx=sx+(i%dpr)*dg,cy=yD+Math.floor(i/dpr)*dg;x.beginPath();x.arc(cx,cy,dr,0,Math.PI*2);x.fillStyle=rallyHistory[i]==='A'?'#c8f73a':'#ff4f64';x.fill();}
    x.font='12px "Courier New",monospace';
    var wA=x.measureText(tA).width,wB2=x.measureText(tB).width;
    var lt=10+8+wA+32+10+8+wB2,lx=W/2-lt/2,ly=yL;
    x.beginPath();x.arc(lx+5,ly-4,5,0,Math.PI*2);x.fillStyle='#c8f73a';x.fill();
    x.fillStyle='#5a6478';x.textAlign='left';x.fillText(tA,lx+14,ly);
    lx+=14+wA+32;x.beginPath();x.arc(lx+5,ly-4,5,0,Math.PI*2);x.fillStyle='#ff4f64';x.fill();
    x.fillStyle='#5a6478';x.fillText(tB,lx+14,ly);
  }
  x.font='13px "Courier New",monospace';x.fillStyle='rgba(90,100,120,0.5)';x.textAlign='center';x.fillText('euforg.com  ·  ShuttleScore',W/2,H-14);
  return c;
}

function rRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

function doShareImage(){
  try{var c=buildShareCanvas();_cachedCanvas=c;document.getElementById('imgPreview').src=c.toDataURL('image/png');closeShareModal();document.getElementById('imgPreviewOverlay').className='open';}
  catch(e){setStatus('Could not generate image','err');}
}
function shareImageFile(){
  if(!_cachedCanvas)return;
  _cachedCanvas.toBlob(function(blob){
    var file=new File([blob],'badminton-result.png',{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){
      navigator.share({files:[file],title:'Badminton Match Result',text:buildShareText()}).then(function(){closePreview();}).catch(function(e){if(e.name!=='AbortError')shareTextOnly();});return;
    }
    if(navigator.share){navigator.share({title:'Badminton Match Result',text:buildShareText()}).then(function(){closePreview();}).catch(function(){});return;}
    dlFromPreview();
  },'image/png');
}
function shareTextOnly(){if(navigator.share)navigator.share({title:'Badminton Match Result',text:buildShareText()});}
function dlFromPreview(){if(!_cachedCanvas)return;var a=document.createElement('a');a.download='badminton-result.png';a.href=_cachedCanvas.toDataURL('image/png');document.body.appendChild(a);a.click();document.body.removeChild(a);}
function closePreview(){document.getElementById('imgPreviewOverlay').className='';_cachedCanvas=null;}
function doDownloadImage(){try{var c=buildShareCanvas();var a=document.createElement('a');a.download='badminton-result.png';a.href=c.toDataURL('image/png');document.body.appendChild(a);a.click();document.body.removeChild(a);setStatus('✓ Saved to downloads!','ok');}catch(e){setStatus('Could not generate image','err');}}
function doCopyText(){
  var t=buildShareText();
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(function(){setStatus('✓ Copied to clipboard!','ok');}).catch(function(){legacyCopy(t);});}
  else legacyCopy(t);
}
function legacyCopy(t){var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();try{document.execCommand('copy');setStatus('✓ Copied!','ok');}catch(e){setStatus('Score: '+scoreA+'-'+scoreB,'err');}document.body.removeChild(ta);}
function buildShareText(){
  var tl=gameType==='doubles'?'Doubles':'Singles';
  var aL=gameType==='doubles'?(teamA.name?teamA.name+' ('+teamA.p1+(teamA.p2?' & '+teamA.p2:'')+')':teamA.p1+(teamA.p2?' & '+teamA.p2:'')):teamA.p1;
  var bL=gameType==='doubles'?(teamB.name?teamB.name+' ('+teamB.p1+(teamB.p2?' & '+teamB.p2:'')+')':teamB.p1+(teamB.p2?' & '+teamB.p2:'')):teamB.p1;
  var w=scoreA>scoreB?(teamA.name||(teamA.p2?teamA.p1+' & '+teamA.p2:teamA.p1)):scoreB>scoreA?(teamB.name||(teamB.p2?teamB.p1+' & '+teamB.p2:teamB.p1)):'Tied';
  return['🏸 BADMINTON MATCH RESULT','Type: '+tl,aL+' vs '+bL,'Score: '+scoreA+' - '+scoreB,gameOver?'🏆 Winner: '+w:'Match in progress','Rallies: '+rallyHistory.length].join('\n');
}

function shareApp(){
  var text='Check out ShuttleScore — a badminton scorer app by Euforg!\neuforg.com';
  if(navigator.share){navigator.share({title:'ShuttleScore',text:text}).catch(function(){});}
  else{var a=document.createElement('a');a.href='https://wa.me/?text='+encodeURIComponent(text);a.target='_blank';document.body.appendChild(a);a.click();document.body.removeChild(a);}
}

// ═══════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════
function debugStorage(){
    var m=getMatches(),kb=0;
    try{for(var k in localStorage){if(localStorage.hasOwnProperty(k))kb+=localStorage[k].length;}}catch(e){}
    showToast(m.length+' matches · '+Math.round(kb/1024)+'KB');
    console.log('Storage: '+m.length+' matches, '+Math.round(kb/1024)+'KB');
    if(m.length)console.log('Latest:',JSON.stringify(m[0]).substring(0,150));
  }

  function showToast(msg){
  var t=document.getElementById('toast');t.textContent=msg;t.style.display='block';
  setTimeout(function(){t.style.display='none';},2000);
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
refreshHome();
