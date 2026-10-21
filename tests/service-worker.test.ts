import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

describe('Cache dos instrumentos',()=>{
 it('a ativação só elimina versões antigas da aplicação e preserva amostras',()=>{const source=readFileSync('public/sw.js','utf8');expect(source).toMatch(/\.startsWith\('ondas-'\)/);expect(source).toMatch(/!\w+\.startsWith\('ondas-instrumentos-'\)/);expect(source).not.toMatch(/filter\(\w+=>\w+!==CACHE\)\.map/)});
});
