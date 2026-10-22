(() => {
  const STORAGE_KEY = "backyardWiffleLeague_v1";
  const $ = (id) => document.getElementById(id);
  const uid = () => "id-" + Math.random().toString(36).slice(2, 10);
  const today = () => new Date().toISOString().slice(0, 10);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const colorNames = {green:"Field Green",red:"Tomato Red",blue:"Pool Blue",yellow:"Sunshine Yellow",purple:"Grape Soda",orange:"Orange Cream"};
  const sample = () => {
    const teams = [
      ["Porch Pirates","green","A"],["The Dingers","red","B"],["Grass Stains","blue","A"],["Fence Hoppers","yellow","B"],
      ["Dirt Dogs","orange","A"],["Moonshot Mafia","purple","B"]
    ].map(([name,color,pool])=>({id:uid(),name,color,pool,players:[]}));
    const playerSeed = [["Mason Cole",7,true],["Riley Park",12,false],["Jordan Lee",4,false],["Sam Rivera",22,true],["Avery Brooks",8,false],["Taylor Quinn",3,false],["Drew Morgan",17,true],["Cameron Reed",9,false],["Alex Kim",2,true],["Jamie Fox",11,false],["Parker James",6,true],["Charlie Lane",14,false]];
    playerSeed.forEach((p,i)=>teams[i%teams.length].players.push({id:uid(),name:p[0],email:p[0].toLowerCase().replace(" ",".")+"@example.com",number:p[1],captain:p[2]}));
    const games = [
      {id:uid(),type:"pool",date:today(),home:teams[0].id,away:teams[2].id,homeScore:7,awayScore:4,status:"final",round:"Pool A · Game 1"},
      {id:uid(),type:"pool",date:today(),home:teams[1].id,away:teams[3].id,homeScore:3,awayScore:5,status:"final",round:"Pool B · Game 1"},
      {id:uid(),type:"pool",date:today(),home:teams[4].id,away:teams[0].id,homeScore:2,awayScore:6,status:"final",round:"Pool A · Game 2"},
      {id:uid(),type:"pool",date:today(),home:teams[3].id,away:teams[5].id,homeScore:4,awayScore:4,status:"scheduled",round:"Pool B · Game 2"},
      {id:uid(),type:"playoff",date:today(),home:teams[0].id,away:teams[1].id,homeScore:8,awayScore:6,status:"final",round:"Semifinal 1"},
      {id:uid(),type:"playoff",date:today(),home:teams[2].id,away:teams[3].id,homeScore:0,awayScore:0,status:"scheduled",round:"Semifinal 2"}
    ];
    return {settings:{leagueName:"Backyard Wiffle League",seasonLabel:"Summer Classic 2026",playoffTeams:"4"},teams,games};
  };
  let state;
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || sample(); } catch { state = sample(); }
  if (!state || !Array.isArray(state.teams) || !Array.isArray(state.games)) state = sample();
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
    $("teamChoice").innerHTML=optionsHtml()+`<option value="__new__">＋ Create a new team</option>`;
    $("homeTeam").innerHTML=optionsHtml();$("awayTeam").innerHTML=optionsHtml();
  }
  function renderHome(){
    const players=state.teams.reduce((n,t)=>n+t.players.length,0);
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
    renderHome();renderTeams();renderStandings();renderScores();renderBracket();renderAdmin();
  }
  function goToPage(){
    let page=(location.hash||"#home").slice(1);if(!["home","signup","teams","standings","bracket","scores","admin"].includes(page))page="home";
    document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));
    document.querySelectorAll("[data-page]").forEach(a=>a.classList.toggle("active",a.dataset.page===page));
    $("mainNav").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"});
    if(page==="signup")renderTeamSelects();
  }
  $("menuToggle").addEventListener("click",()=>$("mainNav").classList.toggle("open"));
  window.addEventListener("hashchange",goToPage);
  $("teamChoice").addEventListener("change",()=>{$("newTeamFields").classList.toggle("hidden",$("teamChoice").value!=="__new__");$("newTeamName").required=$("teamChoice").value==="__new__";});
  $("signupForm").addEventListener("submit",e=>{
    e.preventDefault();
    const name=$("playerName").value.trim(),email=$("playerEmail").value.trim(),choice=$("teamChoice").value;
    if(!choice){setMessage("signupMessage","Choose a team or create a new one.","error");return;}
    let target;
    if(choice==="__new__"){
      const nameNew=$("newTeamName").value.trim();
      if(!nameNew){setMessage("signupMessage","Give your new team a name first.","error");return;}
      if(state.teams.some(t=>t.name.toLowerCase()===nameNew.toLowerCase())){setMessage("signupMessage","That team name is already taken in this league.","error");return;}
      target={id:uid(),name:nameNew,color:$("teamColor").value,pool:"A",players:[]};state.teams.push(target);
    }else target=team(choice);
    if(!target){setMessage("signupMessage","That team could not be found. Refresh and try again.","error");return;}
    if(target.players.some(p=>p.email.toLowerCase()===email.toLowerCase())){setMessage("signupMessage","That email is already registered on this team.","error");return;}
    const player={id:uid(),name,email,number:$("playerNumber").value||"",captain:$("captainCheck").checked};
    if(player.captain)target.players.forEach(p=>p.captain=false);
    target.players.push(player);save();$("signupForm").reset();$("newTeamFields").classList.add("hidden");$("newTeamName").required=false;
    setMessage("signupMessage",`You're on the roster, ${name}! Welcome to ${target.name}.`,"success");
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
  $("resetDemo").addEventListener("click",()=>{if(confirm("Reset all browser data to the original sample league? This cannot be undone.")){state=sample();save();toast("Demo league restored.");}});
  $("exportData").addEventListener("click",()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="backyard-wiffle-league.json";a.click();URL.revokeObjectURL(url);toast("League JSON export prepared.");});
  $("gameDate").value=today();
  render();goToPage();
})();