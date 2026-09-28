"use client";
import {useEffect,useMemo,useState} from "react";
import * as XLSX from "xlsx";

const TERMS=["1st Term","2nd Term","3rd Term","4th Term"];
const COMPANIES=["Alpha","Bravo","Charlie","Delta"];
const PLATOONS=["1st","2nd","3rd","4th"];
const TERM_COURSES={
  "1st Term":["Military Orientation","Drill","Physical Training","Map Reading","Military History"],
  "2nd Term":["Tactics I","Weapons Training","Field Craft","Leadership I","Physical Training II"],
  "3rd Term":["Tactics II","Military Law","Leadership II","Navigation","Signals"],
  "4th Term":["Advanced Tactics","Command & Staff","Military Administration","Leadership III","Final Exercise"]
};
const seed=[
  {id:1,roll:"24-001",name:"Ali Ahmed",company:"Alpha",platoon:"1st",term:"1st Term",courses:["Military Orientation","Drill"],marks:{quiz:91,mid:82,final:88,assign:86}}
];
const pct=m=>Math.round(((+m.quiz||0)*.2+(+m.mid||0)*.25+(+m.final||0)*.35+(+m.assign||0)*.2)*100)/100;
const clean=v=>String(v??"").trim();
const norm=v=>clean(v).toLowerCase().replace(/[\s_\-]/g,"");
const field=(row,names)=>{for(const n of names){const k=Object.keys(row).find(x=>norm(x)===norm(n));if(k&&clean(row[k]))return clean(row[k])}return ""};

export default function App(){
  const [login,setLogin]=useState(false),[u,setU]=useState(""),[p,setP]=useState("");
  const [cadets,setCadets]=useState(seed),[tab,setTab]=useState("dashboard"),[notice,setNotice]=useState("");
  const [cadetQ,setCadetQ]=useState(""),[cadetCompany,setCadetCompany]=useState("All"),[cadetPlatoon,setCadetPlatoon]=useState("All"),[cadetTerm,setCadetTerm]=useState("All");
  const [markQ,setMarkQ]=useState(""),[markCompany,setMarkCompany]=useState("All"),[markPlatoon,setMarkPlatoon]=useState("All");
  const [courseCompany,setCourseCompany]=useState("All"),[coursePlatoon,setCoursePlatoon]=useState("All"),[courseTerm,setCourseTerm]=useState("1st Term");
  const [resultCompany,setResultCompany]=useState("All"),[resultPlatoon,setResultPlatoon]=useState("All"),[graphScope,setGraphScope]=useState("overall");
  const [form,setForm]=useState({roll:"",name:"",company:"Alpha",platoon:"1st",term:"1st Term"});
  const [mid,setMid]=useState(null),[marks,setMarks]=useState({quiz:0,mid:0,final:0,assign:0});
  const [courseCadet,setCourseCadet]=useState(null),[selectedCourses,setSelectedCourses]=useState([]);
  const [excelBusy,setExcelBusy]=useState(false);

  useEffect(()=>{try{const x=localStorage.getItem("pma-cadets-v9");if(x)setCadets(JSON.parse(x))}catch{}},[]);
  useEffect(()=>{if(login)localStorage.setItem("pma-cadets-v9",JSON.stringify(cadets))},[cadets,login]);

  const ranked=useMemo(()=>[...cadets].map(c=>({...c,percentage:pct(c.marks||{})})).sort((a,b)=>b.percentage-a.percentage).map((c,i)=>({...c,overallPosition:i+1})),[cadets]);

  const cadetFiltered=ranked.filter(c=>
    (cadetCompany==="All"||c.company===cadetCompany)&&
    (cadetPlatoon==="All"||c.platoon===cadetPlatoon)&&
    (cadetTerm==="All"||c.term===cadetTerm)&&
    (c.roll+" "+c.name).toLowerCase().includes(cadetQ.toLowerCase())
  );
  const markFiltered=ranked.filter(c=>
    (markCompany==="All"||c.company===markCompany)&&
    (markPlatoon==="All"||c.platoon===markPlatoon)&&
    (c.roll+" "+c.name).toLowerCase().includes(markQ.toLowerCase())
  );
  const courseFiltered=ranked.filter(c=>
    (courseCompany==="All"||c.company===courseCompany)&&
    (coursePlatoon==="All"||c.platoon===coursePlatoon)&&c.term===courseTerm
  );
  const resultFiltered=ranked.filter(c=>(resultCompany==="All"||c.company===resultCompany)&&(resultPlatoon==="All"||c.platoon===resultPlatoon));

  const msg=x=>{setNotice(x);setTimeout(()=>setNotice(""),3000)};
  function signin(e){e.preventDefault();if(u==="admin"&&p==="PMA@123")setLogin(true);else alert("Invalid login. Use admin / PMA@123");}
  function add(e){
    e.preventDefault();
    if(!form.name.trim()||!form.roll.trim())return msg("Enter roll number and cadet name.");
    if(cadets.some(c=>c.roll.toLowerCase()===form.roll.trim().toLowerCase()))return msg("That roll number is already registered.");
    setCadets(cs=>[{id:Date.now(),...form,courses:[],marks:{quiz:0,mid:0,final:0,assign:0}},...cs]);
    setForm({...form,roll:"",name:""});msg("Cadet registered successfully.");
  }
  function promote(c){
    const i=TERMS.indexOf(c.term);
    if(i===3)return msg("Cadet is already in 4th Term.");
    if(!confirm("Promote "+c.name+" to "+TERMS[i+1]+"?"))return;
    setCadets(cs=>cs.map(x=>x.id===c.id?{...x,term:TERMS[i+1],courses:[]}:x));
    msg("Cadet promoted to "+TERMS[i+1]+". Assign the new term courses.");
  }
  function saveMarks(){
    setCadets(cs=>cs.map(c=>c.id===mid?{...c,marks:{
      quiz:Math.max(0,Math.min(100,+marks.quiz||0)),mid:Math.max(0,Math.min(100,+marks.mid||0)),
      final:Math.max(0,Math.min(100,+marks.final||0)),assign:Math.max(0,Math.min(100,+marks.assign||0))
    }}:c));
    setMid(null);msg("Marks saved and percentage recalculated.");
  }
  function saveCourses(){
    setCadets(cs=>cs.map(c=>c.id===courseCadet?{...c,courses:selectedCourses}:c));
    setCourseCadet(null);msg("Courses assigned successfully.");
  }
  function toggleCourse(course){
    setSelectedCourses(s=>s.includes(course)?s.filter(x=>x!==course):[...s,course]);
  }
  async function importExcel(e){
    const file=e.target.files?.[0];if(!file)return;
    setExcelBusy(true);
    try{
      const data=await file.arrayBuffer();
      const wb=XLSX.read(data,{type:"array"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const rows=XLSX.utils.sheet_to_json(ws,{defval:""});
      const imported=[];
      for(const row of rows){
        const roll=field(row,["Roll Number","Roll No","Roll","Cadet Number","Cadet No","Cadet Number"]);
        const name=field(row,["Cadet Name","Name","Full Name"]);
        const company=field(row,["Company"])||"Alpha";
        const platoon=field(row,["Platoon"])||"1st";
        let term=field(row,["Term","Current Term"])||"1st Term";
        const termMatch=TERMS.find(t=>norm(t)===norm(term))||TERMS.find(t=>norm(t).startsWith(norm(term)));
        term=termMatch||"1st Term";
        if(!roll||!name)continue;
        imported.push({id:Date.now()+imported.length,roll,name,company:COMPANIES.includes(company)?company:"Alpha",platoon:PLATOONS.includes(platoon)?platoon:"1st",term,courses:[],marks:{quiz:0,mid:0,final:0,assign:0}});
      }
      const existing=new Set(cadets.map(c=>c.roll.toLowerCase()));
      const fresh=imported.filter(c=>!existing.has(c.roll.toLowerCase()));
      setCadets(cs=>[...fresh,...cs]);
      msg(fresh.length+" cadet(s) imported from Excel."+(imported.length-fresh.length?" Duplicate roll numbers were skipped.":""));
    }catch(err){msg("Could not read the Excel file. Check the column names and file format.");}
    finally{setExcelBusy(false);e.target.value="";}
  }

  if(!login)return <div className="login"><div className="loginGlow"/><form onSubmit={signin} className="loginCard">
    <div className="crest"><img src="/PMA_Kakul_logo.png" alt="Pakistan Military Academy logo"/></div><div className="eyebrow">PAKISTAN MILITARY ACADEMY</div><h1>Cadet Management</h1>
    <p>Secure academic administration portal</p><input placeholder="Username" value={u} onChange={e=>setU(e.target.value)}/><input type="password" placeholder="Password" value={p} onChange={e=>setP(e.target.value)}/>
    <button className="primary wide">Sign In <span>→</span></button><small>Demo access: <b>admin</b> / <b>PMA@123</b></small>
  </form></div>;

  const nav=[["dashboard","⌂","Dashboard"],["cadets","♙","Cadet Register"],["courses","▣","Course Assignment"],["marks","✎","Results & Exams"],["results","◈","Results"]];
  const pageTitle=nav.find(n=>n[0]===tab)?.[2];

  return <main>
    <aside><div className="brand"><div className="brandMark"><img src="/PMA_Kakul_logo.png" alt="PMA logo"/></div><div><b>PMA</b><span>CADET MANAGEMENT</span></div></div>
      <div className="navLabel">MAIN MENU</div>{nav.map(([x,icon,label])=><button className={tab===x?"nav active":"nav"} onClick={()=>setTab(x)} key={x}><i>{icon}</i>{label}<em>{tab===x?"•":""}</em></button>)}
      <div className="sidebarBottom"><div className="userMini"><div className="avatar">A</div><div><b>Administrator</b><small>System Admin</small></div></div><button className="logout" onClick={()=>setLogin(false)}>↪ Logout</button></div>
    </aside>
    <section className="content"><header><div><div className="crumb">PMA / <b>{pageTitle}</b></div><h1>{pageTitle}</h1><p>Pakistan Military Academy · Cadet Management Portal</p></div><div className="status"><span/> System Online</div></header>
      {notice&&<div className="notice">✓ {notice}</div>}

      {tab==="dashboard"&&<Dashboard cadets={cadets} ranked={ranked} setTab={setTab}/>}
      {tab==="cadets"&&<><div className="toolbar"><div><h2>Cadet Register</h2><p>Register individually or import an entire Excel sheet.</p></div><div className="toolbarActions"><label className="uploadBtn">{excelBusy?"Reading Excel…":"＋ Import Excel"}<input type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} disabled={excelBusy}/></label></div></div>
        <div className="filterPanel"><div className="filterTitle">Search & Filters</div><div className="filterGrid"><input placeholder="⌕ Search name or cadet number…" value={cadetQ} onChange={e=>setCadetQ(e.target.value)}/><select value={cadetCompany} onChange={e=>setCadetCompany(e.target.value)}><option value="All">All Companies</option>{COMPANIES.map(x=><option key={x}>{x}</option>)}</select><select value={cadetPlatoon} onChange={e=>setCadetPlatoon(e.target.value)}><option value="All">All Platoons</option>{PLATOONS.map(x=><option key={x}>{x} Platoon</option>)}</select><select value={cadetTerm} onChange={e=>setCadetTerm(e.target.value)}><option value="All">All Terms</option>{TERMS.map(x=><option key={x}>{x}</option>)}</select></div></div>
        <div className="two"><Panel title="Register New Cadet" icon="＋"><form onSubmit={add} className="form">
          <label>Cadet Number / Roll Number<input placeholder="e.g. 24-015" value={form.roll} onChange={e=>setForm({...form,roll:e.target.value})}/></label><label>Cadet Name<input placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label>Company<select value={form.company} onChange={e=>setForm({...form,company:e.target.value})}>{COMPANIES.map(x=><option key={x}>{x}</option>)}</select></label><label>Platoon<select value={form.platoon} onChange={e=>setForm({...form,platoon:e.target.value})}>{PLATOONS.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Current Term<select value={form.term} onChange={e=>setForm({...form,term:e.target.value})}>{TERMS.map(x=><option key={x}>{x}</option>)}</select></label><button className="primary">Register Cadet <span>→</span></button>
        </form><div className="excelHint"><b>Excel upload format</b><span>Required: Roll Number, Name. Optional: Company, Platoon, Term.</span><small>Duplicate roll numbers are skipped automatically.</small></div></Panel>
        <Panel title={"Registered Cadets · "+cadetFiltered.length} icon="♙"><div className="list">{cadetFiltered.map(c=><div className="cadet" key={c.id}><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company} Company · {c.platoon} Platoon</small></div></div><div className="actions"><span className="pill">{c.term}</span><button className="outline" onClick={()=>promote(c)}>Promote</button></div></div>)}{!cadetFiltered.length&&<Empty text="No cadets match your search or filters."/>}</div></Panel></div>
      </>}

      {tab==="courses"&&<><div className="filterPanel"><div className="filterTitle">Course Assignment Filters</div><div className="filterGrid three"><select value={courseTerm} onChange={e=>setCourseTerm(e.target.value)}>{TERMS.map(x=><option key={x}>{x}</option>)}</select><select value={courseCompany} onChange={e=>setCourseCompany(e.target.value)}><option value="All">All Companies</option>{COMPANIES.map(x=><option key={x}>{x}</option>)}</select><select value={coursePlatoon} onChange={e=>setCoursePlatoon(e.target.value)}><option value="All">All Platoons</option>{PLATOONS.map(x=><option key={x}>{x} Platoon</option>)}</select></div></div>
        <Panel title={courseTerm+" Courses · "+courseFiltered.length+" Cadets"} icon="▣"><div className="termCourseStrip">{TERM_COURSES[courseTerm].map(c=><span key={c}>{c}</span>)}</div><div className="courseGrid">{courseFiltered.map(c=><div className="courseCard" key={c.id}><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company} · {c.platoon} Platoon · {c.term}</small></div></div><div className="courseTags">{(c.courses||[]).length?(c.courses||[]).map(x=><span key={x}>{x}</span>):<small>No courses assigned yet</small>}</div><button className="outline full" onClick={()=>{setCourseCadet(c.id);setSelectedCourses(c.courses||[])}}>Assign / Edit Courses</button></div>)}</div>{!courseFiltered.length&&<Empty text="No cadets found for this term and filter."/>}</Panel>
      </>}

      {tab==="marks"&&<><div className="filterPanel"><div className="filterTitle">Search & Filters</div><div className="filterGrid three"><input placeholder="⌕ Search name or cadet number…" value={markQ} onChange={e=>setMarkQ(e.target.value)}/><select value={markCompany} onChange={e=>setMarkCompany(e.target.value)}><option value="All">All Companies</option>{COMPANIES.map(x=><option key={x}>{x}</option>)}</select><select value={markPlatoon} onChange={e=>setMarkPlatoon(e.target.value)}><option value="All">All Platoons</option>{PLATOONS.map(x=><option key={x}>{x} Platoon</option>)}</select></div></div>
        <Panel title="Results & Exams" icon="✎"><p className="muted">Add or edit marks. Weighted percentage: Quiz 20% · Mid Term 25% · Final Term 35% · Assignments 20%.</p>{markFiltered.map(c=><div className="cadet" key={c.id}><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company} · {c.platoon} Platoon · {c.term}</small></div></div><div className="marksPreview"><span>Q {c.marks?.quiz||0}</span><span>MT {c.marks?.mid||0}</span><span>FT {c.marks?.final||0}</span><span>A {c.marks?.assign||0}</span></div><div className="resultMini"><strong>{pct(c.marks||{}).toFixed(2)}%</strong><button className="outline" onClick={()=>{setMid(c.id);setMarks(c.marks||{quiz:0,mid:0,final:0,assign:0})}}>Add / Edit Marks</button></div></div>)}{!markFiltered.length&&<Empty text="No cadets match your search or filters."/>}</Panel></>}

      {tab==="results"&&<><div className="filterPanel"><div className="filterTitle">Results Filters</div><div className="filterGrid three"><select value={resultCompany} onChange={e=>setResultCompany(e.target.value)}><option value="All">All Companies</option>{COMPANIES.map(x=><option key={x}>{x}</option>)}</select><select value={resultPlatoon} onChange={e=>setResultPlatoon(e.target.value)}><option value="All">All Platoons</option>{PLATOONS.map(x=><option key={x}>{x} Platoon</option>)}</select><div className="scopeTabs"><button className={graphScope==="overall"?"selected":""} onClick={()=>setGraphScope("overall")}>Overall</button><button className={graphScope==="company"?"selected":""} onClick={()=>setGraphScope("company")}>Company</button><button className={graphScope==="platoon"?"selected":""} onClick={()=>setGraphScope("platoon")}>Platoon</button></div></div></div>
        <div className="resultLayout"><Panel title="Positions" icon="◈"><div className="positionHead"><span>Overall</span><span>Company</span><span>Platoon</span><span>Cadet</span><span>Result</span></div>{resultFiltered.map(c=><PositionRow key={c.id} c={c} all={ranked}/>)}</Panel><Panel title={(graphScope==="overall"?"Overall":graphScope==="company"?"Company":"Platoon")+" Percentage Graph"} icon="▥"><ResultGraph ranked={ranked} scope={graphScope} company={resultCompany} platoon={resultPlatoon}/></Panel></div>
      </>}

      {courseCadet&&<Modal title={"Assign "+(cadets.find(c=>c.id===courseCadet)?.term||"")+" Courses"}><p className="muted">Select the courses available for this cadet's current term.</p><div className="checkGrid">{TERM_COURSES[cadets.find(c=>c.id===courseCadet)?.term||"1st Term"].map(c=><label className="check" key={c}><input type="checkbox" checked={selectedCourses.includes(c)} onChange={()=>toggleCourse(c)}/><span>{c}</span></label>)}</div><button className="primary" onClick={saveCourses}>Save Courses</button><button className="light" onClick={()=>setCourseCadet(null)}>Cancel</button></Modal>}
      {mid&&<Modal title="Enter / Edit Marks"><div className="markGrid">{[["quiz","Quiz"],["mid","Mid Term"],["final","Final Term"],["assign","Assignments"]].map(([k,label])=><label key={k}>{label}<input type="number" min="0" max="100" value={marks[k]} onChange={e=>setMarks({...marks,[k]:e.target.value})}/></label>)}</div><p className="livePct">Current weighted percentage: <b>{pct(marks).toFixed(2)}%</b></p><button className="primary" onClick={saveMarks}>Save Marks</button><button className="light" onClick={()=>setMid(null)}>Cancel</button></Modal>}
    </section>
  </main>
}

function PositionRow({c,all}){
  const company=all.filter(x=>x.company===c.company).sort((a,b)=>b.percentage-a.percentage).findIndex(x=>x.id===c.id)+1;
  const platoon=all.filter(x=>x.company===c.company&&x.platoon===c.platoon).sort((a,b)=>b.percentage-a.percentage).findIndex(x=>x.id===c.id)+1;
  return <div className="positionRow"><b className="posNum">#{c.overallPosition}</b><b>#{company}</b><b>#{platoon}</b><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company} · {c.platoon} Platoon</small></div></div><strong>{c.percentage.toFixed(2)}%</strong></div>
}
function ResultGraph({ranked,scope,company,platoon}){
  let data=[];
  if(scope==="overall") data=ranked.map(c=>({label:c.name,sub:c.roll,value:c.percentage})).slice(0,10);
  if(scope==="company"){
    const groups=COMPANIES.map(g=>ranked.filter(c=>c.company===g)).filter(x=>x.length).map(x=>({label:x[0].company,sub:x.length+" cadets",value:x.reduce((s,c)=>s+c.percentage,0)/x.length}));
    data=groups;
  }
  if(scope==="platoon"){
    const groups=[];
    for(const co of COMPANIES)for(const pl of PLATOONS){
      const x=ranked.filter(c=>c.company===co&&c.platoon===pl);
      if(x.length)groups.push({label:co+" / "+pl,sub:x.length+" cadets",value:x.reduce((s,c)=>s+c.percentage,0)/x.length});
    }
    data=groups;
  }
  if(company!=="All"&&scope!=="overall")data=data.filter(x=>x.label.startsWith(company));
  if(platoon!=="All"&&scope==="platoon")data=data.filter(x=>x.label.endsWith(platoon));
  return <div className="graph">{data.length?data.map((d,i)=><div className="graphRow" key={i}><div className="graphLabel"><b>{d.label}</b><small>{d.sub}</small></div><div className="graphTrack"><span style={{width:Math.min(100,Math.max(0,d.value))+"%"}}/></div><strong>{d.value.toFixed(1)}%</strong></div>):<Empty text="No result data for this selection."/>}</div>
}
function Dashboard({cadets,ranked,setTab}){
  const avg=cadets.length?cadets.reduce((s,c)=>s+pct(c.marks||{}),0)/cadets.length:0;
  return <><div className="hero"><div><span className="heroTag">ACADEMIC COMMAND CENTER</span><h2>Welcome back, Administrator.</h2><p>Manage cadets, term courses and academic performance from one place.</p><button className="primary" onClick={()=>setTab("cadets")}>Manage Cadets <span>→</span></button></div><img className="heroShield" src="/PMA_Kakul_logo.png" alt="Pakistan Military Academy logo"/></div>
    <div className="cards"><Card n={cadets.length} t="Registered Cadets" icon="♙"/><Card n={cadets.filter(c=>(c.courses||[]).length>0).length} t="With Courses" icon="▣"/><Card n={avg.toFixed(1)+"%"} t="Average Result" icon="◈"/><Card n={ranked[0]?.percentage?.toFixed(1)||"0"} t="Highest Result" icon="★"/></div>
    <div className="dashGrid"><Panel title="Top Results" icon="★">{ranked.slice(0,5).map(c=><div className="rankRow compact" key={c.id}><div className="rank">#{c.overallPosition}</div><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company}</small></div></div><strong>{c.percentage.toFixed(2)}%</strong></div>)}</Panel><Panel title="Quick Actions" icon="⚡"><div className="quick"><button onClick={()=>setTab("cadets")}><b>♙</b> Register Cadet <span>→</span></button><button onClick={()=>setTab("courses")}><b>▣</b> Assign Courses <span>→</span></button><button onClick={()=>setTab("marks")}><b>✎</b> Enter Exam Marks <span>→</span></button><button onClick={()=>setTab("results")}><b>◈</b> View Positions & Graphs <span>→</span></button></div></Panel></div>
  </>;
}
function Card({n,t,icon}){return <div className="card"><div className="cardIcon">{icon}</div><div><b>{n}</b><span>{t}</span></div></div>}
function Panel({title,icon,children}){return <div className="panel"><div className="panelHead"><h2>{icon&&<i>{icon}</i>}{title}</h2></div>{children}</div>}
function Modal({title,children}){return <div className="modal"><div className="modalbox"><h2>{title}</h2>{children}</div></div>}
function Empty({text}){return <div className="empty">{text}</div>}
