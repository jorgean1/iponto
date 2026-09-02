import { DateTime } from 'luxon';
import { punch } from './automation.js';
import { sendAlert } from './mailer.js';

const JOBS = [
  { key: 'entryTime', label: 'entrada', kind: 'start' },
  { key: 'lunchTime', label: 'saída para almoço', kind: 'stop' },
  { key: 'returnTime', label: 'retorno do almoço', kind: 'start' },
  { key: 'exitTime', label: 'saída', kind: 'stop' }
];
const CATCH_UP_MINUTES = 15;

export class Scheduler {
  constructor(store) { this.store = store; this.timer = null; this.running = false; }
  start() { this.stop(); this.timer = setInterval(() => this.tick(), 15000); this.tick(); }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }

  async tick() {
    const s = this.store.data.settings;
    if (!s.enabled || this.running) return;
    const now = DateTime.now().setZone(s.timezone);
    const date = now.toISODate();
    for (const job of JOBS) {
      const jobId = `${date}:${job.key}`;
      if (this.store.data.events.some(e => e.jobId === jobId)) continue;
      const [hour, minute] = s[job.key].split(':').map(Number);
      const scheduled = now.startOf('day').set({ hour, minute });
      const delayMinutes = now.diff(scheduled, 'minutes').minutes;
      if (delayMinutes >= 0 && delayMinutes <= CATCH_UP_MINUTES) {
        await this.execute(job, jobId, s[job.key]);
      } else if (delayMinutes > CATCH_UP_MINUTES) {
        this.store.addEvent({
          jobId,
          type: job.label,
          time: s[job.key],
          status: 'error',
          reason: 'serviço estava parado',
          message: `Ponto ${s[job.key]} não executado: o serviço estava parado ou suspenso por mais de ${CATCH_UP_MINUTES} minutos.`
        });
      }
    }
  }

  async execute(job, jobId = `manual:${Date.now()}`, time = DateTime.now().setZone(this.store.data.settings.timezone).toFormat('HH:mm')) {
    this.running = true;
    const s = structuredClone(this.store.data.settings);
    if (job.key === 'entryTime') s.activityCode = String(s.entryActivityCode || '').trim();
    if (job.key === 'returnTime') s.activityCode = String(s.returnActivityCode || '').trim();
    try {
      const result = await punch(s, job.kind);
      const message = `Ponto de ${job.label} ${time} batido com sucesso`;
      this.store.addEvent({ jobId, type: job.label, time, status: 'success', message, detail: result.message });
      try { await sendAlert(s, 'Iponto — ponto registrado', message); }
      catch (mailError) { this.store.addEvent({ jobId: `${jobId}:email`, type: 'email', time, status: 'warning', message: `Ponto registrado, mas o e-mail falhou: ${mailError.message}` }); }
      return { ok: true, message };
    } catch (error) {
      const reason = error.reason || 'outro motivo';
      const message = `Ponto ${time} falhou, motivo ${reason}: ${error.message}`;
      this.store.addEvent({ jobId, type: job.label, time, status: 'error', message, reason });
      try { await sendAlert(s, 'Iponto — falha ao registrar ponto', message); }
      catch (mailError) { this.store.addEvent({ jobId: `${jobId}:email`, type: 'email', time, status: 'warning', message: `O alerta por e-mail também falhou: ${mailError.message}` }); }
      return { ok: false, message };
    } finally { this.running = false; }
  }
}

export { JOBS };
