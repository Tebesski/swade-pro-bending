import assert from "node:assert/strict";
import {chromium} from "../../swade-better-setting/node_modules/playwright/index.mjs";
const browser=await chromium.launch({executablePath:process.env.LOCALAPPDATA+"/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-win64/chrome-headless-shell.exe"});
try{
 const page=await browser.newPage();await page.goto("http://localhost:30039/join");
 await page.locator('select[name="userId"]').selectOption({label:"Gamemaster"});
 await page.getByRole("button",{name:"Join Game Session",exact:true}).click();
 await page.waitForFunction(()=>globalThis.game?.ready&&game.modules.get("swade-pro-bending")?.api?.elementalProtection);
 const data=await page.evaluate(async()=>{
  const a=await import("/modules/swade-pro-bending/scripts/advanced-manipulation.mjs");
  const {collectRules}=await import("/modules/swade-better-effects/scripts/effects.mjs");
  const {resolveTrait}=await import("/modules/swade-better-effects/scripts/rules.mjs");
  const {normalizeAutomation}=await import("/modules/swade-better-templates/scripts/data.mjs");
  const {buildBehaviorData,dispatchRegionEvent}=await import("/modules/swade-better-templates/scripts/runtime.mjs");
  await a.updateAdvancedContent();
  const actor=await Actor.create({name:"Advanced QA",type:"character"});let scene;
  try{
   const baseline={pace:actor.system.pace.ground,run:actor.system.pace.running.die};
   await a.elementalSurf(actor);const surf={pace:actor.system.pace.ground,run:actor.system.pace.running.die};
   const effect=actor.effects.find(e=>e.flags["swade-pro-bending"]?.elementalSurf);
   await effect.update({disabled:true});const disabled=actor.system.pace.ground;
   await effect.update({disabled:false});
   await actor.toggleStatusEffect("prone",{active:true});
   for(let i=0;i<40&&!effect.disabled;i++)await new Promise(r=>setTimeout(r,50));
   const proneDisabled=effect.disabled;
   await actor.deleteEmbeddedDocuments("ActiveEffect",actor.effects.map(e=>e.id));
   const [protection]=await actor.createEmbeddedDocuments("ActiveEffect",[a.protectionEffect("cold, heat")]);
   const bonus=(attribute,flags)=>resolveTrait({context:{hasRoll:true,attribute,roll:flags},attackerRules:collectRules(actor)}).value;
   const bonuses=[bonus("vigor",["cold"]),bonus("vigor",["heat"]),bonus("vigor",["poison"]),bonus("agility",["cold"])];
   const hours=protection.toObject().duration;
   await protection.delete();
   scene=await Scene.create({name:"Advanced Area QA",width:2000,height:2000,grid:{type:1,size:100,distance:1}});
   const [token]=await scene.createEmbeddedDocuments("Token",[{name:"QA",actorId:actor.id,actorLink:true,x:100,y:100}]);
   const automation=normalizeAutomation(a.protectionArea());
   const [region]=await scene.createEmbeddedDocuments("Region",[{name:"Area QA",shapes:[{type:"circle",x:1000,y:1000,radius:100}],
     behaviors:buildBehaviorData(automation,{actor,itemUuid:actor.uuid,ownerId:game.user.id})}]);
   await dispatchRegionEvent(region,{name:"sbtInitialInside",data:{token},user:game.user});
   const inside=actor.effects.some(e=>e.flags["swade-pro-bending"]?.elementalProtection);
   const areaMods=actor.system.attributes.vigor.effects.map(e=>Number(e.value));
   await dispatchRegionEvent(region,{name:"tokenExit",data:{token},user:game.user});
   const outside=actor.effects.some(e=>e.flags["swade-pro-bending"]?.elementalProtection);
   return {baseline,surf,disabled,proneDisabled,bonuses,hours,inside,outside,areaMods,automation};
  }finally{if(scene)await scene.delete();await actor.delete();}
 });
 assert.equal(data.surf.pace,data.baseline.pace+6);assert.equal(data.surf.run,data.baseline.run+2);
 assert.equal(data.disabled,data.baseline.pace);assert.equal(data.proneDisabled,true);
 assert.deepEqual(data.bonuses,[4,4,0,0]);assert.equal(data.hours.value,1);assert.equal(data.hours.units,"hours");
 assert.equal(data.inside,true);assert.equal(data.outside,false);assert.ok(data.areaMods.includes(4));
 assert.deepEqual(data.automation.shapes,["medium","large"]);assert.equal(data.automation.expiration.unit,"hours");
 console.log("Verified flagged Vigor, 1-hour duration, Surf movement and Prone, template entry/exit and unconditional area Vigor.");
}finally{await browser.close();}
