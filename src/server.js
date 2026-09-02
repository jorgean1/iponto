import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store } from './store.js';
import { Scheduler, JOBS } from './scheduler.js';
import { sendAlert } from './mailer.js';
import { testAccess } from './automation.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const store = new Store(path.join(root, 'data'));
const scheduler = new Scheduler(store);
const app = express();

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(root, 'public')));

app.get('/api/state', (_req, res) => res.json(store.getPublic()));
app.put('/api/settings', (req, res) => {
  const body = req.body || {};
  const required = ['entryTime', 'lunchTime', 'returnTime', 'exitTime', 'username', 'alertEmail', 'targetUrl'];
  const missing = required.filter(k => !body[k]);
  if (missing.length) return res.status(400).json({ error: `Campos obrigatórios: ${missing.join(', ')}` });
  if (!/^https:\/\//i.test(body.targetUrl)) return res.status(400).json({ error: 'A URL deve começar com https://' });
  const settings = store.updateSettings(body);
  scheduler.start();
  res.json(settings);
});

app.post('/api/test-email', async (_req, res) => {
  try { await sendAlert(store.data.settings, 'Iponto — teste de e-mail', 'Configuração de e-mail validada com sucesso.'); res.json({ ok: true }); }
  catch (error) { res.status(400).json({ error: error.message }); }
});

app.post('/api/test-access', async (_req, res) => {
  const settings = structuredClone(store.data.settings);
  try {
    const result = await testAccess(settings);
    const login = result.loginPerformed ? 'login realizado' : 'sessão já autenticada';
    const message = `Acesso validado: HTTP ${result.status}, ${login}, ${result.startButtons} botão(ões) Iniciar e ${result.stopButtons} botão(ões) Parar encontrados.`;
    store.addEvent({ jobId: `access:${Date.now()}`, type: 'teste de acesso', status: 'success', message });
    res.json({ ...result, message });
  } catch (error) {
    const reason = error.reason || 'outro motivo';
    const message = `Teste de acesso falhou, motivo ${reason}: ${error.message}`;
    store.addEvent({ jobId: `access:${Date.now()}`, type: 'teste de acesso', status: 'error', reason, message });
    res.status(502).json({ ok: false, error: message });
  }
});

app.delete('/api/events', (_req, res) => {
  const removed = store.clearEvents();
  res.json({ ok: true, removed });
});

app.post('/api/run/:job', async (req, res) => {
  const job = JOBS.find(j => j.key === req.params.job);
  if (!job) return res.status(404).json({ error: 'Agendamento desconhecido' });
  if (scheduler.running) return res.status(409).json({ error: 'Já existe uma automação em andamento' });
  const result = await scheduler.execute(job);
  res.status(result.ok ? 200 : 500).json(result);
});

app.get('/api/health', (_req, res) => res.json({ ok: true, scheduler: store.data.settings.enabled ? 'active' : 'paused' }));
app.use((_req, res) => res.sendFile(path.join(root, 'public', 'index.html')));

const port = Number(process.env.PORT || 3077);
const host = process.env.IPONTO_HOST || '0.0.0.0';
app.listen(port, host, () => console.log(`Iponto disponível em http://localhost:${port}`));
scheduler.start();
