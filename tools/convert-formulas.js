// Convert plain-notation formula rows to LaTeX segments. Node script.
const fs = require('fs');
const katex = require('/tmp/package/dist/katex.js');
const DATA = JSON.parse(fs.readFileSync('/tmp/data.json','utf8'));
const OVR = fs.existsSync('/tmp/build/overrides.json') ? JSON.parse(fs.readFileSync('/tmp/build/overrides.json','utf8')) : {};

const SUP = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-','ⁿ':'n','ʳ':'r','ˣ':'x','ᵃ':'a','ᵇ':'b','ᶜ':'c','ᵈ':'d','ᵀ':'T','ᵦ':'\\beta'};
const SUB = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','₊':'+','₋':'-','ₐ':'a','ₑ':'e','ₒ':'o','ₓ':'x','ᵢ':'i','ᵣ':'r','ᵥ':'v','ₙ':'n','ₚ':'p','ᴀ':'A'};
const GREEK = {α:'\\alpha',β:'\\beta',γ:'\\gamma',δ:'\\delta',ε:'\\varepsilon',θ:'\\theta',λ:'\\lambda',μ:'\\mu',π:'\\pi',ρ:'\\rho',σ:'\\sigma',τ:'\\tau',φ:'\\phi',χ:'\\chi',ω:'\\omega',η:'\\eta',κ:'\\kappa',ν:'\\nu',Δ:'\\Delta',Σ:'\\sum',Φ:'\\Phi',Λ:'\\Lambda',Ω:'\\Omega'};
const SYM = {'−':'-','×':'\\times ','·':'\\cdot ','°':'^{\\circ} ','±':'\\pm ','∓':'\\mp ','≈':'\\approx ','≥':'\\ge ','≤':'\\le ','≠':'\\ne ','∝':'\\propto ','∞':'\\infty ','≡':'\\equiv ','∀':'\\forall ','∃':'\\exists ','∪':'\\cup ','∩':'\\cap ','∧':'\\land ','∨':'\\lor ','↔':'\\leftrightarrow ','⟹':'\\implies ','⟺':'\\iff ','↑':'\\uparrow ','↓':'\\downarrow ','⇌':'\\rightleftharpoons ','∥':'\\parallel ','⊥':'\\perp ','≪':'\\ll ','…':'\\dots ','′':"'",'″':"''",'½':'\\tfrac{1}{2}','⅓':'\\tfrac{1}{3}','⅔':'\\tfrac{2}{3}','⅖':'\\tfrac{2}{5}','¼':'\\tfrac{1}{4}','Å':'\\text{\\AA}'};
const FUNCS = new Set(['sin','cos','tan','sec','cosec','csc','cot','sinh','cosh','tanh','ln','log','lim','min','max','det','arg','exp','mod','gcd','sup','inf','deg']);
const MATHY_SUB = new Set(['i','j','n','r','x','y','0','1','2','3','4','5','6','7','8','9','a','b','e','o','v','p','+','-','\\beta']);

const SUBTOKENS = {Iz:'I_z',Ix:'I_x',Iy:'I_y',Ic:'I_c',XL:'X_L',XC:'X_C',Ax:'A_x',Ay:'A_y',Az:'A_z',En:'E_n',rn:'r_n',vn:'v_n',fn:'f_n',Rt:'R_t',BH:'B_H',BV:'B_V',Am:'A_m',Ac:'A_c',Rf:'R_f',Vs:'V_s',Vp:'V_p',Ns:'N_s',Np:'N_p',Ip:'I_p',Is:'I_s',KEmax:'\\text{KE}_{\\text{max}}'};
function isSup(c){return c in SUP} function isSub(c){return c in SUB}

// main scanner: string -> latex
function conv(s){
  let out=''; let i=0; const n=s.length;
  while(i<n){
    const c=s[i];
    // word run (letters incl. unicode ascii)
    if(/[A-Za-z]/.test(c)){
      let j=i; while(j<n && /[A-Za-z]/.test(s[j])) j++;
      let w=s.slice(i,j);
      const ncr=w.match(/^(\d*)([nN])([CP])([rR])$/);
      if(ncr){ out+=`{}^{${ncr[1]||''}${ncr[1]?'\\!':''}n}${ncr[3]}_{r}`; i=j; continue; }
      if(Object.prototype.hasOwnProperty.call(SUBTOKENS,w)){ out+=SUBTOKENS[w]; i=j; continue; }
      // combining accent after single letter
      if(w.length===1 && j<n && (s[j]==='\u0304'||s[j]==='\u0302')){
        out += s[j]==='\u0304' ? `\\bar{${w}}` : `\\hat{${w}}`; i=j+1; continue;
      }
      if(FUNCS.has(w.toLowerCase()) && !(w.length>1 && /[A-Z]/.test(w))){ out+='\\'+w.toLowerCase()+' '; i=j; continue; }
      const fp=w.match(/^([a-z]{2,5})((?:[A-Z][A-Za-z0-9]*)+)$/);
      if(fp && FUNCS.has(fp[1])){ out+='\\'+fp[1]+' '+fp[2]; i=j; continue; }
      if(w.length===1){ out+=w; i=j; continue; }
      const ab=w.match(/^([A-Za-z])([a-z]{2,})$/);
      if(ab && ABBREV.has(ab[2])){ out+=`${ab[1]}_{\\text{${ab[2]}}}`; i=j; continue; }
      if(w.length<=3 && !WORDS.has(w.toLowerCase())){ out+=w; i=j; continue; }
      out+=`\\text{${w}}`; i=j; continue;
    }
    if(isSup(c)){ let j=i,r=''; while(j<n&&isSup(s[j])){r+=SUP[s[j]];j++} out+=`^{${r}}`; i=j; continue; }
    if(isSub(c)){ let j=i,r=''; while(j<n&&isSub(s[j])){r+=SUB[s[j]];j++} 
      // upright multi-char non-mathy subscripts
      const parts=r.split(''); let latex=r;
      if(r.length>1 && !r.split('').every(ch=>MATHY_SUB.has(ch))) latex=`\\text{${r}}`;
      else if(r.length>1 && /[a-z]/.test(r) && /\d/.test(r)) latex=`\\text{${r}}`;
      out+=`_{${latex}}`; i=j; continue; }
    if(c in GREEK){ out+=GREEK[c]+' '; i++; continue; }
    if(c in SYM){ out+=SYM[c]; i++; continue; }
    if(c==='→'){ out+='\\to '; i++; continue; }
    if(c==='√'){
      i++;
      if(s[i]==='['){ const g=grp(s,i,'[',']'); out+=`\\sqrt{${resolve(fracPass(g.inner))}}`; i=g.end; continue; }
      if(s[i]==='('){ const g=grp(s,i,'(',')'); out+=`\\sqrt{${resolve(fracPass(g.inner))}}`; i=g.end; continue; }
      // single token: number, letter, or letter+scripts
      let m=s.slice(i).match(/^(\d+(?:\.\d+)?)/);
      if(m){ out+=`\\sqrt{${m[1]}}`; i+=m[1].length; continue; }
      m=s.slice(i).match(/^([A-Za-z]{1,3})/);
      if(m && !WORDS.has(m[1].toLowerCase())){ out+=`\\sqrt{${m[1]}}`; i+=m[1].length; continue; }
      out+='\\sqrt{'; // fallback: next char
      if(i<n){ out+=s[i]; i++; } out+='}'; continue;
    }
    if(c==='∫'||c==='∮'){
      let sym=c==='∫'?'\\int':'\\oint'; i++;
      let lo='',hi='';
      // limits in either order
      for(let k=0;k<2;k++){
        if(i<n&&isSub(s[i])){ let r=''; while(i<n&&isSub(s[i])){r+=SUB[s[i]];i++} lo=r; continue; }
        if(i<n&&isSup(s[i])){ let r=''; while(i<n&&isSup(s[i])){r+=SUP[s[i]];i++} hi=r; continue; }
        break;
      }
      out+=sym+(lo?`_{${lo}}`:'')+(hi?`^{${hi}}`:'')+' '; continue;
    }
    if(c==='_'){ i++; let m2=s.slice(i).match(/^[A-Za-z0-9]+/); if(m2){ const t=m2[0]; const up=t.length>1&&!/^[0-9]+$/.test(t)?`\\text{${t}}`:t; out+=`_{${up}}`; i+=t.length; } else out+='_'; continue; }
    if(c==='^'){ // ASCII power: ^( → group, ^x → single
      i++;
      if(s[i]==='('){ const g=grp(s,i,'(',')'); out+=`^{${resolve(fracPass(g.inner))}}`; i=g.end; }
      else if(i<n){ out+=`^{${s[i]}}`; i++; }
      continue;
    }
    if(c==='('||c==='['){ const open=c, close=c==='('?')':']'; const g=grp(s,i,open,close); out+=`\\left${open}${resolve(fracPass(g.inner))}\\right${close}`; i=g.end; continue; }
    if(c===' '){ out+='\\;'; i++; continue; }
    if(c==='%'){ out+='\\%'; i++; continue; }
    if(/[0-9.=<>+\-*/,;:!?()\[\]|&#@$_{}'"]/.test(c)){ const esc={'{':'\\{','}':'\\}','&':'\\&','#':'\\#','$':'\\$'}; out+=c==='*'?'\\cdot ':(esc[c]||c); i++; continue; }
    out+=c; i++;
  }
  return out;
}
function grp(s,i,open,close){ // s[i]===open; returns inner and end index after close
  let d=0,j=i; for(;j<s.length;j++){ if(s[j]===open)d++; else if(s[j]===close){d--; if(!d)break;} }
  return {inner:s.slice(i+1,j), end:j+1};
}

const ABBREV = new Set(['rms','mean','mp','avg','max','min','total','ext','rev','univ','rxn','cell','net','grav','spring','cm','beat','driving','natural','ice','steam','gas','water','repose','beat','top','bottom','AB','BA']);
const WORDS = new Set(['and','or','if','is','at','to','in','on','for','with','then','else','when','only','both','same','true','false','unique','yaad','honi','chahiye','khatam','sabse','kam','hamesha','jab','bhi','me','ke','ka','hai','go','no','not','all','odd','even','per','vs','approx','const','constant','favourable','none','stick','forward','backward','up','down','left','right','products','reactants','formed','broken','charge','discharge','approach','recede','internal','external','bounded','unbounded','bright','dark','odd','even','mono','dia','sun','milk','butter','sum','avg','air','gas','oil','cut','ppm','dry','law','use','per','msd','vsd','ev','ohm','rad','of','the']);
const SUPC = Object.keys(SUP), SUBC = Object.keys(SUB);
const supSet = new Set(SUPC), subSet = new Set(SUBC);
const atomStart = /[A-Za-z0-9θλμπρστφχωαβγδεηκνΔΣΦΛΩ.''′(√[|]/;

function isMathAtom(s){ // no spaces; at least one math signal or short
  if(!s) return false;
  const g=(s[0]==='('&&s[s.length-1]===')')||(s[0]==='['&&s[s.length-1]===']')||(s[0]==='|'&&s[s.length-1]==='|');
  if(/\s/.test(s)){
    if(!g) return false;
    return /[\dθλμπρστφχωαβγδεηκνΔΣΦΛΩ=+−×·<>±∓¹²³⁰⁴⁵⁶⁷⁸⁹ⁿʳˣ⁺⁻₀₁₂₃₄₅₆₇₈₉ₐₑₒₓᵢᵣᵥₙₚ√∫Σ½⅓⅔¼⅖'′°^]/.test(s);
  }
  if(g) return /[\dθλμπρστφχωαβγδεηκνΔΣΦΛΩ=+−×·<>±∓¹²³⁰⁴⁵⁶⁷⁸⁹ⁿʳˣ⁺⁻₀₁₂₃₄₅₆₇₈₉ₐₑₒₓᵢᵣᵥₙₚ√∫Σ½⅓⅔¼⅖'′°^]/.test(s);
  { let d=0,bad=false;
    for(let k=0;k<s.length;k++){ const ch=s[k];
      if(ch==='\x01'){ while(k<s.length&&s[k]!=='\x04')k++; continue; }
      if(ch==='('||ch==='[')d++; else if(ch===')'||ch===']')d--;
      else if(d===0&&/[=<>+−×·→←]/.test(ch)){bad=true;break;} }
    if(bad) return false; }
  const hasMath = /[\dθλμπρστφχωαβγδεηκνΔΣΦΛΩ√¹²³⁰⁴⁵⁶⁷⁸⁹ⁿʳˣ⁺⁻ᵃᵇᶜᵈᵀ₀₁₂₃₄₅₆₇₈₉ₐₑₒₓᵢᵣᵥₙₚ½⅓⅔¼⅖()|[\]''′_]/.test(s);
  if(hasMath) return true;
  if(/^(sin|cos|tan|sec|cosec|cot|ln|log|lim|arg|exp)[A-Z0-9θπ(]/.test(s)) return true;
  return s.length<=2 && !/^(an|is|of|to|in|on|or|by|at|as|be|we|do|go|no|so|up|if|it)$/.test(s);
}

// extract maximal product-run atom ending at index i (exclusive) scanning left
function leftAtom(s,i){
  let j=i;
  while(j>0){
    const c=s[j-1];
    if(c===')'||c===']'||c==='|'){
      if(c==='|'){ let k=j-1; while(k>0&&s[k-1]!=='|')k--; if(k>0) j=k-1; break; }
      const open=c===')'?'(':'['; let d=1,k=j-1;
      while(k>0&&d>0){k--;if(s[k]===c)d++;if(s[k]===open)d--;}
      j=k; continue;
    }
    if(c==='('||c==='[') break;
    if(c==='^'){j--;continue;}
    if(atomStart.test(c)||supSet.has(c)||subSet.has(c)||c==='\u0304'||c==='\u0302'){j--;continue;}
    break;
  }
  const atom=s.slice(j,i);
  return isMathAtom(atom)?{atom,start:j}:null;
}
function rightAtom(s,i){
  let j=i;
  if(s[j]==='|'){ let k=j+1; while(k<s.length&&s[k]!=='|')k++; if(k<s.length)k++; const atom=s.slice(j,k); return isMathAtom(atom)?{atom,end:k}:null; }
  if(s[j]==='('||s[j]==='['){
    const close=s[j]==='('?')':']'; const open=s[j]; let d=0,k=j;
    for(;k<s.length;k++){if(s[k]===open)d++;else if(s[k]===close){d--;if(!d){k++;break;}}}
    // continue into generic loop from k
    let e=k;
    while(e<s.length){ const c=s[e];
      if(c==='^'){e++;continue;}
      if(c==='('||c==='['){ const cl=c==='('?')':']';let d2=0,k2=e;for(;k2<s.length;k2++){if(s[k2]===c)d2++;else if(s[k2]===cl){d2--;if(!d2){k2++;break;}}} if(!/\s/.test(s.slice(e,k2))){ e=k2; continue; } break; }
      if(c==='|') break;
      if(atomStart.test(c)||supSet.has(c)||subSet.has(c)){e++;continue;}
      break; }
    const atom=s.slice(j,e);
    return isMathAtom(atom)?{atom,end:e}:null;
  }
  if(s[j]==='√'&&(s[j+1]==='('||s[j+1]==='[')){
    const open=s[j+1],close=open==='('?')':']';let d=0,k=j+1;
    for(;k<s.length;k++){if(s[k]===open)d++;else if(s[k]===close){d--;if(!d){k++;break;}}}
    return {atom:s.slice(j,k),end:k};
  }
  while(j<s.length){
    const c=s[j];
    if(c==='^'){j++;continue;}
    if(c==='('||c==='['){ const close=c==='('?')':']';let d=0,k=j;for(;k<s.length;k++){if(s[k]===c)d++;else if(s[k]===close){d--;if(!d){k++;break;}}} j=k; continue; }
    if(atomStart.test(c)||supSet.has(c)||subSet.has(c)||c==='\u0304'||c==='\u0302'){j++;continue;}
    break;
  }
  const atom=s.slice(i,j);
  return isMathAtom(atom)?{atom,end:j}:null;
}

function fracPass(s){
  let i=0;
  while(i<s.length){
    if(s[i]==='\x01'){ let d=0,j=i; for(;j<s.length;j++){ if(s[j]==='\x01')d++; else if(s[j]==='\x04'){d--; if(!d)break;} } i=j+1; continue; }
    if(s[i]==='/'){
      let li=i, ri=i+1, spaced=false;
      if(s[i-1]===' '&&s[i+1]===' '){ spaced=true; li=i-1; ri=i+2; }
      let L=leftAtom(s,li), R=rightAtom(s,ri);
      if(L&&R&&/^(ln|log|sin|cos|tan|sec|cosec|cot|sinh|cosh|tanh|lim|arg|exp|det|min|max|gcd|mod|deg|sup|inf)$/.test(R.atom)&&s[R.end]===' '&&/[A-Za-z0-9θπ(√[]/.test(s[R.end+1]||'')){ const R2=rightAtom(s,R.end+1); if(R2){ R={atom:R.atom+' '+R2.atom,end:R2.end}; } }
      if(spaced&&L&&R){
        const noWords=x=>!/[a-z]{3,}/.test(x.replace(/\x01[^\x04]*\x04/g,''));
        if(!(noWords(L.atom)&&noWords(R.atom))) { L=null; R=null; }
      }
      if(L&&R&&L.atom.length>1||L&&R&&L.atom!=='('&&L.atom!=='['){
        const ph=`\x01FRAC\x02${L.atom}\x03${R.atom}\x04`;
        s = s.slice(0,L.start) + ph + s.slice(R.end);
        i = L.start + ph.length; continue;
      }
    }
    i++;
  }
  return s;
}

function matrixPass(s){
  return s.replace(/\|([^|]*;[^|]*)\|/g, (m,inner)=>{
    return `\x01MTX\x02${inner}\x04`;
  });
}

const STRONG=/[=∫Σ√∮⟹⟺½⅓⅔⅖¼^±∓≈≥≤≠∝∞≡∀∃∧∨∪∩×°¹²³⁰⁴⁵⁶⁷⁸⁹ⁿʳˣ⁺⁻ᵃᵇᶜᵈᵀ₀₁₂₃₄₅₆₇₈₉ₐₑₒₓᵢᵣᵥₙₚθλμπρστφχωαβγδεηκνΔΦΛΩ']/;

const FUNCPREFIX=/^(sin|cos|tan|sec|cosec|cot|sinh|cosh|tanh|ln|log|lim|arg|exp|min|max|det|mod)[A-Z0-9θπ(]/;
const FORCEMATH=['ΣBE(bonds broken)','salt of weak acid+strong base','Condition line y=mx+c tangent','ppm =','Formal charge =','Atom economy =','Mean deviation','even coeff sum','Distance of point (x₁,y₁,z₁)','Area under y=f(x)','Parabola segment','1 MSD − 1 VSD','Screw gauge LC = pitch/N','Shear η','Elastic PE','Energy density u','y = 2A sin kx cos ωt','fringe width β','Path diff bright','half-cycle avg','Kc = α²','∧ (and)','represents pair through origin','abc + 2fgh'];
function classify(v){
  const words=(v.match(/[A-Za-z]{3,}/g)||[]).filter(w=>!FUNCS.has(w.toLowerCase())&&!ABBREV.has(w)&&!FUNCPREFIX.test(w)&&!Object.prototype.hasOwnProperty.call(SUBTOKENS,w));
  const strong=STRONG.test(v);
  const forced=FORCEMATH.some(f=>v.includes(f))||FORCED.some(f=>v.includes(f));
  return {math:(strong&&words.length<=3)||(forced&&strong), words:words.length, strong};
}

function readPH(s,i){ // s[i]==='\x01'; returns tag, body, end index after \x04
  let d=0,j=i;
  for(;j<s.length;j++){ if(s[j]==='\x01')d++; else if(s[j]==='\x04'){d--; if(!d)break;} }
  const full=s.slice(i+1,j);
  return {tag: full.slice(0,full.indexOf('\x02')), body: full.slice(full.indexOf('\x02')+1), end: j+1};
}
function depthSplit(body){ // split at depth-0 \x03
  let d=0;
  for(let k=0;k<body.length;k++){
    if(body[k]==='\x01')d++;
    else if(body[k]==='\x04')d--;
    else if(body[k]==='\x03'&&d===0) return [body.slice(0,k),body.slice(k+1)];
  }
  return [body,''];
}
const FORCED=['MSD/N','pitch/N','moles solute/L solution','mass solute/mass solution','moles/kg solvent','molar mass desired product / Σ molar mass all reactants','tangential stress/shear strain','actual/theoretical','favourable/total','[salt]/[acid]','[salt]/[base]','molar mass/empirical mass','n = real/apparent','output/input','observed colligative/calculated','Var/Mean','distance spot/distance solvent front','lateral/longitudinal strain'];
function toLatex(v){
  let s=matrixPass(v);
  for(const f of FORCED){ let idx; while((idx=s.indexOf(f))>=0){ const parts=f.split('/'); const num=parts[0]==='n = real'?parts[0]:parts[0], den=parts[1];
    if(f==='n = real/apparent'){ s=s.replace('n = real/apparent','n = \x01FRAC\x02real\x03apparent\x04'); continue; }
    s=s.slice(0,idx)+`\x01FRAC\x02${parts[0]}\x03${parts[1]}\x04`+s.slice(idx+f.length); } }
  return resolve(fracPass(s)).replace(/(^|[\s;,=+−])\^\{/g,'$1{}^{');
}
function resolve(s){
  let out='',i=0;
  while(i<s.length){
    if(s[i]==='\x01'){
      const {tag,body,end}=readPH(s,i);
      if(tag==='FRAC'){ let [num,den]=depthSplit(body);
        const strip=x=>{ if(x.length>2&&x[0]==='('&&x[x.length-1]===')'){ let d=0,ok=true; for(let k=0;k<x.length-1;k++){ if(x[k]==='(')d++; else if(x[k]===')'){d--; if(!d){ok=false;break;}} } if(ok) return x.slice(1,-1); } return x; };
        num=strip(num); den=strip(den);
        out+=`\\frac{${resolve(fracPass(num))}}{${resolve(fracPass(den))}}`; }
      else if(tag==='MTX'){
        const rows=body.split(';').map(r=>r.trim().split(/\s+/).map(c=>resolve(fracPass(c))).join(' & '));
        out+=`\\begin{vmatrix}${rows.join(' \\\\ ')}\\end{vmatrix}`;
      }
      i=end; continue;
    }
    let j=i,depth=0;
    while(j<s.length){ const ch=s[j];
      if(ch==='\x01'&&depth===0) break;
      if(ch==='('||ch==='[') depth++;
      else if(ch===')'||ch===']') depth=Math.max(0,depth-1);
      j++; }
    out+=conv(s.slice(i,j)); i=j;
  }
  return out;
}
// ---- row processing + report ----
const report=[], rows={}, flags=[];
let errCount=0, mathRows=0, textRows=0, ovrUsed=0;
for(const c of DATA){
  const key=c.file; rows[key]=[];
  for(const raw of (c.formulas||'').split('\n')){
    const line=raw.trim(); if(!line) continue;
    if(/:$/.test(line) && !line.includes('=')){ rows[key].push({sec:line.replace(/:+$/,'')}); continue; }
    for(const part of line.split(' | ')){
      if(!part) continue;
      const m=part.match(/^([^:|=]{1,46}?):\s+(.+)$/);
      const label=m?m[1]:null, value=m?m[2]:part;
      const ov=OVR[part];
      let seg, cls;
      if(ov){ seg=ov; ovrUsed++; cls={math:seg.some(x=>x.t==='m')}; }
      else{
        cls=classify(value);
        if(cls.math){
          const latex=toLatex(value);
          try{ katex.renderToString(latex,{throwOnError:true}); }
          catch(e){ errCount++; flags.push(`KATEX-ERR [${c.prefix} ${c.title}] ${part}\n  LATEX: ${latex}\n  ERR: ${e.message}`); seg=[{t:'x',s:value}]; }
          if(!seg) seg=[{t:'m',s:latex,raw:value}];
        } else {
          seg=[{t:'x',s:value}];
          if(cls.strong && cls.words>3) flags.push(`MAYBE [${c.prefix} ${c.title}] ${part}`);
        }
      }
      if(seg[0].t==='m') mathRows++; else textRows++;
      rows[key].push(label?{label,seg}:{seg});
      report.push(`${seg[0].t==='m'?'M':'T'} | ${part}${seg[0].t==='m'?'\n   → '+seg[0].s:''}`);
    }
  }
}
fs.writeFileSync('/tmp/build/rows.json', JSON.stringify(rows));
fs.writeFileSync('/tmp/build/report.txt', report.join('\n'));
fs.writeFileSync('/tmp/build/flags.txt', flags.join('\n'));
console.log(`math=${mathRows} text=${textRows} katexErrors=${errCount} overrides=${ovrUsed} flags=${flags.length}`);
