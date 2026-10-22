(() => {
  const $ = (id) => document.getElementById(id);
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2, 10));
  const today = () => new Date().toISOString().slice(0, 10);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const colorNames = {green:"Navy",red:"Red",blue:"Blue",yellow:"Gold",purple:"Purple",orange:"Orange"};
  const emptyState = () => ({settings:{leagueName:"Westside Wiffle League",seasonLabel:"OFFICIAL LEAGUE",playoffTeams:"4"},teams:[],games:[],players:[]});
  let state = emptyState();
  let supabase = null;
  let commissionerSession = null;
  let realtimeChannel = null;
  let isSaving = false;
  const config = window.WESTSIDE_SUPABASE_CONFIG || {};
  if (window.supabase && config.url && config.anonKey && !config.url.includes("YOUR_PROJECT")) {
    supabase = window.supabase.createClient(config.url, config.anonKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  }
  function normalizeState(raw) {
    const fallback = emptyState();
    const result = raw && typeof raw === "object" ? raw : fallback;
    result.settings = result.settings && typeof result.settings === "object" ? {...fallback.settings, ...result.settings} : fallback.settings;
    result.teams = Array.isArray(result.teams) ? result.teams.map(t => ({...t, players:Array.isArray(t.players)?t.players:[], pool:t.pool||"A", color:t.color||"green"})) : [];
    result.games = Array.isArray(result.games) ? result.games.map(g => ({status:"final",type:"pool",...g})) : [];
    result.players = Array.isArray(result.players) ? result.players : [];
    return result;
  }
  function publicStatePayload() { return {settings:state.settings, teams:state.teams, games:state.games}; }
  async function loadSharedData() {
    if (!supabase) { showSetupWarning(); render(); return; }
    const [leagueResult, playersResult] = await Promise.all([
      supabase.from("league_state").select("data").eq("id",1).single(),
      supabase.from("players").select("id,name,created_at").order("created_at",{ascending:true})
    ]);
    if (leagueResult.error) console.error("Unable to load league data:", leagueResult.error.message);
    if (playersResult.error) console.error("Unable to load registrations:", playersResult.error.message);
    state = normalizeState(leagueResult.data?.data || emptyState());
    state.players = (playersResult.data || []).map(p=>({id:p.id,name:p.name,registeredAt:p.created_at}));
    render();
    if (leagueResult.error || playersResult.error) toast("Could not fully load shared data. Check the Supabase setup.");
  }
  function showSetupWarning() {
    const el = $("connectionNotice");
    if (el) { el.hidden = false; el.textContent = "Shared database is not configured yet. Follow SUPABASE_SETUP.md to connect this league."; }
  }
  function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2800);}
  async function save(){
    render();
    if (!supabase) { toast("Connect Supabase before saving shared league changes."); return false; }
    if (!commissionerSession?.user) { toast("Sign in as the commissioner to make league changes."); return false; }
    isSaving = true;
    try {
      const {error} = await supabase.from("league_state").update({data:publicStatePayload(),updated_at:new Date().toISOString()}).eq("id",1);
      if (error) throw error;
      toast("Saved to the shared league database.");
      return true;
    } catch (err) {
      console.error(err); toast("Save failed. Check commissioner permissions and database setup."); await loadSharedData(); return false;
    } finally { isSaving = false; }
  }
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
    const markup = players.length ? `<ol>${players.map((p,i)=>`<li><span class="registered-number">${String(i+1).padStart(2,"0")}</span><span>${escapeHtml(p.name)}</span></li>`).join("")}</ol>` : '<p class="muted registration-empty">No player registrations yet. Be the first to sign up.</p>';
    if (list) list.innerHTML = markup;
    const directory = $("playersDirectoryList");
    const directoryCount = $("playersDirectoryCount");
    if (directoryCount) directoryCount.textContent = players.length;
    if (directory) directory.innerHTML = players.length ? `<ol>${players.map((p,i)=>`<li><span class="registered-number">${String(i+1).padStart(2,"0")}</span><span class="directory-player-name">${escapeHtml(p.name)}</span><span class="directory-player-status">REGISTERED</span></li>`).join("")}</ol>` : '<div class="empty-state">No players have signed up yet. Be the first to register for the November tournament.</div>';
  }
  function renderHome(){
    if ($("homePlayers")) $("homePlayers").textContent=(state.players||[]).length;
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
  async function syncCommissionerGate(){
    if (supabase) {
      const {data} = await supabase.auth.getSession();
      commissionerSession = data?.session || null;
    } else commissionerSession = null;
    const unlocked = !!commissionerSession?.user;
    $("adminLock").hidden = unlocked;
    $("adminContent").hidden = !unlocked;
    $("commissionerLogout").hidden = !unlocked;
    $("commissionerIdentity").textContent = unlocked ? `Signed in: ${commissionerSession.user.email}` : "";
    if (!unlocked) $("commissionerPassword").value = "";
  }
  $("commissionerPasswordForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!supabase) { setMessage("commissionerLoginMessage","Database is not configured yet. Follow SUPABASE_SETUP.md.","error"); return; }
    const email=$("commissionerEmail").value.trim();
    const password=$("commissionerPassword").value;
    const button=$("commissionerPasswordForm").querySelector("button[type=submit]");
    button.disabled=true; button.textContent="Signing in…";
    const {data,error}=await supabase.auth.signInWithPassword({email,password});
    button.disabled=false; button.innerHTML='Sign in to commissioner area <span>↗</span>';
    if (error) { setMessage("commissionerLoginMessage","Sign-in failed. Check the email/password and make sure this user is authorized as commissioner.","error"); return; }
    commissionerSession=data.session;
    setMessage("commissionerLoginMessage","Signed in. Loading commissioner tools…","success");
    await syncCommissionerGate(); render();
  });
  $("commissionerLogout").addEventListener("click",async()=>{if(supabase)await supabase.auth.signOut();commissionerSession=null;await syncCommissionerGate();toast("Commissioner signed out.");});
  function goToPage(){
    let page=(location.hash||"#home").slice(1);if(!["home","signup","signup-confirmation","players","teams","standings","bracket","scores","admin"].includes(page))page="home";
    if(page === "admin") syncCommissionerGate();
    document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id==="page-"+page));
    document.querySelectorAll("[data-page]").forEach(a=>a.classList.toggle("active",a.dataset.page===page));
    $("mainNav").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"});
    if(page==="signup"||page==="players")renderPlayerSignups();
  }
  $("menuToggle").addEventListener("click",()=>$("mainNav").classList.toggle("open"));
  window.addEventListener("hashchange",goToPage);
  $("signupForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const name=$("playerName").value.trim();
    if(!name){setMessage("signupMessage","Enter your name to register.","error");return;}
    if(!supabase){setMessage("signupMessage","Registration is not connected yet. Please try again after the league database is configured.","error");return;}
    const duplicate=(state.players||[]).some(p=>p.name.trim().toLowerCase()===name.toLowerCase());
    if(duplicate){setMessage("signupMessage","That name is already on the player list.","error");return;}
    const button=$("signupForm").querySelector("button[type=submit]");button.disabled=true;button.textContent="Submitting…";
    const {data,error}=await supabase.from("players").insert({name}).select("id,name,created_at").single();
    button.disabled=false;button.innerHTML='Submit registration <span>↗</span>';
    if(error){setMessage("signupMessage",error.code==="23505"?"That name is already registered.":"Registration failed. Please try again in a moment.","error");return;}
    state.players.push({id:data.id,name:data.name,registeredAt:data.created_at});renderPlayerSignups();renderHome();$("signupForm").reset();
    $("confirmationPlayerName").textContent=name.toUpperCase();$("confirmationMessage").textContent=`Thanks, ${name}. Your player registration has been received.`;location.hash="signup-confirmation";
  });
  $("teamSearch").addEventListener("input",renderTeams);
  $("scoreFilter").addEventListener("change",renderScores);
  $("resultForm").addEventListener("submit",async e=>{
    e.preventDefault();if(!commissionerSession?.user){toast("Sign in as commissioner first.");return;}
    const home=$("homeTeam").value,away=$("awayTeam").value,status=$("gameStatus").value,type=$("gameType").value;
    if(!home||!away){setMessage("resultMessage","Choose both teams.","error");return;}
    if(home===away){setMessage("resultMessage","A team can't play itself. Pick two different teams.","error");return;}
    const hs=Number($("homeScore").value),as=Number($("awayScore").value);
    if(status==="final"&&hs===as){setMessage("resultMessage","Final games need a winner. Ties aren't allowed.","error");return;}
    const game={id:uid(),type,date:$("gameDate").value||today(),home,away,homeScore:hs,awayScore:as,status,round:$("roundName").value.trim()||(type==="pool"?"Pool play":"Playoff")};
    state.games.push(game);const ok=await save();if(ok){$("resultForm").reset();$("gameDate").value=today();$("homeScore").value=0;$("awayScore").value=0;setMessage("resultMessage","Game saved to the shared league. Scores, standings, and bracket are updated.","success");}
  });
  $("adminGameList").addEventListener("click",async e=>{const b=e.target.closest("[data-delete-game]");if(!b||!commissionerSession?.user)return;const g=state.games.find(x=>x.id===b.dataset.deleteGame);if(!g)return;if(confirm(`Delete this game: ${teamName(g.home)} vs ${teamName(g.away)}?`)){state.games=state.games.filter(x=>x.id!==g.id);await save();}});
  $("createTeamForm").addEventListener("submit",async e=>{e.preventDefault();if(!commissionerSession?.user)return;const name=$("adminTeamName").value.trim();if(state.teams.some(t=>t.name.toLowerCase()===name.toLowerCase())){toast("A team with that name already exists.");return;}state.teams.push({id:uid(),name,color:$("adminTeamColor").value,pool:"A",players:[]});if(await save()){$("createTeamForm").reset();toast(`${name} added to the league.`);}});
  $("adminTeamList").addEventListener("click",async e=>{const b=e.target.closest("[data-delete-team]");if(!b||!commissionerSession?.user)return;const t=team(b.dataset.deleteTeam);if(!t)return;if(confirm(`Delete ${t.name} and its roster? Games involving this team will also be deleted.`)){state.teams=state.teams.filter(x=>x.id!==t.id);state.games=state.games.filter(g=>g.home!==t.id&&g.away!==t.id);await save();}});
  $("poolForm").addEventListener("submit",async e=>{e.preventDefault();if(!commissionerSession?.user)return;document.querySelectorAll("[data-pool-team]").forEach(sel=>{const t=team(sel.dataset.poolTeam);if(t)t.pool=sel.value;});if(await save())setMessage("poolMessage","Pool assignments saved to the shared league.","success");});
  $("settingsForm").addEventListener("submit",async e=>{e.preventDefault();if(!commissionerSession?.user)return;state.settings.leagueName=$("leagueName").value.trim();state.settings.seasonLabel=$("seasonLabel").value.trim();state.settings.playoffTeams=$("playoffTeams").value;if(await save())setMessage("settingsMessage","League settings saved.","success");});
  document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));document.querySelectorAll(".admin-panel").forEach(p=>p.classList.toggle("active",p.id==="admin-"+tab.dataset.tab));}));
  $("resetDemo").addEventListener("click",async()=>{if(!commissionerSession?.user)return;if(confirm("Clear all teams, games, and league settings? Player registrations will remain. This cannot be undone.")){const players=state.players;state=emptyState();state.players=players;await save();}});
  $("exportData").addEventListener("click",()=>{if(!commissionerSession?.user)return;const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="westside-wiffle-league.json";a.click();URL.revokeObjectURL(url);});
  function setupRealtime(){
    if(!supabase)return;
    realtimeChannel=supabase.channel("westside-league-live")
      .on("postgres_changes",{event:"*",schema:"public",table:"league_state"},async()=>{await loadSharedData();})
      .on("postgres_changes",{event:"*",schema:"public",table:"players"},async()=>{const {data,error}=await supabase.from("players").select("id,name,created_at").order("created_at",{ascending:true});if(!error){state.players=(data||[]).map(p=>({id:p.id,name:p.name,registeredAt:p.created_at}));renderPlayerSignups();renderHome();}})
      .subscribe();
  }
  $("gameDate").value=today();
  (async()=>{if(supabase){await loadSharedData();setupRealtime();await syncCommissionerGate();supabase.auth.onAuthStateChange(async(_event,session)=>{commissionerSession=session;await syncCommissionerGate();render();});}else{showSetupWarning();render();await syncCommissionerGate();}goToPage();})();
})();
