import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('interface possui as cinco seções recolhíveis', () => {
  for (const section of ['hours', 'access', 'email', 'manual', 'history']) {
    assert.match(html, new RegExp(`data-section="${section}"`));
  }
  assert.match(html, /data-section="hours" open/);
  assert.match(app, /panel\.open=!configured/);
});

test('menu Ajuda oferece manual e modal Sobre na versão do pacote', () => {
  assert.match(html, /href="\/manual\.pdf"/);
  assert.match(html, /id="about-dialog"/);
  assert.match(html, new RegExp(`Versão ${pkg.version.replaceAll('.', '\\.')}`));
});

test('campo de senha SMTP identifica o uso da senha de app do Google', () => {
  assert.match(html, /Senha SMTP \(App Google\)/);
});
