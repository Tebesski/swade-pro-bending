import assert from "node:assert/strict";
import {chromium} from "../../swade-better-setting/node_modules/playwright/index.mjs";
const browser=await chromium.launch({executablePath:process.env.LOCALAPPDATA+"/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-win64/chrome-headless-shell.exe"});
try{
 const page=await browser.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto("http://localhost:30039/join");
 await page.locator('select[name="userId"]').selectOption({label:"Gamemaster"});
 await page.getByRole("button",{name:"Join Game Session",exact:true}).click();
 await page.waitForFunction(()=>globalThis.game?.ready&&game.modules.get("swade-pro-bending")?.api?.resolveBendingArea);
 const result=await page.evaluate(async()=>{
  const a=await import("/modules/swade-pro-bending/scripts/bending-areas.mjs");
  const {normalizeAutomation}=await import("/modules/swade-better-templates/scripts/data.mjs");
  const {resolveCastOptions}=await import("/modules/swade-better-templates/scripts/variants.mjs");
  const {buildBehaviorData,dispatchRegionEvent}=await import("/modules/swade-better-templates/scripts/runtime.mjs");
  const {collectRules}=await import("/modules/swade-better-effects/scripts/effects.mjs");
  const {resolveDamage}=await import("/modules/swade-better-effects/scripts/rules.mjs");
  await a.updateBendingAreas();
  const pack=game.packs.get("swade-pro-bending.techniques");const powers=(await pack.getDocuments()).filter(p=>["elemental-barrage","elemental-vortex","earth-entangle","water-entangle"].includes(p.flags["swade-pro-bending"]?.key));
  const caster=await Actor.create({name:"Area Caster QA",type:"character",items:powers.map(p=>p.toObject())}),foe=await Actor.create({name:"Area Foe QA",type:"npc"});let scene;
  const wait=foundry.applications.api.DialogV2.wait;
  try{
   scene=await Scene.create({name:"Bending Areas QA",width:2000,height:2000,grid:{size:100,distance:1,type:1}});
   const [placer,token]=await scene.createEmbeddedDocuments("Token",[{name:"Caster",actorId:caster.id,actorLink:true,x:100,y:100},{name:"Foe",actorId:foe.id,actorLink:true,x:500,y:100}]);
   const configs={};
   const make=async(key,choices={})=>{
    const item=caster.itemTypes.power.find(p=>p.flags["swade-pro-bending"].key===key);
    const config=normalizeAutomation(a.bendingAreaConfig(key));
    const resolved=resolveCastOptions(config,{baseShape:config.shapes[0],...choices},{item}).automation;
    configs[key]=resolved;
    const [region]=await scene.createEmbeddedDocuments("Region",[{name:key,shapes:[{type:"circle",x:1500,y:1500,radius:50}],
      behaviors:buildBehaviorData(resolved,{itemUuid:item.uuid,placerTokenUuid:placer.uuid,ownerId:game.user.id,actor:caster})}]);
    return region;
   };
   let checks=0,penalty;
   foe.rollAttribute=async(_key,options)=>{checks++;penalty=options.additionalMods[0].value;return {total:1};};
   const barrage=await make("elemental-barrage",{raise:1});
   foundry.applications.api.DialogV2.wait=async()=>"duck";
   await a.resolveBendingArea(barrage,token);await a.resolveBendingArea(barrage,token);
   const duck={checks,penalty,statuses:[...foe.statuses].sort()};
   await foe.deleteEmbeddedDocuments("ActiveEffect",foe.effects.map(e=>e.id));
   const damaging=await make("elemental-barrage",{raise:1});
   foundry.applications.api.DialogV2.wait=async()=>"damage";
   await a.resolveBendingArea(damaging,token);
   const damageMessage=game.messages.find(m=>m.flags["swade-better-templates"]?.regionUuid===damaging.uuid&&m.rolls.length);
   const barrageDice=damageMessage.rolls[0].dice.reduce((sum,die)=>sum+die.number,0);
   const vortex=await make("elemental-vortex");
   const count=checks;
   await dispatchRegionEvent(vortex,{name:"sbtPlacerTurnEnd",data:{token:placer},user:game.user});
   const excluded=checks===count;
   await dispatchRegionEvent(vortex,{name:"sbtPlacerTurnEnd",data:{token},user:game.user});
   const vortexChecked=checks===count+1;
   await dispatchRegionEvent(vortex,{name:"sbtInitialInside",data:{token:placer},user:game.user});
   const reduce=roll=>resolveDamage({damage:10,ap:0,armor:0,toughness:5,context:{hasRoll:true,roll:[roll]},defenderRules:collectRules(caster)}).damage;
   const protection=[reduce("ranged"),reduce("melee")];
   const entangles=[];
   for(const key of ["earth-entangle","water-entangle"]){
    const region=await make(key,{raise:1,modifiers:["area-effect","damage","tough"],modifierOptions:{"area-effect":"pm3",damage:"pm1",tough:"pm2"}});
    await a.resolveBendingArea(region,token);
    const effect=foe.effects.find(e=>e.flags["swade-pro-bending"]?.entangle===key);
    entangles.push({status:[...effect.statuses],hardness:effect.flags["swade-pro-bending"].hardness,
      lingering:effect.flags["swade-better-effects"].lingering});
    await effect.delete();
   }
   const earth=normalizeAutomation(a.bendingAreaConfig("earth-entangle"));
   const deadly=resolveCastOptions(earth,{baseShape:"small",modifiers:["deadly"],modifierOptions:{deadly:"pp4"}},{actor:caster}).automation.behaviors.find(b=>b.id==="area-damage").system.formula;
   return {duck,barrageDice,excluded,vortexChecked,protection,entangles,deadly,configs,errors:[]};
  }finally{foundry.applications.api.DialogV2.wait=wait;if(scene)await scene.delete();await caster.delete();await foe.delete();}
 });
 assert.deepEqual(result.duck,{checks:1,penalty:-2,statuses:["distracted","prone"]});
 assert.equal(result.barrageDice,3);assert.equal(result.excluded,true);assert.equal(result.vortexChecked,true);assert.deepEqual(result.protection,[8,10]);
 for(const effect of result.entangles){assert.deepEqual(effect.status,["bound"]);assert.equal(effect.hardness,10);assert.equal(effect.lingering.trait,"2d4");assert.equal(effect.lingering.timing,"end");assert.equal(effect.lingering.enabled,true);}
 assert.equal(result.deadly,"2d6");
 assert.deepEqual(result.configs["elemental-barrage"].shapes,["cone"]);assert.deepEqual(result.configs["elemental-barrage"].modifiers,[]);
 assert.equal(result.configs["elemental-vortex"].attachable,true);
 console.log("Verified Barrage raised resistance/damage, victim choice and deduplication; Vortex turn-end exclusion and ranged reduction; both Entangles, Hardness and lingering damage.");
 if(errors.length)console.log("Browser errors:",errors);
}finally{await browser.close();}
