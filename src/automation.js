import { chromium } from 'playwright';

export class IpontoError extends Error {
  constructor(message, reason = 'outro motivo') { super(message); this.reason = reason; }
}

const timeout = 30000;

function classify(error) {
  const message = String(error?.message || error);
  if (/ERR_INTERNET_DISCONNECTED|ERR_NAME_NOT_RESOLVED|ENOTFOUND|network/i.test(message)) return 'sem internet';
  if (/Timeout|timed out|ERR_CONNECTION|404|500|502|503|504/i.test(message)) return 'página não respondeu';
  return 'outro motivo';
}

async function firstVisible(locators) {
  for (const locator of locators) {
    if (await locator.count() && await locator.first().isVisible()) return locator.first();
  }
  return null;
}

async function visibleActionControls(page, kind) {
  const word = kind === 'start' ? 'iniciar' : 'parar';
  const found = [];
  if (kind === 'stop') {
    const exactStop = page.locator('a.btnParar[href*="/Lancamentos/PararAtividade"]');
    for (const item of await exactStop.all()) {
      if (await item.isVisible().catch(() => false)) found.push(item);
    }
    if (found.length) return found;
  }
  if (kind === 'start') {
    const activityLinks = page.locator('a.btnIniciar[onclick*="IniciarAtividade"]');
    for (const item of await activityLinks.all()) {
      if (!await item.isVisible().catch(() => false)) continue;
      const label = await item.innerText().catch(() => '');
      if (/^\s*iniciar\s*$/i.test(label)) found.push(item);
    }
    if (found.length) return found;
  }
  const candidates = page.locator('button, a, input[type="button"], input[type="submit"], [role="button"], [onclick]');
  for (const item of await candidates.all()) {
    if (!await item.isVisible().catch(() => false)) continue;
    const label = await item.evaluate(element => String(
      element.innerText || element.textContent || element.value || element.getAttribute('aria-label') || ''
    ).trim().toLowerCase()).catch(() => '');
    if (label === word || label.includes(word)) found.push(item);
  }
  return found;
}

async function visibleGenericStartControls(page) {
  const found = [];
  const candidates = page.locator('button, input[type="button"], input[type="submit"]');
  for (const item of await candidates.all()) {
    if (!await item.isVisible().catch(() => false)) continue;
    const label = await item.evaluate(element => String(
      element.innerText || element.textContent || element.value || element.getAttribute('aria-label') || ''
    ).trim()).catch(() => '');
    if (/^iniciar$/i.test(label)) found.push(item);
  }
  return found;
}

async function waitForPunchState(page, kind, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let stableAbsenceChecks = 0;
  while (Date.now() < deadline) {
    const stopControls = await visibleActionControls(page, 'stop');
    if (kind === 'start' && stopControls.length > 0) return true;
    if (kind === 'stop' && stopControls.length === 0) {
      stableAbsenceChecks += 1;
      if (stableAbsenceChecks >= 3) return true;
    } else if (kind === 'stop') {
      stableAbsenceChecks = 0;
    }
    await page.waitForTimeout(500);
  }
  return false;
}

async function authenticate(page, settings) {
  const password = page.locator('input[type="password"]');
  if (!await password.count() || !await password.first().isVisible()) return { loggedIn: true, loginPerformed: false };
  if (!settings.username || !settings.password) throw new IpontoError('A página exige login, mas usuário ou senha não estão configurados');
  const user = await firstVisible([
    page.locator('input[name*="usuario" i]'), page.locator('input[name*="login" i]'),
    page.locator('input[type="email"]'), page.locator('input[type="text"]')
  ]);
  if (!user) throw new IpontoError('Campo de usuário não encontrado');
  await user.fill(settings.username);
  await password.first().fill(settings.password);
  const login = await firstVisible([
    page.getByRole('button', { name: /entrar|acessar|login/i }),
    page.locator('button[type="submit"]'), page.locator('input[type="submit"]')
  ]);
  if (!login) throw new IpontoError('Botão de login não encontrado');
  await Promise.allSettled([page.waitForLoadState('domcontentloaded', { timeout }), login.click()]);
  await page.waitForTimeout(2500);
  if (await password.first().isVisible().catch(() => false)) throw new IpontoError('Login não confirmado; verifique usuário e senha');
  return { loggedIn: true, loginPerformed: true };
}

async function openTarget(settings, options = {}) {
  const browser = await chromium.launch({ headless: options.headless ?? process.env.IPONTO_HEADLESS !== 'false' });
  const context = await browser.newContext({ locale: 'pt-BR', timezoneId: settings.timezone });
  const page = await context.newPage();
  try {
    const response = await page.goto(settings.targetUrl, { waitUntil: 'domcontentloaded', timeout });
    if (!response || response.status() >= 400) throw new IpontoError(`Página respondeu HTTP ${response?.status() || 'desconhecido'}`, 'página não respondeu');
    const auth = await authenticate(page, settings);
    return { browser, context, page, status: response.status(), ...auth };
  } catch (error) {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    if (error instanceof IpontoError) throw error;
    throw new IpontoError(String(error?.message || error).split('\n')[0], classify(error));
  }
}

export async function testAccess(settings, options = {}) {
  let session;
  try {
    session = await openTarget(settings, options);
    await session.page.waitForTimeout(1500);
    const startCount = (await visibleActionControls(session.page, 'start')).length;
    const stopCount = (await visibleActionControls(session.page, 'stop')).length;
    const startTargets = await session.page.locator('a.btnIniciar').evaluateAll(elements => elements
      .filter(element => /^\s*iniciar\s*$/i.test(element.textContent || ''))
      .map(element => element.getAttribute('href'))
      .filter(Boolean));
    const startControls = await session.page.locator('button, a, input[type="button"], input[type="submit"], [role="button"], [onclick]').evaluateAll(elements => elements
      .filter(element => {
        const label = String(element.innerText || element.textContent || element.value || element.getAttribute('aria-label') || '').trim();
        const style = getComputedStyle(element);
        return /^iniciar$/i.test(label) && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map(element => ({
        tag: element.tagName.toLowerCase(),
        className: String(element.className || ''),
        href: element.getAttribute('href') || '',
        value: element.value || '',
        onclick: element.getAttribute('onclick') || '',
        parentClass: String(element.parentElement?.className || '')
      })));
    if (!startCount && !stopCount) throw new IpontoError('Login concluído, mas os botões Iniciar/Parar não foram encontrados');
    return {
      ok: true,
      status: session.status,
      loginPerformed: session.loginPerformed,
      startButtons: startCount,
      stopButtons: stopCount,
      startTargets,
      startControls,
      finalUrl: session.page.url()
    };
  } catch (error) {
    if (error instanceof IpontoError) throw error;
    throw new IpontoError(String(error?.message || error).split('\n')[0], classify(error));
  } finally {
    await session?.context.close().catch(() => {});
    await session?.browser.close().catch(() => {});
  }
}

export async function punch(settings, kind, options = {}) {
  let session;
  try {
    session = await openTarget(settings, options);
    const page = session.page;
    const codeUsed = kind === 'start' ? String(settings.activityCode || '').trim() : '';
    const attempted = new Set();
    let selectedDescription = '';
    let confirmed = false;
    const maxAttempts = Number(options.maxAttempts || 3);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        const response = await page.goto(settings.targetUrl, { waitUntil: 'domcontentloaded', timeout });
        if (!response || response.status() >= 400) throw new IpontoError(`Página respondeu HTTP ${response?.status() || 'desconhecido'}`, 'página não respondeu');
        await authenticate(page, settings);
        await page.waitForTimeout(1200);
      }

      const currentStops = await visibleActionControls(page, 'stop');
      if (kind === 'start' && currentStops.length) { confirmed = true; selectedDescription ||= 'atividade já estava em andamento'; break; }
      if (kind === 'stop' && !currentStops.length) { confirmed = true; selectedDescription ||= 'atividade já estava parada'; break; }

      let controls;
      if (kind === 'start' && codeUsed) {
        const code = await firstVisible([
          page.getByLabel(/código da atividade/i), page.locator('input[name*="atividade" i]'),
          page.locator('input[placeholder*="atividade" i]')
        ]);
        if (!code) throw new IpontoError('Campo Código da atividade não encontrado');
        await code.fill(codeUsed);
        controls = await visibleGenericStartControls(page);
      } else {
        controls = await visibleActionControls(page, kind);
      }
      if (!controls.length) throw new IpontoError(`Controle ${kind === 'start' ? 'Iniciar' : 'Parar'} não encontrado`);

      let choices = [];
      for (let index = 0; index < controls.length; index++) {
        const signature = await controls[index].getAttribute('onclick').catch(() => null)
          || await controls[index].getAttribute('href').catch(() => null)
          || `${kind}-${index}`;
        if (!attempted.has(signature)) choices.push({ control: controls[index], signature, index });
      }
      if (!choices.length) choices = controls.map((control, index) => ({ control, signature: `${kind}-repeat-${attempt}-${index}`, index }));
      const choice = kind === 'start' && !codeUsed ? choices[Math.floor(Math.random() * choices.length)] : choices[0];
      attempted.add(choice.signature);
      selectedDescription = codeUsed
        ? `código ${codeUsed}`
        : kind === 'start' ? `atividade ${choice.index + 1} de ${controls.length}` : 'controle Parar';

      const clickResult = await Promise.allSettled([choice.control.click()]);
      if (clickResult[0].status === 'rejected') continue;
      confirmed = await waitForPunchState(page, kind, options.verifyTimeoutMs ?? 15000);
      if (confirmed) break;
    }

    if (!confirmed) throw new IpontoError(
      kind === 'start'
        ? `Não foi possível iniciar a atividade após ${maxAttempts} tentativa(s) confirmadas`
        : `Não foi possível parar a atividade após ${maxAttempts} tentativa(s) confirmadas`
    );

    const refreshed = await page.goto(settings.targetUrl, { waitUntil: 'domcontentloaded', timeout });
    if (!refreshed || refreshed.status() >= 400) throw new IpontoError('Falha ao atualizar a página para confirmar o ponto', 'página não respondeu');
    await authenticate(page, settings);
    await page.waitForTimeout(1200);
    const confirmedAfterRefresh = await waitForPunchState(page, kind, options.verifyTimeoutMs ?? 15000);
    if (!confirmedAfterRefresh) throw new IpontoError(
      kind === 'start'
        ? 'Após atualizar /Lancamentos, a atividade não permaneceu em andamento'
        : 'Após atualizar /Lancamentos, a atividade ainda aparece em andamento'
    );

    const body = await page.locator('body').innerText();
    if (/erro|falha|inválid/i.test(body) && !/sem erro/i.test(body)) throw new IpontoError('O site exibiu uma mensagem de erro após o clique');
    return {
      ok: true,
      message: kind === 'start'
        ? `Entrada confirmada no site usando ${selectedDescription}`
        : `Saída confirmada no site usando ${selectedDescription}`
    };
  } catch (error) {
    if (error instanceof IpontoError) throw error;
    throw new IpontoError(String(error?.message || error).split('\n')[0], classify(error));
  } finally {
    await session?.context.close().catch(() => {});
    await session?.browser.close().catch(() => {});
  }
}
