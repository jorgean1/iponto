import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('extensão possui permissões e destinos necessários', () => {
  const manifest = JSON.parse(fs.readFileSync(new URL('../extension/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.permissions.includes('tabs'));
  assert.ok(manifest.host_permissions.includes('http://localhost:3077/*'));
  assert.ok(manifest.host_permissions.includes('https://controledeprojetos.crptecnologia.com.br/*'));
  assert.equal(manifest.background.service_worker, 'background.js');
});

test('extensão monitora somente sucessos confirmados de ponto', () => {
  const source = fs.readFileSync(new URL('../extension/background.js', import.meta.url), 'utf8');
  assert.match(source, /event\.status === 'success'/);
  assert.match(source, /PUNCH_TYPES\.has\(event\.type\)/);
  assert.match(source, /chrome\.tabs\.reload/);
});
