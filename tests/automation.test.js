import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { punch, testAccess } from '../src/automation.js';

test('detecta três controles Iniciar e o link Parar personalizado', async () => {
  const server = http.createServer((_req, res) => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(`
      <script>function IniciarAtividade(id){ location.href='/Lancamentos/IniciarAtividade/'+id }</script>
      <button>Iniciar</button>
      <a class="btnIniciar" onclick="IniciarAtividade(1, 10)">Iniciar</a>
      <a class="btnIniciar" onclick="IniciarAtividade(2, 10)">Iniciar</a>
      <a class="btnIniciar" onclick="IniciarAtividade(3, 10)">Iniciar</a>
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
  let active = false;
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    if (req.url.startsWith('/Lancamentos/IniciarAtividade/')) {
      startedPageLoads += 1;
      active = true;
      res.end('<section><b>217696 - [SEED] Analisar Requisitos</b><a class="btnParar" href="/Lancamentos/PararAtividade">Parar</a></section>');
    } else if (active) {
      startedPageLoads += 1;
      res.end('<section><b>217696 - [SEED] Analisar Requisitos</b><a class="btnParar" href="/Lancamentos/PararAtividade">Parar</a></section>');
    } else {
      res.end(`
        <script>function IniciarAtividade(id){ location.href='/Lancamentos/IniciarAtividade/'+id }</script>
        <input><button>Iniciar</button>
        <a class="btnIniciar" onclick="IniciarAtividade(1, 10)">Iniciar</a>
        <a class="btnIniciar" onclick="IniciarAtividade(2, 10)">Iniciar</a>
        <a class="btnIniciar" onclick="IniciarAtividade(3, 10)">Iniciar</a>
      `);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await punch({ targetUrl: `http://127.0.0.1:${server.address().port}`, timezone: 'America/Sao_Paulo' }, 'start');
    assert.match(result.message, /atividade [123] de 3/);
    assert.deepEqual(result.activity, { code: '217696', description: '[SEED] Analisar Requisitos' });
    assert.ok(startedPageLoads >= 2, 'a página iniciada deve ser carregada novamente para confirmação');
  } finally { server.close(); }
});

test('rejeita falso sucesso quando o clique não inicia a atividade', async () => {
  const server = http.createServer((_req, res) => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end('<button>Iniciar</button>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await assert.rejects(
      punch({ targetUrl: `http://127.0.0.1:${server.address().port}`, timezone: 'America/Sao_Paulo' }, 'start', { verifyTimeoutMs: 300 }),
      /Não foi possível iniciar/
    );
  } finally { server.close(); }
});

test('usa o código configurado no botão genérico sem sortear atividade', async () => {
  let requestedUrl = '';
  let active = false;
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    if (req.url.startsWith('/started')) {
      requestedUrl = req.url;
      active = true;
      res.end('<section><b>217696 - [SEED] Analisar Requisitos</b><a class="btnParar" href="/Lancamentos/PararAtividade">Parar</a></section>');
    } else if (active) {
      res.end('<section><b>217696 - [SEED] Analisar Requisitos</b><a class="btnParar" href="/Lancamentos/PararAtividade">Parar</a></section>');
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
    assert.deepEqual(result.activity, { code: '217696', description: '[SEED] Analisar Requisitos' });
    assert.match(requestedUrl, /codigoAtividade=217696/);
    assert.doesNotMatch(requestedUrl, /random/);
  } finally { server.close(); }
});

test('inclui código e descrição da atividade parada', async () => {
  let active = true;
  const server = http.createServer((req, res) => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    if (req.url.startsWith('/Lancamentos/PararAtividade')) active = false;
    res.end(active
      ? '<section><div>Atual</div><strong>217153 - Análise e detalhamento de requisitos</strong><a class="btnParar" href="/Lancamentos/PararAtividade">Parar</a></section>'
      : '<p>Nenhuma atividade em andamento</p>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await punch({ targetUrl: `http://127.0.0.1:${server.address().port}`, timezone: 'America/Sao_Paulo' }, 'stop');
    assert.deepEqual(result.activity, { code: '217153', description: 'Análise e detalhamento de requisitos' });
  } finally { server.close(); }
});
