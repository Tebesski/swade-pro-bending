import {npcSource, makePreset} from "../../swade-better-setting/scripts/npc-data.mjs";
import {RANKS} from "../../swade-better-setting/scripts/npc-math.mjs";
import {effectChanges} from "../scripts/effect-data.mjs";
import {elementalPowerName, weaponKit} from "../scripts/bending-data.mjs";
import {ID, EFFECTS, POWERS, flag, slug, escape} from "../scripts/shared.mjs";
import {teams, tiers, teamActorIds} from "../content/teams.mjs";
import {solo, districts} from "../content/city-benders.mjs";
import {coreEdges, hindrances} from "../content/npc-features.mjs";
import {iconFor} from "./icons.mjs";
import {rosterTextVersion} from "../scripts/roster.mjs";

const portraits = {
  fire:["hood-cloth-mask-red","hood-cloth-pink-red","hood-cloth-trimmed-pink-gold"],
  water:["hood-cloth-blue-white","hood-cloth-teal","hood-cloth-blue"],
  earth:["hood-cloth-green-white","hood-leather-brown","hood-green-gilded"]
};
const roles = {
  anchor:{preset:"defender",focus:"Fighting",label:"Anchor",skills:["Fighting","Intimidation"]},
  shooter:{preset:"marksman",focus:"Shooting",label:"Shooter",skills:["Shooting","Notice"]},
  runner:{preset:"skirmisher",focus:"Athletics",label:"Flanker",skills:["Athletics","Fighting"]},
  controller:{preset:"caster",focus:"Bending",label:"Controller",skills:["Bending","Eloquence"]},
  medic:{preset:"support",focus:"Healing",label:"Medic",skills:["Healing","Bending"]},
  mechanic:{preset:"specialist",focus:"Workshop",label:"Mechanic",skills:["Workshop","Vehicles"]}
};
const teamTechniqueChoices = {
  fire:["burst","blind","deadly-elements","launch","jet","analyse-foe","blast","fan-the-flames","damage-field","boost-lower-trait"],
  water:["impede","water-armour","launch","water-move","jet","quicken","water-entangle","elemental-vortex","healing","relief"],
  earth:["earth-armour","impede","deadly-elements","elemental-maneuver","barrier","havoc","tremor","earth-move","seismic-sense","earth-entangle"]
};
const roleTechnique = {anchor:"deadly-elements",shooter:"burst",runner:"launch",controller:"impede"};
const teamEdgeChoices = {
  fire:["forceful-elements","leg-work","elemental-onslaught","hampering-stance","unleash-elements","close-combat-specialist"],
  water:["fluid-stance","leg-work","shadow-training","close-combat-specialist","extra-effort"],
  earth:["mountain-stance","turtle-shell","leg-work","hampering-stance","close-combat-specialist","extra-effort"]
};
const roleEdges = {
  anchor:["martial-artist","iron-jaw","block","counterattack","combat-reflexes","deadly-assault","nerves-of-steel"],
  shooter:["alertness","calculating","marksman","dodge","combat-reflexes","deadly-hurl","bending-mastery"],
  runner:["fleet-footed","free-runner","acrobat","extraction","dancing-stance","quick","improved-extraction"],
  controller:["alertness","reliable","bolster","careful-bending","level-headed","efficient-bending","bending-mastery"]
};
const stanceFlag = flag => ({op:"flag",source:"actor",flag:`avatar-${flag}`});
const itemFlag = flag => ({op:"flag",source:"item",flag});
const targetFlag = flag => ({op:"flag",source:"target",flag});
const condition = (...children) => ({op:"all",children});
const text = value=>`<p>${escape(value)}</p>`;
const die = (sides,modifier=0)=>({sides,modifier});
const nativeChange = (key,value,type="add")=>({key,value:String(value),type,phase:"initial",priority:null});
const roll = (name,instruction)=>({skill:name,instruction});

const signatures = {
  slip:[roll("Athletics","When someone cuts off your retreat, roll Athletics at +2 to slip past."),
    [],[["skill:Athletics",2,condition({op:"flag",source:"roll",flag:"signature-move"})]]],
  "feint-shot":[{targetStatus:"distracted",instruction:"After your Test distracts a foe, target them. Your next Hurl against them gets +1 to hit."},
    [],[["global:attack",1,condition(itemFlag("elemental-hurl"),targetFlag("distracted"))]]],
  brace:[{instruction:"Hold your ground for +1 Toughness. End the effect if you move."},
    [nativeChange("system.stats.toughness.value",1)],[]],
  support:[{...roll("Eloquence","Choose a teammate and the Trait you want to Support. Roll Eloquence at +2 and apply the Support result."),support:true},
    [],[["skill:Eloquence",2,condition({op:"flag",source:"roll",flag:"signature-move"})]]],
  close:[{stance:"offensive",instruction:"In Offensive Stance, add +2 damage to one Assault that hits."},
    [],[["outgoing-damage",2,condition(itemFlag("elemental-assault"),stanceFlag("offensive"))]]],
  cover:[{stance:"defensive",instruction:"Take cover in Defensive Stance. Ranged attacks against you take an extra −1. End the effect if you leave cover."},
    [],[["target-roll:targetAttackRanged",-1,condition(stanceFlag("defensive"))]]],
  recovery:[{recovery:true,instruction:"Use before rolling to recover from Shaken or Stunned. Add +2 to that recovery roll."},
    [nativeChange("system.attributes.spirit.unShakeBonus",2),nativeChange("system.attributes.vigor.unStunBonus",2)],[]],
  "long-shot":[{stance:"balanced",instruction:"Stand still in Balanced Stance. Add +2 to one Hurl at Long Range."},
    [],[["global:attack",2,condition(itemFlag("elemental-hurl"),stanceFlag("balanced"))]]],
  counter:[{instruction:"After a foe misses you in melee, add +2 to one Assault against them. Spend an action or use an available Counterattack."},
    [],[["global:attack",2,condition(itemFlag("elemental-assault"))]]],
  cast:[{stance:"balanced",instruction:"In Balanced Stance, add +1 to one offensive Technique roll."},
    [],[["global:trait",1,condition(itemFlag("offensive-technique"),stanceFlag("balanced"))]]],
  mark:[{targetStatus:"vulnerable",instruction:"Target a Vulnerable foe. Add +2 damage to your next Hurl against them if it hits."},
    [],[["outgoing-damage",2,condition(itemFlag("elemental-hurl"),targetFlag("vulnerable"))]]],
  opening:[{stance:"balanced",instruction:"In Balanced Stance, add +1 to your opening Hurl attack roll."},
    [],[["global:attack",1,condition(itemFlag("elemental-hurl"),stanceFlag("balanced"))]]],
  takedown:[{targetStatus:"distracted",instruction:"Target a Distracted foe you forced out of position. Add +2 to one offensive Technique roll against them."},
    [],[["global:trait",2,condition(itemFlag("offensive-technique"),targetFlag("distracted"))]]],
  footwork:[{instruction:"Gain +2 Pace for one move."},
    [nativeChange("system.pace.ground",2)],[]],
  switch:[{instruction:"Change lanes. Gain +1 Pace for this move and +1 to Athletics to clear an obstacle."},
    [nativeChange("system.pace.ground",1)],[["skill:Athletics",1,condition()]]],
  champion:[{stance:"balanced",instruction:"Open the final round in Balanced Stance. Add +1 to one Hurl attack and +2 damage if it hits."},
    [],[["global:attack",1,condition(itemFlag("elemental-hurl"),stanceFlag("balanced"))],
      ["outgoing-damage",2,condition(itemFlag("elemental-hurl"),stanceFlag("balanced"))]]]
};
const step = (count,index)=>count?index%count:0;
const levelOf = rank=>RANKS.indexOf(rank);
const rankFor = advances=>RANKS[Math.floor(advances/4)];
const edgeMinimums = {
  acrobat:{skills:{Athletics:8},attributes:{agility:8}},"free-runner":{skills:{Athletics:6},attributes:{agility:8}},
  extraction:{attributes:{agility:8}},"fleet-footed":{attributes:{agility:6}},quick:{attributes:{agility:8}},
  dodge:{attributes:{agility:8}}, marksman:{skills:{Shooting:8}},block:{skills:{Fighting:8}},counterattack:{skills:{Fighting:8}},"martial-artist":{skills:{Fighting:6}},
  calculating:{attributes:{smarts:8}},"level-headed":{attributes:{smarts:8}},command:{attributes:{smarts:6}},
  "hold-the-line":{attributes:{smarts:8}},tactician:{attributes:{smarts:8},skills:{Battle:6}},
  investigator:{attributes:{smarts:8},skills:{Research:8}},streetwise:{attributes:{smarts:6}},
  "improvisational-fighter":{attributes:{smarts:6}},ace:{attributes:{agility:8}},
  reliable:{attributes:{spirit:8}},bolster:{attributes:{spirit:8}},brave:{attributes:{spirit:6}},
  "strong-willed":{attributes:{spirit:8}},"iron-jaw":{attributes:{vigor:8}},
  "nerves-of-steel":{attributes:{vigor:8}},soldier:{attributes:{strength:6,vigor:6}},
  metalbending:{skills:{Bending:10}},glassbending:{skills:{Bending:10}},
  lightningbending:{skills:{Bending:12}}
};
const nativeSeasoned = new Set(["block","combat-acrobat","combat-reflexes","counterattack","dodge","improved-dodge","improved-extraction",
  "hold-the-line","improvisational-fighter","inspire","level-headed","marksman","rapid-fire","tactician"]);

// Adjustments from the Better Setting benchmark, keeping the league's wound and Wild Card rules fixed.
const leagueAdjustments = {
  "Tao Ren":{skills:{Shooting:6}}, "Kezan":{skills:{Shooting:8}},
  "Hamu":{powers:["elemental-maneuver","jet","impede"]},
  "Vakka of the South":{powers:["water-armour","relief","launch","advanced-elemental-manipulation"]},
  "Sialiq":{powers:["elemental-maneuver","quicken","impede","water-entangle"]},
  "Zerika Ito":{powers:["launch","elemental-barrage","analyse-foe","deadly-elements"]},
  "Yun-Seo Min":{edges:["close-combat-specialist","brave"]},
  "Aseno Hase":{skills:{Shooting:8}}, "Aputik":{skills:{Shooting:8}},
  "Ikkat":{skills:{Shooting:8}}, "Yori":{skills:{Shooting:6}},
  "Tullik":{skills:{Shooting:10},armor:2,edges:["close-combat-specialist","reliable","efficient-bending"]}, "Wen Qing":{skills:{Shooting:8}}, "Akemi Tada":{armor:2},
  "Nuvak of the North":{skills:{Shooting:10},powers:["water-move","water-entangle","impede","launch"]}, "Xiulan":{skills:{Shooting:10},armor:1},
  "Azuna Hayase":{skills:{Shooting:10}}, "Saaniq":{skills:{Shooting:10},extraEdges:["deadly-hurl"]},
  "Arnaq":{skills:{Shooting:10},armor:2,powers:["elemental-maneuver","water-entangle","impede","water-armour"]}, "Meiko":{skills:{Shooting:10},extraEdges:["deadly-hurl"]},
  "Zairen Inoue":{armor:1}, "Jian Zhen":{parry:0,skills:{Shooting:10}}, "Luak":{skills:{Shooting:10},armor:2}, "Ming Lan":{skills:{Shooting:10}},
  "Raezan Kaji":{skills:{Shooting:12}}, "Vakka of the South":{skills:{Shooting:10}}
};

export function buildProBenders(packs, stable, uuid) {
  const documents = [];
  const find = (pack,key) => {
    const doc = packs[pack].find(doc=>flag(doc,"key")===key);
    if (!doc) throw new Error(`Missing roster content: ${pack}/${key}`);
    return doc;
  };
  const folder = (name,color,parent=null,sort=0) => {
    const _id = stable(`pro-benders/folder/${parent}/${name}`);
    documents.push({_id,documentName:"Folder",name,type:"Actor",color,folder:parent,sorting:"m",sort});
    return _id;
  };
  const brackets = tiers.map((tier,i)=>folder(tier.name,tier.color,null,(i+1)*100000));
  const soloFolder = folder("Solo","#846872",null,600000);
  const cityFolder = folder("Republic City","#345b68",null,700000);

  function addNpc(data, folder, slot, seed) {
    const {name,element,role,advances,wildcard=false,wounds=wildcard?3:0,title,appearance,tactics,biography,hook,
      team,tier,captain=false,signature,armor=0,parry=0,guard,mecha,match=false}=data;
    const rank = rankFor(advances);
    if (!rank || advances>11) throw new Error(`Invalid advances for ${name}`);
    const level = levelOf(rank);
    const id = key=>stable(`pro-benders/${data.key ?? name}/${key}`);
    const owned = (p,key) => {
      const doc = structuredClone(find(p,key));
      const sourceId = doc._id;
      doc._id = id(key);
      doc.folder = null;
      doc._stats = {compendiumSource:`Compendium.${ID}.${p}.Item.${sourceId}`};
      return doc;
    };
    const {preset,focus,label,skills:primarySkills}=roles[role];
    const draft = makePreset(preset,rank,focus,"none",wildcard);
    const primary = data.primary ?? Math.min(12,6+2*level+2*Number(wildcard));
    const secondary = Math.max(4,primary-2);
    const skills = {Fighting:secondary,Shooting:secondary,Bending:secondary,Athletics:secondary,
      Notice:draft.skills.Notice.sides,...Object.fromEntries(primarySkills.map(skill=>[skill,primary])),...data.skills};
    skills.Bending = Math.max(skills.Bending, 8 + 2 * level);
    draft.attributes.vigor = die(data.vigor ?? Math.min(10,(role==="anchor"?8:6)+2*level));
    draft.attributes.strength = die(data.strength ?? Math.min(10,(role==="anchor"?8:6)+2*Number(level===2)));
    draft.attributes.spirit = die(data.spirit ?? Math.min(10,(["controller","medic"].includes(role)?8:6)+2*Number(level>0)));
    const edgeKeys = [...new Set(data.edges)];
    const allowedStances = [element==="earth"?"Defensive":"Offensive","Hybrid"];
    const startingStance = element==="water" ? "fluid-stance" : edgeKeys.find(key=>
      allowedStances.includes(flag(packs.edges.find(edge=>flag(edge,"key")===key),"stance"))) ??
      (element==="earth" ? (role==="anchor"?"mountain-stance":"turtle-shell") :
        (role==="runner"?"hampering-stance":"elemental-onslaught"));
    if (!edgeKeys.includes(startingStance)) edgeKeys.unshift(startingStance);
    if (edgeKeys.includes("improved-extraction") && !edgeKeys.includes("extraction")) edgeKeys.push("extraction");
    for (const edge of edgeKeys) {
      const {attributes={},skills:needed={}} = edgeMinimums[edge] ?? {};
      for(const [key,sides] of Object.entries(attributes)) if (draft.attributes[key].sides<sides) draft.attributes[key]=die(sides);
      for(const [key,sides] of Object.entries(needed)) skills[key]=Math.max(skills[key]??0,sides);
    }
    if (data.powers.includes("healing")) skills.Healing ??= 6;
    const skillForSignature = signature && signatures[signature[1]][0].skill;
    if (skillForSignature) skills[skillForSignature] ??= secondary;
    // Keep Pace and initiative bonuses on their own items so the GM can switch them off.
    draft.ground = 6;
    const training = owned("backgrounds",`${element}bending`);
    const choices = [...new Set(data.powers)].filter(key=>!["knacks","basic-elemental-manipulation"].includes(key));
    if (choices.length<3) throw new Error(`${name} needs three background Techniques.`);
    training.flags[ID].initialized = true;
    training.flags[ID].choices = {techniques:choices.slice(0,3).map(key=>find("techniques",key)._id),
      stance:find("edges",startingStance)._id};
    const powers = ["knacks","basic-elemental-manipulation",...choices].map(key=>{
      const item = owned("techniques",key);
      const required = levelOf(item.system.rank);
      if (required<0 || required>level || !["universal",element].includes(flag(item,"element"))) {
        throw new Error(`${name} cannot take ${item.name} at ${rank}`);
      }
      item.name = elementalPowerName(item.name,element);
      item.system.arcane = training.name;
      if (edgeKeys.includes("bending-mastery") && key===choices[0]) item.flags[EFFECTS].tags.push("mastered-technique-2");
      return item;
    });
    const nativeEffect = (key,name,img,changes,description)=>({_id:id(`effect/${key}`),name,img,type:"base",transfer:true,
      showIcon:0,system:{changes},description:text(description)});
    const edges = edgeKeys.map(key=>{
      if (!Object.hasOwn(coreEdges,key)) {
        const item = owned("edges",key);
        const required = Number(item.system.requirements?.find(req=>req.type==="rank")?.value ?? 0);
        if (required>level) throw new Error(`${name} cannot take ${item.name} at ${rank}`);
        return item;
      }
      const [name,description,change] = coreEdges[key];
      if (level<(key==="improved-block"?2:Number(nativeSeasoned.has(key)))) throw new Error(`Rank too low for ${name}`);
      const img = "icons/svg/upgrade.svg";
      const changes = change ? [nativeChange(change.path,change.value,change.type)] : [];
      const rules = [];
      if (key==="combat-reflexes") changes.push(nativeChange("system.attributes.vigor.unStunBonus",2));
      if (["block","improved-block"].includes(key)) changes.push(nativeChange("system.stats.globalMods.gangUpDefend",1));
      if (key==="fleet-footed") changes.push(nativeChange("system.pace.ground",2),nativeChange("system.pace.running.die",2));
      if (key==="strong-willed") for (const attribute of ["smarts","spirit"]) rules.push({
        selector:`attribute:${attribute}`,type:"add",value:2,predicate:{op:"flag",source:"opposed",flag:"test"}});
      // SWADE resolves Dodge and Combat Acrobat from the Edge swid on a targeted attack.
      const effects = [];
      if (changes.length || rules.length) {
        const {system,conditions} = effectChanges(changes,rules);
        const effect = nativeEffect(key,name,img,system.changes,description);
        if (rules.length) effect.flags = {[EFFECTS]:{conditions}};
        effects.push(effect);
      }
      return {_id:id(`edge/${key}`),type:"edge",name,img,effects,system:{swid:key,source:"SWADE",description:text(description)}};
    });
    const [hindranceKey,flaw] = data.hindrance;
    const {name:flawName,major,change:flawChange}=hindrances[hindranceKey];
    const flawIcon = "icons/svg/hazard.svg";
    const flawEffects = flawChange?[nativeEffect(hindranceKey,flawName,flawIcon,[nativeChange(flawChange.path,flawChange.value,flawChange.type)],flaw)]:[];
    const flawItem = {_id:id("hindrance"),name:flawName,type:"hindrance",img:flawIcon,effects:flawEffects,
      system:{swid:slug(flawName),major,severity:major?"major":"minor",description:text(flaw)}};
    const items = [training,...Object.entries(skills).map(([name,sides])=>{
      const key = slug(name);
      const source = packs["bending-kit"].some(doc=>flag(doc,"key")===key) ? owned("bending-kit",key) : {
        _id:id(key),name,type:"skill",img:"icons/svg/book.svg",system:{swid:key,attribute:"smarts"}
      };
      // Healing is both a skill and a Technique. They must survive packing as separate documents.
      if (powers.some(power=>power._id===source._id)) source._id = id(`skill/${key}`);
      source.system.die = die(sides);
      return source;
    }),...weaponKit(element).map(key=>owned("bending-kit",key)),...edges,flawItem,...powers,
    owned("stances","balanced"),owned("effects","backlash"),owned("effects","martial")];
    const entryId = id("casting");
    const stats = {...draft,name,rank,role:preset,archetypeLabel:team?`${team} · ${captain?"Captain":label}`:title,
      wildcard,resilience:wildcard?0:wounds,bennies:data.bennies??2,armor,parry,core:false,cr:null,folder,
      disposition:match||data.hostile ? -1 : 0,tags:team?["pro-bender",slug(team)]:[data.roster==="solo"?"solo-bender":"republic-city",slug(title)],
      spellcasting:{[entryId]:{id:entryId,name:training.name,trait:"Bending",points:10,rule:"no-pp"}}};
    const img = `icons/equipment/head/${portraits[element][step(3,seed)]}.webp`;
    let counter = 0;
    const actor = npcSource(stats,items,{img,flags:{core:{sheetClass:"swade.CharacterSheet"}},prototypeToken:{texture:{src:img}}},
      ()=>id(`embedded/${++counter}`));
    actor._id = data.documentId ?? id("actor");
    actor.sort = (slot+1)*100000;
    actor.system.advances.value = advances;
    actor.flags[ID] = {roster:match?"team":data.roster,team,tier,element,captain,role,champion:!!data.champion,rosterTextVersion};
    Object.assign(actor.flags[POWERS].spellcastingEntries[entryId],{attribute:"spirit",sources:[training._id]});
    actor.items.find(item=>flag(item,"key")==="knacks").system.actions.trait = "";
    const protective = actor.items.find(item=>item.type==="armor");
    if (protective) {
      protective.name = guard ?? (match?"League protective pads":"Field jacket");
      protective.img = "icons/equipment/chest/breastplate-collared-leather-brown.webp";
    }
    const parryEffect = actor.effects.find(effect=>effect.name==="Parry adjustment");
    if (parryEffect) {
      parryEffect.name = match?"Ring guard":"Defensive training";
      parryEffect.img = "icons/svg/shield.svg";
      parryEffect.showIcon = 0;
    }
    if (!wildcard && wounds) actor.items.push({
      _id:id("resilience"),name:wounds===2?"Very Resilient":"Resilient",type:"ability",img:"icons/svg/shield.svg",
      system:{description:text(`Can take ${wounds===1?"one Wound":"two Wounds"} before Incapacitation.`)}
    });
    Object.assign(actor.system.details,{
      appearance:text(appearance),goals:"",
      notes:`<ul>${tactics.map(tactic=>`<li>${escape(tactic)}</li>`).join("")}</ul>`
    });
    const background = [
      data.champion && text("Reigning pro-bending champion and captain of the Obsidian Cranes."),
      biography && text(biography),
      hook && text(hook),
      mecha && `<p>Use @UUID[Compendium.${ID}.pro-benders.Actor.${stable(`pro-benders/mecha/${mecha}`)}]{${escape(mecha)} mecha tank} as a separate token.</p>`
    ].filter(Boolean).join("");
    if (background) actor.system.details.biography = {value:background};
    if (signature) {
      const [name,key] = signature;
      const [{instruction,...options},changes,rules] = signatures[key];
      const period = match?"bout":"scene";
      const explanation = instruction;
      const end = options.skill ? "" : " Choose End effect after use.";
      const description = text(explanation)+text(`Once per ${period}.${end} Reset before the next ${period}.`);
      const {system,conditions} = effectChanges(changes,rules.map(([selector,value,predicate])=>({selector,value,predicate,type:"add"})));
      const img = `icons/svg/${({slip:"wingfoot","feint-shot":"target",brace:"shield",support:"sound",close:"combat",cover:"shield",
        recovery:"regen","long-shot":"target",counter:"thrust",cast:"aura",mark:"eye",opening:"target",takedown:"falling",
        footwork:"wingfoot",switch:"direction",champion:"target"})[key]}.svg`;
      const macros = Object.fromEntries([["Use","Use"],["Finish","End effect"],["Reset","Reset use"]].map(([key,label])=>
        [`signature${key}`,{name:label,type:"macro",macroActor:"self",uuid:uuid("macros",`signature-${key.toLowerCase()}`,"Macro")}]));
      actor.items.push({_id:id("signature-action"),name,type:"action",img,system:{description,category:"Signature Move",source:"Avatar",
        swid:slug(name),favorite:true,actions:{additional:macros}},flags:{[ID]:{signatureAction:{period,...options}}},
        effects:[{_id:id("signature"),name,type:"base",disabled:true,transfer:false,showIcon:0,
          img,description:text(explanation),system,flags:{[EFFECTS]:{conditions}}}]});
    }
    if (new Set(actor.items.map(item=>item._id)).size!==actor.items.length) throw new Error(`Duplicate item ID on ${name}`);
    documents.push(actor);
  }

  for (const [i,[team,members]] of teams.entries()) {
    const division = Math.floor(i/4);
    const tier = tiers[division];
    const teamFolder = folder(team,tier.color,brackets[division],(i%4+1)*100000);
    for (const [slot,[name,element,role,skill,appearance,tactics,flaw,flawText,signature,signatureType]] of members.entries()) {
      const captain = slot===0;
      const champion = signatureType==="champion";
      const tierSlot = Number(!captain);
      const wildcard = tier.wildcards[tierSlot];
      const advances = champion?11:tier.advances;
      const rank = rankFor(advances);
      const level = levelOf(rank);
      const variety = i*3+slot;
      const rotate = list=>[...list.slice(variety%list.length),...list.slice(0,variety%list.length)];
      const powers = [...new Set([roleTechnique[role],...rotate(teamTechniqueChoices[element])])]
        .filter(key=>levelOf(find("techniques",key).system.rank)<=level).slice(0,3+Number(division>=2)+Number(champion));
      const eligible = key=>Object.hasOwn(coreEdges,key) ? level>=Number(nativeSeasoned.has(key))
        : level>=Number(find("edges",key).system.requirements.find(req=>req.type==="rank")?.value ?? 0);
      const base = teamEdgeChoices[element][variety%teamEdgeChoices[element].length];
      const edges = [base,...rotate(roleEdges[role]).filter(eligible).slice(0,1+Number(division>=1)+Number(division>=3))];
      if (division>=2 && (role==="shooter"||role==="anchor")) edges.push(role==="shooter"?"deadly-hurl":"deadly-assault");
      if (champion) edges.push("deadly-hurl","combat-reflexes","iron-jaw","bending-mastery");
      const primary = champion?12:Math.min(12,8+2*division-2*Number(division===0 && !captain && i%2===0));
      const skills = {[skill]:Math.min(12,6+2*level+2*Number(captain&&skill!=="Shooting"))};
      if (division>=2) skills.Shooting = champion ? 12 : role==="shooter"?primary:Math.max(8,primary-2);
      const {skills:skillAdjustments,extraEdges=[],...adjustments} = leagueAdjustments[name] ?? {};
      Object.assign(skills,skillAdjustments);
      edges.push(...extraEdges);
      addNpc({name,key:`team/${slug(team)}/${element}`,documentId:teamActorIds[i][slot],element,role,advances,wildcard,wounds:tier.wounds[tierSlot],
        captain,champion,armor:division>=2&&captain?2:1,parry:champion?1:0,primary,skills,edges,powers,
        team,tier:tier.name,title:`${team} · ${captain?"Captain":roles[role].label}`,appearance,tactics,hindrance:[flaw,flawText],
        signature:signature?[signature,signatureType]:undefined,match:true,...adjustments},teamFolder,slot,variety);
    }
  }
  for (const [i,data] of solo.entries()) addNpc({...data,roster:"solo",armor:data.role==="anchor"?1:0},soloFolder,i,i);
  function addDistrict([name,entries],parent,i) {
    const sub = folder(name,"#345b68",parent,(i+1)*100000);
    for (const [slot,data] of entries.entries()) {
      if (Array.isArray(data)) addDistrict(data,sub,slot);
      else {
        addNpc({...data,roster:"city",hostile:name.includes("Triad")},sub,slot,i+slot);
        if (data.mecha) documents.push(makeMecha(data.mecha,sub,stable,documents.at(-1)));
      }
    }
  }
  districts.forEach((district,i)=>addDistrict(district,cityFolder,i));
  return documents;
}

function makeMecha(role, folder, stable, pilot) {
  const fire = role==="Fire support";
  const name = `${role} mecha tank`;
  const img = "icons/svg/clockwork.svg";
  const weapon = (label,key,damage,range,ap)=>({_id:stable(`pro-benders/mecha/${role}/${key}`),name:label,
    type:"weapon",img,system:{damage,range,ap,rof:1,rangeType:range?1:0,equipStatus:3,weight:0,
      isVehicular:true,actions:{trait:"Vehicles"}},effects:[]});
  return {_id:stable(`pro-benders/mecha/${role}`),name,type:"vehicle",img,folder,sort:900000,
    prototypeToken:{name,width:2,height:2,texture:{src:img}},
    system:{size:4,wounds:{max:3},driver:{skill:"Vehicles"},description:
      text(fire?"The launcher sits above the right shoulder. The crew keeps it behind the line and fires down open lanes.":
        "A short grapple arm and broad feet let it lift wreckage. It needs to close the distance to use the arm.")+
      `<p>Assign @UUID[Compendium.${ID}.pro-benders.Actor.${pilot._id}]{${escape(pilot.name)}} as driver. Roll Vehicles for the mounted weapon.</p>`,
      classification:"Mecha tank",toughness:{total:11,armor:3},topspeed:{value:30,unit:"mph"}},
    items:fire?[weapon("Training launcher","launcher","2d8","12/24/48",2)]:[weapon("Grapple arm","grapple","2d8","",1)],effects:[]};
}
