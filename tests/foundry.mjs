import assert from "node:assert/strict";
import {chromium} from "../../swade-better-setting/node_modules/playwright/index.mjs";
const ID="swade-pro-bending";
const better=["swade-better-setting","swade-better-effects","swade-better-powers","swade-better-templates"];
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(13000);
const errors=[];
page.on("pageerror",e=>{errors.push(e.message);console.error(e);});
page.on("console",m=>{if(m.type()==="error") console.error(m.text());});
try {
  await page.goto(process.env.FOUNDRY_QA_URL ?? "http://localhost:30029");
  await page.locator('select[name="userId"]').selectOption({label:"Gamemaster"});
  await page.getByRole("button",{name:"Join Game Session",exact:true}).click();
  await page.waitForFunction(()=>globalThis.game?.ready);
  assert.equal(await page.evaluate(()=>game.world.id),"better-setting-qa");
  const reload=await page.evaluate(async ({ID,better})=>{
    const config=Object.fromEntries([ID,...better].map(id=>[id,true]));
    const existing=game.settings.get("core","moduleConfiguration");
    const ready=game.modules.get(ID)?.active && Object.entries(existing).every(([id,v])=>!v||config[id]);
    if (ready) return false;
    await game.settings.set("core","noCanvas",true);
    await game.settings.set("core","moduleConfiguration",config);
    return true;
  },{ID,better});
  if(reload) await page.reload();
  await page.waitForFunction(id=>globalThis.game?.ready&&game.modules.get(id)?.api,ID);
  const counts=await page.evaluate(async id=>{
    globalThis.qa={id,actors:[],api:game.modules.get(id).api,docs:{}};
    const counts={};
    for(const pack of game.packs.filter(p=>p.metadata.packageName===id)){
      const docs=await pack.getDocuments();
      qa.docs[pack.metadata.name]=docs;
      counts[pack.metadata.name]=docs.length;
      if (pack.invalidDocumentIds?.size) throw Error("Invalid documents: "+[...pack.invalidDocumentIds]);
      for(const doc of docs) doc.validate({strict:true});
    }
    return counts;
  },ID);
  assert.deepEqual(counts,{techniques:44,backgrounds:3,stances:3,edges:56,nations:5,"bending-kit":33,effects:23,macros:11,rules:1,"pro-benders":108});
  const roster=await page.evaluate(async()=>{
    const {actorRating,npcRank}=await import("/modules/swade-better-setting/scripts/npc-data.mjs");
    const powers=game.modules.get("swade-better-powers").api;
    const pack=game.packs.get(`${qa.id}.pro-benders`);
    return {
      folders:pack.folders.map(folder=>[folder.name,folder.folder?.name??null]),
      vehicles:qa.docs["pro-benders"].filter(a=>a.type==="vehicle").map(a=>[a.system.toughness.total,a.items.size,a.system.driver.skill]),
      members:qa.docs["pro-benders"].filter(a=>a.type==="npc").map(a=>{
        const flags=a.flags[qa.id], rating=actorRating(a);
        return {...flags,name:a.name,folder:a.folder?.name,rank:npcRank(a),advances:a.system.advances.value,
          cr:rating.cr,strength:rating.strength,wounds:a.system.wounds.max,wild:a.isWildcard,
          manual:a.flags["swade-better-setting"].npc.cr,edges:a.itemTypes.edge.length,flaws:a.itemTypes.hindrance.length,
          kit:a.itemTypes.weapon.map(w=>w.name),ready:a.itemTypes.weapon.every(w=>w.isReadied),
          powers:a.itemTypes.power.map(p=>[p.name,powers.usesNoPowerPoints(p)]),
          signature:(a.itemTypes.action??[]).filter(i=>i.getFlag(qa.id,"signatureAction")).length,
          base:a.effects.map(e=>e.name),bio:!!a.system.details.appearance,
          tactics:/^<ul>(<li>[^<]+<\/li>){2,3}<\/ul>$/.test(a.system.details.notes),goals:a.system.details.goals,
          sheet:a.sheet.constructor.name};
      })
    };
  });
  assert.equal(roster.folders.length,39);
  assert.ok(roster.folders.some(([name,parent])=>name==="Republic City" && !parent));
  assert.ok(roster.folders.some(([name,parent])=>name==="Solo" && !parent));
  assert.equal(roster.folders.filter(([,parent])=>parent==="United Republic Army").length,5);
  assert.deepEqual(roster.vehicles,[[11,1,"Vehicles"],[11,1,"Vehicles"]]);
  assert.equal(roster.members.filter(a=>a.folder==="Solo").length,12);
  assert.equal(roster.members.filter(a=>a.roster==="city").length,34);
  assert.ok(roster.members.every(a=>a.bio && a.tactics && !a.goals));
  assert.ok(roster.members.find(a=>a.name==="Chief of Police — Seiran Toma")?.wild);
  assert.equal(roster.members.reduce((sum,member)=>sum+member.signature,0),38);
  const champions=roster.members.filter(a=>a.advances===11);
  assert.equal(champions.length,1);
  assert.deepEqual([champions[0].name,champions[0].champion],["Jian Zhen",true]);
  assert.ok(roster.members.every(a=>a.advances<=11 && a.manual===null && a.cr<=11 && a.strength<=champions[0].strength));
  assert.equal(champions[0].cr,11);
  const tiers={"Low":["Novice",[1,0],[false,false]],"Mid":["Seasoned",[2,0],[false,false]],"High":["Veteran",[2,1],[false,false]],
    "Pro":["Veteran",[3,2],[true,false]],"Super Pro":["Veteran",[3,3],[true,true]]};
  const teams=new Map();
  for (const a of roster.members.filter(a=>a.roster==="team")) {
    const [rank,wounds,wild]=tiers[a.tier];
    const member=Number(!a.captain);
    assert.deepEqual([a.rank,a.wounds,a.wild],[rank,wounds[member],wild[member]]);
    assert.equal(a.folder,a.team);
    assert.ok(a.edges>=3 && a.flaws>=1);
    assert.equal(a.kit.length,4);
    assert.ok(a.kit.every(name=>name.toLowerCase().startsWith(a.element)) && a.ready && a.bio);
    assert.equal(a.sheet,"CharacterSheet");
    assert.ok(a.powers.length>=4 && a.powers.every(([,noPP])=>noPP));
    assert.equal(a.signature,Number(a.captain));
    assert.ok(["Balanced Stance","Martial Bending","Bending Backlash"].every(effect=>a.base.includes(effect)));
    const roster=teams.get(a.team) ?? [];
    roster.push(a);
    teams.set(a.team,roster);
  }
  assert.equal(teams.size,20);
  const powerByTier=Object.fromEntries(Object.keys(tiers).map(tier=>[tier,[]]));
  for (const members of teams.values()) {
    assert.equal(members.filter(a=>a.captain).length,1);
    assert.deepEqual(members.map(a=>a.element).sort(),["earth","fire","water"]);
    powerByTier[members[0].tier].push(members.reduce((sum,a)=>sum+a.strength,0));
  }
  for (const strengths of Object.values(powerByTier)) assert.ok(Math.max(...strengths)/Math.min(...strengths)<1.4);
  await page.locator('[data-tab="compendium"][data-action="tab"]').first().click();
  const rosterRow=page.locator('[data-pack="swade-pro-bending.pro-benders"] .compendium-name');
  if (!await rosterRow.isVisible()) await page.getByText("Avatar: Pro-Bending",{exact:true}).click();
  await rosterRow.click();
  const folderView=page.locator('.compendium-directory');
  await folderView.getByText("Super Pro",{exact:true}).click();
  await folderView.getByText("Obsidian Cranes",{exact:true}).click();
  await folderView.getByText("Champion · Captain",{exact:true}).waitFor({state:"visible"});
  await page.evaluate(()=>game.packs.get(`${qa.id}.pro-benders`).apps[0].close());
  console.log("NPC CR ranges and combined Better Setting team strength",Object.fromEntries(Object.entries(powerByTier).map(([tier,values])=>{
    const cr=roster.members.filter(a=>a.tier===tier).map(a=>a.cr);
    return [tier,{cr:[Math.min(...cr),Math.max(...cr)],strength:values.map(value=>Number(value.toFixed(2)))}];
  })));
  const content=await page.evaluate(()=>{
    const documents=Object.entries(qa.docs).filter(([pack])=>pack!=="rules").flatMap(([,docs])=>docs);
    return {icons:documents.every(doc=>doc.img.startsWith("icons/")), macros:qa.docs.macros.map(m=>m.name),
      descriptions:qa.docs.techniques.every(p=>!/<strong>(?:Epic )?Modifiers?:<\/strong>/.test(p.system.description)),
      blastModifiers:qa.docs.techniques.find(p=>p.name==="Blast").flags["swade-better-powers"].powerModifiers.length};
  });
  assert.ok(content.icons&&content.descriptions&&content.blastModifiers>0);
  assert.ok(!content.macros.some(m=>/backlash|knack/i.test(m)));
  console.log("All ten packs load with Foundry icons and separate Technique modifiers");
  await page.evaluate(async ()=>{
    qa.doc=(pack,name)=>qa.docs[pack].find(d=>d.name===name);
    qa.newActor=async name=>{const actor=await Actor.create({name:"Avatar QA "+name,type:"character"});qa.actors.push(actor);return actor;};
    qa.add=async (actor,pack,name)=>{const data=qa.doc(pack,name).toObject();delete data._id;delete data.folder;return (await actor.createEmbeddedDocuments("Item",[data]))[0];};
    for(const name of ["Earthbending","Firebending","Waterbending"]){
      const a=await qa.newActor(name);await qa.add(a,"backgrounds",name);qa[name]=a;
    }
    const swamp=await qa.newActor("Swamp");qa.swamp=swamp;qa.swampDrop=swamp.sheet._onDropItemCreate(qa.doc("nations","Swamp People").toObject());
    const fire=await qa.newActor("Nation");await qa.add(fire,"nations","Fire Nation");qa.nation=fire;
  });
  const imported=await page.evaluate(async()=>{
    const pack=game.packs.get(`${qa.id}.pro-benders`);
    const actor=await game.actors.importFromCompendium(pack,qa.doc("pro-benders","Zairen Inoue").id);
    qa.actors.push(actor);
    const action=actor.items.getName("Lantern Volley");
    const click=async key=>(await fromUuid(action.system.actions.additional[key].uuid)).execute({actor,item:action});
    const effects=game.modules.get("swade-better-effects").api;
    const attack=actor.items.getName("Fire Hurl");
    const adjust=item=>effects.traitAdjustment(effects.makeRollContext(actor,item,[],{kind:"trait"})).value;
    const before=adjust(attack);
    const original=foundry.applications.api.DialogV2.confirm;
    foundry.applications.api.DialogV2.confirm=async()=>true;
    try {
      await click("signatureUse");
      const after=adjust(attack);
      const other=adjust(actor.items.getName("Fire Assault"));
      const spent=action.getFlag(qa.id,"signatureUsed");
      await click("signatureFinish");
      const ended=adjust(attack);
      await click("signatureReset");
      return [before,after,other,ended,spent,Boolean(action.getFlag(qa.id,"signatureUsed"))];
    } finally { foundry.applications.api.DialogV2.confirm=original; }
  });
  assert.deepEqual(imported,[0,1,0,0,true,false]);
  await page.evaluate(async()=>{
    const pack=game.packs.get(`${qa.id}.pro-benders`);
    qa.nanuq=await game.actors.importFromCompendium(pack,qa.doc("pro-benders","Nanuq").id);
    qa.actors.push(qa.nanuq);
    await qa.nanuq.update({"system.details.notes":"<p>Old notes.</p>","system.details.goals":"<p>Old goal.</p>",
      [`flags.${qa.id}.-=rosterTextVersion`]:null});
    const {migrateRosterText}=await import("/modules/swade-pro-bending/scripts/roster.mjs");
    await migrateRosterText([qa.nanuq]);
    if (qa.nanuq.system.details.goals || !qa.nanuq.system.details.notes.includes("<li>Back up along the outside lane.</li>")) {
      throw Error("The imported NPC still has the old Notes or Goals.");
    }
    qa.nanuq.sheet.tabGroups.primary="actions";
    await qa.nanuq.sheet.render({force:true});
  });
  assert.equal(await page.locator('.swade-application [name="system.details.goals"]').count(),0);
  await page.getByRole("button",{name:"Use Undertow Feint",exact:true}).click();
  await page.getByRole("button",{name:"Roll Athletics",exact:true}).click();
  await page.waitForFunction(()=>qa.nanuq.effects.getName("Undertow Feint"));
  await page.waitForFunction(()=>[...foundry.applications.instances.values()].some(app=>app.ctx?.flavor==="Undertow Feint"));
  const rollForm=await page.evaluate(async()=>{
    const actor=qa.nanuq;
    const roll=await actor.rollSkill(actor.items.getName("Athletics").id,{suppressChat:true});
    const app=[...foundry.applications.instances.values()].find(app=>app.ctx?.flavor==="Undertow Feint");
    await app.close();
    return roll.formula;
  });
  assert.match(rollForm,/2\[Undertow Feint\]/);
  await page.waitForFunction(()=>!qa.nanuq.effects.getName("Undertow Feint"));
  assert.equal(await page.evaluate(()=>Boolean(qa.nanuq.items.getName("Undertow Feint").getFlag(qa.id,"signatureUsed"))),false);
  await page.evaluate(()=>qa.nanuq.sheet.close());
  const choice = page.locator(".choice-dialog");
  await choice.getByText("Illiterate (Minor)",{exact:true}).click();
  await choice.getByRole("button",{name:"Submit",exact:true}).click();
  await page.evaluate(()=>qa.swampDrop);
  await page.waitForFunction(()=>["Earthbending","Firebending","Waterbending"].every(name=>qa[name].itemTypes.edge.some(e=>e.getFlag(qa.id,"initialized"))) && qa.swamp.items.getName("Boating"));
  const kits=await page.evaluate(()=>{
    const bp=game.modules.get("swade-better-powers").api;
    return ["Earthbending","Firebending","Waterbending"].map(name=>{
      const a=qa[name], powers=a.itemTypes.power;
      return {powers:powers.map(i=>[i.name,i.system.arcane,i.system.actions.trait,bp.usesNoPowerPoints(i)]).sort(),
        weapons:a.itemTypes.weapon.map(i=>[i.name,i.system.actions.trait,i.system.damage,i.system.range,i.system.equipStatus]).sort(),
        fluid:!!a.items.getName("Fluid Stance"),effects:a.effects.map(e=>e.name).sort(),bending:a.items.getName("Bending")?.system.attribute};
    });
  });
  for (const [i,k] of kits.entries()) {
    const name=["Earthbending","Firebending","Waterbending"][i];
    const element=name.replace("bending","");
    assert.deepEqual(k.powers,[[`Basic Elemental Manipulation (${element})`,name,"Bending",true],[`Knacks (${element})`,name,"",true]]);
    assert.deepEqual(k.weapons,[[`${element} Assault`,"Fighting","@str+d6","",4],[`${element} Assault (Off-Hand)`,"Fighting","@str+d6","",2],
      [`${element} Hurl`,"Shooting","2d6","6/12/24",4],[`${element} Hurl (Off-Hand)`,"Shooting","2d6","6/12/24",2]].sort());
    assert.deepEqual(k.effects,["Balanced Stance","Bending Backlash","Martial Bending"]);
    assert.equal(k.fluid,i===2); assert.equal(k.bending,"spirit");
  }
  console.log("Three backgrounds create the casting entry, two powers, four weapons and starting effects");
  const names=await page.evaluate(async()=>{
    const water=qa.Waterbending, fire=qa.Firebending;
    const armour=await qa.add(water,"techniques","Armour in Ice");
    const flames=await qa.add(fire,"techniques","Fan the Flames");
    const generic=(await water.createEmbeddedDocuments("Item",[{name:"New Power",type:"power"}]))[0];
    const copy=(await water.createEmbeddedDocuments("Item",[{name:generic.name,type:"power"}]))[0];
    const plain=(await qa.swamp.createEmbeddedDocuments("Item",[{name:"New Power",type:"power"}]))[0];
    return [armour.name,flames.name,generic.name,copy.name,plain.name,qa.doc("techniques","Armour in Ice").name];
  });
  assert.deepEqual(names,["Armour in Ice","Fan the Flames","New Power (Water)","New Power (Water)","New Power","Armour in Ice"]);
  await page.evaluate(()=>{void qa.api.chooseStance(qa.Firebending);});
  const stanceFooter=page.locator(".avatar-stance-dialog .form-footer");
  await stanceFooter.waitFor();
  assert.equal(await stanceFooter.evaluate(el=>getComputedStyle(el).flexDirection),"column");
  await stanceFooter.getByRole("button",{name:"Defensive"}).click();
  await page.waitForFunction(()=>qa.Firebending.effects.getName("Defensive Stance"));
  await page.evaluate(()=>qa.api.changeStance(qa.Firebending,"balanced"));
  const nation=await page.evaluate(()=>({
    vigor:qa.swamp.system.attributes.vigor.die.sides,boating:qa.swamp.items.getName("Boating").system.die.sides,
    survival:qa.swamp.items.getName("Survival").system.die.sides,edge:!!qa.swamp.items.getName("Plantbending"),
    hindrances:qa.swamp.itemTypes.hindrance.map(h=>[h.name,h.system.isMajor]).sort(),
    fire:[qa.nation.system.attributes.agility.die.sides,qa.nation.system.attributes.smarts.die.sides,qa.nation.items.getName("Arrogant")?.system.isMajor,qa.nation.items.getName("Driven")?.system.isMajor]
  }));
  assert.deepEqual(nation,{vigor:6,boating:6,survival:6,edge:true,hindrances:[["Illiterate",false],["Outsider",false]],fire:[6,6,false,false]});
  console.log("Nation traits and grants apply through SWADE");
  const stance=await page.evaluate(async()=>{
    const actor=qa.Firebending;
    const original=actor.system.stats.parry.value;
    const originalCharacter = game.user.character;
    try {
      game.user.updateSource({character:actor.id});
      await game.swade.rollItemMacro("Defensive Stance");
    } finally {
      game.user.updateSource({character:originalCharacter?.id ?? null});
    }
    await new Promise(r=>setTimeout(r,200));
    const bending=actor.items.getName("Bending");
    const bolt=await qa.add(actor,"techniques","Blast");
    const defence=(await actor.rollSkill(bending.id,{item:bolt,suppressChat:true})).formula;
    const p=actor.system.stats.parry.value;
    await qa.api.changeStance(actor,"offensive");
    await new Promise(r=>setTimeout(r,200));
    const offense=(await actor.rollSkill(bending.id,{item:bolt,suppressChat:true})).formula;
    const basic=(await actor.rollSkill(bending.id,{item:actor.items.getName("Basic Elemental Manipulation (Fire)"),suppressChat:true})).formula;
    await qa.api.changeStance(actor,"none");
    return {original,p,defence,offense,basic,remaining:actor.effects.filter(e=>e.getFlag(qa.id,"stance")).length,arcane:bolt.system.arcane};
  });
  assert.equal(stance.p,stance.original+1);assert.equal(stance.remaining,0);assert.equal(stance.arcane,"Firebending");
  assert.match(stance.defence,/-\s*1/);assert.match(stance.offense,/2\[Offensive Stance\]/);assert.doesNotMatch(stance.basic,/Offensive Stance/);
  console.log("Stance effects change rolls, are exclusive and can be removed");
  await page.evaluate(async()=>{
    const a=qa.Firebending;
    await qa.api.changeStance(a,"balanced");
    a.sheet.tabGroups.primary="effects";
    await a.sheet.render({force:true});
  });
  const effectsTab=page.locator('section[data-tab="effects"]');
  await effectsTab.locator('li[data-effect-id]').filter({hasText:"Balanced Stance"}).waitFor({state:"visible"});
  const martialEffect=effectsTab.locator('li[data-effect-id]').filter({hasText:"Martial Bending"});
  await martialEffect.waitFor({state:"visible"});
  assert.equal(await effectsTab.locator(".avatar-automation-effects").count(),0);
  assert.equal(await page.evaluate(()=>qa.Firebending.effects.getName("Martial Bending").showIcon),0);
  await page.evaluate(()=>qa.Firebending.sheet.close());
  const controls=await page.evaluate(async()=>{
    const a=qa.Firebending, blast=a.items.getName("Blast (Fire)"), knack=a.items.getName("Knacks (Fire)");
    const mastery=await qa.add(a,"edges","Bending Mastery");
    const bending=a.items.getName("Bending");
    const tags=blast.flags["swade-better-effects"].tags;
    await blast.setFlag("swade-better-effects","tags",[...tags,"mastered-technique-2"]);
    const mastered=(await a.rollSkill(bending.id,{item:blast,suppressChat:true})).formula;
    await mastery.effects.contents[0].update({disabled:true});
    const off=(await a.rollSkill(bending.id,{item:blast,suppressChat:true})).formula;
    await blast.update({"system.description":"<p>Edited rules text.</p>"});
    await a.sheet.render({force:true});
    const row=a.sheet.element.querySelector('.sbs-power[data-item-id="'+knack.id+'"]');
    const display=a.sheet.element.querySelector('.sbs-power[data-item-id="'+blast.id+'"] .sbs-power-description');
    const state={mastered,off,knackButtons:row?.querySelectorAll("[data-sbs-power-action='formula'],[data-sbs-power-action='tableAction']").length,
      desc:blast.system.description,summary:!!display?.querySelector(".sbs-power-modifier-summary")};
    await a.sheet.close();
    return state;
  });
  assert.match(controls.mastered,/2\[Bending Mastery\]/);
  assert.doesNotMatch(controls.off,/Bending Mastery/);
  assert.equal(controls.knackButtons,0);
  assert.equal(controls.desc,"<p>Edited rules text.</p>");
  assert.equal(controls.summary,false);
  console.log("Effects use the native list and icon setting, Knacks has no roll controls, and mastery follows its item flag and effect toggle");
  const edges=await page.evaluate(async()=>{
    const a=qa.Earthbending;
    await qa.add(a,"edges","Leg Work");await qa.add(a,"edges","Deadly Hurl");await qa.add(a,"edges","Fatal Hurl");await qa.add(a,"edges","Deadly Assault");
    return a.itemTypes.weapon.map(w=>[w.name,w.system.range,w.system.damage.replace(/^\+/,"")]).sort();
  });
  assert.deepEqual(edges,[["Earth Assault (Off-Hand)","","@str+d8"],["Earth Assault","","@str+d8"],
    ["Earth Hurl (Off-Hand)","8/16/34","2d10"],["Earth Hurl","8/16/34","2d10"]]);
  console.log("Leg Work, Deadly Assault and the higher Hurl upgrade affect both hands");
  const backlash=await page.evaluate(async()=>{
    const a=qa.Waterbending, b=a.items.getName("Bending");
    const make=async(item=null)=>{
      const options={...(item?{item}:{}),flavour:"Backlash QA"};
      const promise=a.rollSkill(b.id,options);
      const until=Date.now()+4000;
      let button;
      while(!button && Date.now()<until){
        const app=[...foundry.applications.instances.values()].find(app=>app instanceof game.swade.RollDialog && app.ctx?.flavor===options.flavour && app.ctx?.roll!==qa.lastRoll);
        button=app?.element?.querySelector('button[type="submit"]:not([name="extra"])');
        if(!button) await new Promise(r=>setTimeout(r,30));
      }
      if(!button) throw Error("Roll dialog missing");
      qa.lastRoll=[...foundry.applications.instances.values()].find(app=>app.element?.contains(button)).ctx.roll;
      const old=CONFIG.Dice.randomUniform;
      try {
        CONFIG.Dice.randomUniform=()=>0.99;
        button.click();
        const roll=await Promise.race([promise,new Promise((_r,reject)=>setTimeout(()=>reject(Error("Roll did not complete")),5000))]);
        const msg=game.messages.get(roll?.messageId);
        if(!msg?.getFlag(qa.id,"roll")) throw Error("No Avatar roll flag");
        return msg;
      } finally {CONFIG.Dice.randomUniform=old;}
    };
    const waitForApplied=async message=>{
      const deadline=Date.now()+5000;
      while(!message.getFlag(qa.id,"backlashApplied") && Date.now()<deadline) await new Promise(r=>setTimeout(r,40));
      return !!message.getFlag(qa.id,"backlashApplied");
    };
    const first=await make();
    const applied=await waitForApplied(first);
    const f1=a.system.fatigue.value;
    Hooks.callAll("updateChatMessage",first,{rolls:first.rolls},{},game.user.id);
    await new Promise(r=>setTimeout(r,100));
    const replayed=a.system.fatigue.value!==f1;
    await waitForApplied(await make(a.items.getName("Basic Elemental Manipulation (Water)")));
    const f2=a.system.fatigue.value;
    await waitForApplied(await make(a.items.getName("Water Hurl")));
    const incap=a.statuses.has("incapacitated");
    const rule=a.effects.getName("Bending Backlash");
    await rule.update({disabled:true});
    const muted=await make();
    const bypass=!!muted.getFlag(qa.id,"backlashApplied");
    await rule.delete();
    await qa.api.applyEffect(a,"backlash");
    const restored=await waitForApplied(await make());
    return {applied,replayed,f1,f2,incap,bypass,restored};
  });
  assert.deepEqual(backlash,{applied:true,replayed:false,f1:1,f2:2,incap:true,bypass:false,restored:true});
  console.log("Automatic Backlash applies once, escalates and respects the effect toggle");
  const turtle=await page.evaluate(async()=>{
    const defender=qa.Earthbending, attacker=qa.Firebending;
    await qa.add(defender,"edges","Turtle Shell");
    await qa.api.changeStance(defender,"defensive");
    const effects=game.modules.get("swade-better-effects").api;
    const item=attacker.items.getName("Fire Hurl");
    const context=effects.makeRollContext(attacker,item,[],{kind:"trait"});
    const roll=()=>effects.traitAdjustment(context,{actor:defender}).value;
    const stanceOnly=roll();
    await defender.toggleActiveEffect("defending",{active:true});
    const withDefend=roll();
    await qa.api.changeStance(defender,"balanced");
    return [stanceOnly,withDefend,roll()];
  });
  assert.deepEqual(turtle,[-1,-4,0]);
  console.log("Turtle Shell uses native Defending and only stacks in Defensive Stance");
  const healing=await page.evaluate(async()=>{
    const medic=qa.Waterbending, patient=await qa.newActor("Patient");
    await medic.update({"system.fatigue.value":0});
    await medic.toggleActiveEffect("incapacitated",{active:false});
    await qa.add(medic,"bending-kit","Healing");await qa.add(medic,"techniques","Healing");await qa.add(medic,"techniques","Accelerated Recovery");
    const Dialog=foundry.applications.api.DialogV2;
    const saved={prompt:Dialog.prompt,confirm:Dialog.confirm,roll:game.swade.RollDialog.asPromise};
    const flows=[];
    try {
      Dialog.prompt=async()=>new FormData();
      Dialog.confirm=async()=>true;
      const totals=[6,7,7,8,8];
      game.swade.RollDialog.asPromise=async ctx=>{flows.push({label:ctx.flavor,mods:ctx.mods.map(m=>[m.label,m.value])});return {total:totals.shift()};};
      await patient.update({"system.wounds.value":3});
      await qa.api.heal("mundane",medic,[patient]); const mundane=patient.system.wounds.value;
      await qa.api.heal("water",medic,[patient]);const water=patient.system.wounds.value;
      await qa.api.heal("recovery",medic,[patient]);const recovery=patient.system.wounds.value;
      const timers=Object.keys(patient.getFlag(qa.id,"treatments")).sort();
      await patient.update({"system.wounds.value":1});
      let blocked=false;
      try {await qa.api.heal("water",medic,[patient]);} catch (error) {blocked=/can retry/.test(error.message);}
      const untouched=await qa.newActor("Cancelled Patient");
      await untouched.update({"system.wounds.value":1});
      const totals2=[5,8];
      Dialog.confirm=async options=>options.yes.label==="Treatment time has passed";
      game.swade.RollDialog.asPromise=async()=>({total:totals2.shift()});
      await qa.api.heal("water",medic,[untouched]);
      const declined=untouched.system.wounds.value===1 && !untouched.getFlag(qa.id,"treatments");
      return {mundane,water,recovery,flows,timers,blocked,declined};
    } finally {Dialog.prompt=saved.prompt;Dialog.confirm=saved.confirm;game.swade.RollDialog.asPromise=saved.roll;}
  });
  assert.deepEqual([healing.mundane,healing.water,healing.recovery],[2,1,0]);
  assert.deepEqual(healing.timers,["mundane","recovery","water"]);
  assert.equal(healing.blocked,true);assert.equal(healing.declined,true);
  assert.ok(healing.flows[1].mods.some(([label,n])=>label==="No Power Points" && n===-2));
  assert.ok(healing.flows[4].mods.some(([label,n])=>label==="Accelerated Recovery" && n===4));
  console.log("All three healing flows apply the expected wounds, modifiers and separate immunity timers");
  const martial=await page.evaluate(async()=>{
    const a=qa.Earthbending, power=await qa.add(a,"techniques","Blast");
    const message=await new Roll("6").evaluate();
    const chat=await message.toMessage({speaker:ChatMessage.getSpeaker({actor:a}),flags:{[qa.id]:{roll:{
      actorUuid:a.uuid,itemUuid:power.uuid,kind:"technique",threatened:true,area:false,mode:"targets",
      targets:[{name:"Reach opponent",engaged:true,parry:7},{name:"Distant opponent",engaged:false,parry:5}]
    }}}});
    const Dialog=foundry.applications.api.DialogV2;
    const saved={prompt:Dialog.prompt,confirm:Dialog.confirm};
    try {
      const form=new FormData();
      for(const [key,value] of [["threatened","on"],["mode","targets"],["engaged0","on"],["parry0","7"],["parry1","5"],["opposed0",""],["opposed1",""]]) form.set(key,value);
      Dialog.prompt=async()=>form;
      Dialog.confirm=async()=>true;
      await qa.api.reviewMartial(chat);
      const html=chat.getFlag(qa.id,"martialReview").html;
      return {html,vulnerable:a.statuses.has("vulnerable")};
    } finally {Dialog.prompt=saved.prompt;Dialog.confirm=saved.confirm;await chat.delete();}
  });
  assert.match(martial.html,/Technique activates/);
  assert.match(martial.html,/Reach opponent: misses/);
  assert.match(martial.html,/Distant opponent: meets/);
  assert.equal(martial.vulnerable,true);
  console.log("Martial review distinguishes a Parry miss from activation and applies Vulnerable on confirmation");
  const aids=await page.evaluate(async()=>{
    const a=qa.Earthbending;
    const orig=a.system.stats.toughness.armor;
    await qa.api.applyEffect(a,"earth-armour");
    const armor=a.system.stats.toughness.armor;
    const notUnarmored=!a.isUnarmored;
    await qa.api.applyEffect(a,"numb");
    const numb=a.system.woundsOrFatigue.ignored;
    const impede=qa.doc("techniques","Impede");
    const template=game.modules.get("swade-better-templates").api.readAutomation(impede);
    return {orig,armor,notUnarmored,numb,range:template.placementRange.max,shape:template.shapes[0],behavior:template.behaviors[0]?.type};
  });
  assert.equal(aids.armor,aids.orig+2);
  assert.equal(aids.notUnarmored,true);
  assert.equal(aids.numb,1);
  assert.deepEqual([aids.range,aids.shape,aids.behavior],["@spirit","medium","difficultTerrain"]);
  console.log("Better Effects and Better Templates read the supplied armor, Relief and Impede automation");
  assert.deepEqual(errors,[]);
} finally {
  if (await page.evaluate(()=>!!globalThis.qa).catch(()=>false)) await page.evaluate(async()=>{for(const actor of qa.actors) if(game.actors.has(actor.id)) await actor.delete();});
  await browser.close();
}
