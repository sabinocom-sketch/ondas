import {defineConfig} from '@playwright/test';
import base from './playwright.config';
export default defineConfig({...base,outputDir:'tablet-test-results',reporter:'list',projects:[{name:'tablet-emulado',use:{viewport:{width:820,height:1180},isMobile:true,hasTouch:true,deviceScaleFactor:2}}]});
