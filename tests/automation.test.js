import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { testAccess } from '../src/automation.js';

test('detecta três controles Iniciar e o link Parar personalizado', async () => {
  const server = http.createServer((_req, res) => {
    res.setHeader('content-type', 'text/html');
    res.end(`
      <a href="/Lancamentos/IniciarAtividade/1">Iniciar</a>
      <a href="/Lancamentos/IniciarAtividade/2">Iniciar</a>
      <button>Iniciar</button>
      <a class="action-button btn btn-danger btnIniciar btnParar" onclick="loadingModal(true)" href="/Lancamentos/PararAtividade">Parar</a>
    `);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await testAccess({
      targetUrl: `http://127.0.0.1:${server.address().port}`,
      timezone: 'America/Sao_Paulo'
    });
    assert.equal(result.startButtons, 3);
    assert.equal(result.stopButtons, 1);
  } finally {
    server.close();
  }
});
