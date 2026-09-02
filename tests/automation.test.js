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
  let startedPageLoads = 0;
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'text/html');
    if (req.url.startsWith('/Lancamentos/IniciarAtividade/')) {
      startedPageLoads += 1;
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
    assert.ok(startedPageLoads >= 2, 'a página iniciada deve ser carregada novamente para confirmação');
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

test('usa o código configurado no botão genérico sem sortear atividade', async () => {
  let requestedUrl = '';
  const server = http.createServer((req, res) => {
    requestedUrl = req.url;
    res.setHeader('content-type', 'text/html');
    if (req.url.startsWith('/started')) {
      res.end('<a class="btnParar" href="/Lancamentos/PararAtividade">Parar</a>');
    } else {
      res.end(`
        <form action="/started"><input name="codigoAtividade"><button type="submit">Iniciar</button></form>
        <a class="btnIniciar" href="/random/1">Iniciar</a>
        <a class="btnIniciar" href="/random/2">Iniciar</a>
        <a class="btnIniciar" href="/random/3">Iniciar</a>
      `);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await punch({
      targetUrl: `http://127.0.0.1:${server.address().port}`,
      timezone: 'America/Sao_Paulo', activityCode: '217696'
    }, 'start');
    assert.match(result.message, /217696/);
    assert.match(requestedUrl, /codigoAtividade=217696/);
    assert.doesNotMatch(requestedUrl, /random/);
  } finally { server.close(); }
});
