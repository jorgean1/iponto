import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.js';

test('protege senhas no arquivo e preserva na edição mascarada', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iponto-'));
  const store = new Store(dir);
  store.updateSettings({ password: 'segredo-site', smtp: { password: 'segredo-email' } });
  const raw = fs.readFileSync(path.join(dir, 'iponto.json'), 'utf8');
  assert.equal(raw.includes('segredo-site'), false);
  assert.equal(raw.includes('segredo-email'), false);
  const reloaded = new Store(dir);
  assert.equal(reloaded.data.settings.password, 'segredo-site');
  reloaded.updateSettings({ password: '********', smtp: { password: '********' } });
  assert.equal(reloaded.data.settings.password, 'segredo-site');
});

test('limpa somente o histórico e preserva as configurações', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iponto-'));
  const store = new Store(dir);
  store.updateSettings({ username: 'usuario-teste' });
  store.addEvent({ status: 'success', message: 'teste' });
  assert.equal(store.clearEvents(), 1);
  assert.equal(store.data.events.length, 0);
  assert.equal(store.data.settings.username, 'usuario-teste');
});

test('mantém códigos separados para primeira e segunda entrada', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iponto-'));
  const store = new Store(dir);
  store.updateSettings({ entryActivityCode: '111', returnActivityCode: '222' });
  const reloaded = new Store(dir);
  assert.equal(reloaded.data.settings.entryActivityCode, '111');
  assert.equal(reloaded.data.settings.returnActivityCode, '222');
});
