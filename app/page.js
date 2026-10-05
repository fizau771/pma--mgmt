"use client";
import {useEffect,useMemo,useState} from "react";
import * as XLSX from "xlsx";

const TERMS=["1st Term","2nd Term","3rd Term","4th Term"];
const COMPANIES=["Khalid","Tariq","Qasim","Salahuddin"];
const PLATOONS=["1st","2nd","3rd"];
const TERM_COURSES={
  "1st Term":["Military Orientation","Drill","Physical Training","Map Reading","Military History"],
  "2nd Term":["Tactics I","Weapons Training","Field Craft","Leadership I","Physical Training II"],
  "3rd Term":["Tactics II","Military Law","Leadership II","Navigation","Signals"],
  "4th Term":["Advanced Tactics","Command & Staff","Military Administration","Leadership III","Final Exercise"]
};
const seed=[
  {id:1,roll:"24-001",name:"Ali Ahmed",company:"Khalid",platoon:"1st",term:"1st Term",courses:["Military Orientation","Drill"],marks:{quiz:91,mid:82,final:88,assign:86,speaking:90}}
];
const pct=m=>Math.round(((+m.quiz||0)*.2+(+m.mid||0)*.25+(+m.final||0)*.35+(+m.assign||0)*.15+(+m.speaking||0)*.05)*100)/100;
const grade=p=>p>=80?"A":p>=70?"B":p>=60?"C":p>=50?"D":"F";
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

  const activeCadets=useMemo(()=>cadets.filter(c=>c.status!=="relegated"),[cadets]);
  const relegatedCadets=useMemo(()=>cadets.filter(c=>c.status==="relegated"),[cadets]);
  const ranked=useMemo(()=>[...activeCadets].map(c=>({...c,percentage:pct(c.marks||{})})).sort((a,b)=>b.percentage-a.percentage).map((c,i)=>({...c,overallPosition:i+1})),[activeCadets]);

  const cadetFiltered=ranked.filter(c=>
    (cadetCompany==="All"||c.company===cadetCompany)&&
    (cadetPlatoon==="All"||c.platoon===cadetPlatoon)&&
    (cadetTerm==="All"||c.term===cadetTerm)&&
    (c.roll+" "+c.name).toLowerCase().includes(cadetQ.toLowerCase())
  );
  const relegatedFiltered=relegatedCadets.filter(c=>
    (c.roll+" "+c.name).toLowerCase().includes(cadetQ.toLowerCase())&&
    (cadetCompany==="All"||c.company===cadetCompany)&&
    (cadetPlatoon==="All"||c.platoon===cadetPlatoon)
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
    setCadets(cs=>[{id:Date.now(),...form,courses:[],marks:{quiz:0,mid:0,final:0,assign:0,speaking:0}},...cs]);
    setForm({...form,roll:"",name:""});msg("Cadet registered successfully.");
  }
  function promote(c){
    const i=TERMS.indexOf(c.term);
    if(i===3)return msg("Cadet is already in 4th Term.");
    if(!confirm("Promote "+c.name+" to "+TERMS[i+1]+"?"))return;
    setCadets(cs=>cs.map(x=>x.id===c.id?{...x,term:TERMS[i+1],courses:[]}:x));
    msg("Cadet promoted to "+TERMS[i+1]+". Assign the new term courses.");
  }
  function relegate(c){
    if(!confirm("Relegate "+c.name+"? The cadet will be removed from all terms, courses, rankings and academic lists and shown only under Relegated Cadets."))return;
    setCadets(cs=>cs.map(x=>x.id===c.id?{...x,status:"relegated",term:null,courses:[]}:x));
    msg(c.name+" has been relegated and removed from all active academic lists.");
  }
  function saveMarks(){
    setCadets(cs=>cs.map(c=>c.id===mid?{...c,marks:{
      quiz:Math.max(0,Math.min(100,+marks.quiz||0)),mid:Math.max(0,Math.min(100,+marks.mid||0)),
      final:Math.max(0,Math.min(100,+marks.final||0)),assign:Math.max(0,Math.min(100,+marks.assign||0)),speaking:Math.max(0,Math.min(100,+marks.speaking||0))
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
    <div className="crest"><img src="/PMA_Kakul_logo.png" alt="Pakistan Military Academy logo"/></div><div className="eyebrow">PAKISTAN MILITARY ACADEMY</div><h1>Cadet Academic Tracking System</h1>
    <p>Secure academic administration portal</p><input placeholder="Username" value={u} onChange={e=>setU(e.target.value)}/><input type="password" placeholder="Password" value={p} onChange={e=>setP(e.target.value)}/>
    <button className="primary wide">Sign In <span>→</span></button><small>Demo access: <b>admin</b> / <b>PMA@123</b></small>
  </form></div>;

  const nav=[["dashboard","⌂","Dashboard"],["cadets","♙","Cadet Register"],["courses","▣","Course Assignment"],["marks","✎","Results & Exams"],["results","◈","Results"]];
  const pageTitle=nav.find(n=>n[0]===tab)?.[2];

  return <main>
    <aside><div className="brand"><div className="brandMark"><img src="/PMA_Kakul_logo.png" alt="PMA logo"/></div><div className="brandName">CADET ACADEMIC TRACKING SYSTEM</div></div>
      <div className="navLabel">MAIN MENU</div>{nav.map(([x,icon,label])=><button className={tab===x?"nav active":"nav"} onClick={()=>setTab(x)} key={x}><i>{icon}</i>{label}<em>{tab===x?"•":""}</em></button>)}
      <div className="sidebarBottom"><div className="userMini"><div className="avatar">A</div><div><b>Administrator</b><small>System Admin</small></div></div><button className="logout" onClick={()=>setLogin(false)}>↪ Logout</button></div>
    </aside>
    <section className="content"><header><div><div className="crumb">PMA / <b>{pageTitle}</b></div><h1>{pageTitle}</h1><p>Pakistan Military Academy · Cadet Management Portal</p></div><div className="status"><span/> System Online</div></header>
      {notice&&<div className="notice">✓ {notice}</div>}

      {tab==="dashboard"&&<Dashboard cadets={cadets} ranked={ranked} setTab={setTab} setCadets={setCadets}/>}
      {tab==="cadets"&&<><div className="toolbar"><div><h2>Cadet Register</h2><p>Register individually or import an entire Excel sheet.</p></div><div className="toolbarActions"><label className="uploadBtn">{excelBusy?"Reading Excel…":"＋ Import Excel"}<input type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} disabled={excelBusy}/></label></div></div>
        <div className="filterPanel"><div className="filterTitle">Search & Filters</div><div className="filterGrid"><input placeholder="⌕ Search name or cadet number…" value={cadetQ} onChange={e=>setCadetQ(e.target.value)}/><select value={cadetCompany} onChange={e=>setCadetCompany(e.target.value)}><option value="All">All Companies</option>{COMPANIES.map(x=><option key={x}>{x}</option>)}</select><select value={cadetPlatoon} onChange={e=>setCadetPlatoon(e.target.value)}><option value="All">All Platoons</option>{PLATOONS.map(x=><option key={x}>{x} Platoon</option>)}</select><select value={cadetTerm} onChange={e=>setCadetTerm(e.target.value)}><option value="All">All Terms</option>{TERMS.map(x=><option key={x}>{x}</option>)}</select></div></div>
        <div className="two"><Panel title="Register New Cadet" icon="＋"><form onSubmit={add} className="form">
          <label>Cadet Number / Roll Number<input placeholder="e.g. 24-015" value={form.roll} onChange={e=>setForm({...form,roll:e.target.value})}/></label><label>Cadet Name<input placeholder="Full name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
          <label>Company<select value={form.company} onChange={e=>setForm({...form,company:e.target.value})}>{COMPANIES.map(x=><option key={x}>{x}</option>)}</select></label><label>Platoon<select value={form.platoon} onChange={e=>setForm({...form,platoon:e.target.value})}>{PLATOONS.map(x=><option key={x}>{x}</option>)}</select></label>
          <label>Current Term<select value={form.term} onChange={e=>setForm({...form,term:e.target.value})}>{TERMS.map(x=><option key={x}>{x}</option>)}</select></label><button className="primary">Register Cadet <span>→</span></button>
        </form><div className="excelHint"><b>Excel upload format</b><span>Required: Roll Number, Name. Optional: Company, Platoon, Term.</span><small>Duplicate roll numbers are skipped automatically.</small></div></Panel>
        <Panel title={"Registered Cadets · "+cadetFiltered.length} icon="♙"><div className="list">{cadetFiltered.map(c=><div className="cadet" key={c.id}><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company} Company · {c.platoon} Platoon</small></div></div><div className="actions"><span className="pill">{c.term}</span><button className="outline" onClick={()=>promote(c)}>Promote</button><button className="outline relegate" onClick={()=>relegate(c)}>Relegate</button></div></div>)}{!cadetFiltered.length&&<Empty text="No active cadets match your search or filters."/>}</div></Panel>
        <Panel title={"Relegated Cadets · "+relegatedFiltered.length} icon="⚠"><div className="list">{relegatedFiltered.map(c=><div className="cadet" key={c.id}><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company} Company · {c.platoon} Platoon</small></div></div><div className="actions"><span className="pill">RELEGATED</span></div></div>)}{!relegatedFiltered.length&&<Empty text="No relegated cadets."/>}</div></Panel></div>
      </>}

      {tab==="courses"&&<><div className="filterPanel"><div className="filterTitle">Course Assignment Filters</div><div className="filterGrid three"><select value={courseTerm} onChange={e=>setCourseTerm(e.target.value)}>{TERMS.map(x=><option key={x}>{x}</option>)}</select><select value={courseCompany} onChange={e=>setCourseCompany(e.target.value)}><option value="All">All Companies</option>{COMPANIES.map(x=><option key={x}>{x}</option>)}</select><select value={coursePlatoon} onChange={e=>setCoursePlatoon(e.target.value)}><option value="All">All Platoons</option>{PLATOONS.map(x=><option key={x}>{x} Platoon</option>)}</select></div></div>
        <Panel title={courseTerm+" Courses · "+courseFiltered.length+" Cadets"} icon="▣"><div className="termCourseStrip">{TERM_COURSES[courseTerm].map(c=><span key={c}>{c}</span>)}</div><div className="courseGrid">{courseFiltered.map(c=><div className="courseCard" key={c.id}><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company} · {c.platoon} Platoon · {c.term}</small></div></div><div className="courseTags">{(c.courses||[]).length?(c.courses||[]).map(x=><span key={x}>{x}</span>):<small>No courses assigned yet</small>}</div><button className="outline full" onClick={()=>{setCourseCadet(c.id);setSelectedCourses(c.courses||[])}}>Assign / Edit Courses</button></div>)}</div>{!courseFiltered.length&&<Empty text="No cadets found for this term and filter."/>}</Panel>
      </>}

      {tab==="marks"&&<><div className="filterPanel"><div className="filterTitle">Search & Filters</div><div className="filterGrid three"><input placeholder="⌕ Search name or cadet number…" value={markQ} onChange={e=>setMarkQ(e.target.value)}/><select value={markCompany} onChange={e=>setMarkCompany(e.target.value)}><option value="All">All Companies</option>{COMPANIES.map(x=><option key={x}>{x}</option>)}</select><select value={markPlatoon} onChange={e=>setMarkPlatoon(e.target.value)}><option value="All">All Platoons</option>{PLATOONS.map(x=><option key={x}>{x} Platoon</option>)}</select></div></div>
        <Panel title="Results & Exams" icon="✎"><p className="muted">Add or edit marks. Weighted percentage: Quiz 20% · Mid Term 25% · Final Term 35% · Assignments 15% · Public Speaking 5%.</p>{markFiltered.map(c=><div className="cadet" key={c.id}><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company} · {c.platoon} Platoon · {c.term}</small></div></div><div className="marksPreview"><span>Q {c.marks?.quiz||0}</span><span>MT {c.marks?.mid||0}</span><span>FT {c.marks?.final||0}</span><span>A {c.marks?.assign||0}</span><span>PS {c.marks?.speaking||0}</span></div><div className="resultMini"><strong>{pct(c.marks||{}).toFixed(2)}%</strong><button className="outline" onClick={()=>{setMid(c.id);setMarks(c.marks||{quiz:0,mid:0,final:0,assign:0})}}>Add / Edit Marks</button></div></div>)}{!markFiltered.length&&<Empty text="No cadets match your search or filters."/>}</Panel></>}

      {tab==="results"&&<><div className="filterPanel"><div className="filterTitle">Results Filters</div><div className="filterGrid three"><select value={resultCompany} onChange={e=>setResultCompany(e.target.value)}><option value="All">All Companies</option>{COMPANIES.map(x=><option key={x}>{x}</option>)}</select><select value={resultPlatoon} onChange={e=>setResultPlatoon(e.target.value)}><option value="All">All Platoons</option>{PLATOONS.map(x=><option key={x}>{x} Platoon</option>)}</select><div className="scopeTabs"><button className={graphScope==="overall"?"selected":""} onClick={()=>setGraphScope("overall")}>Overall</button><button className={graphScope==="company"?"selected":""} onClick={()=>setGraphScope("company")}>Company</button><button className={graphScope==="platoon"?"selected":""} onClick={()=>setGraphScope("platoon")}>Platoon</button></div></div></div>
        <div className="resultLayout"><Panel title="Positions" icon="◈"><div className="positionHead"><span>Overall</span><span>Company</span><span>Platoon</span><span>Cadet</span><span>Result</span></div>{resultFiltered.map(c=><PositionRow key={c.id} c={c} all={ranked}/>)}</Panel><Panel title="Percentage Results" icon="▥"><ResultGraph ranked={ranked} scope={graphScope} company={resultCompany} platoon={resultPlatoon}/></Panel></div>
      </>}

      {courseCadet&&<Modal title={"Assign "+(cadets.find(c=>c.id===courseCadet)?.term||"")+" Courses"}><p className="muted">Select the courses available for this cadet's current term.</p><div className="checkGrid">{TERM_COURSES[cadets.find(c=>c.id===courseCadet)?.term||"1st Term"].map(c=><label className="check" key={c}><input type="checkbox" checked={selectedCourses.includes(c)} onChange={()=>toggleCourse(c)}/><span>{c}</span></label>)}</div><button className="primary" onClick={saveCourses}>Save Courses</button><button className="light" onClick={()=>setCourseCadet(null)}>Cancel</button></Modal>}
      {mid&&<Modal title="Enter / Edit Marks"><div className="markGrid">{[["quiz","Quiz"],["mid","Mid Term"],["final","Final Term"],["assign","Assignments"],["speaking","Public Speaking"]].map(([k,label])=><label key={k}>{label}<input type="number" min="0" max="100" value={marks[k]} onChange={e=>setMarks({...marks,[k]:e.target.value})}/></label>)}</div><p className="livePct">Current weighted percentage: <b>{pct(marks).toFixed(2)}%</b></p><button className="primary" onClick={saveMarks}>Save Marks</button><button className="light" onClick={()=>setMid(null)}>Cancel</button></Modal>}
    </section>
  </main>
}

function PositionRow({c,all}){
  const company=all.filter(x=>x.company===c.company).sort((a,b)=>b.percentage-a.percentage).findIndex(x=>x.id===c.id)+1;
  const platoon=all.filter(x=>x.company===c.company&&x.platoon===c.platoon).sort((a,b)=>b.percentage-a.percentage).findIndex(x=>x.id===c.id)+1;
  return <div className="positionRow"><b className="posNum">#{c.overallPosition}</b><b>#{company}</b><b>#{platoon}</b><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company} · {c.platoon} Platoon</small></div></div><strong>{c.percentage.toFixed(2)}% · Grade {grade(c.percentage)}</strong></div>
}
function ResultGraph({ranked,scope,company,platoon}){
  const [selected,setSelected]=useState(null);
  let data=[];
  if(scope==="overall")data=ranked.slice(0,7).map(c=>({label:c.name,value:c.percentage}));
  if(scope==="company")data=COMPANIES.map(co=>{const x=ranked.filter(c=>c.company===co&&(platoon==="All"||c.platoon===platoon));return x.length?{label:co,value:x.reduce((s,c)=>s+c.percentage,0)/x.length}:null}).filter(Boolean);
  if(scope==="platoon")data=PLATOONS.map(pl=>{const x=ranked.filter(c=>c.platoon===pl&&(company==="All"||c.company===company));return x.length?{label:pl+" Platoon",value:x.reduce((s,c)=>s+c.percentage,0)/x.length}:null}).filter(Boolean);
  const total=data.reduce((s,d)=>s+d.value,0),colors=["#2f7d5b","#78aee8","#e0a83a","#df6b6b","#8b76c7","#58a9a0","#c58a5a"];
  let angle=-90;const cx=145,cy=145,r=128;
  const pt=a=>{const q=a*Math.PI/180;return[cx+r*Math.cos(q),cy+r*Math.sin(q)]};
  const slices=data.map((d,i)=>{const st=angle,sw=total?d.value/total*360:0;angle+=sw;const [x1,y1]=pt(st),[x2,y2]=pt(angle);return{...d,i,color:colors[i%colors.length],path:"M "+cx+" "+cy+" L "+x1+" "+y1+" A "+r+" "+r+" 0 "+(sw>180?1:0)+" 1 "+x2+" "+y2+" Z"}});
  return <div className="pieChartWrap"><div className="pieOnly"><svg viewBox="0 0 290 290" className="pieSvg largePie" role="img" aria-label="Percentage results pie chart">
    {slices.map(s=><path key={s.i} d={s.path} fill={s.color} className={selected===s.i?"pieSlice selected":"pieSlice"} onClick={()=>setSelected(selected===s.i?null:s.i)} onMouseEnter={()=>setSelected(s.i)} onMouseLeave={()=>setSelected(null)}/>)}
  </svg>{selected!==null&&data[selected]&&<div className="pieTooltip">{data[selected].label}: {data[selected].value.toFixed(2)}%</div>}</div></div>
}
function Dashboard({cadets,ranked,setTab,setCadets}){
  const avg=cadets.length?cadets.reduce((s,c)=>s+pct(c.marks||{}),0)/cadets.length:0;
  function loadDemoData(){
    const names=["Ahmed Khan","Usman Ali","Hamza Raza","Bilal Ahmed","Hassan Shah","Saad Malik","Ahsan Iqbal","Danish Khan","Talha Asif","Fahad Noor","Zain Abbas","Owais Tariq","Muneeb Akram","Rayan Ahmed","Shahzaib Khan","Waleed Hussain","Haris Javed","Salman Riaz","Abdullah Farooq","Arham Nadeem"];
    const demo=[];
    COMPANIES.forEach((company,ci)=>{
      for(let j=0;j<5;j++){
        const n=names[ci*5+j];
        const pass=j<3;
        const base=pass?62+(j*8)+(ci*2):25+((j-3)*7)+(ci*2);
        const marks={quiz:base+3,mid:base-2,final:base+4,assign:base+1,speaking:base+5};
        demo.push({id:Date.now()+ci*10+j+1,roll:"D-"+(ci*5+j+1).toString().padStart(3,"0"),name:n,company,platoon:PLATOONS[(ci+j)%3],term:"1st Term",courses:["Military Orientation","Drill"],marks});
      }
    });
    setCadets(cs=>{
      const existing=new Set(cs.map(c=>c.roll));
      return [...demo.filter(c=>!existing.has(c.roll)),...cs];
    });
  }
  return <><div className="hero"><div><span className="heroTag">ACADEMIC COMMAND CENTER</span><h2>Welcome back, Administrator.</h2><p>Manage cadets, term courses and academic performance from one place.</p><button className="primary" onClick={()=>setTab("cadets")}>Manage Cadets <span>→</span></button></div><img className="heroShield" src="/PMA_Kakul_logo.png" alt="Pakistan Military Academy logo"/></div>
    <div className="cards"><Card n={cadets.length} t="Registered Cadets" icon="♙"/><Card n={cadets.filter(c=>(c.courses||[]).length>0).length} t="With Courses" icon="▣"/><ProgressCard value={avg} t="Average Result" icon="◈"/><ProgressCard value={ranked[0]?.percentage||0} t="Highest Result" icon="★"/></div>
    <div className="dashGrid"><Panel title="Top Results" icon="★">{ranked.slice(0,5).map(c=><div className="rankRow compact" key={c.id}><div className="rank">#{c.overallPosition}</div><div className="cadetInfo"><div className="avatar small">{c.name[0]}</div><div><b>{c.name}</b><small>{c.roll} · {c.company}</small></div></div><strong>{c.percentage.toFixed(2)}%</strong></div>)}</Panel><Panel title="Quick Actions" icon="⚡"><div className="quick"><button onClick={()=>setTab("cadets")}><b>♙</b> Register Cadet <span>→</span></button><button onClick={()=>setTab("courses")}><b>▣</b> Assign Courses <span>→</span></button><button onClick={()=>setTab("marks")}><b>✎</b> Enter Exam Marks <span>→</span></button><button onClick={()=>setTab("results")}><b>◈</b> View Positions & Graphs <span>→</span></button></div></Panel></div>
    <PassFailChart ranked={ranked} onLoadDemo={loadDemoData}/>
    <CompanyOverview cadets={ranked}/>
  </>;
}

function CompanyOverview({cadets}){
  const icons=["♜","⚔","✥","♞"];
  const demoCounts={Khalid:60,Tariq:60,Qasim:60,Salahuddin:60};
  return <Panel title="Company Overview">
    <div className="companyOverview">
      {COMPANIES.map((company,i)=>{
        const realCount=cadets.filter(c=>c.company===company).length;
        const count=realCount||demoCounts[company];
        return <div className={"companyTile companyTile"+i} key={company}>
          <div className="companyTileIcon">{icons[i]}</div>
          <b>{company}</b>
          <span>{count} Cadets</span>
        </div>;
      })}
    </div>
  </Panel>;
}

function PassFailChart({ranked,onLoadDemo}){
  const [scope,setScope]=useState("company");
  const groups=scope==="company"?COMPANIES:PLATOONS;
  const demoCompany={Khalid:[48,12],Tariq:[51,9],Qasim:[45,15],Salahuddin:[54,6]};
  const demoPlatoon={"1st":[52,18],"2nd":[49,21],"3rd":[55,15]};
  const data=groups.map(group=>{
    const list=ranked.filter(c=>scope==="company"?c.company===group:c.platoon===group);
    if(!list.length){
      const d=(scope==="company"?demoCompany:demoPlatoon)[group];
      return {label:scope==="platoon"?group+" Platoon":group,pass:d[0],fail:d[1],total:d[0]+d[1]};
    }
    const pass=list.filter(c=>c.percentage>=50).length;
    return {label:scope==="platoon"?group+" Platoon":group,pass,fail:list.length-pass,total:list.length};
  });
  const max=Math.max(1,...data.map(x=>Math.max(x.pass,x.fail)));
  const tick=Math.max(1,Math.ceil(max/4));
  const ticks=[tick*4,tick*3,tick*2,tick,0];
  return <Panel title="Pass & Fail Cadets" icon="▥">
    <div className="passFailHead"><div><b>Cadet Performance Distribution</b><span>Pass: 50% and above · Fail: below 50%</span></div><div className="passFailHeadActions"><button className="outline demoDataBtn" onClick={onLoadDemo}>＋ Load Demo Data</button><div className="scopeTabs"><button className={scope==="company"?"selected":""} onClick={()=>setScope("company")}>Company Wise</button><button className={scope==="platoon"?"selected":""} onClick={()=>setScope("platoon")}>Platoon Wise</button></div></div></div>
    <div className="passFailChart">
      <div className="passFailAxis">{ticks.map((t,i)=><span key={i}>{t}</span>)}</div>
      <div className="passFailPlot">
        <div className="passFailGrid">{ticks.map((t,i)=><i key={i} style={{bottom:(i/(ticks.length-1))*100+"%"}}/>)}</div>
        <div className="passFailGroups">
          {data.map((d,i)=><div className="passFailGroup" key={d.label}>
            <div className="passFailBars">
              <div className="passFailBar passBar" style={{height:(d.pass/max*100)+"%"}}><b>{d.pass}</b></div>
              <div className="passFailBar failBar" style={{height:(d.fail/max*100)+"%"}}><b>{d.fail}</b></div>
            </div>
            <small>{d.label}</small>
          </div>)}
        </div>
      </div>
    </div>
    <div className="passFailLegend"><span><i className="passDot"/>Pass</span><span><i className="failDot"/>Fail</span><strong>{ranked.length} active cadets</strong></div>
  </Panel>;
}
function Card({n,t,icon}){return <div className="card"><div className="cardIcon">{icon}</div><div><b>{n}</b><span>{t}</span></div></div>}

function ProgressCard({value,t,icon}){
  const target=Math.max(0,Math.min(100,Number(value)||0));
  const [progress,setProgress]=useState(0);
  useEffect(()=>{
    const timer=setTimeout(()=>setProgress(target),80);
    return ()=>clearTimeout(timer);
  },[target]);
  const radius=30,circ=2*Math.PI*radius,offset=circ-(progress/100)*circ;
  return <div className="card progressCard">
    <div className="progressRing" style={{"--ring-offset":offset}}>
      <svg viewBox="0 0 72 72" aria-label={t+" "+target.toFixed(1)+"%"}>
        <circle className="ringTrack" cx="36" cy="36" r={radius}/>
        <circle className="ringValue" cx="36" cy="36" r={radius}/>
      </svg>
      <strong>{progress.toFixed(1)}%</strong>
      <span>{icon}</span>
    </div>
    <div><b>{t}</b><span>Overall percentage</span></div>
  </div>;
}
function Panel({title,icon,children}){return <div className="panel"><div className="panelHead"><h2>{icon&&<i>{icon}</i>}{title}</h2></div>{children}</div>}
function Modal({title,children}){return <div className="modal"><div className="modalbox"><h2>{title}</h2>{children}</div></div>}
function Empty({text}){return <div className="empty">{text}</div>}
