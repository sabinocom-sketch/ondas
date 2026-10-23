import {readFileSync} from 'node:fs';
import {test,expect} from '../fixtures';

test.beforeEach(async({page})=>{if(process.env.ONDAS_ISOLATED){const js=readFileSync('dist-test/fixture.js','utf8'),css=readFileSync('src/styles.css','utf8')+readFileSync('src/composer.css','utf8');await page.route('**/*',async route=>{const path=new URL(route.request().url()).pathname;if(path==='/')await route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>'});else if(path==='/fixture.js')await route.fulfill({contentType:'text/javascript; charset=utf-8',body:js});else await route.fulfill({status:404,body:''})})}await page.goto('/',{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Ativar áudio'}).click();await page.getByRole('button',{name:'Compor',exact:true}).click()});

test('compositor v2: pistas, blocos, escala, persistência e ficheiro versionado',async({page})=>{
 await page.getByRole('button',{name:'Adicionar nota',exact:true}).click();
 await page.getByRole('button',{name:'+ Pista',exact:true}).click();
 await page.getByLabel('Nome da pista').fill('Melodia');await page.getByLabel('Instrumento da pista').selectOption('lead');
 await page.getByLabel('Nota da composição').selectOption('67');await page.getByRole('button',{name:'Adicionar nota',exact:true}).click();
 await page.getByRole('button',{name:'Duplicar bloco',exact:true}).click();await page.getByLabel('Nome do bloco').fill('Refrão');
 await expect(page.locator('.song-block-list button')).toHaveCount(2);await expect(page.locator('.track-tabs button')).toHaveCount(2);
 await page.getByLabel('Tonalidade',{exact:true}).selectOption('2');await page.getByLabel('Escala',{exact:true}).selectOption('minor');await page.getByRole('checkbox',{name:'Restringir novas notas à escala'}).check();
 await page.getByLabel('Grau do acorde').selectOption('4');await page.getByLabel('Compasso do acorde').selectOption('2');await page.getByLabel('Tempo do acorde').selectOption('0');await page.getByLabel('Duração do acorde').selectOption('16');await page.getByRole('button',{name:'Inserir acorde'}).click();await expect(page.locator('[data-roll-note]')).toHaveCount(4);await expect(page.locator('[data-roll-note][aria-label*="passo 17"][aria-label*="duração 16"]')).toHaveCount(3);await expect(page.getByLabel('Compasso do acorde')).toHaveValue('3');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Guardar projeto'}).click();const saved=await download;expect(saved.suggestedFilename()).toBe('ondas-projeto-v2.json');const path=test.info().outputPath('projeto-v2.json');await saved.saveAs(path);const project=JSON.parse(readFileSync(path,'utf8'));expect(project.version).toBe(2);expect(project.blocks).toHaveLength(2);expect(project.order).toHaveLength(2);expect(project.blocks[1].tracks).toHaveLength(2);
 await page.reload({waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Compor',exact:true}).click();await expect(page.locator('.song-block-list button')).toHaveCount(2);await page.locator('.song-block-list button').nth(1).click();await expect(page.getByLabel('Nome do bloco')).toHaveValue('Refrão');
 const before=await page.locator('[data-roll-note]').count();await page.getByLabel('Ficheiro de composição').setInputFiles({name:'inválido.json',mimeType:'application/json',buffer:Buffer.from('{"version":2}')});await expect(page.locator('.roll-status')).toContainText('projeto atual foi preservado');await expect(page.locator('[data-roll-note]')).toHaveCount(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:test.info().outputPath('compositor-v2.png'),fullPage:true});
});

test('piano roll apaga diretamente uma nota com clique direito',async({page})=>{
 await page.getByRole('button',{name:'Adicionar nota',exact:true}).click();await expect(page.locator('[data-roll-note]')).toHaveCount(1);
 await page.locator('[data-roll-note]').click({button:'right'});await expect(page.locator('[data-roll-note]')).toHaveCount(0);await expect(page.locator('.roll-status')).toContainText('Nota apagada');
});

test('acordes usam durações musicais, podem atravessar compassos e avançam o início',async({page})=>{
 await page.getByLabel('Compasso do acorde').selectOption('1');await page.getByLabel('Tempo do acorde').selectOption('8');await page.getByLabel('Duração do acorde').selectOption('2');await page.getByRole('button',{name:'Inserir acorde'}).click();
 await expect(page.locator('[data-roll-note][aria-label*="passo 9"][aria-label*="duração 2"]')).toHaveCount(3);await expect(page.getByLabel('Tempo do acorde')).toHaveValue('10');
 await page.getByLabel('Tempo do acorde').selectOption('12');await page.getByLabel('Duração do acorde').selectOption('8');await page.getByRole('button',{name:'Inserir acorde'}).click();
 await expect(page.locator('[data-roll-note][aria-label*="passo 13"][aria-label*="duração 8"]')).toHaveCount(3);await expect(page.getByLabel('Compasso do acorde')).toHaveValue('2');await expect(page.getByLabel('Tempo do acorde')).toHaveValue('4');
 await page.getByLabel('Duração do acorde').selectOption('4');await page.getByRole('button',{name:'Inserir acorde'}).click();await expect(page.getByLabel('Tempo do acorde')).toHaveValue('8');
});

test('exporta a sequência completa para WAV estéreo com sinal',async({page})=>{
 test.setTimeout(180000);await page.getByRole('button',{name:'Adicionar nota',exact:true}).click();await page.getByLabel('Duração da nota').fill('8');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar composição WAV'}).click();const file=await download;expect(file.suggestedFilename()).toBe('ondas-composicao.wav');const path=test.info().outputPath('ondas-composicao.wav');await file.saveAs(path);const bytes=readFileSync(path),view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let peak=0;for(let i=44;i<bytes.byteLength;i+=2)peak=Math.max(peak,Math.abs(view.getInt16(i,true)));expect(bytes.subarray(0,4).toString()).toBe('RIFF');expect(view.getUint16(22,true)).toBe(2);expect(peak).toBeGreaterThan(10);
});
