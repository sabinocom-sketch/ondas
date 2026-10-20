import {build} from 'vite';
await build({configFile:false,esbuild:{jsx:'automatic'},build:{outDir:'dist-test',rollupOptions:{input:'tests/browser/fixture-entry.ts',output:{format:'iife',entryFileNames:'fixture.js',inlineDynamicImports:true}}}});
