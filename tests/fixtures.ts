import {test as base, expect} from '@playwright/test';

// Own the test browser explicitly: some Windows Chrome installations hang
// on graceful shutdown. The deadline applies only AFTER all assertions.
export const test = base.extend({
  browser: [async ({playwright, browserName, channel, headless}, use) => {
    const server = await playwright[browserName].launchServer({channel, headless});
    const browser = await playwright[browserName].connect(server.wsEndpoint());
    try {
      await use(browser);
    } finally {
      const forceClose = setTimeout(() => { void server.kill().catch(() => {}); }, 5000);
      try {
        await browser.close();
        await server.close();
      } finally {
        clearTimeout(forceClose);
      }
    }
  }, {scope:'worker'}],
});
export {expect};
