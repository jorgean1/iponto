import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { punch, testAccess } from '../src/automation.js';

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

test('só confirma entrada quando Parar aparece após clicar em uma atividade', async () => {
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'text/html');
    if (req.url.startsWith('/Lancamentos/IniciarAtividade/')) {
      res.end('<a class="btnParar" href="/Lancamentos/PararAtividade">Parar</a>');
    } else {
      res.end(`
        <input><button>Iniciar</button>
        <a class="btnIniciar" href="/Lancamentos/IniciarAtividade/1">Iniciar</a>
        <a class="btnIniciar" href="/Lancamentos/IniciarAtividade/2">Iniciar</a>
        <a class="btnIniciar" href="/Lancamentos/IniciarAtividade/3">Iniciar</a>
      `);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await punch({ targetUrl: `http://127.0.0.1:${server.address().port}`, timezone: 'America/Sao_Paulo' }, 'start');
    assert.match(result.message, /1 de 3|2 de 3|3 de 3/);
  } finally { server.close(); }
});

test('rejeita falso sucesso quando o clique não inicia a atividade', async () => {
  const server = http.createServer((_req, res) => {
    res.setHeader('content-type', 'text/html');
    res.end('<button>Iniciar</button>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await assert.rejects(
      punch({ targetUrl: `http://127.0.0.1:${server.address().port}`, timezone: 'America/Sao_Paulo' }, 'start', { verifyTimeoutMs: 300 }),
      /não foi confirmado/
    );
  } finally { server.close(); }
});
