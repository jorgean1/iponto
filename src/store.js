import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const EMPTY = {
  settings: {
    entryTime: '08:00', lunchTime: '12:00', returnTime: '13:00', exitTime: '17:00',
    username: '', password: '', alertEmail: '', timezone: 'America/Sao_Paulo',
    targetUrl: 'https://controledeprojetos.crptecnologia.com.br/Lancamentos',
    entryActivityCode: '', returnActivityCode: '', enabled: false,
    workingDays: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: false, 7: false },
    excludedDates: '',
    smtp: { host: '', port: 587, secure: false, user: '', password: '', from: '' }
  },
  events: []
};

export class Store {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.file = path.join(dataDir, 'iponto.json');
    this.keyFile = path.join(dataDir, 'iponto.key');
    fs.mkdirSync(dataDir, { recursive: true });
    this.key = this.#loadKey();
    this.data = this.#load();
  }

  #loadKey() {
    const envKey = process.env.IPONTO_MASTER_KEY;
    if (envKey) return crypto.createHash('sha256').update(envKey).digest();
    if (fs.existsSync(this.keyFile)) return Buffer.from(fs.readFileSync(this.keyFile, 'utf8'), 'base64');
    const key = crypto.randomBytes(32);
    fs.writeFileSync(this.keyFile, key.toString('base64'), { mode: 0o600 });
    return key;
  }

  #encrypt(value) {
    if (!value) return '';
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), encrypted.toString('base64')].join(':');
  }

  #decrypt(value) {
    if (!value || !value.startsWith('v1:')) return value || '';
    const [, iv, tag, encrypted] = value.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]).toString('utf8');
  }

  #load() {
    if (!fs.existsSync(this.file)) return structuredClone(EMPTY);
    const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    const data = { ...structuredClone(EMPTY), ...raw, settings: { ...EMPTY.settings, ...raw.settings, workingDays: { ...EMPTY.settings.workingDays, ...raw.settings?.workingDays }, smtp: { ...EMPTY.settings.smtp, ...raw.settings?.smtp } } };
    if (data.settings.targetUrl === 'https://controledeprojetos.crptecnologia.com.br/Lancamento') {
      data.settings.targetUrl = 'https://controledeprojetos.crptecnologia.com.br/Lancamentos';
    }
    if (!data.settings.entryActivityCode && !data.settings.returnActivityCode && data.settings.activityCodes) {
      const legacyCodes = String(data.settings.activityCodes).split(/[,;\s]+/).filter(Boolean);
      data.settings.entryActivityCode = legacyCodes[0] || '';
      data.settings.returnActivityCode = legacyCodes[1] || '';
    }
    data.settings.password = this.#decrypt(data.settings.password);
    data.settings.smtp.password = this.#decrypt(data.settings.smtp.password);
    return data;
  }

  save() {
    const safe = structuredClone(this.data);
    safe.settings.password = this.#encrypt(safe.settings.password);
    safe.settings.smtp.password = this.#encrypt(safe.settings.smtp.password);
    const temp = `${this.file}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(safe, null, 2));
    fs.renameSync(temp, this.file);
  }

  getPublic() {
    const copy = structuredClone(this.data);
    copy.settings.password = copy.settings.password ? '********' : '';
    copy.settings.smtp.password = copy.settings.smtp.password ? '********' : '';
    return copy;
  }

  updateSettings(input) {
    const old = this.data.settings;
    const smtpInput = input.smtp || {};
    this.data.settings = {
      ...old, ...input,
      password: input.password === '********' ? old.password : input.password,
      workingDays: { ...old.workingDays, ...input.workingDays },
      smtp: { ...old.smtp, ...smtpInput, password: smtpInput.password === '********' ? old.smtp.password : smtpInput.password }
    };
    this.save();
    return this.getPublic().settings;
  }

  addEvent(event) {
    this.data.events.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), ...event });
    this.data.events = this.data.events.slice(0, 200);
    this.save();
  }

  clearEvents() {
    const removed = this.data.events.length;
    this.data.events = [];
    this.save();
    return removed;
  }
}
