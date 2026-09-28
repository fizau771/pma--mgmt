"use client";
import {useEffect,useMemo,useState} from "react";

const TERMS=["1st Term","2nd Term","3rd Term","4th Term"];
const COMPANIES=["Alpha","Bravo","Charlie","Delta"];
const PLATOONS=["1st","2nd","3rd","4th"];
const COURSES=["Tactics","Military History","Leadership","Physical Training","Map Reading"];

const seed=[
  {id:1,roll:"24-001",name:"Ali Ahmed",company:"Alpha",platoon:"1st",term:"1st Term",courses:["Tactics","Leadership"],marks:{quiz:91,mid:82,final:88,assign:86}}
];

const pct=m=>Math.round(((+m.quiz||0)*.2+(+m.mid||0)*.25+(+m.final||0)*.35+(+m.assign||0)*.2)*100)/100;

export default function App(){
  const [login,setLogin]=useState(false),[u,setU]=useState(""),[p,setP]=useState("");
  const [cadets,setCadets]=useState(seed),[tab,setTab]=useState("dashboard"),[q,setQ]=useState(""),[notice,setNotice]=useState("");
  const [form,setForm]=useState({roll:"",name:"",company:"Alpha",platoon:"1st",term:"1st Term"});
  const [mid,setMid]=useState(null),[marks,setMarks]=useState({quiz:0,mid:0,final:0,assign:0});
  const [courseCadet,setCourseCadet]=useState(null),[selectedCourses,setSelectedCourses]=useState([]);
  const [company,setCompany]=useState("All"),[platoon,setPlatoon]=useState("All");

  useEffect(()=>{try{const x=localStorage.getItem("pma-cadets-v8");if(x)setCadets(JSON.parse(x))}catch{}},[]);
  useEffect(()=>{if(login)localStorage.setItem("pma-cadets-v8",JSON.stringify(cadets))},[cadets,login]);

  const ranked=useMemo(()=>[...cadets].map(c=>({...c,percentage:pct(c.marks||{})})).sort((a,b)=>b.percentage-a.percentage).map((c,i)=>({...c,position:i+1})),[cadets]);
  const filtered=ranked.filter(c=>(c.roll+" "+c.name+" "+c.company+" "+c.platoon).toLowerCase().includes(q.toLowerCase()));
  const resultFiltered=ranked.filter(c=>(company==="All"||c.company===company)&&(platoon==="All"||c.platoon===platoon));
  const msg=x=>{setNotice(x);setTimeout(()=>setNotice(""),2500)};

  function signin(e){e.preventDefault();if(u==="admin"&&p==="PMA@123")setLogin(true);else alert("Invalid login. Use admin / PMA@123");}
  function add(e){
    e.preventDefault();
    if(!form.name.trim()||!form.roll.trim())return;
    setCadets(cs=>[{id:Date.now(),...form,courses:[],marks:{quiz:0,mid:0,final:0,assign:0}},...cs]);
    setForm({...form,roll:"",name:""});msg("Cadet registered successfully.");
  }
  function promote(c){
    const i=TERMS.indexOf(c.term);
    if(i===3)return msg("Cadet is already in 4th Term.");
    if(!confirm("Promote "+c.name+" to "+TERMS[i+1]+"?"))return;
    setCadets(cs=>cs.map(x=>x.id===c.id?{...x,term:TERMS[i+1]}:x));msg("Cadet promoted.");
  }
  function saveMarks(){
    setCadets(cs=>cs.map(c=>c.id===mid?{...c,marks}:c));
    setMid(null);msg("Marks saved.");
  }
  function saveCourses(){
    setCadets(cs=>cs.map(c=>c.id===courseCadet?{...c,courses:selectedCourses}:c));
    setCourseCadet(null);msg("Courses assigned.");
  }

  if(!login)return <div className="login"><div className="loginGlow"/><form onSubmit={signin} className="loginCard">
    <div className="crest">🛡️</div><div className="eyebrow">PAKISTAN MILITARY ACADEMY</div><h1>Cadet Management</h1>
    <p>Secure academic administration portal</p>
    <input placeholder="Username" value={u} onChange={e=>setU(e.target.value)}/>
    <input type="password" placeholder="Password" value={p} onChange={e=>setP(e.target.value)}/>
    <button className="primary wide">Sign In <span>→</span></button>
    <small>Demo access: <b>admin</b> / <b>PMA@123</b></small>
  </form></div>;

  const nav=[
    ["dashboard","⌂","Dashboard"],["cadets","♙","Cadet Register"],["courses","▣","Course Assignment"],
    ["marks","✎","Results & Exams"],["results","◈","Results"]
  ];

  return <main>
    <aside>
      <div className="brand"><div className="brandMark">🛡️</div><div><b>PMA</b><span>CADET MANAGEMENT</span></div></div>
      <div className="navLabel">MAIN MENU</div>
      {nav.map(([x,icon,label])=><button className={tab===x?"nav active":"nav"} onClick={()=>setTab(x)} key={x}><i>{icon}</i>{label}<em>{tab===x?"•":""}</em></button>)}
      <div className="sidebarBottom"><div className="userMini"><div className="avatar">A</div><div><b>Administrator</b><small>System Admin</small></div></div><button className="logout" onClick={()=>setLogin(false)}>↪ Logout</button></div>
    </aside>

    <section className="content">
      <header><div><div className="crumb">PMA / <b>{nav.find(n=>n[0]===tab)?.[2]}</b></div><h1>{nav.find(n=>n[0]===tab)?.[2]}</h1><p>Pakistan Military Academy · Cadet Management Portal</p></div><div className="status"><span/> System Online</div></header>
      {notice&&<div className="notice">✓ {notice}</div>}

      {tab==="dashboard"&&<Dashboard cadets={cadets} ranked={ranked} setTab={setTab}/>}
      {tab==="cadets"&&<><div className="toolbar"><div><h2>Cadet Register</h2><p>Register and manage academy cadets.</p></div><input placeholder="⌕  Search by roll no. or name..." value={q} onChange={e=>setQ(e.target.value)}/></div>
        <div className="two"><Panel title="Register New Cadet" icon="＋"><form onSubmit={add} className="form">
          <label>Roll Number<input placeholder="e.g. 24-015" value={form.roll} onChange={e=>setForm({...form,roll:e.target.value})}/></label>
          <label>Cadet Name<input placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label>Company<select value={form.company} onChange={e=>setForm({...form,company:e.target.value})}>{COMPANIES.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Platoon<select value={form.platoon} onChange={e=>setForm({...form,platoon:e.target.value})}>{PLATOONS.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Current Term<select value={form.term} onChange={e=>setForm({...form,term:e.target.value})}>{TERMS.map(x=><option key={x}>{x}</option>)}</select></label>
          <button className="primary">Register Cadet <span>→</span></button>
        </form></Panel>
        <Panel title={"Registered Cadets · "+filtered.length} icon="♙"><div className="list">{filtered.map(c=><div className="cadet" key={c.id}><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company} Company · {c.platoon} Platoon</small></div></div><div className="actions"><span className="pill">{c.term}</span><button className="outline" onClick={()=>promote(c)}>Promote</button></div></div>)}</div></Panel></div>
      </>}

      {tab==="courses"&&<Panel title="Course Assignment" icon="▣"><div className="filterBar"><select value={company} onChange={e=>setCompany(e.target.value)}><option value="All">All Companies</option>{COMPANIES.map(x=><option key={x}>{x}</option>)}</select><select value={platoon} onChange={e=>setPlatoon(e.target.value)}><option value="All">All Platoons</option>{PLATOONS.map(x=><option key={x}>{x}</option>)}</select></div><div className="courseGrid">{resultFiltered.map(c=><div className="courseCard" key={c.id}><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company} · {c.platoon} Platoon · {c.term}</small></div></div><div className="courseTags">{(c.courses||[]).length?(c.courses||[]).map(x=><span key={x}>{x}</span>):<small>No courses assigned</small>}</div><button className="outline full" onClick={()=>{setCourseCadet(c.id);setSelectedCourses(c.courses||[])}}>Manage Courses</button></div>)}</div></Panel>}

      {tab==="marks"&&<Panel title="Results & Exams" icon="✎"><p className="muted">Enter assessment marks. Final percentage uses Quiz 20% · Mid Term 25% · Final Term 35% · Assignments 20%.</p>{filtered.map(c=><div className="cadet" key={c.id}><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.term}</small></div></div><div className="resultMini"><strong>{pct(c.marks||{}).toFixed(2)}%</strong><button className="outline" onClick={()=>{setMid(c.id);setMarks(c.marks||{quiz:0,mid:0,final:0,assign:0})}}>Edit Marks</button></div></div>)}</Panel>}

      {tab==="results"&&<Panel title="Overall Results & Positions" icon="◈"><div className="filterBar"><select value={company} onChange={e=>setCompany(e.target.value)}><option value="All">All Companies</option>{COMPANIES.map(x=><option key={x}>{x}</option>)}</select><select value={platoon} onChange={e=>setPlatoon(e.target.value)}><option value="All">All Platoons</option>{PLATOONS.map(x=><option key={x}>{x}</option>)}</select></div>{resultFiltered.map(c=><div className="rankRow" key={c.id}><div className="rank">#{c.position}</div><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company} · {c.platoon} Platoon · {c.term}</small></div></div><div className="bar"><span style={{width:c.percentage+"%"}}/></div><strong>{c.percentage.toFixed(2)}%</strong></div>)}</Panel>}

      {courseCadet&&<Modal title="Assign Courses"><p className="muted">Select courses for this cadet.</p><div className="checkGrid">{COURSES.map(c=><label className="check" key={c}><input type="checkbox" checked={selectedCourses.includes(c)} onChange={e=>setSelectedCourses(s=>e.target.checked?[...s,c]:s.filter(x=>x!==c))}/><span>{c}</span></label>)}</div><button className="primary" onClick={saveCourses}>Save Courses</button><button className="light" onClick={()=>setCourseCadet(null)}>Cancel</button></Modal>}
      {mid&&<Modal title="Enter Marks"><div className="markGrid">{[["quiz","Quiz"],["mid","Mid Term"],["final","Final Term"],["assign","Assignments"]].map(([k,label])=><label key={k}>{label}<input type="number" min="0" max="100" value={marks[k]} onChange={e=>setMarks({...marks,[k]:e.target.value})}/></label>)}</div><button className="primary" onClick={saveMarks}>Save Marks</button><button className="light" onClick={()=>setMid(null)}>Cancel</button></Modal>}
    </section>
  </main>
}

function Dashboard({cadets,ranked,setTab}){
  const avg=cadets.length?cadets.reduce((s,c)=>s+pct(c.marks||{}),0)/cadets.length:0;
  return <><div className="hero"><div><span className="heroTag">ACADEMIC COMMAND CENTER</span><h2>Welcome back, Administrator.</h2><p>Monitor cadet registration, courses and academic performance from one place.</p><button className="primary" onClick={()=>setTab("cadets")}>Manage Cadets <span>→</span></button></div><div className="heroShield">🛡️</div></div>
    <div className="cards"><Card n={cadets.length} t="Registered Cadets" icon="♙"/><Card n={cadets.filter(c=>(c.courses||[]).length>0).length} t="With Courses" icon="▣"/><Card n={avg.toFixed(1)+"%"} t="Average Result" icon="◈"/><Card n={ranked[0]?.percentage?.toFixed(1)||"0"} t="Highest Result" icon="★"/></div>
    <div className="dashGrid"><Panel title="Top Results" icon="★">{ranked.slice(0,5).map(c=><div className="rankRow compact" key={c.id}><div className="rank">#{c.position}</div><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company}</small></div></div><strong>{c.percentage.toFixed(2)}%</strong></div>)}</Panel><Panel title="Quick Actions" icon="⚡"><div className="quick"><button onClick={()=>setTab("cadets")}><b>♙</b> Register Cadet <span>→</span></button><button onClick={()=>setTab("courses")}><b>▣</b> Assign Courses <span>→</span></button><button onClick={()=>setTab("marks")}><b>✎</b> Enter Exam Marks <span>→</span></button><button onClick={()=>setTab("results")}><b>◈</b> View Positions <span>→</span></button></div></Panel></div>
  </>;
}
function Card({n,t,icon}){return <div className="card"><div className="cardIcon">{icon}</div><div><b>{n}</b><span>{t}</span></div></div>}
function Panel({title,icon,children}){return <div className="panel"><div className="panelHead"><h2>{icon&&<i>{icon}</i>}{title}</h2></div>{children}</div>}
function Modal({title,children}){return <div className="modal"><div className="modalbox"><h2>{title}</h2>{children}</div></div>}
