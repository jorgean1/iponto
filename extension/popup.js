const connection = document.querySelector('#connection');
const checked = document.querySelector('#checked');
const event = document.querySelector('#event');
const result = document.querySelector('#result');
const button = document.querySelector('#refresh');

function date(value) { return value ? new Date(value).toLocaleString('pt-BR') : '—'; }
function render(status) {
  connection.textContent = status.connected ? 'Conectado ao Iponto' : `Iponto indisponível${status.error ? `: ${status.error}` : ''}`;
  connection.className = `status ${status.connected ? 'ok' : 'error'}`;
  checked.textContent = date(status.checkedAt);
  event.textContent = status.latestSuccess ? `${status.latestSuccess.message} (${date(status.latestSuccess.at)})` : 'Nenhum ponto confirmado';
}

chrome.runtime.sendMessage({ type: 'status' }, render);
button.addEventListener('click', () => {
  button.disabled = true; result.textContent = 'Atualizando...';
  chrome.runtime.sendMessage({ type: 'refresh-now' }, response => {
    button.disabled = false;
    result.textContent = response?.ok ? `${response.reloaded} aba(s) atualizada(s).` : `Falha: ${response?.error || 'erro desconhecido'}`;
  });
});
