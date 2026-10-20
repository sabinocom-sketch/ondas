import {test,expect} from '../fixtures';
test('build de produção inicia áudio e funciona offline após cache',async({page,context})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.locator('.key')).toHaveCount(49);
 await page.getByRole('button',{name:'Ativar áudio'}).click();await expect(page.getByText('Áudio ativo',{exact:true})).toBeVisible();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready});
 await page.reload();await expect(page.locator('.key')).toHaveCount(49);
 await expect.poll(()=>page.evaluate(async()=>{const cache=await caches.open('ondas-v1');const keys=await cache.keys();return keys.some(r=>r.url.endsWith('.js')&&r.url.includes('/assets/'))})).toBe(true);
 await context.setOffline(true);await page.reload();await expect(page.locator('.key')).toHaveCount(49);
 await page.getByRole('button',{name:'Ativar áudio'}).click();await expect(page.getByText('Áudio ativo',{exact:true})).toBeVisible();expect(errors).toEqual([]);
});
