import { useState, useEffect, useCallback } from "react";

const LAT = -32.827378, LON = -71.090495; // Estación "Nueva Purehue" ID:0020F829 · FieldClimate · 312m s.n.m.

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

// ── Semana ISO ───────────────────────────────────────────────
const isoWeek = (dateStr) => {
  const d = new Date(dateStr+"T12:00:00");
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - (jan4.getDay()||7) + 1);
  const weekNum = Math.floor((d - startOfWeek1) / (7*864e5)) + 1;
  return `${d.getFullYear()}-W${String(weekNum).padStart(2,"0")}`;
};
const weekDates = (weekKey) => {
  // Returns {start, end} as YYYY-MM-DD for the ISO week
  const [yr, wStr] = weekKey.split("-W");
  const year = parseInt(yr), week = parseInt(wStr);
  const jan4 = new Date(year, 0, 4);
  const dow = jan4.getDay()||7;
  const startOfW1 = new Date(jan4.getTime() - (dow-1)*864e5);
  const start = new Date(startOfW1.getTime() + (week-1)*7*864e5);
  const end   = new Date(start.getTime() + 6*864e5);
  const fmt = d => d.toISOString().split("T")[0];
  return { start: fmt(start), end: fmt(end) };
};
const weekLabel = (weekKey) => {
  const {start, end} = weekDates(weekKey);
  const fmtD = d => new Date(d+"T12:00:00").toLocaleDateString("es-CL",{day:"2-digit",month:"short"});
  return `${fmtD(start)} — ${fmtD(end)}`;
};
// Get all ISO weeks covered by wRows
const getWeeks = (rows) => {
  const seen = new Set();
  const weeks = [];
  for(const r of rows){
    const wk = isoWeek(r.date);
    if(!seen.has(wk)){ seen.add(wk); weeks.push(wk); }
  }
  return weeks;
};
// Sum ETo/precip/etc for all days in a week
const weekSum = (rows, weekKey, field) =>
  rows.filter(r=>isoWeek(r.date)===weekKey&&!isFuture(r.date))
      .reduce((a,r)=>a+(r[field]||0),0);
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
  const [kcAuto,  setKcAuto]  = useState(true);

  // ── Datos manuales estación FieldClimate ───────────────────
  // Permite ingresar datos reales de "Nueva Purehue" [0020F829]
  // y recalcular ETo FAO-PM con valores medidos en vez de ERA5
  const [stData, setStData] = useState(() => {
    try { return JSON.parse(localStorage.getItem("hijuelas_stdata") || "{}"); }
    catch { return {}; }
  });
  const [stEdit, setStEdit] = useState(false);

  useEffect(() => {
    try { localStorage.setItem("hijuelas_stdata", JSON.stringify(stData)); }
    catch(e) {}
  }, [stData]);

  // Calcula ETo FAO-PM simplificado con datos de estación
  // Referencia: FAO-56 Eq. 6 (Hargreaves como fallback si faltan datos)
  const etoFromStation = (fecha) => {
    const d = stData[fecha];
    if (!d || !d.tmax || !d.tmin) return null;
    const tmax = parseFloat(d.tmax), tmin = parseFloat(d.tmin);
    const tmean = (tmax + tmin) / 2;
    // Si tenemos HR y viento usamos Penman-Monteith simplificado
    // Si no, Hargreaves (solo T°)
    if (d.rs || d.viento) {
      const hr   = parseFloat(d.hr || 70);
      const u2   = parseFloat(d.viento || 2) * 0.748; // km/h → m/s aprox
      const ra   = parseFloat(d.ra || 25); // MJ/m²/día estimado según mes/latitud
      // Presión de saturación
      const es_max = 0.6108 * Math.exp(17.27 * tmax / (tmax + 237.3));
      const es_min = 0.6108 * Math.exp(17.27 * tmin / (tmin + 237.3));
      const es = (es_max + es_min) / 2;
      const ea = (hr / 100) * es;
      const vpd = es - ea;
      // Delta (pendiente curva presión de vapor)
      const delta = 4098 * (0.6108 * Math.exp(17.27 * tmean / (tmean + 237.3))) / Math.pow(tmean + 237.3, 2);
      // Gamma (constante psicrométrica, P=88 kPa a 312m s.n.m.)
      const gamma = 0.0655;
      // Rn estimada desde Ra (si no tienen piranómetro)
      const rs = parseFloat(d.rs || ra * 0.5);
      const rns = (1 - 0.23) * rs;
      const rso = (0.75 + 2e-5 * 312) * ra;
      const rnl = 4.903e-9 * ((Math.pow(tmax+273.16,4)+Math.pow(tmin+273.16,4))/2) * (0.34-0.14*Math.sqrt(ea)) * (1.35*(rs/rso)-0.35);
      const rn = Math.max(0, rns - rnl);
      const G = 0;
      const eto = (0.408*delta*(rn-G) + gamma*(900/(tmean+273))*u2*vpd) / (delta + gamma*(1+0.34*u2));
      return Math.max(0, eto).toFixed(2);
    } else {
      // Hargreaves: ETo = 0.0023 × Ra × (T+17.8) × (Tmax-Tmin)^0.5
      const mes = new Date(fecha+"T12:00:00").getMonth();
      // Ra mensual estimada para latitud -32.8° (MJ/m²/día)
      const RA = [36,33,28,22,17,14,15,19,25,30,34,37];
      const ra = RA[mes];
      const eto = 0.0023 * ra * (tmean + 17.8) * Math.pow(Math.max(0,tmax-tmin), 0.5);
      return Math.max(0, eto).toFixed(2);
    }
  };

  // Merge: usa datos de estación si existen, si no usa Open-Meteo
  const getEto = (row) => {
    const st = etoFromStation(row.date);
    return st ? parseFloat(st) : row.eto;
  };
  const getTmax = (row) => stData[row.date]?.tmax ? parseFloat(stData[row.date].tmax) : row.tmax;
  const getTmin = (row) => stData[row.date]?.tmin ? parseFloat(stData[row.date].tmin) : row.tmin;
  const getHR   = (row) => stData[row.date]?.hr   ? parseFloat(stData[row.date].hr)   : row.hum;
  const getWind = (row) => stData[row.date]?.viento? parseFloat(stData[row.date].viento): row.wind;
  const getPrecip=(row) => stData[row.date]?.lluvia? parseFloat(stData[row.date].lluvia): row.precip;
  const hasStation=(fecha)=> !!(stData[fecha]?.tmax && stData[fecha]?.tmin); // true = sigue fenología mensual
  const [selDate, setSelDate] = useState(null);
  // ── Gráficos ──────────────────────────────────────────────
  const [chartCult, setChartCult] = useState("todos");
  // ── Registro real ──────────────────────────────────────────
  // registro[date][cultivoId_sectorId] = { m3Real, ec, ph, notas }
  // ── Registro semanal ──────────────────────────────────────
  // regSem[weekKey][cultId__sectorId] = {m3Real, ec, ph, notas, fechaInicio, fechaFin}
  // weekKey = "YYYY-Www" (ISO week)
  const [regSem, setRegSem] = useState(()=>{
    try{
      const legacy = JSON.parse(localStorage.getItem("hijuelas_registro")||"{}");
      const weekly = JSON.parse(localStorage.getItem("hijuelas_registro_sem")||"{}");
      // Migrate legacy daily data to weekly on first load
      if(Object.keys(legacy).length && !Object.keys(weekly).length){
        const migrated = {};
        for(const [date, sectors] of Object.entries(legacy)){
          const wk = isoWeek(date);
          if(!migrated[wk]) migrated[wk] = {};
          for(const [key, val] of Object.entries(sectors)){
            if(!migrated[wk][key]) migrated[wk][key] = {...val};
            else migrated[wk][key].m3Real = (parseFloat(migrated[wk][key].m3Real||0)+parseFloat(val.m3Real||0)).toFixed(1);
          }
        }
        return migrated;
      }
      return weekly;
    } catch{ return {}; }
  });
  const [regWeekSel, setRegWeekSel] = useState(()=>isoWeek(todayStr()));
  const [regCultId,  setRegCultId]  = useState(CULTIVOS[0].id);
  const [csvDrag,    setCsvDrag]    = useState(false);
  const [csvMsg,     setCsvMsg]     = useState(null);

  // Persist registro semanal
  useEffect(()=>{
    try{ localStorage.setItem("hijuelas_registro_sem", JSON.stringify(regSem)); }
    catch(e){ console.warn("localStorage full", e); }
  },[regSem]);

  const setRegW = (weekKey, cultId, sectorId, campo, valor) => {
    const key = `${cultId}__${sectorId}`;
    setRegSem(p=>({...p,[weekKey]:{...(p[weekKey]||{}),[key]:{...(p[weekKey]?.[key]||{}),[campo]:valor}}}));
  };
  const getRegW = (weekKey, cultId, sectorId, campo) =>
    regSem?.[weekKey]?.[`${cultId}__${sectorId}`]?.[campo] ?? "";

  // Compatibilidad legacy (para calculos de gráficos que usaban registro diario)
  const registro = {};
  const getReg = (fecha, cultId, sectorId, campo) => {
    const wk = isoWeek(fecha);
    return getRegW(wk, cultId, sectorId, campo);
  };
  const setRegistro = () => {};

  // ── OlivePlus: mapeo EXACTO sector → cultivo/turno ─────────
  // Fuente: confirmación Nico Valenzuela, abril 2026
  //
  // Reporte por sectores (granular):
  //   Linea 2 V1+V2  → Paltos Nuevos 1+2 (T1+T2, distribuir por ha)
  //   Linea 2 V3     → Paltos Viejos T1
  //   Linea 2 V4     → Paltos Viejos T2
  //   Linea 2 V5     → Paltos Viejos T3
  //   Linea 2 V6     → Paltos Viejos T4
  //   Linea 1 V1     → Naranjos Lanelate S1
  //   Linea 1 V2     → Naranjos Lanelate S2
  //   Linea 1 V3     → Paltos Nuevos 3 (sector único)
  //   Linea 3 V1     → Valencia/Midnight OP1
  //   Linea 3 V2     → Valencia/Midnight OP2
  //
  // Reporte acumulado por equipo (agrupado):
  //   Citricos (MELBACE2V4)       → Lanelate S1+S2 + Paltos Nuevos 3
  //   Naranjos Valencia (MELBACE4V4) → Valencia OP1+OP2
  //   Paltos (MELBACE1)           → Paltos Viejos T1-T4 + Paltos N1+2 T1+T2

  const OLIVE_SECTOR_MAP = [
    // ── Paltos MELBACE1 (Linea 2) ─────────────────────────────
    // V1+V2 combinadas = Paltos Nuevos 1+2 completo (T1+T2, distribuir por ha)
    { match:/linea\s*2\s*v1\s*\+\s*v2|linea\s*2\s*v1.*\+.*v2/i, cultId:"paltos_n12", sectorId:null },
    // V1 individual (puede aparecer solo con 0 m³ → ignorar si es 0, o T1 si tiene valor)
    { match:/linea\s*2\s*v1\s*\(/i,                               cultId:"paltos_n12", sectorId:"T1" },
    // V2 individual
    { match:/linea\s*2\s*v2\s*\(/i,                               cultId:"paltos_n12", sectorId:"T2" },
    // V3 → Paltos Viejos T1
    { match:/linea\s*2\s*v3/i,                                    cultId:"paltos_v",   sectorId:"T1" },
    // V4 → Paltos Viejos T2
    { match:/linea\s*2\s*v4/i,                                    cultId:"paltos_v",   sectorId:"T2" },
    // V5 → Paltos Viejos T3
    { match:/linea\s*2\s*v5/i,                                    cultId:"paltos_v",   sectorId:"T3" },
    // V6 → Paltos Viejos T4
    { match:/linea\s*2\s*v6/i,                                    cultId:"paltos_v",   sectorId:"T4" },
    // ── Cítricos MELBACE2V4 (Linea 1) ─────────────────────────
    // 1v1 / Linea 1 V1 → Naranjos Lanelate S1
    { match:/linea\s*1\s*v1/i,                                    cultId:"lanelate",   sectorId:"S1" },
    // 1v2 / Linea 1 V2 → Naranjos Lanelate S2
    { match:/linea\s*1\s*v2/i,                                    cultId:"lanelate",   sectorId:"S2" },
    // 1v3 / Linea 1 V3 → Paltos Nuevos 3 (sector único, 3 válvulas en paralelo)
    { match:/linea\s*1\s*v3/i,                                    cultId:"paltos_n3",  sectorId:"S1" },
    // ── Valencia MELBACE4V4 (Linea 3) ─────────────────────────
    // 3v1 / Linea 3 V1 → Valencia Operación 1
    { match:/linea\s*3\s*v1/i,                                    cultId:"valencia",   sectorId:"OP1" },
    // 3v2 / Linea 3 V2 → Valencia Operación 2
    { match:/linea\s*3\s*v2/i,                                    cultId:"valencia",   sectorId:"OP2" },
    // ── Ignorar siempre ────────────────────────────────────────
    { match:/control.*helada|v7|v8/i,                             cultId:null,         sectorId:null  },
  ];

  // Mapeo equipo completo (reporte acumulado) → IDs para distribución por ha
  const OLIVE_EQUIPO_MAP = [
    { match:/melbace2v4|citrico.*melbace2/i,   ids:[{cid:"lanelate",tids:["S1","S2"]},{cid:"paltos_n3",tids:["S1"]}] },
    { match:/melbace4v4|valencia/i,            ids:[{cid:"valencia", tids:["OP1","OP2"]}] },
    { match:/melbace1|^paltos\s*\(/i,          ids:[{cid:"paltos_v", tids:["T1","T2","T3","T4"]},{cid:"paltos_n12",tids:["T1","T2"]}] },
    { match:/control.*helada/i,                ids:[] },
  ];

  // Registra m³ para un sector específico
  const registrarSector = (newReg, weekKey, cultId, sectorId, m3, ec, ph, notas, fi, ff) => {
    const c = CULTIVOS.find(x=>x.id===cultId);
    if(!c) return;
    const turnos = sectorId ? c.turnos.filter(t=>t.id===sectorId) : c.turnos;
    const haTotal = turnos.reduce((a,t)=>a+t.ha, 0);
    for(const t of turnos){
      const key = `${cultId}__${t.id}`;
      if(!newReg[weekKey]) newReg[weekKey]={};
      const prev = parseFloat(newReg[weekKey][key]?.m3Real||0);
      newReg[weekKey][key] = {
        m3Real: (prev + m3*(t.ha/haTotal)).toFixed(1),
        ec: ec||"", ph: ph||"",
        notas: notas||"OlivePlus",
        fechaInicio: fi||"", fechaFin: ff||"",
      };
    }
  };

  // ── Parser principal ───────────────────────────────────────
  const parseCSV = (text) => {
    const lines = text.trim().split(/\r?\n/).filter(l=>l.trim());
    if(lines.length < 2) return { ok:false, msg:"El archivo no tiene datos suficientes." };

    // Detectar formato: ¿tiene "Linea" → reporte por sectores? ¿o "Riego acumulado" → equipo?
    const allText = lines.join(" ").toLowerCase();
    const isSectorReport  = /linea\s*[12]/i.test(allText);
    const isEquipoReport  = /melbace[24]v4|paltos.*melbace1/i.test(allText);

    // Buscar línea de encabezado (contiene "Nombre" y "Volumen")
    let hdrIdx = lines.findIndex(l=>/nombre/i.test(l)&&/volumen/i.test(l));
    if(hdrIdx<0) return { ok:false, msg:"No se encontró encabezado con 'Nombre' y 'Volumen'." };

    const cols0 = lines[hdrIdx].split(/\t/);
    const iNombre = cols0.findIndex(h=>/nombre/i.test(h));
    const iVol    = cols0.findIndex(h=>/^volumen$/i.test(h.trim()));
    if(iNombre<0||iVol<0) return { ok:false, msg:`Columnas: ${cols0.join(", ")}` };

    // Extraer rango de fechas del título (ej: "22/04/2026 - 29/04/2026")
    let fechaInicio = todayStr(), fechaFin = todayStr();
    const titulo = lines.slice(0, hdrIdx).join(" ");
    const mf = titulo.match(/(\d{2}\/\d{2}\/\d{4})\s*[-–]\s*(\d{2}\/\d{2}\/\d{4})/);
    if(mf){
      const [d1,mo1,y1]=mf[1].split("/"); fechaInicio=`${y1}-${mo1}-${d1}`;
      const [d2,mo2,y2]=mf[2].split("/"); fechaFin=`${y2}-${mo2}-${d2}`;
    }
    // Usar la semana del día final del reporte
    const weekKey = isoWeek(fechaFin);

    let imported=0;
    const newReg={};
    const sinMatch=[];

    for(let i=hdrIdx+1; i<lines.length; i++){
      const row   = lines[i].split(/\t/);
      const nombre= row[iNombre]?.trim()||"";
      const m3    = parseFloat((row[iVol]?.trim()||"0").replace(",","."));
      if(!nombre) continue;
      if(isNaN(m3)||m3===0){ sinMatch.push(`${nombre} (m³=0, ignorado)`); continue; }

      if(isSectorReport){
        const rule = OLIVE_SECTOR_MAP.find(r=>r.match.test(nombre));
        if(!rule){ sinMatch.push(nombre); continue; }
        if(!rule.cultId) continue;
        registrarSector(newReg, weekKey, rule.cultId, rule.sectorId, m3, "", "", `OlivePlus: ${nombre}`, fechaInicio, fechaFin);
        imported++;
      } else {
        const rule = OLIVE_EQUIPO_MAP.find(r=>r.match.test(nombre));
        if(!rule||!rule.ids.length){ sinMatch.push(nombre); continue; }
        for(const {cid, tids} of rule.ids){
          const c = CULTIVOS.find(x=>x.id===cid);
          if(!c) continue;
          const turnos = tids.map(tid=>c.turnos.find(t=>t.id===tid)).filter(Boolean);
          const haGrupo = turnos.reduce((a,t)=>a+t.ha,0);
          const haEquipo = rule.ids.reduce((a,{cid:cid2,tids:tids2})=>{
            const c2=CULTIVOS.find(x=>x.id===cid2); if(!c2) return a;
            return a+tids2.reduce((b,tid)=>{const t=c2.turnos.find(x=>x.id===tid);return b+(t?t.ha:0);},0);
          },0);
          const m3Cultivo = m3*(haGrupo/haEquipo);
          if(!newReg[weekKey]) newReg[weekKey]={};
          for(const t of turnos){
            const key=`${cid}__${t.id}`;
            const prev = parseFloat(newReg[weekKey][key]?.m3Real||0);
            newReg[weekKey][key]={ m3Real:(prev+m3Cultivo*(t.ha/haGrupo)).toFixed(1), ec:"", ph:"", notas:`OlivePlus: ${nombre}`, fechaInicio, fechaFin };
          }
          imported++;
        }
      }
    }

    if(imported===0){
      const sugerencia = isSectorReport
        ? "Sectores reconocidos: Linea 2 V1+V2, Linea 2 V3-V6, Linea 1 V1-V3, Linea 3 V1-V2"
        : "Equipos reconocidos: Citricos (MELBACE2V4), Naranjos Valencia (MELBACE4V4), Paltos (MELBACE1)";
      return { ok:false, msg:`No se importó ninguna fila.\n${sugerencia}` };
    }

    setRegSem(p=>{ const m={...p}; for(const[wk,v] of Object.entries(newReg)) m[wk]={...m[wk],...v}; return m; });
    const rango = mf ? `${mf[1]} al ${mf[2]}` : weekLabel(weekKey);
    const tipo = isSectorReport?"sectores (detallado)":"equipos (acumulado)";
    return {
      ok:true,
      msg:`✅ ${imported} ${tipo} importados\nSemana: ${rango} → ${weekLabel(weekKey)}${sinMatch.filter(s=>!s.includes("m³=0")).length?`\nIgnorados: ${sinMatch.filter(s=>!s.includes("m³=0")).join(", ")}`:""}`
    };
  };

  const handleCSVFile = async (file) => {
    if(!file) return;
    setCsvMsg("Leyendo archivo...");
    try{
      // Load SheetJS if needed
      if(!window.XLSX){
        await new Promise((res,rej)=>{
          const s=document.createElement("script");
          s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          s.onload=res; s.onerror=rej; document.head.appendChild(s);
        });
      }
      const buf = await file.arrayBuffer();
      const wb  = window.XLSX.read(buf, {type:"array"});
      const ws  = wb.Sheets[wb.SheetNames[0]];
      // Convert sheet to tab-separated text preserving structure
      const tsv = window.XLSX.utils.sheet_to_csv(ws, {FS:"\t", RS:"\n"});
      const res = parseCSV(tsv);
      setCsvMsg(res.msg);
    } catch(e){
      // Fallback: try reading as text (CSV)
      const reader = new FileReader();
      reader.onload = e => { const res=parseCSV(e.target.result); setCsvMsg(res.msg); };
      reader.onerror = () => setCsvMsg("❌ Error al leer el archivo.");
      reader.readAsText(file, "utf-8");
    }
  };

  const fetchWeather = useCallback(async()=>{
    setLoading(true); setError(null);
    try{
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&elevation=312&daily=et0_fao_evapotranspiration,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_max&timezone=America%2FSantiago&past_days=7&forecast_days=3`);
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
              {l:"ETo hoy",  v:getEto(todayRow).toFixed(2), u:"mm/día", c:"#F2EBD9"},
              {l:"Temp.",    v:`${getTmax(todayRow)?.toFixed(0)}° / ${getTmin(todayRow)?.toFixed(0)}°`, u:"máx/mín",c:"rgba(242,235,217,0.75)"},
              {l:"Viento",   v:todayRow.wind?.toFixed(0), u:"km/h",c:"rgba(242,235,217,0.65)"},
              {l:"Lluvia",   v:getPrecip(todayRow).toFixed(1), u:"mm",c:"#7EB3D3"},
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
        {[["tabla","📅 Climática"],["hoy","☀ Programa del Día"],["resumen","📊 Resumen"],["graficos","📈 Gráficos"],["registro","📋 Registro Real"],["planos","📐 Planos"]].map(([k,l])=>(
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
            {/* Estación FieldClimate */}
            <div style={{margin:"16px 16px 0",borderTop:"1px solid rgba(92,61,40,0.15)"}}/>
            <div style={{padding:"10px 16px 6px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div className="mono" style={{fontSize:9,color:"#9C7A5A",letterSpacing:2.5}}>ESTACIÓN REAL</div>
              <button onClick={()=>setStEdit(p=>!p)}
                style={{fontFamily:"'DM Mono',monospace",fontSize:8,padding:"2px 7px",borderRadius:10,cursor:"pointer",
                  background:stEdit?"#2C1810":"transparent",color:stEdit?"#F2EBD9":"#5C3D28",
                  border:"1px solid rgba(92,61,40,0.3)"}}>
                {stEdit?"✓ cerrar":"✎ ingresar"}
              </button>
            </div>
            <div style={{padding:"0 16px"}}>
              <div className="mono" style={{fontSize:8,color:"#3D6B35",marginBottom:4}}>
                Nueva Purehue [0020F829]
              </div>
              {stEdit && (()=>{
                const hoy=todayStr();
                const fields=[
                  {k:"tmax",  l:"T° Máx", u:"°C",   step:"0.1"},
                  {k:"tmin",  l:"T° Mín", u:"°C",   step:"0.1"},
                  {k:"hr",    l:"HR",     u:"%",    step:"1"},
                  {k:"viento",l:"Viento", u:"km/h", step:"0.1"},
                  {k:"lluvia",l:"Lluvia", u:"mm",   step:"0.1"},
                ];
                return(
                  <div>
                    <div style={{marginBottom:8}}>
                      <div className="mono" style={{fontSize:8,color:"#9C7A5A",marginBottom:3}}>FECHA</div>
                      <input type="date" defaultValue={hoy}
                        id="st-fecha"
                        style={{fontFamily:"'DM Mono',monospace",fontSize:11,background:"rgba(44,24,16,0.04)",
                          border:"1px solid rgba(92,61,40,0.3)",color:"#2C1810",padding:"4px 6px",borderRadius:2,width:"100%"}}/>
                    </div>
                    {fields.map(f=>(
                      <div key={f.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <span className="mono" style={{fontSize:9,color:"#5C3D28"}}>{f.l} <span style={{opacity:0.5}}>{f.u}</span></span>
                        <input type="number" step={f.step} placeholder="—"
                          value={stData[document.getElementById("st-fecha")?.value||hoy]?.[f.k]||""}
                          onChange={e=>{
                            const fecha=document.getElementById("st-fecha")?.value||hoy;
                            setStData(p=>({...p,[fecha]:{...(p[fecha]||{}),[f.k]:e.target.value}}));
                          }}
                          style={{fontFamily:"'DM Mono',monospace",fontSize:11,background:"rgba(44,24,16,0.04)",
                            border:"1px solid rgba(92,61,40,0.3)",color:"#2C1810",padding:"4px 5px",borderRadius:2,width:60,textAlign:"right"}}/>
                      </div>
                    ))}
                    <div className="mono" style={{fontSize:8,color:"#3D6B35",lineHeight:1.6,marginTop:4}}>
                      Con T°máx+mín calcula ETo<br/>Hargreaves desde tu estación.<br/>Con HR+Viento usa FAO PM.
                    </div>
                  </div>
                );
              })()}
              {!stEdit&&(()=>{
                const hoy=todayStr();
                const d=stData[hoy];
                const eto=etoFromStation(hoy);
                if(!d?.tmax) return <div className="mono" style={{fontSize:8,color:"rgba(92,61,40,0.35)",lineHeight:1.6}}>Sin datos hoy.<br/>Haz clic en "ingresar".</div>;
                return(
                  <div>
                    {eto&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span className="mono" style={{fontSize:9,color:"#9C7A5A"}}>ETo estación</span>
                      <span className="mono" style={{fontSize:11,fontWeight:600,color:"#C2622D"}}>{eto} mm</span>
                    </div>}
                    {[["T°",`${d.tmax}°/${d.tmin}°`],["HR",d.hr?d.hr+"%":"—"],["Viento",d.viento?d.viento+" km/h":"—"],["Lluvia",d.lluvia?d.lluvia+" mm":"—"]].map(([l,v])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                        <span className="mono" style={{fontSize:8,color:"#9C7A5A"}}>{l}</span>
                        <span className="mono" style={{fontSize:9,color:"#5C3D28"}}>{v}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
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
                                  <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:getEto(row)>5?"#C2622D":getEto(row)>3?"#B8860B":"#5C3D28",fontWeight:hoy?700:400}}>
                                    {n(getEto(row))}
                                    {hasStation(row.date)&&<span style={{fontSize:7,color:"#3D6B35",marginLeft:3}}>●</span>}
                                  </td>
                                  <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:getPrecip(row)>0?"#4A7FA5":"#B8B0A0"}}>{n(getPrecip(row),1)}</td>
                                  <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:hasStation(row.date)?"#2C1810":"#5C3D28",fontWeight:hasStation(row.date)?600:400}}>{n(getTmax(row),1)}°</td>
                                  <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:hasStation(row.date)?"#4A7FA5":"#9C7A5A",fontWeight:hasStation(row.date)?600:400}}>{n(getTmin(row),1)}°</td>
                                  <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:"#9C7A5A"}}>{n(getWind(row),0)}</td>
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
                      const ep=Math.min(getPrecip(selectedRow)*0.8,getEto(selectedRow));
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
                                {ico:"☀",l:"ETo FAO-PM",v:n(getEto(selectedRow))+" mm",c:"#C2622D",big:true},
                                {ico:"🌡",l:"T° Máx / Mín",v:`${n(getTmax(selectedRow),1)}° / ${n(getTmin(selectedRow),1)}°`,c:"#5C3D28"},
                                {ico:"💧",l:"Precipitación",v:n(getPrecip(selectedRow),1)+" mm",c:getPrecip(selectedRow)>0?"#4A7FA5":"#B8B0A0"},
                                {ico:"🌬",l:"Viento máx.",v:n(getWind(selectedRow),0)+" km/h",c:"#5C3D28"},
                                {ico:"🌫",l:"Humedad máx.",v:n(getHR(selectedRow),0)+"%",c:"#5C3D28"},
                                {ico:"💦",l:"Prec. efectiva",v:ep.toFixed(2)+" mm",c:"#4A7FA5"},
                                {ico:"📉",l:"Déficit hídrico",v:(getEto(selectedRow)-ep).toFixed(2)+" mm",c:"#B8860B"},
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
                              const tR=calcAuto(c,kcs,kcAuto,getEto(selectedRow),getPrecip(selectedRow),selectedRow.date);
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
                                        <div className="mono" style={{fontSize:9,color:"#9C7A5A",marginTop:2}}>{c.cultivo} · {c.area} ha · Kc {kcAuto?kcDeFecha(c.id,selectedRow?.date):kcs[c.id]} · ETc {(getEto(selectedRow)*(kcAuto?kcDeFecha(c.id,selectedRow?.date):kcs[c.id])).toFixed(2)} mm</div>
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
                <div className="serif" style={{fontSize:16,color:"#9C7A5A",fontStyle:"italic",marginBottom:22}}>{fmtFull(todayStr())} · ETo {getEto(todayRow).toFixed(2)} mm/día</div>
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {visibles.map(c=>{
                    const tR=calcAuto(c,kcs,kcAuto,getEto(todayRow),getPrecip(todayRow),todayRow.date);
                    const volTot=tR.reduce((a,t)=>a+t.volTotal,0),horTot=tR.reduce((a,t)=>a+t.horas,0);
                    const ep=Math.min(getPrecip(todayRow)*0.8,getEto(todayRow)*(kcAuto?kcDeFecha(c.id,todayRow.date):kcs[c.id]));
                    return(
                      <div key={c.id} className="card" style={{overflow:"hidden",border:`1px solid ${c.color}33`}}>
                        <div style={{padding:"14px 20px",background:`linear-gradient(135deg,${c.light}66,rgba(255,252,244,0))`,borderBottom:"1px solid rgba(92,61,40,0.1)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
                          <div style={{display:"flex",alignItems:"center",gap:12}}>
                            <div style={{width:4,height:42,background:c.color,borderRadius:2}}/>
                            <div>
                              <div className="fell" style={{fontSize:19,fontWeight:400,color:"#2C1810"}}>{c.emoji} {c.label}</div>
                              <div className="mono" style={{fontSize:9,color:"#9C7A5A",marginTop:3}}>{c.cultivo} · {c.area} ha · Kc {kcAuto?kcDeFecha(c.id,selectedRow?.date):kcs[c.id]} · ETc {(getEto(todayRow)*(kcAuto?kcDeFecha(c.id,todayRow.date):kcs[c.id])).toFixed(2)} mm · Prec.Ef. {ep.toFixed(2)} mm</div>
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
                  const grpVol=cult.reduce((a,c)=>a+calcAuto(c,kcs,kcAuto,getEto(todayRow),getPrecip(todayRow),todayRow.date).reduce((b,t)=>b+t.volTotal,0),0);
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
                          const tR=calcAuto(c,kcs,kcAuto,getEto(todayRow),getPrecip(todayRow),todayRow.date);
                          const vol=tR.reduce((a,t)=>a+t.volTotal,0),hrs=tR.reduce((a,t)=>a+t.horas,0);
                          return(
                            <div key={c.id} className="card" style={{padding:"14px 18px",background:`linear-gradient(135deg,${c.light}55,rgba(255,252,244,0.9))`}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                                <div style={{width:3,height:32,background:c.color,borderRadius:1}}/>
                                <div><div className="fell" style={{fontSize:15,color:"#2C1810"}}>{c.emoji} {c.label}</div>
                                <div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>{c.area} ha · ETc {(getEto(todayRow)*(kcAuto?kcDeFecha(c.id,todayRow.date):kcs[c.id])).toFixed(2)} mm</div></div>
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
                  const allVol=CULTIVOS.reduce((a,c)=>a+calcAuto(c,kcs,kcAuto,getEto(todayRow),getPrecip(todayRow),todayRow.date).reduce((b,t)=>b+t.volTotal,0),0);
                  const cVol=CULTIVOS.filter(c=>c.grupo==="citricos").reduce((a,c)=>a+calcAuto(c,kcs,kcAuto,getEto(todayRow),getPrecip(todayRow),todayRow.date).reduce((b,t)=>b+t.volTotal,0),0);
                  const pVol=CULTIVOS.filter(c=>c.grupo==="paltos").reduce((a,c)=>a+calcAuto(c,kcs,kcAuto,getEto(todayRow),getPrecip(todayRow),todayRow.date).reduce((b,t)=>b+t.volTotal,0),0);
                  return(
                    <div style={{padding:"20px 26px",background:"#2C1810",borderRadius:4,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16}}>
                      <div><div className="mono" style={{fontSize:10,letterSpacing:3,color:"rgba(242,235,217,0.38)",marginBottom:4}}>TOTAL PREDIO HOY</div>
                        <div style={{display:"flex",alignItems:"baseline",gap:6}}><span className="serif" style={{fontWeight:700,fontSize:44,color:"#F2EBD9",lineHeight:1}}>{allVol.toFixed(0)}</span><span className="fell" style={{fontSize:18,color:"rgba(242,235,217,0.5)"}}>m³</span></div>
                        <div className="mono" style={{fontSize:9,color:"rgba(242,235,217,0.24)",marginTop:3}}>{TOTAL_HA.toFixed(2)} ha · ETo {getEto(todayRow).toFixed(2)} mm</div></div>
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

            {/* ──── GRÁFICOS ──── */}
            {tab==="graficos"&&(()=>{
              const past = wRows.filter(r=>!isFuture(r.date));
              const all  = wRows;
              const cultF = chartCult==="todos" ? CULTIVOS : CULTIVOS.filter(c=>c.id===chartCult);

              // ── Helpers SVG ──────────────────────────────────────
              const W=900, BAR_H=320, LINE_H=240, KC_H=200;
              const PAD={t:30,r:24,b:48,l:56};
              const innerW = W - PAD.l - PAD.r;

              const scale = (val,min,max,h) => h - PAD.t - PAD.b - ((val-min)/(max-min||1))*(h-PAD.t-PAD.b);
              const barX  = (i,n,w) => PAD.l + i*(w/n);
              const barW  = (n,w,gap=0.28) => (w/n)*(1-gap);

              const GridLines = ({yVals, h, fmt=v=>v, color="rgba(92,61,40,0.12)"})=>(
                <>
                  {yVals.map(v=>{
                    const y=PAD.t+(h-PAD.t-PAD.b)*(1-(v-yVals[0])/(yVals[yVals.length-1]-yVals[0]||1));
                    return(
                      <g key={v}>
                        <line x1={PAD.l} x2={W-PAD.r} y1={y} y2={y} stroke={color} strokeWidth={1} strokeDasharray="4,4"/>
                        <text x={PAD.l-6} y={y+4} textAnchor="end" fontSize={9} fill="#9C7A5A" fontFamily="'DM Mono',monospace">{fmt(v)}</text>
                      </g>
                    );
                  })}
                </>
              );

              const XLabels = ({rows, h}) => rows.map((r,i)=>{
                const x = PAD.l + (i+0.5)*(innerW/rows.length);
                const hoy=isToday(r.date), fut=isFuture(r.date);
                return(
                  <g key={r.date}>
                    {hoy&&<rect x={PAD.l+i*(innerW/rows.length)} width={innerW/rows.length} y={PAD.t} height={h-PAD.t-PAD.b} fill="rgba(184,134,11,0.04)"/>}
                    {fut&&<rect x={PAD.l+i*(innerW/rows.length)} width={innerW/rows.length} y={PAD.t} height={h-PAD.t-PAD.b} fill="rgba(74,127,165,0.04)"/>}
                    <text x={x} y={h-PAD.b+16} textAnchor="middle" fontSize={9} fill={hoy?"#C2622D":fut?"#4A7FA5":"#9C7A5A"} fontFamily="'DM Mono',monospace">
                      {fmtShort(r.date).split(",")[0]}
                    </text>
                    {hoy&&<text x={x} y={h-PAD.b+26} textAnchor="middle" fontSize={8} fill="#C2622D" fontFamily="'DM Mono',monospace">HOY</text>}
                  </g>
                );
              });

              // ── CHART 1: ETo + ETc por cultivo + Lluvia ──────────
              const chart1Data = all.map(r=>{
                const cultEtc = cultF.reduce((a,c)=>{
                  const kc=kcAuto?kcDeFecha(c.id,r.date):kcs[c.id];
                  return Math.max(a, r.eto*kc);
                },0);
                return {...r, maxEtc:cultEtc};
              });
              const eto_max = Math.ceil(Math.max(...all.map(r=>r.eto),0.1)*1.3*10)/10;
              const etoTicks = [0,1,2,3,4,5,6].filter(v=>v<=eto_max+1);

              // ── CHART 2: Volumen calculado vs real (solo pasados) ──
              const chart2Data = past.map(r=>{
                const calc_ = cultF.reduce((a,c)=>a+calcAuto(c,kcs,kcAuto,r.eto,r.precip,r.date).reduce((b,t)=>b+t.volTotal,0),0);
                const real_ = cultF.reduce((a,c)=>a+c.turnos.reduce((b,t)=>{
                  const v=parseFloat(getReg(r.date,c.id,t.id,"m3Real")||"");
                  return b+(isNaN(v)?0:v);
                },0),0);
                return {...r, calc:calc_, real:real_, hasReal:real_>0};
              });
              const vol_max = Math.ceil(Math.max(...chart2Data.map(r=>Math.max(r.calc,r.real)),10)*1.15/100)*100;
              const volTicks = [0,vol_max*0.25,vol_max*0.5,vol_max*0.75,vol_max].map(v=>Math.round(v));

              // ── CHART 3: Déficit acumulado ─────────────────────────
              let acumCalc=0,acumReal=0;
              const chart3Data = past.map(r=>{
                const calc_=cultF.reduce((a,c)=>a+calcAuto(c,kcs,kcAuto,r.eto,r.precip,r.date).reduce((b,t)=>b+t.volTotal,0),0);
                const real_=cultF.reduce((a,c)=>a+c.turnos.reduce((b,t)=>{const v=parseFloat(getReg(r.date,c.id,t.id,"m3Real")||"");return b+(isNaN(v)?0:v);},0),0);
                acumCalc+=calc_; acumReal+=real_;
                return {...r, acumCalc, acumReal, deficit:acumCalc-acumReal};
              });
              const hasRealData = chart3Data.some(r=>r.acumReal>0);
              const acum_max = Math.max(...chart3Data.map(r=>Math.max(r.acumCalc,r.acumReal)),100);
              const acumTicks = [0,Math.round(acum_max*0.33),Math.round(acum_max*0.66),Math.round(acum_max)];

              // ── CHART 4: Kc anual ─────────────────────────────────
              const meses=["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
              const mesActual=new Date().getMonth();
              const kcLines = cultF.map(c=>({
                c,
                pts: meses.map((_,m)=>KC_MENSUAL[c.id]?.[m]??0.80),
              }));
              const kc_min=0.55, kc_max=1.05;

              // ── SVG path builder ──────────────────────────────────
              const linePath = (pts, w, h, minV, maxV) => pts.map((v,i)=>{
                const x=PAD.l+i*(innerW/(pts.length-1));
                const y=PAD.t+(h-PAD.t-PAD.b)*(1-(v-minV)/(maxV-minV||1));
                return `${i===0?"M":"L"}${x},${y}`;
              }).join(" ");

              const areaPath = (pts, w, h, minV, maxV) => {
                const line=pts.map((v,i)=>{
                  const x=PAD.l+i*(innerW/(pts.length-1));
                  const y=PAD.t+(h-PAD.t-PAD.b)*(1-(v-minV)/(maxV-minV||1));
                  return `${i===0?"M":"L"}${x},${y}`;
                }).join(" ");
                const baseY=PAD.t+(h-PAD.t-PAD.b);
                const x0=PAD.l, xN=PAD.l+innerW;
                return `${line} L${xN},${baseY} L${x0},${baseY} Z`;
              };

              const ChartCard = ({title,sub,children,h})=>(
                <div className="card" style={{padding:"0 0 8px",overflow:"hidden",marginBottom:20}}>
                  <div style={{padding:"14px 20px 10px",borderBottom:"1px solid rgba(92,61,40,0.1)"}}>
                    <div className="fell" style={{fontSize:18,fontWeight:400,color:"#2C1810"}}>{title}</div>
                    {sub&&<div className="mono" style={{fontSize:9,color:"#9C7A5A",marginTop:2,letterSpacing:0.5}}>{sub}</div>}
                  </div>
                  <div style={{overflowX:"auto",padding:"10px 0 0"}}>
                    <svg width="100%" viewBox={`0 0 ${W} ${h}`} style={{display:"block",maxWidth:"100%"}} preserveAspectRatio="xMidYMid meet">
                      {children}
                    </svg>
                  </div>
                </div>
              );

              return(
                <div className="fade">
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10}}>
                    <div>
                      <h2 className="fell" style={{fontSize:24,fontWeight:400,marginBottom:2}}>Gráficos del Predio</h2>
                      <div className="serif" style={{fontSize:13,color:"#9C7A5A",fontStyle:"italic"}}>Clima · Riego calculado · Riego real · Fenología</div>
                    </div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      <button className={`gbtn ${chartCult==="todos"?"on":""}`} onClick={()=>setChartCult("todos")}>Todo el predio</button>
                      {CULTIVOS.map(c=>(
                        <button key={c.id} className={`gbtn ${chartCult===c.id?"on":""}`}
                          style={{borderColor:chartCult===c.id?"transparent":c.color+"55",color:chartCult===c.id?"#F2EBD9":c.color}}
                          onClick={()=>setChartCult(c.id)}>
                          {c.emoji} {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── CHART 1: ETo + ETc + Lluvia ── */}
                  <ChartCard
                    title="Evapotranspiración y Lluvia"
                    sub={`ETo DIARIA (barras) · ETc POR CULTIVO (líneas) · PRECIPITACIÓN (barras azules) · ${all.length} días`}
                    h={BAR_H}>
                    <GridLines yVals={etoTicks} h={BAR_H} fmt={v=>v+"mm"}/>
                    <XLabels rows={all} h={BAR_H}/>
                    {/* Axis */}
                    <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={BAR_H-PAD.b} stroke="rgba(92,61,40,0.25)" strokeWidth={1}/>
                    <line x1={PAD.l} x2={W-PAD.r} y1={BAR_H-PAD.b} y2={BAR_H-PAD.b} stroke="rgba(92,61,40,0.25)" strokeWidth={1}/>
                    {/* ETo bars */}
                    {all.map((r,i)=>{
                      const bw=barW(all.length,innerW,0.35);
                      const x=barX(i,all.length,innerW)+PAD.l;
                      const h_=((r.eto/eto_max))*(BAR_H-PAD.t-PAD.b);
                      const y=BAR_H-PAD.b-h_;
                      const hoy=isToday(r.date);
                      return<rect key={r.date} x={x} y={y} width={bw} height={h_}
                        fill={hoy?"#C2622D":"rgba(194,98,45,0.45)"} rx={2}/>;
                    })}
                    {/* Lluvia bars (overlay, blue) */}
                    {all.filter(r=>r.precip>0).map((r,_)=>{
                      const i=all.indexOf(r);
                      const bw=barW(all.length,innerW,0.35);
                      const x=barX(i,all.length,innerW)+PAD.l;
                      const h_=((r.precip/eto_max))*(BAR_H-PAD.t-PAD.b);
                      const y=BAR_H-PAD.b-h_;
                      return<rect key={"p"+r.date} x={x} y={y} width={bw} height={h_}
                        fill="rgba(74,127,165,0.55)" rx={2} opacity={0.8}/>;
                    })}
                    {/* ETc lines per cultivo */}
                    {cultF.map(c=>{
                      const pts=all.map(r=>r.eto*(kcAuto?kcDeFecha(c.id,r.date):kcs[c.id]));
                      const bw=barW(all.length,innerW,0.35);
                      const path=pts.map((v,i)=>{
                        const x=barX(i,all.length,innerW)+PAD.l+bw/2;
                        const y=BAR_H-PAD.b-((v/eto_max))*(BAR_H-PAD.t-PAD.b);
                        return`${i===0?"M":"L"}${x},${y}`;
                      }).join(" ");
                      return(
                        <g key={c.id}>
                          <path d={path} fill="none" stroke={c.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.9}/>
                          {pts.map((v,i)=>{
                            const x=barX(i,all.length,innerW)+PAD.l+bw/2;
                            const y=BAR_H-PAD.b-((v/eto_max))*(BAR_H-PAD.t-PAD.b);
                            return<circle key={i} cx={x} cy={y} r={3} fill={c.color} opacity={0.9}/>;
                          })}
                        </g>
                      );
                    })}
                    {/* ETo value labels on bars */}
                    {all.map((r,i)=>{
                      const bw=barW(all.length,innerW,0.35);
                      const x=barX(i,all.length,innerW)+PAD.l+bw/2;
                      const h_=((r.eto/eto_max))*(BAR_H-PAD.t-PAD.b);
                      const y=BAR_H-PAD.b-h_-5;
                      return<text key={r.date} x={x} y={y} textAnchor="middle" fontSize={8.5}
                        fill={isToday(r.date)?"#C2622D":"rgba(92,61,40,0.7)"} fontFamily="'DM Mono',monospace"
                        fontWeight={isToday(r.date)?700:400}>{r.eto.toFixed(1)}</text>;
                    })}
                    {/* Legend */}
                    {[{c:"rgba(194,98,45,0.7)",l:"ETo"},{c:"rgba(74,127,165,0.6)",l:"Lluvia"},...cultF.map(c=>({c:c.color,l:`ETc ${c.label.split(" ")[0]}`,line:true}))].map((leg,i)=>(
                      <g key={i} transform={`translate(${PAD.l+i*100},${PAD.t-10})`}>
                        {leg.line
                          ? <line x1={0} y1={5} x2={16} y2={5} stroke={leg.c} strokeWidth={2.5}/>
                          : <rect x={0} y={0} width={12} height={10} fill={leg.c} rx={1}/>}
                        <text x={leg.line?20:15} y={10} fontSize={8.5} fill="#5C3D28" fontFamily="'DM Mono',monospace">{leg.l}</text>
                      </g>
                    ))}
                  </ChartCard>

                  {/* ── CHART 2: m³ calculado vs real ── */}
                  <ChartCard
                    title="Riego Calculado vs Real Aplicado"
                    sub={hasRealData?"CALCULADO FAO (barras claras) · REAL OLIVEPLUS (barras sólidas) · datos históricos":"Sin datos reales aún — importa desde OlivePlus en la pestaña Registro Real"}
                    h={BAR_H}>
                    <GridLines yVals={volTicks} h={BAR_H} fmt={v=>v+"m³"}/>
                    <XLabels rows={past} h={BAR_H}/>
                    <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={BAR_H-PAD.b} stroke="rgba(92,61,40,0.25)" strokeWidth={1}/>
                    <line x1={PAD.l} x2={W-PAD.r} y1={BAR_H-PAD.b} y2={BAR_H-PAD.b} stroke="rgba(92,61,40,0.25)" strokeWidth={1}/>
                    {chart2Data.map((r,i)=>{
                      const totalBw=innerW/past.length*0.8;
                      const xBase=PAD.l+i*(innerW/past.length)+(innerW/past.length)*0.1;
                      const barPair=totalBw/2-1;
                      const hCalc=((r.calc/vol_max||0))*(BAR_H-PAD.t-PAD.b);
                      const hReal=r.hasReal?((r.real/vol_max||0))*(BAR_H-PAD.t-PAD.b):0;
                      const hoy=isToday(r.date);
                      const pct=r.hasReal&&r.calc>0?(r.real/r.calc*100):null;
                      return(
                        <g key={r.date}>
                          {/* Calc bar */}
                          <rect x={xBase} y={BAR_H-PAD.b-hCalc} width={barPair} height={hCalc}
                            fill={hoy?"rgba(184,134,11,0.5)":"rgba(184,134,11,0.25)"} rx={2}
                            stroke="#B8860B" strokeWidth={0.5}/>
                          {/* Real bar */}
                          {r.hasReal&&<rect x={xBase+barPair+2} y={BAR_H-PAD.b-hReal} width={barPair} height={hReal}
                            fill={pct>=85?"#3D6B35":pct>=70?"#B8860B":"#8B0000"} rx={2} opacity={0.85}/>}
                          {/* % label */}
                          {pct!=null&&<text x={xBase+barPair+1} y={BAR_H-PAD.b-Math.max(hCalc,hReal)-5}
                            textAnchor="middle" fontSize={8} fill={pct>=85?"#3D6B35":pct>=70?"#B8860B":"#8B0000"}
                            fontFamily="'DM Mono',monospace" fontWeight={600}>{pct.toFixed(0)}%</text>}
                          {/* Calc value */}
                          <text x={xBase+barPair/2} y={BAR_H-PAD.b-hCalc-5} textAnchor="middle" fontSize={7.5}
                            fill="rgba(184,134,11,0.7)" fontFamily="'DM Mono',monospace">{r.calc.toFixed(0)}</text>
                        </g>
                      );
                    })}
                    <g transform={`translate(${PAD.l},${PAD.t-10})`}>
                      <rect x={0} y={0} width={12} height={10} fill="rgba(184,134,11,0.4)" stroke="#B8860B" strokeWidth={0.5} rx={1}/>
                      <text x={16} y={9} fontSize={8.5} fill="#5C3D28" fontFamily="'DM Mono',monospace">Calculado (m³)</text>
                      <rect x={120} y={0} width={12} height={10} fill="#3D6B35" rx={1}/>
                      <text x={136} y={9} fontSize={8.5} fill="#5C3D28" fontFamily="'DM Mono',monospace">Real OlivePlus (m³)</text>
                      <text x={280} y={9} fontSize={8.5} fill="#9C7A5A" fontFamily="'DM Mono',monospace">% = eficiencia de riego</text>
                    </g>
                  </ChartCard>

                  {/* ── CHART 3: Acumulados + Déficit ── */}
                  {hasRealData&&(
                    <ChartCard
                      title="Acumulados: Calculado vs Real"
                      sub="ÁREA NARANJA = riego calculado acumulado · ÁREA VERDE = real aplicado · BRECHA = déficit hídrico acumulado"
                      h={LINE_H+40}>
                      <GridLines yVals={acumTicks} h={LINE_H+40} fmt={v=>v+"m³"}/>
                      <XLabels rows={past} h={LINE_H+40}/>
                      <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={LINE_H+40-PAD.b} stroke="rgba(92,61,40,0.25)" strokeWidth={1}/>
                      <line x1={PAD.l} x2={W-PAD.r} y1={LINE_H+40-PAD.b} y2={LINE_H+40-PAD.b} stroke="rgba(92,61,40,0.25)" strokeWidth={1}/>
                      {/* Calc area */}
                      {chart3Data.length>1&&(
                        <path d={areaPath(chart3Data.map(r=>r.acumCalc), W, LINE_H+40, 0, acum_max)}
                          fill="rgba(184,134,11,0.15)" stroke="#B8860B" strokeWidth={2}/>
                      )}
                      {/* Real area */}
                      {chart3Data.length>1&&(
                        <path d={areaPath(chart3Data.map(r=>r.acumReal), W, LINE_H+40, 0, acum_max)}
                          fill="rgba(61,107,53,0.25)" stroke="#3D6B35" strokeWidth={2.5}/>
                      )}
                      {/* Deficit fill */}
                      {chart3Data.length>1&&(()=>{
                        const topPts=chart3Data.map((r,i)=>{
                          const x=PAD.l+i*(innerW/(chart3Data.length-1));
                          const y=PAD.t+(LINE_H+40-PAD.t-PAD.b)*(1-(r.acumCalc/acum_max||0));
                          return`${i===0?"M":"L"}${x},${y}`;
                        }).join(" ");
                        const botPts=chart3Data.map((r,i)=>{
                          const x=PAD.l+i*(innerW/(chart3Data.length-1));
                          const y=PAD.t+(LINE_H+40-PAD.t-PAD.b)*(1-(r.acumReal/acum_max||0));
                          return`L${x},${y}`;
                        }).reverse().join(" ");
                        return<path d={`${topPts} ${botPts} Z`} fill="rgba(139,0,0,0.08)"/>;
                      })()}
                      {/* Last point labels */}
                      {chart3Data.length>0&&(()=>{
                        const last=chart3Data[chart3Data.length-1];
                        const xi=PAD.l+innerW;
                        const yCalc=PAD.t+(LINE_H+40-PAD.t-PAD.b)*(1-(last.acumCalc/acum_max||0));
                        const yReal=PAD.t+(LINE_H+40-PAD.t-PAD.b)*(1-(last.acumReal/acum_max||0));
                        return(
                          <g>
                            <text x={xi-4} y={yCalc-6} textAnchor="end" fontSize={9} fill="#B8860B" fontFamily="'DM Mono',monospace" fontWeight={600}>{last.acumCalc.toFixed(0)} m³</text>
                            <text x={xi-4} y={yReal+14} textAnchor="end" fontSize={9} fill="#3D6B35" fontFamily="'DM Mono',monospace" fontWeight={600}>{last.acumReal.toFixed(0)} m³</text>
                            <text x={xi-4} y={(yCalc+yReal)/2+4} textAnchor="end" fontSize={9} fill="#8B0000" fontFamily="'DM Mono',monospace">Déficit: {last.deficit.toFixed(0)} m³</text>
                          </g>
                        );
                      })()}
                      <g transform={`translate(${PAD.l},${PAD.t-10})`}>
                        <rect x={0} y={0} width={12} height={8} fill="rgba(184,134,11,0.4)" rx={1}/>
                        <text x={16} y={8} fontSize={8.5} fill="#5C3D28" fontFamily="'DM Mono',monospace">Calculado acumulado</text>
                        <rect x={160} y={0} width={12} height={8} fill="rgba(61,107,53,0.5)" rx={1}/>
                        <text x={176} y={8} fontSize={8.5} fill="#5C3D28" fontFamily="'DM Mono',monospace">Real acumulado</text>
                        <rect x={290} y={0} width={12} height={8} fill="rgba(139,0,0,0.15)" rx={1}/>
                        <text x={306} y={8} fontSize={8.5} fill="#8B0000" fontFamily="'DM Mono',monospace">Déficit acumulado</text>
                      </g>
                    </ChartCard>
                  )}

                  {/* ── CHART 4: Kc anual fenológico ── */}
                  <ChartCard
                    title="Curva Kc Fenológico Anual · Hijuelas 32°S"
                    sub="Coeficiente de cultivo mensual · FAO-56 + INIA Chile · el punto rojo indica el mes actual"
                    h={KC_H+60}>
                    <GridLines yVals={[0.6,0.7,0.8,0.9,1.0]} h={KC_H+60} fmt={v=>v.toFixed(1)}/>
                    {/* Month labels */}
                    {meses.map((m,i)=>{
                      const x=PAD.l+i*(innerW/11);
                      const isNow=i===mesActual;
                      return(
                        <g key={m}>
                          {isNow&&<rect x={x-innerW/22} width={innerW/11} y={PAD.t} height={KC_H+60-PAD.t-PAD.b} fill="rgba(194,98,45,0.08)"/>}
                          <text x={x} y={KC_H+60-PAD.b+14} textAnchor="middle" fontSize={9}
                            fill={isNow?"#C2622D":"#9C7A5A"} fontFamily="'DM Mono',monospace"
                            fontWeight={isNow?700:400}>{m}</text>
                        </g>
                      );
                    })}
                    <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={KC_H+60-PAD.b} stroke="rgba(92,61,40,0.2)" strokeWidth={1}/>
                    <line x1={PAD.l} x2={W-PAD.r} y1={KC_H+60-PAD.b} y2={KC_H+60-PAD.b} stroke="rgba(92,61,40,0.2)" strokeWidth={1}/>
                    {/* Kc lines per cultivo */}
                    {cultF.map(c=>{
                      const pts=KC_MENSUAL[c.id]||[];
                      if(!pts.length) return null;
                      const path=pts.map((v,i)=>{
                        const x=PAD.l+i*(innerW/11);
                        const y=PAD.t+(KC_H+60-PAD.t-PAD.b)*(1-(v-kc_min)/(kc_max-kc_min));
                        return`${i===0?"M":"L"}${x},${y}`;
                      }).join(" ");
                      return(
                        <g key={c.id}>
                          <path d={path} fill="none" stroke={c.color} strokeWidth={2.5} strokeLinejoin="round" opacity={0.9}/>
                          {pts.map((v,i)=>{
                            const x=PAD.l+i*(innerW/11);
                            const y=PAD.t+(KC_H+60-PAD.t-PAD.b)*(1-(v-kc_min)/(kc_max-kc_min));
                            const isNow=i===mesActual;
                            return(
                              <g key={i}>
                                <circle cx={x} cy={y} r={isNow?6:3} fill={isNow?"#C2622D":c.color} opacity={0.9}/>
                                {isNow&&<text x={x} y={y-10} textAnchor="middle" fontSize={9}
                                  fill="#C2622D" fontFamily="'DM Mono',monospace" fontWeight={700}>{v.toFixed(2)}</text>}
                              </g>
                            );
                          })}
                          {/* End label */}
                          <text x={PAD.l+11*(innerW/11)+4} y={PAD.t+(KC_H+60-PAD.t-PAD.b)*(1-(pts[11]-kc_min)/(kc_max-kc_min))+4}
                            fontSize={8.5} fill={c.color} fontFamily="'Cormorant Garamond',serif" fontWeight={600}>
                            {c.emoji}
                          </text>
                        </g>
                      );
                    })}
                    {/* Fenología label for current month */}
                    {cultF.slice(0,1).map(c=>(
                      <text key={c.id} x={W/2} y={PAD.t-8} textAnchor="middle" fontSize={9}
                        fill="#C2622D" fontFamily="'Cormorant Garamond',serif" fontStyle="italic">
                        {meses[mesActual]} · {fenoDeFecha(c.id)}
                      </text>
                    ))}
                  </ChartCard>
                </div>
              );
            })()}

            {/* ──── REGISTRO REAL (SEMANAL) ──── */}
            {tab==="registro"&&(()=>{
              const allWeeks = getWeeks(wRows.filter(r=>!isFuture(r.date)));
              const cultF = visibles;

              // Calcular totales semanales calculados
              const weekCalc = (wk, cultivos) => {
                const days = wRows.filter(r=>isoWeek(r.date)===wk&&!isFuture(r.date));
                return cultivos.reduce((a,c)=>
                  a+days.reduce((b,r)=>
                    b+calcAuto(c,kcs,kcAuto,getEto(r),getPrecip(r),r.date).reduce((bb,t)=>bb+t.volTotal,0)
                  ,0)
                ,0);
              };
              const weekReal = (wk, cultivos) =>
                cultivos.reduce((a,c)=>
                  a+c.turnos.reduce((b,t)=>
                    b+(parseFloat(getRegW(wk,c.id,t.id,"m3Real")||0)||0)
                  ,0)
                ,0);
              const weekETo = (wk) => weekSum(wRows, wk, "eto");
              const weekPrecip = (wk) => weekSum(wRows, wk, "precip");

              // Acumulados globales
              let totCalc=0,totReal=0;
              allWeeks.forEach(wk=>{
                const c=weekCalc(wk,cultF), r=weekReal(wk,cultF);
                totCalc+=c; if(r>0) totReal+=r;
              });
              const eficGlobal = totCalc>0?(totReal/totCalc*100):null;
              const hasAnyReal = allWeeks.some(wk=>weekReal(wk,cultF)>0);

              return(
                <div className="fade">
                  {/* Header */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12}}>
                    <div>
                      <h2 className="fell" style={{fontSize:24,fontWeight:400,marginBottom:2}}>Registro de Riego Semanal</h2>
                      <div className="serif" style={{fontSize:14,color:"#9C7A5A",fontStyle:"italic"}}>
                        Acumulado semanal · Calculado FAO vs Real OlivePlus · El riego puede distribuirse cualquier día de la semana
                      </div>
                    </div>
                    <button onClick={()=>{if(window.confirm("¿Borrar todo el registro semanal?"))setRegSem({});}}
                      style={{fontFamily:"'DM Mono',monospace",fontSize:10,background:"transparent",border:"1px solid rgba(139,0,0,0.3)",color:"#8B0000",padding:"5px 12px",borderRadius:2,cursor:"pointer"}}>
                      🗑 Borrar todo
                    </button>
                  </div>

                  <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:20}}>

                    {/* ── LEFT: Import + Manual entry ── */}
                    <div style={{display:"flex",flexDirection:"column",gap:14}}>

                      {/* Import OlivePlus */}
                      <div className="card" style={{padding:"18px 20px"}}>
                        <div className="mono" style={{fontSize:9,letterSpacing:2.5,color:"#9C7A5A",marginBottom:10}}>IMPORTAR DESDE OLIVEPLUS</div>
                        <div
                          onDragOver={e=>{e.preventDefault();setCsvDrag(true);}}
                          onDragLeave={()=>setCsvDrag(false)}
                          onDrop={e=>{e.preventDefault();setCsvDrag(false);const f=e.dataTransfer.files[0];if(f)handleCSVFile(f);}}
                          style={{border:`2px dashed ${csvDrag?"#4A7FA5":"rgba(92,61,40,0.25)"}`,borderRadius:4,padding:"18px 16px",textAlign:"center",
                            background:csvDrag?"rgba(74,127,165,0.06)":"rgba(232,220,191,0.2)",transition:"all 0.15s",cursor:"pointer"}}
                          onClick={()=>document.getElementById("csv-input2").click()}>
                          <div style={{fontSize:24,marginBottom:6}}>📂</div>
                          <div className="serif" style={{fontSize:15,color:"#5C3D28",marginBottom:3}}>Arrastra el Excel de OlivePlus aquí</div>
                          <div className="mono" style={{fontSize:9,color:"#9C7A5A"}}>
                            "Riego acumulado por equipo" · "Reporte por sectores"<br/>
                            El sistema detecta el período automáticamente
                          </div>
                          <input id="csv-input2" type="file" accept=".xlsx,.csv,.tsv,.txt" style={{display:"none"}}
                            onChange={e=>handleCSVFile(e.target.files[0])}/>
                        </div>
                        {csvMsg&&(
                          <div className="mono" style={{marginTop:10,fontSize:10,padding:"8px 12px",borderRadius:3,whiteSpace:"pre-line",lineHeight:1.6,
                            background:csvMsg.startsWith("✅")?"rgba(61,107,53,0.08)":"rgba(139,0,0,0.06)",
                            color:csvMsg.startsWith("✅")?"#3D6B35":"#8B0000",
                            border:`1px solid ${csvMsg.startsWith("✅")?"rgba(61,107,53,0.25)":"rgba(139,0,0,0.2)"}`}}>
                            {csvMsg}
                          </div>
                        )}
                        <div className="mono" style={{marginTop:10,fontSize:8,color:"#9C7A5A",lineHeight:1.9}}>
                          <span style={{color:"#3D6B35",fontWeight:500}}>✓ Equipos reconocidos:</span><br/>
                          <span style={{color:"#5C3D28"}}>Citricos (MELBACE2V4)</span> → Lanelate + Paltos N3<br/>
                          <span style={{color:"#5C3D28"}}>Naranjos Valencia (MELBACE4V4)</span> → Valencia OP1+OP2<br/>
                          <span style={{color:"#5C3D28"}}>Paltos (MELBACE1)</span> → Paltos Viejos + Nuevos 1+2<br/>
                          <span style={{color:"#5C3D28"}}>Linea 2 V3–V6, Linea 1 V1–V3, Linea 3 V1–V2</span> → sector exacto
                        </div>
                      </div>

                      {/* Manual entry semanal */}
                      <div className="card" style={{padding:"18px 20px"}}>
                        <div className="mono" style={{fontSize:9,letterSpacing:2.5,color:"#9C7A5A",marginBottom:12}}>INGRESO MANUAL SEMANAL</div>
                        <div style={{marginBottom:12}}>
                          <div className="mono" style={{fontSize:8,color:"#9C7A5A",marginBottom:4}}>SEMANA</div>
                          <select value={regWeekSel} onChange={e=>setRegWeekSel(e.target.value)}
                            style={{fontFamily:"'Cormorant Garamond',serif",fontSize:13,background:"rgba(44,24,16,0.04)",
                              border:"1px solid rgba(92,61,40,0.3)",color:"#2C1810",padding:"6px 10px",borderRadius:2,width:"100%"}}>
                            {allWeeks.length===0&&<option value={isoWeek(todayStr())}>{weekLabel(isoWeek(todayStr()))}</option>}
                            {allWeeks.map(wk=><option key={wk} value={wk}>{weekLabel(wk)}</option>)}
                            {!allWeeks.includes(isoWeek(todayStr()))&&
                              <option value={isoWeek(todayStr())}>{weekLabel(isoWeek(todayStr()))} (semana actual)</option>}
                          </select>
                        </div>
                        <div style={{marginBottom:12}}>
                          <div className="mono" style={{fontSize:8,color:"#9C7A5A",marginBottom:4}}>CULTIVO</div>
                          <select value={regCultId} onChange={e=>setRegCultId(e.target.value)}
                            style={{fontFamily:"'Cormorant Garamond',serif",fontSize:14,background:"rgba(44,24,16,0.04)",
                              border:"1px solid rgba(92,61,40,0.3)",color:"#2C1810",padding:"6px 10px",borderRadius:2,width:"100%"}}>
                            {CULTIVOS.map(c=><option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
                          </select>
                        </div>
                        {(()=>{
                          const c=CULTIVOS.find(x=>x.id===regCultId);
                          const calcDays=wRows.filter(r=>isoWeek(r.date)===regWeekSel&&!isFuture(r.date));
                          return c.turnos.map(t=>{
                            const calcV=calcDays.reduce((a,r)=>a+calcAuto(c,kcs,kcAuto,getEto(r),getPrecip(r),r.date).find(x=>x.id===t.id)?.volTotal||0,0);
                            const realVal=getRegW(regWeekSel,c.id,t.id,"m3Real");
                            const diff=realVal!==""?(parseFloat(realVal)-calcV):null;
                            return(
                              <div key={t.id} style={{marginBottom:12,paddingBottom:10,borderBottom:"1px solid rgba(92,61,40,0.08)"}}>
                                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                                  <span className="serif" style={{fontSize:14,fontWeight:600,color:c.color}}>{t.label}</span>
                                  <span className="mono" style={{fontSize:9,color:"#9C7A5A"}}>calc. <strong>{calcV.toFixed(0)} m³</strong> semana</span>
                                </div>
                                <div style={{display:"grid",gridTemplateColumns:"1fr 70px 70px",gap:6}}>
                                  <div>
                                    <div className="mono" style={{fontSize:8,color:"#9C7A5A",marginBottom:3}}>M³ REALES SEMANA</div>
                                    <div style={{position:"relative"}}>
                                      <input type="number" step="1" min="0" placeholder="0"
                                        value={realVal}
                                        onChange={e=>setRegW(regWeekSel,c.id,t.id,"m3Real",e.target.value)}
                                        style={{fontFamily:"'DM Mono',monospace",fontSize:13,background:"rgba(44,24,16,0.04)",
                                          border:"1px solid rgba(92,61,40,0.3)",color:"#2C1810",padding:"5px 8px",borderRadius:2,width:"100%"}}/>
                                      {diff!=null&&<span className="mono" style={{position:"absolute",right:6,top:"50%",transform:"translateY(-50%)",
                                        fontSize:9,color:diff<-30?"#8B0000":diff>30?"#3D6B35":"#B8860B",fontWeight:600}}>
                                        {diff>0?"+":""}{diff.toFixed(0)}
                                      </span>}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="mono" style={{fontSize:8,color:"#9C7A5A",marginBottom:3}}>EC prom</div>
                                    <input type="number" step="0.1" placeholder="—"
                                      value={getRegW(regWeekSel,c.id,t.id,"ec")}
                                      onChange={e=>setRegW(regWeekSel,c.id,t.id,"ec",e.target.value)}
                                      style={{fontFamily:"'DM Mono',monospace",fontSize:12,background:"rgba(44,24,16,0.04)",
                                        border:"1px solid rgba(92,61,40,0.3)",color:"#2C1810",padding:"4px 5px",borderRadius:2,width:"100%"}}/>
                                  </div>
                                  <div>
                                    <div className="mono" style={{fontSize:8,color:"#9C7A5A",marginBottom:3}}>pH prom</div>
                                    <input type="number" step="0.1" placeholder="—"
                                      value={getRegW(regWeekSel,c.id,t.id,"ph")}
                                      onChange={e=>setRegW(regWeekSel,c.id,t.id,"ph",e.target.value)}
                                      style={{fontFamily:"'DM Mono',monospace",fontSize:12,background:"rgba(44,24,16,0.04)",
                                        border:"1px solid rgba(92,61,40,0.3)",color:"#2C1810",padding:"4px 5px",borderRadius:2,width:"100%"}}/>
                                  </div>
                                </div>
                                <input type="text" placeholder="Notas: fertilizante, incidencias..."
                                  value={getRegW(regWeekSel,c.id,t.id,"notas")}
                                  onChange={e=>setRegW(regWeekSel,c.id,t.id,"notas",e.target.value)}
                                  style={{fontFamily:"'Cormorant Garamond',serif",fontSize:12,background:"rgba(44,24,16,0.04)",
                                    border:"1px solid rgba(92,61,40,0.08)",color:"#5C3D28",padding:"4px 8px",borderRadius:2,width:"100%",marginTop:5}}/>
                              </div>
                            );
                          });
                        })()}
                        <div className="serif" style={{fontSize:12,color:"#9C7A5A",fontStyle:"italic",marginTop:4}}>
                          Los m³ son el total de la semana independiente de qué días se regó.
                        </div>
                      </div>
                    </div>

                    {/* ── RIGHT: Weekly comparison table ── */}
                    <div>
                      <div className="mono" style={{fontSize:9,letterSpacing:2.5,color:"#9C7A5A",marginBottom:10}}>COMPARATIVO SEMANAL · CALCULADO VS REAL</div>

                      {/* Summary cards */}
                      {hasAnyReal&&(
                        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
                          {[
                            {l:"Calc. total",v:totCalc.toFixed(0)+" m³",c:"#B8860B"},
                            {l:"Real aplicado",v:totReal.toFixed(0)+" m³",c:"#3D6B35"},
                            {l:"Diferencia",v:`${(totReal-totCalc)>0?"+":""}${(totReal-totCalc).toFixed(0)} m³`,c:(totReal-totCalc)<-100?"#8B0000":(totReal-totCalc)>100?"#3D6B35":"#5C3D28"},
                            {l:"Eficiencia",v:eficGlobal?eficGlobal.toFixed(0)+"%":"—",c:eficGlobal>=85?"#3D6B35":eficGlobal>=70?"#B8860B":"#8B0000"},
                          ].map(s=>(
                            <div key={s.l} className="card" style={{padding:"10px 14px"}}>
                              <div className="mono" style={{fontSize:8,color:"#9C7A5A",marginBottom:3}}>{s.l.toUpperCase()}</div>
                              <div className="serif" style={{fontSize:20,fontWeight:700,color:s.c,lineHeight:1}}>{s.v}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Weekly table */}
                      <div className="card" style={{overflow:"hidden"}}>
                        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                          <thead>
                            <tr style={{background:"rgba(232,220,191,0.7)"}}>
                              {["Semana","ETo mm","Lluvia mm","Calc. m³","Real m³","Dif. m³","%","EC","pH"].map((h,hi)=>(
                                <th key={h} className="mono" style={{padding:"9px 12px",textAlign:hi<3?"left":"right",
                                  fontSize:9,fontWeight:500,color:"#5C3D28",borderBottom:"2px solid rgba(92,61,40,0.2)",whiteSpace:"nowrap"}}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(allWeeks.length===0?[isoWeek(todayStr())]:allWeeks).map((wk,ri)=>{
                              const calc_=weekCalc(wk,cultF);
                              const real_=weekReal(wk,cultF);
                              const eto_=weekETo(wk), prec_=weekPrecip(wk);
                              const hasReal=real_>0;
                              const diff=hasReal?(real_-calc_):null;
                              const pct=hasReal&&calc_>0?(real_/calc_*100):null;
                              const isCurrent=wk===isoWeek(todayStr());
                              const {start,end}=weekDates(wk);
                              const ecVals=[],phVals=[];
                              for(const c of cultF) for(const t of c.turnos){
                                const ec=getRegW(wk,c.id,t.id,"ec"); if(ec) ecVals.push(parseFloat(ec));
                                const ph=getRegW(wk,c.id,t.id,"ph"); if(ph) phVals.push(parseFloat(ph));
                              }
                              const ecAvg=ecVals.length?(ecVals.reduce((a,v)=>a+v,0)/ecVals.length).toFixed(1):"—";
                              const phAvg=phVals.length?(phVals.reduce((a,v)=>a+v,0)/phVals.length).toFixed(1):"—";
                              return(
                                <tr key={wk} onClick={()=>setRegWeekSel(wk)}
                                  style={{background:wk===regWeekSel?"rgba(194,98,45,0.08)":isCurrent?"rgba(184,134,11,0.05)":ri%2?"rgba(242,235,217,0.2)":"rgba(255,252,244,0.6)",
                                    borderBottom:"1px solid rgba(92,61,40,0.08)",cursor:"pointer"}}>
                                  <td style={{padding:"11px 12px",whiteSpace:"nowrap"}}>
                                    <div className="serif" style={{fontSize:13,fontWeight:isCurrent?700:400,color:isCurrent?"#2C1810":"#5C3D28"}}>
                                      {weekLabel(wk)}
                                    </div>
                                    {isCurrent&&<span className="mono" style={{fontSize:8,padding:"1px 5px",borderRadius:2,background:"rgba(194,98,45,0.12)",color:"#C2622D",border:"1px solid rgba(194,98,45,0.3)"}}>EN CURSO</span>}
                                    {/* Show dates with data */}
                                    {(()=>{
                                      const daysWithData=wRows.filter(r=>isoWeek(r.date)===wk&&!isFuture(r.date));
                                      if(!daysWithData.length) return null;
                                      return <div className="mono" style={{fontSize:8,color:"#9C7A5A",marginTop:2}}>{daysWithData.length} días · {start.slice(5).replace("-","/")} al {end.slice(5).replace("-","/")}</div>;
                                    })()}
                                  </td>
                                  <td className="mono" style={{padding:"11px 12px",textAlign:"right",fontSize:12,color:"#C2622D",fontWeight:isCurrent?600:400}}>{eto_.toFixed(1)}</td>
                                  <td className="mono" style={{padding:"11px 12px",textAlign:"right",fontSize:12,color:prec_>0?"#4A7FA5":"#CCCCCC"}}>{prec_.toFixed(1)}</td>
                                  <td className="mono" style={{padding:"11px 12px",textAlign:"right",fontSize:13,color:"#B8860B",fontWeight:500}}>{calc_.toFixed(0)}</td>
                                  <td style={{padding:"11px 12px",textAlign:"right"}}>
                                    {hasReal
                                      ?<span className="serif" style={{fontSize:16,fontWeight:700,color:"#3D6B35"}}>{real_.toFixed(0)}</span>
                                      :<span className="mono" style={{fontSize:11,color:"rgba(92,61,40,0.25)"}}>—</span>}
                                  </td>
                                  <td className="mono" style={{padding:"11px 12px",textAlign:"right",fontSize:12,fontWeight:500,
                                    color:diff==null?"#ccc":diff<-100?"#8B0000":diff>100?"#3D6B35":"#9C7A5A"}}>
                                    {diff!=null?`${diff>0?"+":""}${diff.toFixed(0)}`:"—"}
                                  </td>
                                  <td style={{padding:"11px 12px",textAlign:"right"}}>
                                    {pct!=null&&<span className="mono" style={{fontSize:11,padding:"2px 6px",borderRadius:2,fontWeight:600,
                                      background:pct>=85?"rgba(61,107,53,0.12)":pct>=70?"rgba(184,134,11,0.1)":"rgba(139,0,0,0.08)",
                                      color:pct>=85?"#3D6B35":pct>=70?"#B8860B":"#8B0000"}}>{pct.toFixed(0)}%</span>}
                                  </td>
                                  <td className="mono" style={{padding:"11px 12px",textAlign:"right",fontSize:11,color:"#5C3D28"}}>{ecAvg}</td>
                                  <td className="mono" style={{padding:"11px 12px",textAlign:"right",fontSize:11,color:"#5C3D28"}}>{phAvg}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {hasAnyReal&&(
                            <tfoot>
                              <tr style={{background:"#2C1810",borderTop:"2px solid rgba(92,61,40,0.4)"}}>
                                <td className="fell" style={{padding:"10px 12px",fontSize:13,color:"rgba(242,235,217,0.7)"}}>Σ {allWeeks.length} semanas</td>
                                <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:"#E8A882",fontWeight:700}}>{allWeeks.reduce((a,wk)=>a+weekETo(wk),0).toFixed(1)}</td>
                                <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:"#7EB3D3"}}>{allWeeks.reduce((a,wk)=>a+weekPrecip(wk),0).toFixed(1)}</td>
                                <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:"#E8A882",fontWeight:700}}>{totCalc.toFixed(0)}</td>
                                <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:13,color:"#8FA370",fontWeight:700}}>{totReal.toFixed(0)}</td>
                                <td className="mono" style={{padding:"10px 12px",textAlign:"right",fontSize:12,color:(totReal-totCalc)<0?"#E8A882":"#8FA370",fontWeight:500}}>
                                  {(totReal-totCalc)>0?"+":""}{(totReal-totCalc).toFixed(0)}
                                </td>
                                <td style={{padding:"10px 12px",textAlign:"right"}}>
                                  <span className="mono" style={{fontSize:13,fontWeight:700,color:eficGlobal>=85?"#8FA370":eficGlobal>=70?"#E8C882":"#E8A882"}}>{eficGlobal?.toFixed(0)}%</span>
                                </td>
                                <td colSpan={2}/>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>

                      {/* Detalle por sector de la semana seleccionada */}
                      {(()=>{
                        const wk=regWeekSel;
                        const days=wRows.filter(r=>isoWeek(r.date)===wk&&!isFuture(r.date));
                        if(!days.length) return null;
                        return(
                          <div style={{marginTop:14}}>
                            <div className="mono" style={{fontSize:9,letterSpacing:2.5,color:"#9C7A5A",marginBottom:10}}>
                              DETALLE SEMANAL POR SECTOR · {weekLabel(wk).toUpperCase()}
                            </div>
                            {cultF.map(c=>{
                              const calcTotal=days.reduce((a,r)=>a+calcAuto(c,kcs,kcAuto,getEto(r),getPrecip(r),r.date).reduce((b,t)=>b+t.volTotal,0),0);
                              const realTotal=c.turnos.reduce((a,t)=>a+(parseFloat(getRegW(wk,c.id,t.id,"m3Real")||0)||0),0);
                              const hrsCalc=days.reduce((a,r)=>a+calcAuto(c,kcs,kcAuto,getEto(r),getPrecip(r),r.date).reduce((b,t)=>b+t.horas,0),0);
                              return(
                                <div key={c.id} className="card" style={{marginBottom:10,overflow:"hidden",border:`1px solid ${c.color}22`}}>
                                  <div style={{padding:"10px 16px",background:`linear-gradient(135deg,${c.light}44,rgba(255,252,244,0))`,
                                    borderBottom:"1px solid rgba(92,61,40,0.1)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                                    <span className="fell" style={{fontSize:15,color:"#2C1810"}}>{c.emoji} {c.label}</span>
                                    <div style={{display:"flex",gap:20}}>
                                      <div style={{textAlign:"right"}}>
                                        <div className="mono" style={{fontSize:8,color:"#9C7A5A"}}>CALCULADO</div>
                                        <span className="serif" style={{fontWeight:700,fontSize:17,color:"#B8860B"}}>{calcTotal.toFixed(0)} m³</span>
                                        <span className="mono" style={{fontSize:8,color:"#9C7A5A",marginLeft:4}}>{hToHM(hrsCalc)}</span>
                                      </div>
                                      {realTotal>0&&<div style={{textAlign:"right"}}>
                                        <div className="mono" style={{fontSize:8,color:"#9C7A5A"}}>REAL</div>
                                        <span className="serif" style={{fontWeight:700,fontSize:17,color:"#3D6B35"}}>{realTotal.toFixed(0)} m³</span>
                                        <span className="mono" style={{fontSize:9,marginLeft:4,padding:"1px 5px",borderRadius:2,
                                          background:calcTotal>0&&(realTotal/calcTotal)>=0.85?"rgba(61,107,53,0.1)":"rgba(139,0,0,0.08)",
                                          color:calcTotal>0&&(realTotal/calcTotal)>=0.85?"#3D6B35":"#8B0000"}}>
                                          {calcTotal>0?(realTotal/calcTotal*100).toFixed(0):0}%
                                        </span>
                                      </div>}
                                    </div>
                                  </div>
                                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                                    <thead><tr style={{background:"rgba(232,220,191,0.3)"}}>
                                      {["Sector","ha","Calc. m³ sem.","⏱ Calc.","Real m³ sem.","Dif.","EC","pH","Notas"].map((h,hi)=>(
                                        <th key={h} className="mono" style={{padding:"7px 12px",textAlign:hi<2?"left":"right",
                                          fontSize:8,fontWeight:500,color:"#5C3D28",borderBottom:"1px solid rgba(92,61,40,0.15)",whiteSpace:"nowrap"}}>{h}</th>
                                      ))}
                                    </tr></thead>
                                    <tbody>
                                      {c.turnos.map((t,ti)=>{
                                        const calcT=days.reduce((a,r)=>a+(calcAuto(c,kcs,kcAuto,getEto(r),getPrecip(r),r.date).find(x=>x.id===t.id)?.volTotal||0),0);
                                        const hrsT=days.reduce((a,r)=>a+(calcAuto(c,kcs,kcAuto,getEto(r),getPrecip(r),r.date).find(x=>x.id===t.id)?.horas||0),0);
                                        const realT=parseFloat(getRegW(wk,c.id,t.id,"m3Real")||0)||0;
                                        const diff=realT>0?(realT-calcT):null;
                                        const pct=realT>0&&calcT>0?(realT/calcT*100):null;
                                        return(
                                          <tr key={t.id} style={{background:ti%2?"rgba(242,235,217,0.2)":"rgba(255,252,244,0.5)",borderBottom:"1px solid rgba(92,61,40,0.07)"}}>
                                            <td style={{padding:"9px 12px"}}>
                                              <div className="serif" style={{fontSize:13,fontWeight:600,color:c.color}}>{t.label}</div>
                                              <div className="mono" style={{fontSize:8,color:"#9C7A5A"}}>{t.bloques}</div>
                                            </td>
                                            <td className="mono" style={{padding:"9px 12px",fontSize:12,color:"#5C3D28"}}>{t.ha}</td>
                                            <td style={{padding:"9px 12px",textAlign:"right"}}>
                                              <span className="serif" style={{fontSize:15,fontWeight:600,color:"#B8860B"}}>{calcT.toFixed(0)}</span>
                                              <span className="mono" style={{fontSize:8,color:"#9C7A5A"}}> m³</span>
                                            </td>
                                            <td className="mono" style={{padding:"9px 12px",textAlign:"right",fontSize:11,color:"#9C7A5A"}}>{hToHM(hrsT)}</td>
                                            <td style={{padding:"9px 12px",textAlign:"right"}}>
                                              {realT>0
                                                ?<span className="serif" style={{fontSize:17,fontWeight:700,color:"#3D6B35"}}>{realT.toFixed(0)}</span>
                                                :<span className="mono" style={{fontSize:10,color:"rgba(92,61,40,0.2)"}}>—</span>}
                                            </td>
                                            <td className="mono" style={{padding:"9px 12px",textAlign:"right",fontSize:11,fontWeight:500,
                                              color:diff==null?"#ccc":diff<-50?"#8B0000":diff>50?"#3D6B35":"#9C7A5A"}}>
                                              {diff!=null?`${diff>0?"+":""}${diff.toFixed(0)}`:"—"}
                                            </td>
                                            <td className="mono" style={{padding:"9px 12px",textAlign:"right",fontSize:11,color:"#5C3D28"}}>{getRegW(wk,c.id,t.id,"ec")||"—"}</td>
                                            <td className="mono" style={{padding:"9px 12px",textAlign:"right",fontSize:11,color:"#5C3D28"}}>{getRegW(wk,c.id,t.id,"ph")||"—"}</td>
                                            <td className="serif" style={{padding:"9px 12px",textAlign:"right",fontSize:11,color:"#9C7A5A",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                                              {getRegW(wk,c.id,t.id,"notas")||""}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}
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
                    Metodología: ETo por FAO Penman-Monteith (Open-Meteo) · ETc = ETo × Kc (FAO-56) · Precipitación efectiva = 80% lluvia · Riego bruto = Neto ÷ Eficiencia del sistema · Vol. m³/ha = Riego bruto (mm) × 10 · Horas = Vol. total ÷ Caudal sector · Estación meteorológica: Nueva Purehue [0020F829] · Hijuelas, V Región, Chile (-32.827°S / -71.090°O · 312 m s.n.m.)
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
