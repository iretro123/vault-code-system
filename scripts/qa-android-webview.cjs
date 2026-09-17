// Attach to a DEBUG WebView exposed by adb forward. Credentials only from env.
// Login/navigation only: no message, purchase, reset email, or account deletion.
const { chromium } = require('/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.connectOverCDP(process.env.QA_CDP || 'http://127.0.0.1:9229');
  const page = browser.contexts()[0].pages()[0];
  page.setDefaultTimeout(25000);
  const out = process.env.QA_OUT || '/tmp/vault-android-functional';
  fs.mkdirSync(out, { recursive: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    if (page.url().endsWith('/welcome') || await page.getByRole('button', { name: /Log in to your account/ }).count()) {
      assert.equal(await page.getByRole('button', { name: 'Restore Google Play Purchase' }).count(), 1);
      await page.screenshot({ path: out + '/welcome.png' });
      await page.getByRole('button', { name: /Log in to your account/ }).click();
    }
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await page.getByRole('button', { name: 'Back to sign in' }).click();
    if (!process.env.QA_EMAIL || !process.env.QA_PASSWORD) throw Error('Test credentials required in environment');
    await page.getByPlaceholder('Email', { exact: true }).fill(process.env.QA_EMAIL);
    await page.getByPlaceholder('Password', { exact: true }).fill(process.env.QA_PASSWORD);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('**/academy/**', { timeout: 45000 });
    for (const tab of ['Chat', 'Learn', 'Home']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      await page.getByRole('button', { name: 'Menu', exact: true }).waitFor();
      await page.screenshot({ path: `${out}/${tab}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Horizontal overflow: ${tab}`);
    }
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByRole('link', { name: /^(Vault )?Live$/ }).click();
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    assert.deepEqual(errors, []);
    console.log('PASS: native Android WebView welcome/store label, recovery/back, real sign-in, Chat/Learn/Home/Menu/Live/Home, no observed horizontal overflow or page errors. No writes beyond login.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
