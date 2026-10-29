import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
const browser=await puppeteer.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true,args:['--no-sandbox','--use-angle=swiftshader']});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try {
 const page=await browser.newPage(); await page.setViewport({width:1440,height:900});
 await page.goto('http://127.0.0.1:5181/',{waitUntil:'networkidle2'});
 await page.waitForSelector('.yo-hero[data-entrance="done"]',{timeout:60000});
 await pause(1000);
 const read=()=>page.evaluate(()=>{const bar=document.querySelector('.yo-sticky-chrome'),hero=document.querySelector('#hero');return {y:scrollY,top:bar.getBoundingClientRect().top,hidden:bar.dataset.hidden,bg:getComputedStyle(bar).backgroundColor,heroBg:getComputedStyle(hero).backgroundColor,color:getComputedStyle(bar).color,logoInside:bar.contains(document.querySelector('.yo-intro')),intro:document.querySelector('.yo-intro')?.dataset.state,heroEnd:hero.getBoundingClientRect().bottom+scrollY};});
 let state=await read(); console.log('INITIAL',state);assert.equal(state.bg,state.heroBg);assert.equal(state.logoInside,true);assert.equal(state.top,0);
 await page.mouse.move(700,500);await page.mouse.wheel({deltaY:400});await pause(1500);state=await read();assert.equal(state.hidden,'false');
 await page.mouse.wheel({deltaY:1400});await pause(1800);state=await read();console.log('DOWN',state);assert.equal(state.hidden,'true');assert.ok(state.top<=-67);
 await page.mouse.wheel({deltaY:-100});await pause(1500);state=await read();console.log('UP',state);assert.equal(state.hidden,'false');assert.equal(state.top,0);
 const serviceY=await page.$eval('#services',el=>el.getBoundingClientRect().top+scrollY);
 await page.mouse.wheel({deltaY:(serviceY-state.y)/.88+1600});await pause(2200);await page.mouse.wheel({deltaY:-140});await pause(1500);
 state=await read();console.log('SERVICES',state);assert.equal(state.hidden,'false');assert.equal(state.bg,state.heroBg);
 await page.screenshot({path:'tmp-header-services.png'});
 await page.mouse.wheel({deltaY:3});await pause(1000);assert.equal((await read()).hidden,'false');
 console.log('PASS intro containment, hero visibility, down/up, services colors, jitter');
}finally{await browser.close();}
