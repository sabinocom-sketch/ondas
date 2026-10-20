import {chromium} from 'playwright';
import {appendFileSync,writeFileSync} from 'node:fs';
const log=(m)=>appendFileSync('browser-probe.log',new Date().toISOString()+' '+m+'\n');
writeFileSync('browser-probe.log','');
let browser;
try{
 log('launch');
 browser=await chromium.launch({channel:process.env.PLAYWRIGHT_CHANNEL||'chrome',timeout:30000,headless:true});
 log('launched');
 const page=await browser.newPage();
 log('page');
 await page.setContent('<h1>Ondas diagnostic</h1>',{timeout:10000});
 log('content: '+await page.locator('h1').textContent());
 log('audio: '+JSON.stringify(await page.evaluate(async()=>{const c=new OfflineAudioContext(1,4800,48000),o=c.createOscillator();o.connect(c.destination);o.start();const b=await c.startRendering();return{samples:b.length,peak:Math.max(...b.getChannelData(0))}})));
}catch(e){log(String(e));process.exitCode=1}finally{await browser?.close();log('closed')}
