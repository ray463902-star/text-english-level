
const LEVELS = ['A1','A2','B1','B2','C1','C2'];
let questions = [];
let posterior = [1,1,1,1,1,1];
let asked = new Set();
let history = [];
let qCount = 0;
let minQ = 12, maxQ = 25;

async function loadQuestions(){
  const res = await fetch('questions.json');
  questions = await res.json();
  document.getElementById('startBtn').disabled = false;
}

function normalize(arr){ const s = arr.reduce((a,b)=>a+b,0); return s?arr.map(x=>x/s):arr.map(()=>1/arr.length); }
function entropy(dist){ return -dist.reduce((sum,p)=> sum + (p>0 ? p*Math.log2(p) : 0),0); }
function estimatedLevel(){ const d=normalize(posterior); return d.reduce((acc,p,i)=>acc + i*p,0); }
function pickLevel(){ return Math.max(0,Math.min(5, Math.round(estimatedLevel()))); }
function pickQuestionAtLevel(level){
  const candidates = questions.map((q,i)=>({q,i})).filter(o=>o.q.level===level && !asked.has(o.i));
  if(candidates.length) return candidates[Math.floor(Math.random()*candidates.length)];
  const rest = questions.map((q,i)=>({q,i})).filter(o=>!asked.has(o.i));
  if(rest.length) return rest[Math.floor(Math.random()*rest.length)];
  return null;
}

const pHighCorrect=0.85, pLowCorrect=0.25;
function updatePosterior(qLevel, correct){
  for(let L=0;L<posterior.length;L++){
    posterior[L] *= correct ? (L>=qLevel? pHighCorrect : pLowCorrect) : (L>=qLevel? (1-pHighCorrect) : (1-pLowCorrect));
  }
  posterior = normalize(posterior);
}

function showStart(){
  document.getElementById('intro').style.display='block';
  document.getElementById('quiz').style.display='none';
  document.getElementById('result').style.display='none';
}

function startTest(){
  posterior = [1,1,1,1,1,1]; asked.clear(); history=[]; qCount=0;
  minQ = Number(document.getElementById('minQ').value) || 12;
  maxQ = Number(document.getElementById('maxQ').value) || 25;
  document.getElementById('intro').style.display='none';
  document.getElementById('quiz').style.display='block';
  nextQuestion(pickLevel());
}

let current=null;
function renderQuestion(obj){
  current=obj;
  document.getElementById('qnum').textContent = qCount+1;
  document.getElementById('curLevel').textContent = LEVELS[obj.q.level];
  const qtext = document.getElementById('qtext'); qtext.textContent = obj.q.text;
  const opts = document.getElementById('opts'); opts.innerHTML='';
  obj.q.choices.forEach((c,idx)=>{
    const d=document.createElement('div'); d.className='opt'; d.textContent=c; d.dataset.idx=idx;
    d.onclick=()=>{ Array.from(opts.children).forEach(n=>n.classList.remove('selected')); d.classList.add('selected'); };
    opts.appendChild(d);
  });
  document.getElementById('entropy').textContent = entropy(normalize(posterior)).toFixed(3);
}

function nextQuestion(preferred){
  qCount++;
  const lvl = preferred!==undefined?preferred:pickLevel();
  const picked = pickQuestionAtLevel(lvl);
  if(!picked){ finish(); return; }
  asked.add(picked.i);
  renderQuestion(picked);
}

function submitAnswer(){
  const sel = document.querySelector('.opt.selected');
  if(!sel){ alert('Please select an option or press Skip'); return; }
  const chosen = Number(sel.dataset.idx);
  const correct = chosen === current.q.answer;
  history.push({q: current.q.text, level: current.q.level, correct});
  updatePosterior(current.q.level, correct);
  const ent = entropy(normalize(posterior));
  if(qCount >= minQ && (ent < 0.45 || qCount >= maxQ)){ finish(); return; }
  nextQuestion(pickLevel());
}

function skip(){
  history.push({q: current.q.text, level: current.q.level, correct:false, skipped:true});
  updatePosterior(current.q.level, false);
  if(qCount >= minQ && (entropy(normalize(posterior))<0.45 || qCount>=maxQ)){ finish(); return; }
  nextQuestion(pickLevel());
}

function finish(){
  document.getElementById('quiz').style.display='none';
  document.getElementById('result').style.display='block';
  const est = estimatedLevel(); const rounded = Math.round(est);
  const dist = normalize(posterior);
  document.getElementById('finalLevel').textContent = LEVELS[rounded];
  const ul = document.getElementById('probList'); ul.innerHTML='';
  dist.forEach((p,i)=>{ const li = document.createElement('li'); li.textContent = `${LEVELS[i]}: ${(p*100).toFixed(1)}%`; ul.appendChild(li); });
  const hist = document.getElementById('history'); hist.innerHTML='';
  history.forEach(h=>{ const li=document.createElement('li'); li.innerHTML=`[${LEVELS[h.level]}] ${h.q} — ${h.correct?'<span style="color:green">Correct</span>':(h.skipped?'<span style="orange">Skipped</span>':'<span style="color:red">Wrong</span>')}`; hist.appendChild(li); });
}

window.addEventListener('load', ()=>{ loadQuestions(); showStart(); });
