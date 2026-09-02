const form = document.querySelector('#settings-form');
const toast = document.querySelector('#toast');
let state;
let knownEventIds = new Set();
let eventsInitialized = false;

const notify = (message) => { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 4200); };

function setPath(obj, path, value) { const bits = path.split('.'); let cur = obj; for (const bit of bits.slice(0,-1)) cur = cur[bit] ||= {}; cur[bits.at(-1)] = value; }
function formData() { const out = {}; for (const el of form.elements) if (el.name) setPath(out, el.name, el.type === 'checkbox' ? el.checked : el.value); return out; }
function fill(data) { for (const el of form.elements) if (el.name) { const value = el.name.split('.').reduce((o,k)=>o?.[k], data); if (el.type === 'checkbox') el.checked = Boolean(value); else if (value != null) el.value = value; } }

function renderEvents(events) {
  const box = document.querySelector('#events');
  if (!events.length) return;
  box.innerHTML = events.map(e => `<div class="event ${e.status}"><span>${escapeHtml(e.message)}</span><small>${new Date(e.at).toLocaleString('pt-BR')}</small></div>`).join('');
}
function escapeHtml(s='') { const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function nextPoint(s) {
  const items = [['entryTime','Entrada'],['lunchTime','Saída para almoço'],['returnTime','Retorno do almoço'],['exitTime','Saída']].map(([k,l])=>({time:s[k],label:l})).sort((a,b)=>a.time.localeCompare(b.time));
  const now = new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:s.timezone});
  return items.find(x=>x.time>now) || items[0];
}
function render(s) { const n=nextPoint(s); document.querySelector('#next-time').textContent=n.time; document.querySelector('#next-label').textContent=n.label; const status=document.querySelector('#status'); status.textContent=s.enabled?'Automação ativa':'Automação pausada'; status.classList.toggle('active',s.enabled); }

async function load() { const res=await fetch('/api/state',{cache:'no-store'}); state=await res.json(); fill(state.settings); render(state.settings); renderEvents(state.events); if(!eventsInitialized){knownEventIds=new Set(state.events.map(e=>e.id));eventsInitialized=true;} }
async function watchPunches() { try { const res=await fetch('/api/state',{cache:'no-store'}); const latest=await res.json(); const punchTypes=new Set(['entrada','saída para almoço','retorno do almoço','saída']); const hasNewSuccess=latest.events.some(e=>!knownEventIds.has(e.id)&&e.status==='success'&&punchTypes.has(e.type)); latest.events.forEach(e=>knownEventIds.add(e.id)); if(hasNewSuccess) location.reload(); } catch {} }
form.addEventListener('submit', async e => { e.preventDefault(); const button=e.submitter; button.disabled=true; try { const res=await fetch('/api/settings',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(formData())}); const data=await res.json(); if(!res.ok) throw new Error(data.error); render(data); notify('Configuração salva.'); } catch(e){notify(e.message)} finally{button.disabled=false} });
document.querySelector('#test-email').addEventListener('click', async e => { e.target.disabled=true; try { const res=await fetch('/api/test-email',{method:'POST'}); const data=await res.json(); if(!res.ok) throw new Error(data.error); notify('E-mail de teste enviado.'); }catch(e){notify(e.message)}finally{e.target.disabled=false} });
document.querySelector('#test-access').addEventListener('click', async e => { e.target.disabled=true; notify('Verificando página e login, sem registrar ponto…'); try { const res=await fetch('/api/test-access',{method:'POST'}); const data=await res.json(); if(!res.ok) throw new Error(data.error); notify(data.message); await load(); }catch(e){notify(e.message); await load();}finally{e.target.disabled=false} });
document.querySelectorAll('[data-job]').forEach(button=>button.addEventListener('click',async()=>{ if(!confirm('Esta ação pode registrar um ponto real no site. Continuar?'))return; button.disabled=true; notify('Executando automação…'); try{const res=await fetch(`/api/run/${button.dataset.job}`,{method:'POST'});const data=await res.json();if(!res.ok)throw new Error(data.message||data.error);notify(data.message);await load()}catch(e){notify(e.message);await load()}finally{button.disabled=false} }));
document.querySelector('#clear-history').addEventListener('click', async e => { if(!confirm('Apagar todo o histórico do Iponto? Esta ação não pode ser desfeita.'))return; e.target.disabled=true; try { const res=await fetch('/api/events',{method:'DELETE'}); const data=await res.json(); if(!res.ok)throw new Error(data.error); document.querySelector('#events').innerHTML='<p class="empty">Nenhuma execução registrada.</p>'; notify(`${data.removed} registro(s) removido(s).`); } catch(error){notify(error.message)} finally{e.target.disabled=false} });
if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
load().then(()=>setInterval(watchPunches,2000)).catch(e=>notify(`Falha ao carregar: ${e.message}`));
