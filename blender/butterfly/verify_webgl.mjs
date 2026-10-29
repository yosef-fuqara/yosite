import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const exe=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const browser=await puppeteer.launch({executablePath:exe,headless:true,args:['--no-sandbox','--disable-gpu-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],defaultViewport:{width:1400,height:1200,deviceScaleFactor:1}});
const page=await browser.newPage();const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try{
  await page.goto('http://127.0.0.1:8876/blender/butterfly/preview.html?qa',{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>window.butterflyReady||window.butterflyError,{timeout:60000});
  const loadError=await page.evaluate(()=>window.butterflyError);if(loadError)throw Error(loadError);
  const report=await page.evaluate(()=>window.butterflyQA.report);
  if(report.triangles<10000||report.triangles>25000)throw Error('Triangle budget exceeded');
  if(report.meshes.length!==8||report.animations!==0)throw Error('Component / animation mismatch');
  for(const light of [false,true])for(const view of ['three-quarter','top','front','side','underside']){
    await page.evaluate(({light,view})=>{window.butterflyQA.background(light);window.butterflyQA.setView(view)},{light,view});
    await page.screenshot({path:path.join(here,'previews',`webgl-${view}-${light?'white':'black'}.png`)});
  }
  // Small on-screen readability at an approximately 240-pixel wingspan.
  await page.evaluate(()=>{const q=window.butterflyQA;q.background(true);q.setView('three-quarter');q.camera.zoom=.29;q.camera.updateProjectionMatrix();q.render()});
  await page.screenshot({path:path.join(here,'previews','webgl-small-white.png')});
  // Temporarily exercise root pivots; do not save or add animation to the asset.
  const pivotCheck=await page.evaluate(()=>{
    const q=window.butterflyQA;const results=[];
    for(const name of ['Left_Forewing','Left_Hindwing','Right_Forewing','Right_Hindwing']){
      const o=q.model.getObjectByName(name);const p=o.position.clone();o.rotateZ(.25);
      results.push({name,pivotFixed:o.position.equals(p)});o.rotateZ(-.25);
    }q.render();return results;
  });
  report.pivotChecks=pivotCheck;report.errors=errors;
  fs.writeFileSync(path.join(here,'webgl-validation.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(errors.some(e=>!e.includes('favicon')))throw Error('Browser errors: '+errors.join('\n'));
}finally{await browser.close()}
