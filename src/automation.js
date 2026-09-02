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
    if (!startCount && !stopCount) throw new IpontoError('Login concluído, mas os botões Iniciar/Parar não foram encontrados');
    return {
      ok: true,
      status: session.status,
      loginPerformed: session.loginPerformed,
      startButtons: startCount,
      stopButtons: stopCount,
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

    if (kind === 'start' && settings.activityCode) {
      const code = await firstVisible([
        page.getByLabel(/código da atividade/i), page.locator('input[name*="atividade" i]'),
        page.locator('input[placeholder*="atividade" i]')
      ]);
      if (code) await code.fill(settings.activityCode);
    }

    const controls = await visibleActionControls(page, kind);
    if (!controls.length) throw new IpontoError(`Controle ${kind === 'start' ? 'Iniciar' : 'Parar'} não encontrado`);
    const selectedIndex = kind === 'start' ? Math.floor(Math.random() * controls.length) : 0;
    const button = controls[selectedIndex];
    await button.click();
    await page.waitForTimeout(1200);

    const body = await page.locator('body').innerText();
    if (/erro|falha|inválid/i.test(body) && !/sem erro/i.test(body)) throw new IpontoError('O site exibiu uma mensagem de erro após o clique');
    return {
      ok: true,
      message: kind === 'start'
        ? `Botão Iniciar ${selectedIndex + 1} de ${controls.length} acionado aleatoriamente`
        : 'Controle Parar acionado'
    };
  } catch (error) {
    if (error instanceof IpontoError) throw error;
    throw new IpontoError(String(error?.message || error).split('\n')[0], classify(error));
  } finally {
    await session?.context.close().catch(() => {});
    await session?.browser.close().catch(() => {});
  }
}
