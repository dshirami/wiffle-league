(() => {
  const STORAGE_KEY = "westsideWiffleLeague_v3";
  const $ = (id) => document.getElementById(id);
  const uid = () => "id-" + Math.random().toString(36).slice(2, 10);
  const today = () => new Date().toISOString().slice(0, 10);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const colorNames = {green:"Navy",red:"Red",blue:"Blue",yellow:"Gold",purple:"Purple",orange:"Orange"};
  const emptyState = () => ({settings:{leagueName:"Westside Wiffle League",seasonLabel:"OFFICIAL LEAGUE",playoffTeams:"4"},teams:[],games:[],players:[]});
  let state;
  try {
    state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || emptyState();
  } catch { state = emptyState(); }
  if (!state || !Array.isArray(state.teams) || !Array.isArray(state.games)) state = emptyState();
  if (!Array.isArray(state.players)) state.players = [];
  if (!state.settings || typeof state.settings !== "object") state.settings = emptyState().settings;
  // Normalize data from older browser saves so one incomplete roster cannot break the entire site.
  state.teams = state.teams.map(t => ({...t, players: Array.isArray(t.players) ? t.players : [], pool: t.pool || "A", color: t.color || "green"}));
  state.games = state.games.map(g => ({status: "final", type: "pool", ...g}));
  let toastTimer;
  function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); render(); }
  function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2800);}
  function team(id){return state.teams.find(t=>t.id===id);}
  function teamName(id){return team(id)?.name || "TBD";}
  function initials(name){return String(name||"?").trim().split(/\s+/).slice(0,2).map(s=>s[0]).join("").toUpperCase();}
  function finalGames(type){return state.games.filter(g=>g.status==="final"&&(!type||g.type===type));}
  function statsFor(t,type="pool"){
    const games=finalGames(type).filter(g=>g.home===t.id||g.away===t.id);
    let w=0,l=0,rf=0,ra=0;
    games.forEach(g=>{const isHome=g.home===t.id,forRuns=Number(isHome?g.homeScore:g.awayScore),against=Number(isHome?g.awayScore:g.homeScore);rf+=forRuns;ra+=against;if(forRuns>against)w++;else if(forRuns<against)l++;});
    return {gp:games.length,w,l,rf,ra,diff:rf-ra};
  }
  function standings(teams=state.teams,type="pool"){
    return [...teams].map(t=>({team:t,...statsFor(t,type)})).sort((a,b)=>b.w-a.w||b.diff-a.diff||b.rf-a.rf||a.team.name.localeCompare(b.team.name));
  }
  function setMessage(id,msg,kind="success"){const el=$(id);if(!el)return;el.textContent=msg;el.className="message "+kind;}
  function optionsHtml(selected=""){return `<option value="">Choose a team</option>`+state.teams.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(t=>`<option value="${escapeHtml(t.id)}" ${t.id===selected?"selected":""}>${escapeHtml(t.name)}</option>`).join("");}
  function renderTeamSelects(){
    $("homeTeam").innerHTML=optionsHtml();$("awayTeam").innerHTML=optionsHtml();
  }
  function renderPlayerSignups(){
    const players = state.players || [];
    const count = $("signupPlayerCount");
    const list = $("signupPlayerList");
    if (count) count.textContent = players.length;
    if (list) list.innerHTML = players.length ? `<ol>${players.map((p,i)=>`<li><span class="registered-number">${String(i+1).padStart(2,"0")}</span><span>${escapeHtml(p.name)}</span></li>`).join("")}</ol>` : '<p class="muted registration-empty">No player registrations yet. Be the first to sign up.</p>';
  }
  function renderHome(){
    const players=(state.players||[]).length+state.teams.reduce((n,t)=>n+t.players.length,0);
    $("homeTeamCount").textContent=state.teams.length;$("homeGames").textContent=finalGames().length;
    $("homeRuns").textContent=finalGames().reduce((n,g)=>n+Number(g.homeScore)+Number(g.awayScore),0);
    $("homePlayers").textContent=players;
    const latest=[...state.games].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,4);
    $("homeLatest").innerHTML=latest.length?latest.map(g=>`<div class="latest-item"><span class="latest-tag">${g.status==="final"?"FINAL": "UP NEXT"}</span><span class="latest-match">${escapeHtml(teamName(g.home))} <span class="muted">vs.</span> ${escapeHtml(teamName(g.away))}</span><span class="latest-score">${g.status==="final"?`${g.homeScore}–${g.awayScore}`:"—"}</span></div>`).join(""):`<div class="empty-state">No games on the books yet. Commissioner, it's your move.</div>`;
  }
  function renderTeams(){
    const query=($("teamSearch").value||"").toLowerCase().trim();
    const list=state.teams.filter(t=>t.name.toLowerCase().includes(query)||t.players.some(p=>p.name.toLowerCase().includes(query)));
    $("teamCountLabel").textContent=`${state.teams.length} team${state.teams.length===1?"":"s"} registered`;
    $("teamGrid").innerHTML=list.length?list.map(t=>{const s=statsFor(t);return `<article class="team-card"><div class="team-card-top"><div class="team-mark ${escapeHtml(t.color)}">${escapeHtml(initials(t.name))}</div><div><h3>${escapeHtml(t.name)}</h3><div class="team-meta">${t.players.length} player${t.players.length===1?"":"s"} · Pool ${escapeHtml(t.pool||"—")}</div></div><div class="team-record"><b>${s.w}–${s.l}</b><span>W–L</span></div></div><div class="roster-title">ROSTER / ${String(t.players.length).padStart(2,"0")}</div><ul class="roster-list">${t.players.length?t.players.map(p=>`<li><span class="jersey">${escapeHtml(p.number||"—")}</span><span>${escapeHtml(p.name)}</span>${p.captain?'<span class="captain-pill">Captain</span>':""}</li>`).join(""):'<li class="muted">No players registered yet.</li>'}</ul></article>`}).join(""):`<div class="empty-state">No teams match that search. Try another name.</div>`;
  }
  function renderStandings(){
    const rows=standings();
    $("standingsBody").innerHTML=rows.length?rows.map((s,i)=>`<tr><td class="rank">${String(i+1).padStart(2,"0")}</td><td class="table-team">${escapeHtml(s.team.name)}<div class="muted">Pool ${escapeHtml(s.team.pool||"—")}</div></td><td>${s.gp}</td><td><b>${s.w}</b></td><td>${s.l}</td><td>${s.rf}</td><td>${s.ra}</td><td class="${s.diff>0?"diff-positive":s.diff<0?"diff-negative":""}">${s.diff>0?"+":""}${s.diff}</td></tr>`).join(""):`<tr><td colspan="8">No teams registered yet.</td></tr>`;
  }
  function gameMarkup(g){
    const home=teamName(g.home),away=teamName(g.away),homeWin=g.status==="final"&&Number(g.homeScore)>Number(g.awayScore),awayWin=g.status==="final"&&Number(g.awayScore)>Number(g.homeScore);
    return `<article class="score-card"><div class="score-card-head"><span>${g.type==="playoff"?"PLAYOFF":"POOL PLAY"}${g.round?" · "+escapeHtml(g.round):""}</span><span>${g.status==="final"?"FINAL":g.status==="scheduled"?"SCHEDULED":"UPCOMING"}</span></div><div class="score-teams"><span class="score-team ${homeWin?"winner":""}">${escapeHtml(home)}${homeWin?" ✦":""}</span><span class="score-number">${g.status==="final"?escapeHtml(g.homeScore):"—"}</span><span class="score-team ${awayWin?"winner":""}">${escapeHtml(away)}${awayWin?" ✦":""}</span><span class="score-number">${g.status==="final"?escapeHtml(g.awayScore):"—"}</span></div><div class="score-foot"><span>${escapeHtml(g.date||"Date TBD")}</span><span>${g.status==="final"?(homeWin?escapeHtml(home):awayWin?escapeHtml(away):"Tie"):"Play ball soon"}</span></div></article>`;
  }
  function renderScores(){
    const filter=$("scoreFilter").value;
    const games=[...state.games].filter(g=>filter==="all"||g.type===filter).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
    $("scoreCount").textContent=`${games.length} game${games.length===1?"":"s"} logged`;
    $("scoreList").innerHTML=games.length?games.map(gameMarkup).join(""):`<div class="empty-state">No games here yet. Check back after first pitch.</div>`;
  }
  function renderBracket(){
    const poolStandings={};
    ["A","B","C","D","E","F"].forEach(p=>poolStandings[p]=standings(state.teams.filter(t=>(t.pool||"A")===p),"pool"));
    $("poolTables").innerHTML=Object.entries(poolStandings).filter(([p,arr])=>arr.length).map(([p,arr])=>`<div class="pool-card"><h3>POOL ${p}</h3><div class="table-scroll"><table><thead><tr><th>TEAM</th><th>W</th><th>L</th><th>DIFF</th></tr></thead><tbody>${arr.map(s=>`<tr><td class="table-team">${escapeHtml(s.team.name)}</td><td>${s.w}</td><td>${s.l}</td><td>${s.diff>0?"+":""}${s.diff}</td></tr>`).join("")}</tbody></table></div></div>`).join("")||'<div class="empty-state">Assign teams to pools in the Commissioner area.</div>';
    const games=state.games.filter(g=>g.type==="playoff");
    const rounds=[...new Set(games.map(g=>g.round||"Playoff"))];
    const rank={Final:99,Championship:99,Semifinal:3,"Semi-final":3,Quarterfinal:2,"Quarter-final":2};
    rounds.sort((a,b)=>(rank[a]||1)-(rank[b]||1));
    $("bracketStatus").textContent=games.length?`${games.length} playoff matchup${games.length===1?"":"s"} added`:"Awaiting playoff matchups";
    $("bracketBoard").innerHTML=games.length?rounds.map(r=>`<div class="bracket-round"><h3 class="round-title">${escapeHtml(r)}</h3>${games.filter(g=>(g.round||"Playoff")===r).map(g=>{const hw=g.status==="final"&&Number(g.homeScore)>Number(g.awayScore),aw=g.status==="final"&&Number(g.awayScore)>Number(g.homeScore);return `<div class="bracket-match"><div class="match-top"><span>${escapeHtml(g.date||"DATE TBD")}</span><span>${g.status==="final"?"FINAL":"UPCOMING"}</span></div><div class="match-team ${hw?"winner":""}"><span>${escapeHtml(teamName(g.home))}</span><span class="match-score">${g.status==="final"?escapeHtml(g.homeScore):"—"}</span></div><div class="match-team ${aw?"winner":""}"><span>${escapeHtml(teamName(g.away))}</span><span class="match-score">${g.status==="final"?escapeHtml(g.awayScore):"—"}</span></div></div>`}).join("")}</div>`).join(""):`<div class="empty-state">No playoff games scheduled yet. Enter playoff matchups in the Commissioner area to build the bracket.</div>`;
  }
  function renderAdmin(){
    renderTeamSelects();
    $("adminGameList").innerHTML=state.games.length?[...state.games].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(g=>`<div class="admin-list-item"><div><b>${escapeHtml(teamName(g.home))} ${g.status==="final"?escapeHtml(g.homeScore):"—"} – ${g.status==="final"?escapeHtml(g.awayScore):"—"} ${escapeHtml(teamName(g.away))}</b><small>${escapeHtml(g.date||"Date TBD")} · ${escapeHtml(g.type)} · ${escapeHtml(g.round||"")}</small></div><button class="mini-delete" data-delete-game="${g.id}">Delete</button></div>`).join(""):'<div class="empty-state">No games entered yet.</div>';
    $("adminTeamList").innerHTML=state.teams.length?state.teams.map(t=>`<div class="admin-list-item"><div><b>${escapeHtml(t.name)}</b><small>${t.players.length} player(s) · Pool ${escapeHtml(t.pool||"A")} · ${escapeHtml(colorNames[t.color]||"Field Green")}</small></div><button class="mini-delete" data-delete-team="${t.id}">Delete team</button></div>`).join(""):'<div class="empty-state">No teams yet.</div>';
    $("poolAssignments").innerHTML=state.teams.length?state.teams.map(t=>`<div class="pool-assignment-row"><b>${escapeHtml(t.name)}</b><select data-pool-team="${t.id}" aria-label="Pool for ${escapeHtml(t.name)}">${["A","B","C","D","E","F"].map(p=>`<option value="${p}" ${p===(t.pool||"A")?"selected":""}>Pool ${p}</option>`).join("")}</select></div>`).join(""):'<div class="empty-state">Add teams to assign pools.</div>';
    $("leagueName").value=state.settings.leagueName||"Backyard Wiffle League";$("seasonLabel").value=state.settings.seasonLabel||"";$("playoffTeams").value=state.settings.playoffTeams||"4";
  }
  function render(){
    document.title=(state.settings.leagueName||"Backyard Wiffle League");
    document.querySelectorAll(".brand b").forEach(el=>el.textContent=(state.settings.leagueName||"Backyard Wiffle League").split(" ").slice(0,2).join(" ").toUpperCase());
    document.querySelectorAll(".brand small").forEach(el=>el.textContent=(state.settings.seasonLabel||"WIFFLE LEAGUE").toUpperCase());
    renderPlayerSignups();renderHome();renderTeams();renderStandings();renderScores();renderBracket();renderAdmin();
  }
  const COMMISSIONER_SESSION_KEY = "westsideWiffleCommissionerUnlocked";
  function commissionerUnlocked(){ try { return sessionStorage.getItem(COMMISSIONER_SESSION_KEY) === "yes"; } catch { return false; } }
  function syncCommissionerGate(){
    const unlocked = commissionerUnlocked();
    $("adminLock").hidden = unlocked;
    $("adminContent").hidden = !unlocked;
    if (!unlocked) $("commissionerPassword").value = "";
  }
  $("commissionerPasswordForm").addEventListener("submit", e => {
    e.preventDefault();
    if ($("commissionerPassword").value === "poopy") {
      try { sessionStorage.setItem(COMMISSIONER_SESSION_KEY, "yes"); } catch {}
      setMessage("commissionerLoginMessage", "Access granted. Commissioner tools unlocked.", "success");
      syncCommissionerGate();
    } else {
      setMessage("commissionerLoginMessage", "Incorrect password. Try again.", "error");
      $("commissionerPassword").select();
    }
  });
  function goToPage(){
    let page=(location.hash||"#home").slice(1);if(!["home","signup","signup-confirmation","teams","standings","bracket","scores","admin"].includes(page))page="home";
    if(page === "admin") syncCommissionerGate();
    document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));
    document.querySelectorAll("[data-page]").forEach(a=>a.classList.toggle("active",a.dataset.page===page));
    $("mainNav").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"});
    if(page==="signup")renderPlayerSignups();
  }
  $("menuToggle").addEventListener("click",()=>$("mainNav").classList.toggle("open"));
  window.addEventListener("hashchange",goToPage);
  $("signupForm").addEventListener("submit",e=>{
    e.preventDefault();
    const name=$("playerName").value.trim();
    if(!name){setMessage("signupMessage","Enter your name to register.","error");return;}
    const duplicate=(state.players||[]).some(p=>p.name.trim().toLowerCase()===name.toLowerCase());
    if(duplicate){setMessage("signupMessage","That name is already on the player list.","error");return;}
    if(!Array.isArray(state.players))state.players=[];
    state.players.push({id:uid(),name,registeredAt:new Date().toISOString()});
    save();$("signupForm").reset();
    $("confirmationPlayerName").textContent = name.toUpperCase();
    $("confirmationMessage").textContent = `Thanks, ${name}. Your player registration has been received.`;
    location.hash = "signup-confirmation";
  });
  $("teamSearch").addEventListener("input",renderTeams);
  $("scoreFilter").addEventListener("change",renderScores);
  $("resultForm").addEventListener("submit",e=>{
    e.preventDefault();
    const home=$("homeTeam").value,away=$("awayTeam").value,status=$("gameStatus").value,type=$("gameType").value;
    if(!home||!away){setMessage("resultMessage","Choose both teams.","error");return;}
    if(home===away){setMessage("resultMessage","A team can't play itself. Pick two different teams.","error");return;}
    const hs=Number($("homeScore").value),as=Number($("awayScore").value);
    if(status==="final"&&hs===as){setMessage("resultMessage","Final games need a winner. Ties aren't allowed.","error");return;}
    const game={id:uid(),type,date:$("gameDate").value||today(),home,away,homeScore:hs,awayScore:as,status,round:$("roundName").value.trim()||(type==="pool"?"Pool play":"Playoff")};
    state.games.push(game);save();$("resultForm").reset();$("gameDate").value=today();$("homeScore").value=0;$("awayScore").value=0;
    setMessage("resultMessage","Game saved. Standings, scores, and bracket have been refreshed.","success");
  });
  $("adminGameList").addEventListener("click",e=>{const b=e.target.closest("[data-delete-game]");if(!b)return;const g=state.games.find(x=>x.id===b.dataset.deleteGame);if(!g)return;if(confirm(`Delete this game: ${teamName(g.home)} vs ${teamName(g.away)}?`)){state.games=state.games.filter(x=>x.id!==g.id);save();toast("Game removed from the scorebook.");}});
  $("createTeamForm").addEventListener("submit",e=>{e.preventDefault();const name=$("adminTeamName").value.trim();if(state.teams.some(t=>t.name.toLowerCase()===name.toLowerCase())){toast("A team with that name already exists.");return;}state.teams.push({id:uid(),name,color:$("adminTeamColor").value,pool:"A",players:[]});save();$("createTeamForm").reset();toast(`${name} added to the league.`);});
  $("adminTeamList").addEventListener("click",e=>{const b=e.target.closest("[data-delete-team]");if(!b)return;const t=team(b.dataset.deleteTeam);if(!t)return;if(confirm(`Delete ${t.name} and its roster? Games involving this team will also be deleted.`)){state.teams=state.teams.filter(x=>x.id!==t.id);state.games=state.games.filter(g=>g.home!==t.id&&g.away!==t.id);save();toast("Team and associated games deleted.");}});
  $("poolForm").addEventListener("submit",e=>{e.preventDefault();document.querySelectorAll("[data-pool-team]").forEach(sel=>{const t=team(sel.dataset.poolTeam);if(t)t.pool=sel.value;});save();setMessage("poolMessage","Pool assignments saved.","success");});
  $("settingsForm").addEventListener("submit",e=>{e.preventDefault();state.settings.leagueName=$("leagueName").value.trim();state.settings.seasonLabel=$("seasonLabel").value.trim();state.settings.playoffTeams=$("playoffTeams").value;save();setMessage("settingsMessage","League settings saved.","success");});
  document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));document.querySelectorAll(".admin-panel").forEach(p=>p.classList.toggle("active",p.id==="admin-"+tab.dataset.tab));}));
  $("resetDemo").addEventListener("click",()=>{if(confirm("Clear all local player registrations, teams, games, and settings? This cannot be undone.")){state=emptyState();save();toast("League data cleared.");}});
  $("exportData").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="backyard-wiffle-league.json";a.click();URL.revokeObjectURL(url);toast("League JSON export prepared.");});
  $("gameDate").value=today();
  syncCommissionerGate();render();goToPage();
})();