import { useState, useEffect, useCallback } from "react";

const LAT = -32.785, LON = -71.143;

// ─── Kc mensual por cultivo (hemisferio sur, 32°S, Hijuelas)
// Índice 0=Enero … 11=Diciembre
// Base: FAO-56 + INIA Chile + CNR, ajustado fenología mediterránea
const KC_MENSUAL = {
  // Lanelate: cosecha jul-ago → post-cos ago-sep → floración sep-oct → cuaja oct-nov → engrose nov-mar
  lanelate:  [0.78,0.75,0.72,0.68,0.65,0.63,0.63,0.65,0.70,0.76,0.79,0.79],
  // Valencia/Midnight: cosecha ago-oct → similar pero desfasada ~1 mes
  valencia:  [0.77,0.74,0.71,0.68,0.65,0.63,0.63,0.65,0.70,0.75,0.78,0.78],

  // Paltos Hass: engrose ene-feb → cosecha mar-may → post-cos may-jul → floración ago-sep → cuaja oct → engrose nov-dic
  paltos_v:  [0.95,0.95,0.88,0.82,0.76,0.72,0.72,0.78,0.85,0.90,0.92,0.94],
  paltos_n12:[0.95,0.95,0.88,0.82,0.76,0.72,0.72,0.78,0.85,0.90,0.92,0.94],
  paltos_n3: [0.95,0.95,0.88,0.82,0.76,0.72,0.72,0.78,0.85,0.90,0.92,0.94],
};

const FENOLOGIA = {
  lanelate: ["Engrose avanzado","Engrose / maduración","Maduración","Maduración / inicio cosecha","Cosecha","Reposo post-cosecha","Cosecha / brotación","Brotación","Floración plena","Cuaja","Engrose inicial","Engrose"],
  valencia: ["Engrose avanzado","Engrose / maduración","Maduración","Maduración","Inicio cosecha","Reposo","Reposo","Brotación","Floración plena","Cuaja","Engrose inicial","Engrose"],

  paltos_v: ["Engrose máximo","Engrose máximo","Maduración / cosecha Hass","Cosecha plena","Post-cosecha","Reposo invernal","Reposo / floración incipiente","Floración plena","Cuaja","Crecimiento inicial fruto","Engrose","Engrose acelerado"],
  paltos_n12:["Engrose máximo","Engrose máximo","Maduración / cosecha Hass","Cosecha plena","Post-cosecha","Reposo invernal","Reposo / floración incipiente","Floración plena","Cuaja","Crecimiento inicial fruto","Engrose","Engrose acelerado"],
  paltos_n3: ["Engrose máximo","Engrose máximo","Maduración / cosecha Hass","Cosecha plena","Post-cosecha","Reposo invernal","Reposo / floración incipiente","Floración plena","Cuaja","Crecimiento inicial fruto","Engrose","Engrose acelerado"],
};

// Devuelve Kc del mes de una fecha dada (o mes actual)
const kcDeFecha = (id, fecha) => {
  const mes = fecha ? new Date(fecha+"T12:00:00").getMonth() : new Date().getMonth();
  return KC_MENSUAL[id]?.[mes] ?? 0.80;
};
const fenoDeFecha = (id, fecha) => {
  const mes = fecha ? new Date(fecha+"T12:00:00").getMonth() : new Date().getMonth();
  return FENOLOGIA[id]?.[mes] ?? "—";
};

const CULTIVOS = [
  { id:"lanelate",   grupo:"citricos", label:"Naranjos Lanelate",    emoji:"🍊", cultivo:"4.50×2.00 m", area:5.06,  ef:90, color:"#C2622D", light:"#F5E6D8", plano:"MELBACE2 · 2006",
    emisor:"TIRAN 16D · 2 l/h · doble línea", bomba:"VOGT N 629 · 15 HP", filtro:"SPIN KLIN 2\" × 3 ud.",
    turnos:[{id:"S1",label:"Sector 1",ha:2.53,q:45.55,bloques:"1,1·2,1·3,1·4,1·5,1"},{id:"S2",label:"Sector 2",ha:2.53,q:46.34,bloques:"6,1·8,1·9,1·10,1·11,1"}]},
  { id:"valencia",   grupo:"citricos", label:"Valencia / Midnight",   emoji:"🌕", cultivo:"5.00×2.00 m", area:11.99, ef:90, color:"#B8860B", light:"#FBF3D5", plano:"MELBACE4 · 2017",
    emisor:"QUILLAY 16.10 · 2 l/h · doble línea", bomba:"KSB 1125-100-160 · 40 HP", filtro:"Anillas PUELO 3\" × 6 ud.",
    turnos:[{id:"OP1",label:"Operación 1",ha:6.00,q:99.7,bloques:"1.1·2.1·3.1·4.1·5.1·6.1·7.1·8.1"},{id:"OP2",label:"Operación 2",ha:5.99,q:98.7,bloques:"9.1·10.1·11.1·12.1"}]},

  { id:"paltos_v",   grupo:"paltos",   label:"Paltos Viejos",         emoji:"🥑", cultivo:"6.00×4.00 m", area:10.04, ef:90, color:"#3D6B35", light:"#DFF0D8", plano:"VER VIII · 2013",
    emisor:"RAM 16D · 2.3 l/h · doble línea", bomba:"KSB 65-200 · 25 HP", filtro:"Control de heladas exist.",
    turnos:[{id:"T1",label:"Turno 1",ha:2.59,q:56.6,bloques:"1.1·2.1·3.1"},{id:"T2",label:"Turno 2",ha:2.54,q:54.6,bloques:"4.1·5.1"},{id:"T3",label:"Turno 3",ha:2.75,q:58.7,bloques:"6.1·7.1·8.1"},{id:"T4",label:"Turno 4",ha:2.16,q:46.3,bloques:"9.1·10.1·11.1·12.1"}]},
  { id:"paltos_n12", grupo:"paltos",   label:"Paltos Nuevos 1+2",     emoji:"🌱", cultivo:"5.00×2.00 m", area:5.93,  ef:90, color:"#4A7C41", light:"#E3F1DD", plano:"MELBACE3-CH · 2013",
    emisor:"QUILLAY 16/10 · 2.0 l/h · doble línea", bomba:"KSB 65-160 · 20 HP", filtro:"Anillas PUELO 3\" × 4 ud.",
    turnos:[{id:"T1",label:"Turno 1",ha:3.21,q:53.6,bloques:"1.1·6.1·7.1·8.1·9.1"},{id:"T2",label:"Turno 2",ha:2.72,q:44.3,bloques:"2.1·3.1·4.1·5.1"}]},
  { id:"paltos_n3",  grupo:"paltos",   label:"Paltos Nuevos 3",       emoji:"🌿", cultivo:"6.00×4.00 m", area:2.77,  ef:90, color:"#2E7D52", light:"#D4EDDF", plano:"MELBACE2 y CH · 2024",
    emisor:"BOLDO 16/10 · 2.0 l/h · 2 líneas · 3 válvulas en paralelo", bomba:"VOGT 15HP + 10HP en serie", filtro:"Anillas PUELO 2×3 ud.",
    turnos:[{id:"S1",label:"Sector único",ha:2.77,q:37.93,bloques:"Válvula 1 · Válvula 2 · Válvula 3 (paralelo)"}]},
];

const TOTAL_HA = CULTIVOS.reduce((a,c)=>a+c.area,0);
const todayStr  = ()=>new Date().toISOString().split("T")[0];
const isToday   = d=>d===todayStr();
const isFuture  = d=>d>todayStr();
const fmtShort  = d=>new Date(d+"T12:00:00").toLocaleDateString("es-CL",{weekday:"short",day:"2-digit",month:"short"});
const fmtFull   = d=>new Date(d+"T12:00:00").toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
const hToHM     = h=>{const hh=Math.floor(h),mm=Math.round((h-hh)*60);return mm===0?`${hh}h`:`${hh}h ${mm}m`;};
const n         = (v,d=2)=>v==null?"—":Number(v).toFixed(d);

function calc(c,kc,eto,precip){
  const ep=Math.min(precip*0.8,eto*kc);
  return c.turnos.map(t=>{
    const etc=eto*kc,neto=Math.max(0,etc-ep),bruto=neto/(c.ef/100),volHa=bruto*10,volTotal=volHa*t.ha,horas=t.q>0?volTotal/t.q:0;
    return{...t,etc,neto,bruto,volHa,volTotal,horas,ep};
  });
}
// Calcula usando Kc automático de la fecha si kcAuto=true, sino el Kc manual
function calcAuto(c, kcs, kcAuto, eto, precip, fecha){
  const kc = kcAuto ? kcDeFecha(c.id, fecha) : kcs[c.id];
  return calc(c, kc, eto, precip);
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{background:#F2EBD9;}
::-webkit-scrollbar{width:6px;height:6px;background:#E8DCBF;}
::-webkit-scrollbar-thumb{background:#9C7A5A;border-radius:3px;}
.fell{font-family:'IM Fell English',Georgia,serif;}
.serif{font-family:'Cormorant Garamond',Georgia,serif;}
.mono{font-family:'DM Mono',monospace;}
.tab{background:transparent;border:none;border-bottom:3px solid transparent;color:#9C7A5A;padding:10px 20px;cursor:pointer;font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;transition:all 0.2s;letter-spacing:0.3px;}
.tab.on{border-bottom-color:#C2622D;color:#2C1810;}
.tab:hover:not(.on){color:#5C3D28;}
.cbtn{font-family:'Cormorant Garamond',serif;font-size:14px;background:transparent;border:none;border-left:3px solid transparent;padding:8px 16px;cursor:pointer;color:#9C7A5A;text-align:left;width:100%;transition:all 0.15s;line-height:1.3;}
.cbtn.on{border-left-color:var(--c,#C2622D);color:#2C1810;background:rgba(194,98,45,0.05);}
.cbtn:hover:not(.on){color:#5C3D28;}
.gbtn{font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;background:transparent;border:1px solid rgba(92,61,40,0.3);padding:6px 16px;border-radius:20px;cursor:pointer;color:#5C3D28;transition:all 0.2s;}
.gbtn.on{background:#2C1810;color:#F2EBD9;border-color:#2C1810;}
input.kci{font-family:'DM Mono',monospace;font-size:12px;background:rgba(44,24,16,0.05);border:1px solid rgba(92,61,40,0.3);color:#2C1810;padding:4px 6px;border-radius:2px;width:58px;text-align:right;}
input.kci:focus{outline:none;border-color:#C2622D;}
.card{background:rgba(255,252,244,0.9);border:1px solid rgba(92,61,40,0.18);border-radius:4px;box-shadow:0 1px 4px rgba(44,24,16,0.06);}
.row-hoy td{background:rgba(184,134,11,0.06)!important;}
.row-fut td{opacity:0.72;}
tbody tr:hover td{background:rgba(194,98,45,0.025)!important;}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fade{animation:fadeUp 0.35s ease forwards;}
@keyframes drip{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
.drip{animation:drip 1.6s ease-in-out infinite;display:inline-block;}
`;

export default function App() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [lastUpd, setLastUpd] = useState(null);
  const [grupo,   setGrupo]   = useState("todos");
  const [cultSel, setCultSel] = useState("todos");
  const [tab,     setTab]     = useState("tabla");
  const [kcs,     setKcs]     = useState(Object.fromEntries(CULTIVOS.map(c=>[c.id,kcDeFecha(c.id)])));
  const [kcAuto,  setKcAuto]  = useState(true); // true = sigue fenología mensual
  const [selDate, setSelDate] = useState(null);

  const fetchWeather = useCallback(async()=>{
    setLoading(true); setError(null);
    try{
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&daily=et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_max&timezone=America%2FSantiago&past_days=7&forecast_days=3`);
      if(!r.ok) throw new Error("HTTP "+r.status);
      setWeather((await r.json()).daily);
      setLastUpd(new Date().toLocaleTimeString("es-CL"));
    } catch(e){ setError(e.message); }
    setLoading(false);
  },[]);
  useEffect(()=>{fetchWeather();},[fetchWeather]);

  const visibles = cultSel==="todos"
    ? (grupo==="todos"?CULTIVOS:CULTIVOS.filter(c=>c.grupo===grupo))
    : CULTIVOS.filter(c=>c.id===cultSel);

  const wRows = weather ? weather.time.map((date,i)=>({
    date, eto:weather.et0_fao_evapotranspiration[i]||0,
    precip:weather.precipitation_sum[i]||0,
    tmax:weather.temperature_2m_max[i], tmin:weather.temperature_2m_min[i],
    wind:weather.wind_speed_10m_max[i], hum:weather.relative_humidity_2m_max[i],
  })) : [];

  const todayRow = wRows.find(r=>isToday(r.date));
  const selectedRow = wRows.find(r=>r.date===selDate) || todayRow;

  const volGrp = (row,ids)=>ids.reduce((a,id)=>{
    const c=CULTIVOS.find(x=>x.id===id); if(!c)return a;
    const kcV=kcAuto?kcDeFecha(id,row.date):kcs[id]; return a+calc(c,kcV,row.eto,row.precip).reduce((b,t)=>b+t.volTotal,0);
  },0);
  const citIds=CULTIVOS.filter(c=>c.grupo==="citricos").map(c=>c.id);
  const pltIds=CULTIVOS.filter(c=>c.grupo==="paltos").map(c=>c.id);
  const allIds=CULTIVOS.map(c=>c.id);

  return (
    <div style={{fontFamily:"'IM Fell English',Georgia,serif",background:"#F2EBD9",minHeight:"100vh",color:"#2C1810"}}>
      <style>{CSS}</style>

      {/* ═══════════════ MASTHEAD ═══════════════ */}
      <div style={{background:"#2C1810",position:"relative"}}>
        <div style={{height:5,background:"repeating-linear-gradient(90deg,#C2622D 0,#C2622D 30px,#B8860B 30px,#B8860B 60px,#5A6E3A 60px,#5A6E3A 90px,#4A7FA5 90px,#4A7FA5 120px)"}}/>
        <div style={{padding:"18px 32px 14px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:14}}>
          <div>
            <div className="mono" style={{fontSize:10,letterSpacing:3,color:"rgba(242,235,217,0.4)",marginBottom:6}}>
              INVERSIONES PUREHUE · HIJUELAS, V REGIÓN · SRA. MARÍA ELBA ACEVEDO
            </div>
            <h1 className="fell" style={{fontSize:28,fontWeight:400,color:"#F2EBD9",letterSpacing:0.5,lineHeight:1}}>
              Registro de Evapotranspiración y Riego
            </h1>
            <div className="serif" style={{fontSize:15,color:"rgba(242,235,217,0.5)",marginTop:4,fontStyle:"italic"}}>
              {TOTAL_HA.toFixed(2)} ha · Naranjos Lanelate · Valencia/Midnight · Limón · Paltos
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
            <button onClick={fetchWeather} disabled={loading} className="serif"
              style={{background:"transparent",border:"1px solid rgba(242,235,217,0.3)",color:"rgba(242,235,217,0.8)",padding:"7px 20px",cursor:"pointer",fontSize:14,borderRadius:2,letterSpacing:0.3}}>
              {loading?"Cargando…":"↺ Actualizar datos"}
            </button>
            {lastUpd&&<div className="mono" style={{fontSize:9,color:"rgba(242,235,217,0.28)",letterSpacing:1}}>Open-Meteo · FAO Penman-Monteith · {lastUpd}</div>}
          </div>
        </div>

        {/* ETo strip */}
        {todayRow&&(
          <div style={{padding:"10px 32px 14px",borderTop:"1px solid rgba(242,235,217,0.08)",display:"flex",gap:0,flexWrap:"wrap"}}>
            {[
              {l:"ETo hoy",  v:todayRow.eto.toFixed(2), u:"mm/día", c:"#F2EBD9"},
              {l:"Temp.",    v:`${todayRow.tmax?.toFixed(0)}° / ${todayRow.tmin?.toFixed(0)}°`, u:"máx/mín",c:"rgba(242,235,217,0.75)"},
              {l:"Viento",   v:todayRow.wind?.toFixed(0), u:"km/h",c:"rgba(242,235,217,0.65)"},
              {l:"Lluvia",   v:todayRow.precip.toFixed(1), u:"mm",c:"#7EB3D3"},
              {l:"Cítricos", v:volGrp(todayRow,citIds).toFixed(0), u:"m³",c:"#E8A882"},
              {l:"Paltos",   v:volGrp(todayRow,pltIds).toFixed(0), u:"m³",c:"#8FA370"},
              {l:"TOTAL PREDIO",v:volGrp(todayRow,allIds).toFixed(0), u:"m³",c:"#F2EBD9"},
            ].map((s,i)=>(
              <div key={s.l} style={{padding:"5px 24px",borderLeft:i>0?"1px solid rgba(242,235,217,0.1)":"none"}}>
                <div className="mono" style={{fontSize:9,color:"rgba(242,235,217,0.3)",letterSpacing:2,textTransform:"uppercase"}}>{s.l}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:3,marginTop:2}}>
                  <span className="serif" style={{fontWeight:700,fontSize:22,color:s.c,lineHeight:1}}>{s.v}</span>
                  <span className="mono" style={{fontSize:9,color:"rgba(242,235,217,0.3)"}}>{s.u}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════ NAV BAR ═══════════════ */}
      <div style={{background:"rgba(232,220,191,0.6)",borderBottom:"1px solid rgba(92,61,40,0.28)",padding:"0 32px",display:"flex",alignItems:"center",gap:24,flexWrap:"wrap",backdropFilter:"blur(4px)"}}>
        <div style={{display:"flex",gap:8}}>
          {[["todos","Todo el Predio"],["citricos","Cítricos"],["paltos","Paltos"]].map(([k,l])=>(
            <button key={k} className={`gbtn ${grupo===k?"on":""}`}
              onClick={()=>{setGrupo(k);setCultSel("todos");}}>{l}</button>
          ))}
        </div>
        <div style={{width:1,height:26,background:"rgba(92,61,40,0.25)"}}/>
        {[["tabla","📅 Tabla Climática"],["hoy","☀ Programa del Día"],["resumen","📊 Resumen"],["planos","📐 Planos"]].map(([k,l])=>(
          <button key={k} className={`tab ${tab===k?"on":""}`} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      {error&&<div className="mono" style={{padding:"12px 32px",color:"#8B0000",fontSize:12,background:"rgba(139,0,0,0.05)"}}>⚠ {error}</div>}

      {loading?(
        <div style={{padding:"120px 32px",textAlign:"center"}}>
          <div className="drip" style={{marginBottom:16}}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="#4A7FA5" opacity="0.5"><path d="M12 2C12 2 5 9 5 14.5C5 18.1 8.1 21 12 21C15.9 21 19 18.1 19 14.5C19 9 12 2 12 2Z"/></svg>
          </div>
          <div className="serif" style={{fontSize:20,color:"#9C7A5A",fontStyle:"italic"}}>Consultando datos meteorológicos…</div>
          <div className="mono" style={{fontSize:10,color:"#9C7A5A",marginTop:6,letterSpacing:2}}>Open-Meteo · FAO Penman-Monteith · Hijuelas, V Región</div>
        </div>
      ):(
        <div style={{display:"flex",minHeight:"calc(100vh - 240px)"}}>

          {/* ═══════════════ SIDEBAR ═══════════════ */}
          <div style={{width:200,flexShrink:0,borderRight:"1px solid rgba(92,61,40,0.22)",background:"rgba(232,220,191,0.3)",padding:"18px 0",overflowY:"auto"}}>
            <div className="mono" style={{fontSize:9,color:"#9C7A5A",padding:"0 16px 8px",letterSpacing:2.5}}>CULTIVO</div>
            <button className={`cbtn ${cultSel==="todos"?"on":""}`} style={{"--c":"#2C1810"}} onClick={()=>setCultSel("todos")}>
              ⬡ Todo el predio
              <div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>{TOTAL_HA.toFixed(2)} ha</div>
            </button>
            <div className="mono" style={{fontSize:9,color:"#9C7A5A",padding:"12px 16px 6px",letterSpacing:2.5}}>CÍTRICOS</div>
            {CULTIVOS.filter(c=>c.grupo==="citricos").map(c=>(
              <button key={c.id} className={`cbtn ${cultSel===c.id?"on":""}`} style={{"--c":c.color}} onClick={()=>setCultSel(c.id)}>
                {c.emoji} {c.label}
                <div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>{c.area} ha</div>
              </button>
            ))}
            <div className="mono" style={{fontSize:9,color:"#9C7A5A",padding:"12px 16px 6px",letterSpacing:2.5}}>PALTOS</div>
            {CULTIVOS.filter(c=>c.grupo==="paltos").map(c=>(
              <button key={c.id} className={`cbtn ${cultSel===c.id?"on":""}`} style={{"--c":c.color}} onClick={()=>setCultSel(c.id)}>
                {c.emoji} {c.label}
                <div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>{c.area} ha</div>
              </button>
            ))}

            {/* Kc */}
            <div style={{margin:"16px 16px 0",borderTop:"1px solid rgba(92,61,40,0.15)"}}/>
            <div className="mono" style={{fontSize:9,color:"#9C7A5A",padding:"10px 16px 6px",letterSpacing:2.5}}>Kc CULTIVO</div>
            {/* Auto/Manual toggle */}
            <div style={{padding:"0 16px 8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span className="mono" style={{fontSize:8,color:kcAuto?"#3D6B35":"#9C7A5A"}}>
                {kcAuto?"● AUTO fenología":"○ MANUAL"}
              </span>
              <button onClick={()=>setKcAuto(p=>!p)}
                style={{fontFamily:"'DM Mono',monospace",fontSize:8,background:kcAuto?"#3D6B35":"rgba(92,61,40,0.15)",color:kcAuto?"#fff":"#5C3D28",border:"none",padding:"3px 8px",borderRadius:10,cursor:"pointer"}}>
                {kcAuto?"→ Manual":"→ Auto"}
              </button>
            </div>
            <div style={{padding:"0 16px"}}>
              {visibles.map(c=>{
                const kcMes=kcDeFecha(c.id);
                const feno=fenoDeFecha(c.id);
                return(
                  <div key={c.id} style={{marginBottom:10,paddingBottom:8,borderBottom:"1px solid rgba(92,61,40,0.08)"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                      <span className="serif" style={{fontSize:13,color:c.color}}>{c.emoji} {c.label.split(" ")[0]}</span>
                      {kcAuto
                        ? <span className="mono" style={{fontSize:12,fontWeight:500,color:c.color}}>{kcMes.toFixed(2)}</span>
                        : <input className="kci" type="number" step="0.01" min="0.3" max="1.5" value={kcs[c.id]}
                            onChange={e=>setKcs(p=>({...p,[c.id]:parseFloat(e.target.value)||p[c.id]}))}/>
                      }
                    </div>
                    <div className="mono" style={{fontSize:8,color:"#9C7A5A",lineHeight:1.4}}>{feno}</div>
                  </div>
                );
              })}
              <div className="mono" style={{fontSize:8,color:"#9C7A5A",lineHeight:1.8,marginTop:4}}>
                {kcAuto?"Kc ajustado mensualmente\nsegún fenología Hijuelas\nFAO-56 + INIA Chile":"Ajuste manual activo\nEfic. 90% · Prec.ef. 80%"}<br/>FAO Penman-Monteith
              </div>
            </div>
          </div>

          {/* ═══════════════ MAIN ═══════════════ */}
          <div style={{flex:1,padding:"24px 32px",overflowX:"auto"}}>

            {/* ──── TABLA CLIMÁTICA (vertical, legible) ──── */}
            {tab==="tabla"&&(
              <div className="fade">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                  <h2 className="fell" style={{fontSize:24,fontWeight:400}}>Tabla Climática y Programa de Riego</h2>
                  <div className="serif" style={{fontSize:14,color:"#9C7A5A",fontStyle:"italic"}}>Selecciona un día para ver el detalle completo →</div>
                </div>

                {/* TWO-COLUMN LAYOUT: calendar left, detail right */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1.4fr",gap:20,marginTop:16}}>

                  {/* LEFT: Date list */}
                  <div>
                    <div className="mono" style={{fontSize:9,letterSpacing:2.5,color:"#9C7A5A",marginBottom:10}}>HISTORIAL · 7 DÍAS + HOY + PRONÓSTICO</div>
                    <div className="card" style={{overflow:"hidden"}}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead>
                          <tr style={{background:"rgba(232,220,191,0.7)"}}>
                            {["Fecha","ETo mm","Lluvia mm","T°Máx","T°Mín","Viento","ETo Acum."].map(h=>(
                              <th key={h} className="mono" style={{padding:"10px 12px",textAlign:h==="Fecha"?"left":"right",borderBottom:"2px solid rgba(92,61,40,0.25)",fontSize:9,fontWeight:500,color:"#5C3D28",letterSpacing:0.5,whiteSpace:"nowrap"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(()=>{
                            let acum=0;
                            return wRows.map((row,i)=>{
                              const hoy=isToday(row.date),fut=isFuture(row.date);
                              if(!fut) acum+=row.eto;
                              const sel=row.date===selDate||(selDate===null&&hoy);
                              return(
                                <tr key={row.date}
                                  onClick={()=>setSelDate(row.date===selDate?null:row.date)}
                                  className={hoy?"row-hoy":fut?"row-fut":""}
                                  style={{
                                    background: sel?"rgba(194,98,45,0.1)":(i%2?"rgba(242,235,217,0.2)":"rgba(255,252,244,0.6)"),
                                    cursor:"pointer",
                                    borderBottom:"1px solid rgba(92,61,40,0.08)",
                                    outline: sel?"2px solid rgba(194,98,45,0.5)":"none",
                                    outlineOffset:"-1px",
                                    transition:"background 0.15s",
                                  }}>
                                  <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}>
                                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                                      <span className="serif" style={{fontSize:14,fontWeight:hoy?700:400,color:hoy?"#2C1810":fut?"#4A7FA5":"#5C3D28"}}>{fmtShort(row.date)}</span>
                                      {hoy&&<span className="mono" style={{fontSize:8,padding:"2px 6px",borderRadius:2,background:"rgba(194,98,45,0.15)",color:"#C2622D",border:"1px solid rgba(194,98,45,0.35)"}}>HOY</span>}
                                      {fut&&<span className="mono" style={{fontSize:8,padding:"2px 6px",borderRadius:2,background:"rgba(74,127,165,0.1)",color:"#4A7FA5",border:"1px solid rgba(74,127,165,0.25)"}}>PRON.</span>}
                                      {sel&&<span style={{marginLeft:"auto",fontSize:12,color:"#C2622D"}}>→</span>}
                                    </div>
                                  </td>
                                  <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:row.eto>5?"#C2622D":row.eto>3?"#B8860B":"#5C3D28",fontWeight:hoy?700:400}}>{n(row.eto)}</td>
                                  <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:row.precip>0?"#4A7FA5":"#B8B0A0"}}>{n(row.precip,1)}</td>
                                  <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:"#5C3D28"}}>{n(row.tmax,1)}°</td>
                                  <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:"#9C7A5A"}}>{n(row.tmin,1)}°</td>
                                  <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:"#9C7A5A"}}>{n(row.wind,0)}</td>
                                  <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:"#B8860B",fontWeight:500}}>{fut?"—":acum.toFixed(1)}</td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                        {/* Acumulado */}
                        {(()=>{
                          const past=wRows.filter(r=>!isFuture(r.date));
                          return(
                            <tfoot>
                              <tr style={{background:"#2C1810",borderTop:"2px solid rgba(92,61,40,0.4)"}}>
                                <td className="fell" style={{padding:"10px 12px",fontSize:13,color:"rgba(242,235,217,0.7)",fontWeight:400}}>Σ {past.length} días</td>
                                <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:"#E8A882",fontWeight:700}}>{past.reduce((a,r)=>a+r.eto,0).toFixed(1)}</td>
                                <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:"#7EB3D3",fontWeight:700}}>{past.reduce((a,r)=>a+r.precip,0).toFixed(1)}</td>
                                <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:"rgba(242,235,217,0.4)"}}>{(past.reduce((a,r)=>a+r.tmax,0)/past.length).toFixed(1)}°</td>
                                <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:"rgba(242,235,217,0.3)"}}>{(past.reduce((a,r)=>a+r.tmin,0)/past.length).toFixed(1)}°</td>
                                <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:"rgba(242,235,217,0.3)"}}>{(past.reduce((a,r)=>a+r.wind,0)/past.length).toFixed(0)}</td>
                                <td/>
                              </tr>
                            </tfoot>
                          );
                        })()}
                      </table>
                    </div>
                  </div>

                  {/* RIGHT: Detail panel for selected date */}
                  <div>
                    {selectedRow&&(()=>{
                      const ep=Math.min(selectedRow.precip*0.8,selectedRow.eto);
                      const hoy=isToday(selectedRow.date),fut=isFuture(selectedRow.date);
                      return(
                        <>
                          <div className="mono" style={{fontSize:9,letterSpacing:2.5,color:"#9C7A5A",marginBottom:10}}>
                            DETALLE · {fmtShort(selectedRow.date).toUpperCase()}
                            {hoy&&" · HOY"}{fut&&" · PRONÓSTICO"}
                          </div>

                          {/* Clima del día */}
                          <div className="card" style={{padding:"16px 20px",marginBottom:14,background:`linear-gradient(135deg,rgba(255,252,244,0.95),rgba(232,220,191,0.4))`}}>
                            <div className="fell" style={{fontSize:17,fontWeight:400,color:"#2C1810",marginBottom:12}}>
                              {fmtFull(selectedRow.date)}
                              {hoy&&<span className="mono" style={{fontSize:9,marginLeft:10,padding:"2px 7px",borderRadius:2,background:"rgba(194,98,45,0.12)",color:"#C2622D",border:"1px solid rgba(194,98,45,0.3)"}}>HOY</span>}
                              {fut&&<span className="mono" style={{fontSize:9,marginLeft:10,padding:"2px 7px",borderRadius:2,background:"rgba(74,127,165,0.1)",color:"#4A7FA5",border:"1px solid rgba(74,127,165,0.25)"}}>PRONÓSTICO</span>}
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
                              {[
                                {ico:"☀",l:"ETo FAO-PM",v:n(selectedRow.eto)+" mm",c:"#C2622D",big:true},
                                {ico:"🌡",l:"T° Máx / Mín",v:`${n(selectedRow.tmax,1)}° / ${n(selectedRow.tmin,1)}°`,c:"#5C3D28"},
                                {ico:"💧",l:"Precipitación",v:n(selectedRow.precip,1)+" mm",c:selectedRow.precip>0?"#4A7FA5":"#B8B0A0"},
                                {ico:"🌬",l:"Viento máx.",v:n(selectedRow.wind,0)+" km/h",c:"#5C3D28"},
                                {ico:"🌫",l:"Humedad máx.",v:n(selectedRow.hum,0)+"%",c:"#5C3D28"},
                                {ico:"💦",l:"Prec. efectiva",v:ep.toFixed(2)+" mm",c:"#4A7FA5"},
                                {ico:"📉",l:"Déficit hídrico",v:(selectedRow.eto-ep).toFixed(2)+" mm",c:"#B8860B"},
                                {ico:"📆",l:"Día del año",v:Math.floor((new Date(selectedRow.date)-new Date(new Date(selectedRow.date).getFullYear()+"-01-01"))/864e5)+1,c:"#9C7A5A"},
                              ].map(s=>(
                                <div key={s.l} style={{padding:"10px 12px",background:"rgba(255,252,244,0.7)",borderRadius:3,border:"1px solid rgba(92,61,40,0.1)"}}>
                                  <div className="mono" style={{fontSize:8,color:"#9C7A5A",marginBottom:3,letterSpacing:0.5}}>{s.ico} {s.l.toUpperCase()}</div>
                                  <div className="serif" style={{fontSize:s.big?22:16,fontWeight:700,color:s.c,lineHeight:1}}>{s.v}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Riego por cultivo — VERTICAL */}
                          <div className="mono" style={{fontSize:9,letterSpacing:2.5,color:"#9C7A5A",marginBottom:10}}>PROGRAMA DE RIEGO POR CULTIVO</div>
                          <div style={{display:"flex",flexDirection:"column",gap:10}}>
                            {visibles.map(c=>{
                              const tR=calcAuto(c,kcs,kcAuto,selectedRow.eto,selectedRow.precip,selectedRow.date);
                              const volTot=tR.reduce((a,t)=>a+t.volTotal,0);
                              const horTot=tR.reduce((a,t)=>a+t.horas,0);
                              return(
                                <div key={c.id} className="card" style={{overflow:"hidden",border:`1px solid ${c.color}33`}}>
                                  {/* Cultivo header */}
                                  <div style={{padding:"12px 18px",background:`linear-gradient(135deg,${c.light}66,rgba(255,252,244,0))`,borderBottom:"1px solid rgba(92,61,40,0.1)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                                      <div style={{width:4,height:38,background:c.color,borderRadius:2}}/>
                                      <div>
                                        <div className="fell" style={{fontSize:17,fontWeight:400,color:"#2C1810"}}>{c.emoji} {c.label}</div>
                                        <div className="mono" style={{fontSize:9,color:"#9C7A5A",marginTop:2}}>{c.cultivo} · {c.area} ha · Kc {kcAuto?kcDeFecha(c.id,selectedRow?.date):kcs[c.id]} · ETc {(selectedRow.eto*(kcAuto?kcDeFecha(c.id,selectedRow?.date):kcs[c.id])).toFixed(2)} mm</div>
                                      </div>
                                    </div>
                                    <div style={{display:"flex",gap:24,alignItems:"center"}}>
                                      <div style={{textAlign:"right"}}>
                                        <div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>VOL. TOTAL</div>
                                        <div className="serif" style={{fontSize:24,fontWeight:700,color:c.color,lineHeight:1}}>{volTot.toFixed(0)} <span className="mono" style={{fontSize:10,color:"#9C7A5A"}}>m³</span></div>
                                      </div>
                                      <div style={{textAlign:"right"}}>
                                        <div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>HORAS RIEGO</div>
                                        <div className="serif" style={{fontSize:28,fontWeight:700,color:"#2C1810",lineHeight:1}}>{hToHM(horTot)}</div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Sectores — tabla vertical */}
                                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                                    <thead>
                                      <tr style={{background:"rgba(232,220,191,0.45)"}}>
                                        {["Sector / Turno","ha","m³/ha","Vol. m³","Caudal m³/h","⏱ Horas de riego"].map((h,hi)=>(
                                          <th key={h} className="mono" style={{padding:"8px 14px",textAlign:hi<2?"left":"right",fontSize:9,fontWeight:500,color:"#5C3D28",borderBottom:"1px solid rgba(92,61,40,0.2)",letterSpacing:0.5,whiteSpace:"nowrap"}}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {tR.map((t,ti)=>(
                                        <tr key={t.id} style={{background:ti%2?"rgba(242,235,217,0.2)":"rgba(255,252,244,0.5)",borderBottom:"1px solid rgba(92,61,40,0.07)"}}>
                                          <td style={{padding:"12px 14px"}}>
                                            <div className="serif" style={{fontSize:15,fontWeight:600,color:c.color}}>{t.label}</div>
                                            <div className="mono" style={{fontSize:9,color:"#9C7A5A",marginTop:2}}>{t.bloques}</div>
                                          </td>
                                          <td className="mono" style={{padding:"12px 14px",fontSize:13,color:"#5C3D28"}}>{t.ha}</td>
                                          <td className="mono" style={{padding:"12px 14px",textAlign:"right",fontSize:13,color:"#5C3D28"}}>{t.volHa.toFixed(1)}</td>
                                          <td style={{padding:"12px 14px",textAlign:"right"}}>
                                            <span className="serif" style={{fontSize:18,fontWeight:700,color:c.color}}>{t.volTotal.toFixed(0)}</span>
                                            <span className="mono" style={{fontSize:9,color:"#9C7A5A"}}> m³</span>
                                          </td>
                                          <td className="mono" style={{padding:"12px 14px",textAlign:"right",fontSize:13,color:"#9C7A5A"}}>{t.q}</td>
                                          <td style={{padding:"12px 14px",textAlign:"right"}}>
                                            <span className="serif" style={{fontSize:22,fontWeight:700,color:"#2C1810"}}>{hToHM(t.horas)}</span>
                                            <div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>{(t.horas*60).toFixed(0)} min</div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot>
                                      <tr style={{background:`${c.light}55`,borderTop:`2px solid ${c.color}33`}}>
                                        <td colSpan={2} className="mono" style={{padding:"10px 14px",fontSize:9,color:c.color,letterSpacing:1}}>TOTAL {c.label.toUpperCase()}</td>
                                        <td className="mono" style={{padding:"10px 14px",textAlign:"right",fontSize:13,color:"#5C3D28"}}>{(volTot/c.area).toFixed(1)}</td>
                                        <td style={{padding:"10px 14px",textAlign:"right"}}>
                                          <span className="serif" style={{fontSize:20,fontWeight:700,color:c.color}}>{volTot.toFixed(0)}</span>
                                          <span className="mono" style={{fontSize:9,color:"#9C7A5A"}}> m³</span>
                                        </td>
                                        <td className="mono" style={{padding:"10px 14px",textAlign:"right",fontSize:12,color:"#9C7A5A"}}>{tR.reduce((a,t)=>a+t.q,0).toFixed(0)} total</td>
                                        <td style={{padding:"10px 14px",textAlign:"right"}}>
                                          <span className="serif" style={{fontSize:26,fontWeight:700,color:c.color}}>{hToHM(horTot)}</span>
                                        </td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* ──── PROGRAMA DEL DÍA ──── */}
            {tab==="hoy"&&todayRow&&(
              <div className="fade">
                <h2 className="fell" style={{fontSize:24,fontWeight:400,marginBottom:4}}>Programa de Riego</h2>
                <div className="serif" style={{fontSize:16,color:"#9C7A5A",fontStyle:"italic",marginBottom:22}}>{fmtFull(todayStr())} · ETo {todayRow.eto.toFixed(2)} mm/día</div>
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {visibles.map(c=>{
                    const tR=calcAuto(c,kcs,kcAuto,todayRow.eto,todayRow.precip,todayRow.date);
                    const volTot=tR.reduce((a,t)=>a+t.volTotal,0),horTot=tR.reduce((a,t)=>a+t.horas,0);
                    const ep=Math.min(todayRow.precip*0.8,todayRow.eto*(kcAuto?kcDeFecha(c.id,todayRow.date):kcs[c.id]));
                    return(
                      <div key={c.id} className="card" style={{overflow:"hidden",border:`1px solid ${c.color}33`}}>
                        <div style={{padding:"14px 20px",background:`linear-gradient(135deg,${c.light}66,rgba(255,252,244,0))`,borderBottom:"1px solid rgba(92,61,40,0.1)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                          <div style={{display:"flex",alignItems:"center",gap:12}}>
                            <div style={{width:4,height:42,background:c.color,borderRadius:2}}/>
                            <div>
                              <div className="fell" style={{fontSize:19,fontWeight:400,color:"#2C1810"}}>{c.emoji} {c.label}</div>
                              <div className="mono" style={{fontSize:9,color:"#9C7A5A",marginTop:3}}>{c.cultivo} · {c.area} ha · Kc {kcAuto?kcDeFecha(c.id,selectedRow?.date):kcs[c.id]} · ETc {(todayRow.eto*(kcAuto?kcDeFecha(c.id,todayRow.date):kcs[c.id])).toFixed(2)} mm · Prec.Ef. {ep.toFixed(2)} mm</div>
                            </div>
                          </div>
                          <div style={{display:"flex",gap:28}}>
                            {[{l:"Volumen total",v:volTot.toFixed(0)+" m³",c:c.color},{l:"Horas de riego",v:hToHM(horTot),c:"#2C1810"}].map(s=>(
                              <div key={s.l} style={{textAlign:"right"}}>
                                <div className="mono" style={{fontSize:9,color:"#9C7A5A",letterSpacing:0.5}}>{s.l.toUpperCase()}</div>
                                <div className="serif" style={{fontSize:26,fontWeight:700,color:s.c,lineHeight:1}}>{s.v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                          <thead>
                            <tr style={{background:"rgba(232,220,191,0.45)"}}>
                              {["Sector / Turno","ha","ETc mm","Riego neto mm","Riego bruto mm","m³ / ha","Volumen m³","Caudal m³/h","⏱ Horas de riego"].map((h,hi)=>(
                                <th key={h} className="mono" style={{padding:"9px 14px",textAlign:hi<2?"left":"right",fontSize:9,fontWeight:500,color:"#5C3D28",borderBottom:"1px solid rgba(92,61,40,0.2)",letterSpacing:0.4,whiteSpace:"nowrap"}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {tR.map((t,ti)=>(
                              <tr key={t.id} style={{background:ti%2?"rgba(242,235,217,0.2)":"rgba(255,252,244,0.5)",borderBottom:"1px solid rgba(92,61,40,0.07)"}}>
                                <td style={{padding:"13px 14px"}}>
                                  <div className="serif" style={{fontSize:16,fontWeight:600,color:c.color}}>{t.label}</div>
                                  <div className="mono" style={{fontSize:9,color:"#9C7A5A",marginTop:2}}>{t.bloques}</div>
                                </td>
                                <td className="mono" style={{padding:"13px 14px",fontSize:13,color:"#5C3D28"}}>{t.ha}</td>
                                <td className="mono" style={{padding:"13px 14px",textAlign:"right",fontSize:13,color:c.color,fontWeight:500}}>{t.etc.toFixed(2)}</td>
                                <td className="mono" style={{padding:"13px 14px",textAlign:"right",fontSize:13,color:"#2C1810"}}>{t.neto.toFixed(2)}</td>
                                <td className="mono" style={{padding:"13px 14px",textAlign:"right",fontSize:13,color:"#2C1810"}}>{t.bruto.toFixed(2)}</td>
                                <td className="mono" style={{padding:"13px 14px",textAlign:"right",fontSize:13,color:"#5C3D28"}}>{t.volHa.toFixed(1)}</td>
                                <td style={{padding:"13px 14px",textAlign:"right"}}>
                                  <span className="serif" style={{fontSize:20,fontWeight:700,color:c.color}}>{t.volTotal.toFixed(0)}</span>
                                  <span className="mono" style={{fontSize:9,color:"#9C7A5A"}}> m³</span>
                                </td>
                                <td className="mono" style={{padding:"13px 14px",textAlign:"right",fontSize:13,color:"#9C7A5A"}}>{t.q}</td>
                                <td style={{padding:"13px 14px",textAlign:"right"}}>
                                  <span className="serif" style={{fontSize:24,fontWeight:700,color:"#2C1810"}}>{hToHM(t.horas)}</span>
                                  <div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>{(t.horas*60).toFixed(0)} min</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr style={{background:`${c.light}55`,borderTop:`2px solid ${c.color}44`}}>
                              <td colSpan={2} className="mono" style={{padding:"11px 14px",fontSize:9,color:c.color,letterSpacing:1}}>TOTAL {c.label.toUpperCase()}</td>
                              <td colSpan={4}/>
                              <td style={{padding:"11px 14px",textAlign:"right"}}>
                                <span className="serif" style={{fontSize:22,fontWeight:700,color:c.color}}>{volTot.toFixed(0)}</span>
                                <span className="mono" style={{fontSize:9,color:"#9C7A5A"}}> m³</span>
                              </td>
                              <td className="mono" style={{padding:"11px 14px",textAlign:"right",fontSize:12,color:"#9C7A5A"}}>{tR.reduce((a,t)=>a+t.q,0).toFixed(0)}</td>
                              <td style={{padding:"11px 14px",textAlign:"right"}}>
                                <span className="serif" style={{fontSize:28,fontWeight:700,color:c.color}}>{hToHM(horTot)}</span>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })}
                </div>
                {/* 3-day */}
                <div style={{marginTop:28}}>
                  <div className="serif" style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,fontSize:15,color:"#9C7A5A",fontStyle:"italic"}}>
                    <div style={{flex:1,height:1,background:"rgba(92,61,40,0.15)"}}/>Pronóstico próximos 3 días<div style={{flex:1,height:1,background:"rgba(92,61,40,0.15)"}}/>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
                    {wRows.filter(r=>isFuture(r.date)).slice(0,3).map(r=>{
                      const ids=visibles.map(c=>c.id);
                      const vol=ids.reduce((a,id)=>{const c=CULTIVOS.find(x=>x.id===id);return a+(c?calcAuto(c,kcs,kcAuto,r.eto,r.precip,r.date).reduce((b,t)=>b+t.volTotal,0):0);},0);
                      const hrs=ids.reduce((a,id)=>{const c=CULTIVOS.find(x=>x.id===id);return a+(c?calcAuto(c,kcs,kcAuto,r.eto,r.precip,r.date).reduce((b,t)=>b+t.horas,0):0);},0);
                      return(
                        <div key={r.date} className="card" style={{padding:"16px 20px"}}>
                          <div className="mono" style={{fontSize:9,color:"#4A7FA5",letterSpacing:1.5,marginBottom:8}}>{fmtShort(r.date).toUpperCase()} · PRONÓSTICO</div>
                          <div className="serif" style={{fontWeight:700,fontSize:20,color:"#C2622D",marginBottom:6}}>ETo {r.eto.toFixed(2)} mm</div>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                            <div><div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>VOLUMEN</div><span className="serif" style={{fontWeight:700,fontSize:18,color:"#2C1810"}}>{vol.toFixed(0)} m³</span></div>
                            <div style={{textAlign:"right"}}><div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>HORAS</div><span className="serif" style={{fontWeight:700,fontSize:18,color:"#5A6E3A"}}>{hToHM(hrs)}</span></div>
                          </div>
                          <div className="mono" style={{fontSize:10,color:"#5C3D28"}}>T° {r.tmax?.toFixed(0)}° / {r.tmin?.toFixed(0)}° · Viento {r.wind?.toFixed(0)} km/h</div>
                          {r.precip>0&&<div style={{marginTop:6,display:"flex",alignItems:"center",gap:4}}><svg width="10" height="10" viewBox="0 0 24 24" fill="#4A7FA5"><path d="M12 2C12 2 5 9 5 14.5C5 18.1 8.1 21 12 21C15.9 21 19 18.1 19 14.5C19 9 12 2 12 2Z"/></svg><span className="mono" style={{fontSize:10,color:"#4A7FA5"}}>{r.precip.toFixed(1)} mm lluvia</span></div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ──── RESUMEN ──── */}
            {tab==="resumen"&&todayRow&&(
              <div className="fade">
                <h2 className="fell" style={{fontSize:24,fontWeight:400,marginBottom:4}}>Resumen del Predio</h2>
                <div className="serif" style={{fontSize:15,color:"#9C7A5A",fontStyle:"italic",marginBottom:22}}>{TOTAL_HA.toFixed(2)} ha totales · {new Date().toLocaleDateString("es-CL",{day:"numeric",month:"long",year:"numeric"})}</div>
                {["citricos","paltos"].map(grp=>{
                  const cult=CULTIVOS.filter(c=>c.grupo===grp);
                  const grpVol=cult.reduce((a,c)=>a+calcAuto(c,kcs,kcAuto,todayRow.eto,todayRow.precip,todayRow.date).reduce((b,t)=>b+t.volTotal,0),0);
                  const grpHa=cult.reduce((a,c)=>a+c.area,0);
                  const gc=grp==="citricos"?"#C2622D":"#3D6B35";
                  return(
                    <div key={grp} style={{marginBottom:28}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:12}}>
                        <h3 className="fell" style={{fontSize:20,fontWeight:400}}>{grp==="citricos"?"🍊 Cítricos":"🥑 Paltos"} — {grpHa.toFixed(2)} ha</h3>
                        <div className="serif" style={{fontWeight:700,fontSize:20,color:gc}}>{grpVol.toFixed(0)} m³ hoy</div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
                        {cult.map(c=>{
                          const tR=calcAuto(c,kcs,kcAuto,todayRow.eto,todayRow.precip,todayRow.date);
                          const vol=tR.reduce((a,t)=>a+t.volTotal,0),hrs=tR.reduce((a,t)=>a+t.horas,0);
                          return(
                            <div key={c.id} className="card" style={{padding:"14px 18px",background:`linear-gradient(135deg,${c.light}55,rgba(255,252,244,0.9))`}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                                <div style={{width:3,height:32,background:c.color,borderRadius:1}}/>
                                <div><div className="fell" style={{fontSize:15,color:"#2C1810"}}>{c.emoji} {c.label}</div>
                                <div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>{c.area} ha · ETc {(todayRow.eto*(kcAuto?kcDeFecha(c.id,todayRow.date):kcs[c.id])).toFixed(2)} mm</div></div>
                              </div>
                              <div style={{display:"flex",justifyContent:"space-between"}}>
                                <div><div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>VOLUMEN</div><span className="serif" style={{fontWeight:700,fontSize:22,color:c.color}}>{vol.toFixed(0)} m³</span></div>
                                <div style={{textAlign:"right"}}><div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>HORAS</div><span className="serif" style={{fontWeight:700,fontSize:22,color:"#2C1810"}}>{hToHM(hrs)}</span></div>
                              </div>
                              {tR.map(t=>(
                                <div key={t.id} style={{display:"flex",justifyContent:"space-between",paddingTop:5,marginTop:5,borderTop:`1px solid ${c.color}22`}}>
                                  <span className="serif" style={{fontSize:13,color:"#5C3D28"}}>{t.label}</span>
                                  <span className="mono" style={{fontSize:11}}><span style={{color:c.color}}>{t.volTotal.toFixed(0)} m³</span> <span style={{color:"#2C1810",fontWeight:500}}>{hToHM(t.horas)}</span></span>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {(()=>{
                  const allVol=CULTIVOS.reduce((a,c)=>a+calcAuto(c,kcs,kcAuto,todayRow.eto,todayRow.precip,todayRow.date).reduce((b,t)=>b+t.volTotal,0),0);
                  const cVol=CULTIVOS.filter(c=>c.grupo==="citricos").reduce((a,c)=>a+calcAuto(c,kcs,kcAuto,todayRow.eto,todayRow.precip,todayRow.date).reduce((b,t)=>b+t.volTotal,0),0);
                  const pVol=CULTIVOS.filter(c=>c.grupo==="paltos").reduce((a,c)=>a+calcAuto(c,kcs,kcAuto,todayRow.eto,todayRow.precip,todayRow.date).reduce((b,t)=>b+t.volTotal,0),0);
                  return(
                    <div style={{padding:"20px 26px",background:"#2C1810",borderRadius:4,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
                      <div><div className="mono" style={{fontSize:10,letterSpacing:3,color:"rgba(242,235,217,0.38)",marginBottom:4}}>TOTAL PREDIO HOY</div>
                        <div style={{display:"flex",alignItems:"baseline",gap:6}}><span className="serif" style={{fontWeight:700,fontSize:44,color:"#F2EBD9",lineHeight:1}}>{allVol.toFixed(0)}</span><span className="fell" style={{fontSize:18,color:"rgba(242,235,217,0.5)"}}>m³</span></div>
                        <div className="mono" style={{fontSize:9,color:"rgba(242,235,217,0.24)",marginTop:3}}>{TOTAL_HA.toFixed(2)} ha · ETo {todayRow.eto.toFixed(2)} mm</div></div>
                      <div style={{display:"flex",gap:32}}>
                        {[["🍊 Cítricos",cVol,"#C2622D"],["🥑 Paltos",pVol,"#5A6E3A"]].map(([l,v,col])=>(
                          <div key={l} style={{textAlign:"right"}}><div className="mono" style={{fontSize:9,color:"rgba(242,235,217,0.3)",letterSpacing:1}}>{l}</div>
                          <span className="serif" style={{fontWeight:700,fontSize:28,color:col}}>{v.toFixed(0)} m³</span></div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ──── PLANOS ──── */}
            {tab==="planos"&&(
              <div className="fade">
                <h2 className="fell" style={{fontSize:24,fontWeight:400,marginBottom:4}}>Datos Técnicos de los Planos</h2>
                <div className="serif" style={{fontSize:15,color:"#9C7A5A",fontStyle:"italic",marginBottom:20}}>Carpeta 423 · Inversiones Purehue · Hijuelas–Romeral · V Región de Valparaíso</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:14}}>
                  {CULTIVOS.map(c=>(
                    <div key={c.id} className="card" style={{overflow:"hidden"}}>
                      <div style={{padding:"13px 18px",background:`linear-gradient(135deg,${c.light}66,rgba(255,252,244,0))`,borderBottom:"1px solid rgba(92,61,40,0.14)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <div style={{display:"flex",gap:10,alignItems:"center"}}>
                          <div style={{width:3,height:40,background:c.color,borderRadius:1}}/>
                          <div><div className="fell" style={{fontSize:16,color:"#2C1810"}}>{c.emoji} {c.label}</div>
                          <div className="mono" style={{fontSize:9,color:"#9C7A5A",marginTop:1}}>{c.plano}</div></div>
                        </div>
                        <div className="serif" style={{fontWeight:700,fontSize:20,color:c.color}}>{c.area} ha</div>
                      </div>
                      <div style={{padding:"12px 18px"}}>
                        {[["Cultivo",c.cultivo],["Emisor",c.emisor],["Bomba",c.bomba],["Filtro",c.filtro],["Kc",`FAO: ${KC_MENSUAL[c.id]?.join(" · ")||"—"}`]].map(([k,v])=>(
                          <div key={k} style={{display:"flex",gap:10,marginBottom:7}}>
                            <span className="mono" style={{fontSize:8,color:"#9C7A5A",minWidth:48,letterSpacing:0.5,paddingTop:2}}>{k.toUpperCase()}</span>
                            <span className="serif" style={{fontSize:13,color:"#5C3D28",lineHeight:1.35}}>{v}</span>
                          </div>
                        ))}
                        <div style={{marginTop:10,borderTop:"1px solid rgba(92,61,40,0.12)",paddingTop:10}}>
                          <div className="mono" style={{fontSize:9,color:"#9C7A5A",letterSpacing:1,marginBottom:7}}>SECTORES / TURNOS</div>
                          {c.turnos.map(t=>(
                            <div key={t.id} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                              <span className="serif" style={{fontSize:14,color:c.color,fontWeight:600}}>{t.label}</span>
                              <span className="mono" style={{fontSize:11,color:"#9C7A5A"}}>{t.ha} ha · {t.q} m³/h</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="card" style={{marginTop:14,padding:"12px 18px"}}>
                  <div className="serif" style={{fontSize:12,color:"#9C7A5A",fontStyle:"italic",lineHeight:2}}>
                    Metodología: ETo por FAO Penman-Monteith (Open-Meteo) · ETc = ETo × Kc (FAO-56) · Precipitación efectiva = 80% lluvia · Riego bruto = Neto ÷ Eficiencia del sistema · Vol. m³/ha = Riego bruto (mm) × 10 · Horas = Vol. total ÷ Caudal sector · Coordenadas: Hijuelas, V Región, Chile (-32.785°S / -71.143°O)
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
