import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const executablePath=['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
const browser=await puppeteer.launch({executablePath,headless:true,args:['--no-sandbox','--disable-gpu-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],defaultViewport:{width:1200,height:1000,deviceScaleFactor:1},protocolTimeout:180000});
const page=await browser.newPage();const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try{
  await page.goto('http://127.0.0.1:8876/blender/butterfly/animation-preview.html?qa',{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>window.butterflyReady||window.butterflyError,{timeout:60000});
  const loadError=await page.evaluate(()=>window.butterflyError);if(loadError)throw Error(loadError);
  const report=process.argv.includes('--captures-only')
    ?JSON.parse(fs.readFileSync(path.join(here,'animation-webgl-validation.json'),'utf8'))
    :await page.evaluate(()=>window.animationQA.runChecks());
  report.browserErrors=errors;
  fs.writeFileSync(path.join(here,'animation-webgl-validation.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  if(!process.argv.includes('--checks-only')){
  // Capture extrema and the swept positions from multiple views on both grounds.
  for(const clip of ['IDLE','FLY','GLIDE']){
    const period=clip==='FLY'?1/3:clip==='IDLE'?4:3;
    for(const [phase,label] of [[0,'peak'],[.25,'downstroke'],[.5,'trough'],[.75,'upstroke']]){
      await page.evaluate(({clip,time})=>window.animationQA.setPose(clip,time),{clip,time:phase*period});
      for(const view of ['three-quarter','front']){
        await page.evaluate(({view})=>{window.animationQA.background(view==='three-quarter');window.animationQA.setView(view)},{view});
        await page.screenshot({path:path.join(here,'animation-previews',`${clip}-${label}-${view}.png`)});
      }
    }
  }
  for(const view of ['top','side','underside']){
    await page.evaluate(({view})=>{const q=window.animationQA;q.setPose('FLY',.25);q.background(true);q.setView(view)},{view});
    await page.screenshot({path:path.join(here,'animation-previews',`FLY-upstroke-${view}.png`)});
  }
  }
  const clipNames=report.clips.map(c=>c.name).sort().join(',');
  if(clipNames!=='FLY,GLIDE,IDLE')throw Error('Missing clips');
  if(report.collisions.length)throw Error('Wing collision(s): '+JSON.stringify(report.collisions));
  if(report.rootMaxDistanceMeters>1e-8||report.maxPivotErrorMeters>1e-7||report.maxBoneScaleError>1e-5||report.minTriangleAreaRatio<.15||report.minNormalAlignment<=0)throw Error('Root / pivot / deformation verification failed');
  for(const [name,v]of Object.entries(report.loops))if(v.endpointPositionGapMeters>1e-7||v.endpointAngleGapRadians>1e-5||v.endpointTangentGap>1e-5||v.repeated100LoopsGapMeters>1e-7)throw Error('Loop seam or drift '+name);
  if(errors.length)throw Error('Browser errors: '+errors.join('\n'));
  console.log('ANIMATION_WEBGL_PASS');
}finally{await browser.close()}
