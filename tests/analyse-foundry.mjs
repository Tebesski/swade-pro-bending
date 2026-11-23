import assert from "node:assert/strict";
import {chromium} from "../../swade-better-setting/node_modules/playwright/index.mjs";
const browser=await chromium.launch({executablePath:process.env.LOCALAPPDATA+"/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-win64/chrome-headless-shell.exe"});
try{
 const page=await browser.newPage();await page.goto("http://localhost:30039/join");
 await page.locator('select[name="userId"]').selectOption({label:"Gamemaster"});
 await page.getByRole("button",{name:"Join Game Session",exact:true}).click();
 await page.waitForFunction(()=>globalThis.game?.ready&&game.modules.get("swade-pro-bending")?.api?.analyseFoe);
 const result=await page.evaluate(async()=>{
  const {applyAnalysis,updateAnalyseContent}=await import("/modules/swade-pro-bending/scripts/analyse-foe.mjs");
  const {collectRules}=await import("/modules/swade-better-effects/scripts/effects.mjs");
  const {rollTarget}=await import("/modules/swade-better-effects/scripts/flags.mjs");
  const {resolveTrait}=await import("/modules/swade-better-effects/scripts/rules.mjs");
  await updateAnalyseContent();
  const caster=await Actor.create({name:"Analyse caster QA",type:"character"}),foe=await Actor.create({name:"Analyse foe QA",type:"npc"});let scene;
  try{
   scene=await Scene.create({name:"Analyse QA",width:2000,height:2000});
   const [target,other]=await scene.createEmbeddedDocuments("Token",[{name:"Target",actorId:foe.id,actorLink:true,x:100,y:100},{name:"Other",actorId:foe.id,actorLink:true,x:500,y:500}]);
   const effects=()=>caster.effects.filter(e=>e.flags["swade-pro-bending"]?.analyse);
   const bonus=(token,skill)=>resolveTrait({context:{hasRoll:true,attribute:"agility",...(skill?{skill:{name:"Fighting",id:"fighting"}}:{}),roll:["trait"],target:token?rollTarget({},token).flags:[]},attackerRules:collectRules(caster)}).value;
   await applyAnalysis(caster,target);
   const base=effects()[0].toObject().duration;
   const initial=[bonus(target),bonus(target,true),bonus(other),bonus(null)];
   const marker=foe.effects.find(e=>e.name==="Analysed");
   await marker.update({disabled:true});const disabled=bonus(target);
   await marker.update({disabled:false});const restored=bonus(target);
   await applyAnalysis(caster,target,true);
   const extended=effects()[0].toObject().duration,count=effects().length,afterRecast=bonus(target);
   await foe.effects.find(e=>e.name==="Analysed").delete();
   for(let i=0;i<40&&effects().length;i++)await new Promise(r=>setTimeout(r,50));
   const removed=effects().length;
   return {base,initial,disabled,restored,extended,count,afterRecast,removed};
  }finally{if(scene)await scene.delete();await caster.delete();await foe.delete();}
 });
 assert.deepEqual(result.initial,[1,1,0,0]);assert.equal(result.disabled,0);assert.equal(result.restored,1);
 assert.equal(result.base.value,3);assert.equal(result.extended.value,6);assert.equal(result.count,1);assert.equal(result.afterRecast,1);assert.equal(result.removed,0);
 console.log("Verified caster/foe links, selected-token-only trait bonus, marker toggling, 3/6 rounds, no stacking and paired removal.");
}finally{await browser.close();}
