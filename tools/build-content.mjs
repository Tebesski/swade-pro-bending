import {createHash} from "node:crypto";
import {readFileSync, writeFileSync} from "node:fs";
import {ID, POWERS, EFFECTS, TEMPLATES, slug} from "../scripts/shared.mjs";

import {iconFor} from "./icons.mjs";
import {effectChanges} from "../scripts/effect-data.mjs";
import {ELEMENTS, weaponKey, weaponName} from "../scripts/bending-data.mjs";
import {buildProBenders} from "./pro-benders.mjs";

const rules = JSON.parse(readFileSync(new URL("../content/avatar.json", import.meta.url)));
const stable = key => createHash("sha256").update(`avatar:${key}`).digest("hex").slice(0,16);
const pack = {};
const add = (p, doc) => ((pack[p] ??= []).push(doc), doc);
const documentId = (p,key) => stable(`${p}/${p==="bending-kit" ? key.replace(/^earth-(?=hurl|assault)/,"elemental-") : key}`);
const uuid = (p, key, type = "Item") => `Compendium.${ID}.${p}.${type}.${documentId(p,key)}`;
const link = (p,key,label,type) => `@UUID[${uuid(p,key,type)}]{${label}}`;
const revision = 2;
const item = (p, key, name, type, system, {flags = {}, meta = {}, effects = [], folder = null} = {}) => add(p,{
  _id:documentId(p,key), name, type, img:iconFor(p,key), folder,
  system:{swid:key, source:"Avatar", ...system}, flags:{[ID]:{key,contentRevision:revision,...meta},...flags}, effects
});
const folder = (p, name, color) => {
  const id = stable(`${p}/folder/${name}`);
  add(p,{_id:id, documentName:"Folder", type:"Item", name, color, sorting:"a"});
  return id;
};
const change = (key, value, type = "add") => ({key,type,value:String(value),phase:"initial",priority:null});
const rollFlag = flag => ({op:"flag",source:"roll",flag});
const actorFlag = flag => ({op:"flag",source:"actor",flag});
const not = child => ({op:"not",child});
const all = (...children) => ({op:"all",children});
const any = (...children) => ({op:"any",children});
const sbeRule = (selector, value, predicate = all()) => ({selector, value, type:"add", predicate});
const opposedFlag = flag => ({op:"flag",source:"opposed",flag});
const itemFlag = flag => ({op:"flag",source:"item",flag});
const targetFlag = flag => ({op:"flag",source:"target",flag});
const effect = (pack, key, name, {description="", changes=[], rules=[], tags=[], transfer=false, meta={}, duration, disabled=false, statuses=[], visible=false} = {}) => {
  const {system, conditions} = effectChanges(changes,rules);
  return {_id:stable(`effect/${key}`), name, type:"base", img:iconFor(pack,key), description, disabled, transfer, statuses,
    showIcon:visible ? 2 : 0, ...(duration ? {duration} : {}), system,
    flags:{[ID]:{contentRevision:revision,...meta,backgroundEffect:!visible},[EFFECTS]:{conditions,tags}}};
};
const attackSkills = (value, predicate = all()) => ["Fighting","Shooting"].map(skill=>sbeRule(`skill:${skill}`,value,predicate));
for (const row of rules.stances) {
  const stance = slug(row.name).split("-")[0];
  const fire = actorFlag("avatar-firebender");
  const offensive = itemFlag("offensive-technique");
  const damaging = itemFlag("damaging-technique");
  const unskilledElemental = all(itemFlag("elemental-weapon"),not(any(rollFlag("fighting"),rollFlag("shooting"))));
  const stanceRules = stance === "defensive" ? [
    ...attackSkills(-2,not(fire)), ...attackSkills(-1,fire),
    sbeRule("global:trait",-2,all(any(offensive,unskilledElemental),not(fire))),
    sbeRule("global:trait",-1,all(any(offensive,unskilledElemental),fire)),
    sbeRule("global:trait",1,opposedFlag("offensive-technique")),
    sbeRule("target-roll:targetAttackRanged",-1)
  ] : stance === "offensive" ? [
    ...attackSkills(2), sbeRule("global:trait",2,any(damaging,unskilledElemental)),
    sbeRule("outgoing-damage",-2,rollFlag("damage"))
  ] : [];
  const changes = stance === "defensive" ? [change("system.stats.parry.value",1)] : [];
  const e = effect("stances",stance,row.name,{description:row.html,changes,rules:stanceRules,meta:{stance},
    tags:[`avatar-${stance}`],visible:true});
  item("stances",stance,row.name,`${EFFECTS}.effect`,{description:row.html},{meta:{stance},effects:[e]});
}
for (const [key,name,desc] of [
  ["backlash","Bending Backlash","A critical failure on Bending, Elemental Hurl, or Elemental Assault automatically applies one Fatigue step. Disable this effect to turn Backlash off for this actor."],
  ["martial","Martial Bending","Technique chat cards can check engagement, target Parry, opposed rolls, and Vulnerability. Remove this effect to turn off the workflow."],
  ["legs","Leg Work: Hands Disabled","While bending with disabled hands, take −1 to bending attacks, Technique activation, and bending damage. Remove when your hands are usable again."],
  ["onslaught","Elemental Onslaught: Same Target","Enable this only when all offensive actions this turn are against the same target. The MAP reduction requires Offensive Stance."],
  ["cold","Water Tribe: Resist Cold","Apply for a cold environment or hazard roll. Water Tribe characters get +4 on the Vigor roll. Remove the marker after the roll."],
  ["movement","Earthbending: Resist Forced Movement","Apply when resisting forced movement or being knocked prone. Earthbenders in Defensive Stance may roll Strength instead of Agility and gain +1 on that Strength roll."],
  ["turtle","Turtle Shell: Defending","Apply to mark Defend if the native Defending condition is unavailable. Turtle Shell uses this marker or the Defending condition while in Defensive Stance."],
  ["unleash","Unleash Elements","Apply at the start of your turn in Offensive Stance to become Vulnerable and gain the listed bonuses until your next turn. Use a Better Effects opposed roll for Technique resistance."],
  ["hampering","Leaving a Threat Zone","Apply to a target while it tries to leave a threat zone. Hampering Stance grants its Offensive Stance bonus against this target."],
  ["berserk","Berserk (Avatar)","Apply after a failed or voluntarily failed Smarts check. Use Wild Attack for eligible attacks and adjudicate ally strikes and Fatigue at rounds 5 and 10 as described on the Edge."],
  ["deadly","Deadly Elements","+2 damage to Elemental Hurl and Assault."],
  ["deadly-raise","Deadly Elements (Raise)","+4 damage to Elemental Hurl and Assault."],
  ["earth-armour","Armour in Earth","+2 stackable Armour."],
  ["earth-armour-raise","Armour in Earth (Raise)","+4 stackable Armour."],
  ["ice-armour","Armour in Ice","+2 stackable Armour and the ice armour and fire resistance tags. Use the table’s damage ruling for fire resistance."],
  ["ice-armour-raise","Armour in Ice (Raise)","+4 stackable Armour and the ice armour and fire resistance tags. Use the table’s damage ruling for fire resistance."],
  ["havoc","Havoc: Distracted","Apply to a target caught in Havoc; resolve Strength and forced movement separately."],
  ["numb","Relief: Numb","Ignore 1 point of combined Wound and Fatigue penalties for an hour. Use this or the raised effect, never both."],
  ["numb-raise","Relief: Numb (Raise)","Ignore 2 points of combined Wound and Fatigue penalties for an hour. Use this or the base effect, never both."],
  ["vortex","Elemental Vortex","Light Cover and −2 incoming damage against ranged attacks. Adjudicate concealment and adjacent Agility rolls separately."],
  ["paralysis","Paralysis","The recipient’s ground Pace is 0. Use the Technique text to resolve its other movement modes, actions on a raise, and Vigor recovery. Remove the effect on recovery."],
  ["quicken","Quicken: Speed","Doubles Pace and running. On a raise, use the raise effect."],
  ["quicken-raise","Quicken: Speed (Raise)","Doubles Pace and running and ignores the running penalty."]
]) {
  const elemental = rollFlag("elemental-weapon");
  const bending = any(elemental,rollFlag("bending-technique"),rollFlag("bending"));
  const armour = key.includes("-armour"), ice = key.startsWith("ice-armour"), powerBuff = /^(?:deadly|quicken|(?:earth|ice)-armour)/.test(key);
  const duration = powerBuff ? {units:"rounds",value:5,expiry:"turnEnd"} : key === "unleash" ? {units:"rounds",value:1,expiry:"turnStart"}
    : key === "berserk" ? {units:"rounds",value:10,expiry:"turnEndPrompt"} : key === "havoc" ? {units:"rounds",value:1,expiry:"turnEnd"} :
    key.startsWith("numb") ? {units:"seconds",value:3600} : key==="vortex" ? {units:"rounds",value:3,expiry:"turnEnd"} :
    key==="paralysis" ? {units:"rounds",value:5,expiry:"turnEnd"} : undefined;
  const changes = armour ? [change("system.stats.toughness.armor",key.endsWith("-raise")?4:2)] :
    key.startsWith("numb") ? [change("system.woundsOrFatigue.ignored",key.endsWith("-raise")?2:1,"upgrade")] :
    key==="paralysis" ? [change("system.pace.ground",0,"override")] :
    key.startsWith("quicken") ? [change("system.pace.ground",2,"multiply"),change("sbe.modifyFlag","avatar-quicken"),...(key.endsWith("-raise")?[change("sbe.modifyFlag","avatar-no-running-penalty")]:[])] :
    key === "berserk" ? [change("system.attributes.strength.die.sides",2),change("system.stats.toughness.value",2),change("system.wounds.ignored",1),change("system.stats.parry.value",-2)] : [];
  const conditional = {
    legs:[sbeRule("global:trait",-1,bending),sbeRule("outgoing-damage",-1,bending)],
    
    unleash:[sbeRule("outgoing-damage",2,all(actorFlag("avatar-offensive"),bending)),
      sbeRule("target-roll:trait",-2,all(actorFlag("avatar-offensive"),opposedFlag("offensive-technique")))],
    berserk:[sbeRule("outgoing-damage",2,any(elemental,rollFlag("melee"),rollFlag("damaging-technique")))],
    vortex:[sbeRule("target-roll:targetAttackRanged",-2),sbeRule("incoming-damage",-2,rollFlag("ranged"))],
    deadly:[sbeRule("outgoing-damage",2,elemental)],
    "deadly-raise":[sbeRule("outgoing-damage",4,elemental)]
  }[key] ?? [];
  item("effects",key,name,`${EFFECTS}.effect`,{description:`<p>${desc}</p>`},{effects:[effect("effects",key,name,{description:`<p>${desc}</p>`,changes,rules:conditional,
    meta:{[key]:true,...(armour?{wornArmour:true}:{})},duration,visible:!!duration,
    tags:[...(ice?["ice-armour","fire-resistance"]:[]),...({cold:["cold-hazard"],onslaught:["avatar-onslaught-same-target"],movement:["forced-movement"],turtle:["avatar-defending"],hampering:["leaving-threat-zone"]}[key] ?? [])],statuses:({havoc:["distracted"],unleash:["vulnerable"]}[key] ?? [])})]});
}
const rank = {Novice:0,Seasoned:1,Veteran:2,Heroic:3,Legendary:4};
const requirements = row => (row.requirements ? row.requirements.split(/,\s*|\s+or\s+(?=[A-Z])/g) : ["Novice"]).map((text,i,arr) => {
  const combinator = row.requirements?.includes(" or ") && !row.requirements.includes(",") && i < arr.length-1 ? "or" : "and";
  const m = text.match(/^Bending d(\d+)\+?$/);
  if (text in rank) return {type:"rank",selector:"",value:rank[text],combinator};
  if (m) return {type:"skill",selector:"bending",label:"Bending",value:Number(m[1]),combinator};
  const name = {Earthbender:"Earthbending",Firebender:"Firebending",Waterbender:"Waterbending"}[text] ?? text;
  return {type: /[()+]/.test(name) ? "other":"edge",selector:slug(name),label:name,value:"",combinator};
});
const edgeFolders = new Map();
for (const row of rules.edges) {
  const group = row.category === "SBT" ? `SBT · ${row.group}` : row.category;
  if (!edgeFolders.has(group)) edgeFolders.set(group,folder("edges",group,"#664e34"));
  const key = slug(row.name);
  const weaponChange = (kind,field,value) => Object.keys(ELEMENTS).flatMap(element=>[false,true].map(off=>
    change(`@Weapon{${weaponName(element,kind,off)}}[system.${field}]`,value,"override")));
  const changes = {
    "leg-work":weaponChange("hurl","range","8/16/34"),
    "deadly-hurl":weaponChange("hurl","damage","2d8"),
    "fatal-hurl":weaponChange("hurl","damage","2d10").map(change=>({...change,priority:60})),
    "deadly-assault":weaponChange("assault","damage","@str+d8")
  }[key] ?? [];
  const defensive = actorFlag("avatar-defensive");
  const offensive = actorFlag("avatar-offensive");
  const resistMovement = any(rollFlag("forced-movement"), actorFlag("forced-movement"));
  const edgeRules = {
    "experienced-healer": [sbeRule("global:trait",2,rollFlag("healing"))],
    "elemental-onslaught": [sbeRule("map",-1,all(offensive,actorFlag("avatar-onslaught-same-target")))],
    "mountain-stance": [sbeRule("armor",1,defensive),sbeRule("global:trait",1,all(defensive,resistMovement))],
    "turtle-shell": [sbeRule("target-roll:targetAttackRanged",-3,all(defensive,any(actorFlag("defending"),actorFlag("avatar-defending"))))],
    "hampering-stance": [sbeRule("global:attack",2,all(offensive,targetFlag("leaving-threat-zone"))),
      sbeRule("global:trait",2,all(offensive,targetFlag("leaving-threat-zone"),itemFlag("offensive-technique")))],
    "shadow-training": ["earth","fire","water"].flatMap(element=>[
      sbeRule("global:trait",1,all(actorFlag("avatar-"+element+"bender"),opposedFlag(element))),
      sbeRule("toughness",1,all(actorFlag("avatar-"+element+"bender"),rollFlag(element)))
    ]),
    "bending-mastery": [sbeRule("global:trait",2,itemFlag("mastered-technique-2")),
      sbeRule("global:trait",1,all(itemFlag("mastered-technique-1"),not(itemFlag("mastered-technique-2"))))]
  }[key] ?? [];
  const meta = {"experienced-healer":{experiencedHealer:true},"close-combat-specialist":{closeCombatSpecialist:true},"shadow-training":{shadowTraining:true},"leg-work":{elementalReach:true}}[key] ?? {};
  const effects = changes.length || edgeRules.length || Object.keys(meta).length
    ? [effect("edges",key,row.name,{transfer:true,changes,rules:edgeRules,meta})] : [];
  const extra = {berserk:"berserk","leg-work":"legs","elemental-onslaught":"onslaught","turtle-shell":"turtle","unleash-elements":"unleash",
    "mountain-stance":"movement","hampering-stance":"hampering"}[key];
  const mastery = key==="shadow-training" ? "<p>Better Effects applies the opposed and Toughness bonuses when the attacker’s roll carries your element flag. Martial Bending includes its Parry bonus. For other Parry-based attacks, include the bonus when resolving the hit.</p>" : key==="bending-mastery" ? "<p>Use the Technique’s Better Effects Flags to mark one Technique with <strong>mastered-technique-2</strong>, or two Techniques with <strong>mastered-technique-1</strong>. Clear the flags or disable this Edge’s effect to turn off the bonus.</p>" : "";
  const desc = row.html + mastery + (extra ? `<p>Table aid: ${link("effects",extra,pack.effects.find(doc=>doc.flags[ID].key===extra).name)}.</p>` : "");
  item("edges",key,row.name,"edge",{description:desc,category:row.category === "Technique" ? "Technique" : row.category,requirements:requirements(row)},
    {effects,folder:edgeFolders.get(group),meta:{stance:row.stance,element:row.group && row.group !== "Universal" ? row.group.toLowerCase() : "",requirements:row.requirements}});
}
const minor = (key,name,id) => ({name,uuid:`Compendium.swade.hindrances.Item.${id}`,mutation:{system:{severity:"minor",major:false}}});
const stubborn=minor("stubborn","Stubborn","azzxAsa4RL4h6pRb"), cautious=minor("cautious","Cautious","xVZDXCCWRywhXAln");
const arrogant=minor("arrogant","Arrogant","MHT53wLklMhwkiws"), driven=minor("driven","Driven","I2fywaBASbCCh5Xm");
const thumbs=minor("all-thumbs","All Thumbs","eDXRWmZ4Tgg6b14e"), outsider=minor("outsider","Outsider","PJXEZiSCew4xyBU5");
const illiterate=minor("illiterate","Illiterate","8S2h3R7DpYOrbamK");
const grant = (p,key,name) => ({name,uuid:uuid(p,key)});
for (const row of rules.nations) {
  const key = slug(row.name);
  const options = {
    "earth-kingdom":{attrs:["spirit"],grants:[{name:"Strong Willed",uuid:"Compendium.swade.edges.Item.ttlD4Gy7Dlq8yzD1"},stubborn,cautious]},
    "fire-nation":{attrs:["agility","smarts"],grants:[arrogant,driven]},
    "water-tribe":{attrs:["vigor"],grants:[thumbs,outsider,grant("edges","icebending","Icebending")]},
    "swamp-people":{attrs:["vigor"],grants:[outsider,grant("edges","plantbending","Plantbending")],skills:["Boating","Survival"]},
    republican:{grants:[]}
  }[key];
  const extra = key==="water-tribe" ? `<p>Cold resistance: ${link("effects","cold","Resist Cold")}.</p>` :
    key==="swamp-people" ? `<p>Choose <strong>one</strong>: @UUID[${illiterate.uuid}]{Illiterate (Minor)} or @UUID[${thumbs.uuid}]{All Thumbs (Minor)}. You will be prompted when adding this Nation.</p>` : "";
  const nationRules = key==="water-tribe" ? [sbeRule("attribute:vigor",4,any(rollFlag("cold-hazard"),actorFlag("cold-hazard")))] : [];
  const changes = (options.attrs ?? []).map(a=>change(`system.attributes.${a}.die.sides`,2));
  for (const name of options.skills ?? []) changes.push(change(`@Skill{${name}}[system.die.sides]`,2));
  const choices = key==="swamp-people" ? [illiterate,thumbs] : undefined;
  const choiceSets = choices?.length ? [{title:"Choose a Swamp People Hindrance",choice:null,choices:choices.map(hindrance=>({
    name:hindrance.name+" (Minor)",addToName:false,mutation:{
      system:{grants:[...options.grants,hindrance]},flags:{[ID]:{choicesMade:{swamp:hindrance.uuid}}}
    }
  }))}] : [];
  item("nations",key,row.name,"ancestry",{description:row.html+extra,grants:options.grants,choiceSets},
    {meta:{nation:key,skills:options.skills,choices},
      effects:changes.length ? [effect("nations",key,row.name,{transfer:true,changes,rules:nationRules})] : []});
}
for (const row of rules.backgrounds) {
  const element = row.name.replace("bending","").toLowerCase();
  item("backgrounds",slug(row.name),row.name,"edge",{isArcaneBackground:true,category:"Bending Background",
    description:`<p><strong>Bending skill:</strong> Bending (Spirit).</p><p>Learn three Techniques of your choice and gain Knacks, Basic Elemental Manipulation, and the main-hand and off-hand versions of ${weaponName(element,"hurl",false)} and ${weaponName(element,"assault",false)}.</p>${row.html}<p>Use Avatar Setup to choose your free Techniques${element==="water"?"":" and stance Edge"} or restore a missing grant.</p>`,
    requirements:requirements({requirements:"Novice"})},{meta:{background:element},effects:element==="fire" ? [effect("backgrounds","firebending","Firebending Training",{transfer:true,tags:["avatar-firebender"]})] :
      element==="earth" ? [effect("backgrounds","earthbending","Earthbending Training",{transfer:true,rules:[
        sbeRule("attribute:strength",1,all(actorFlag("avatar-defensive"),any(rollFlag("forced-movement"),actorFlag("forced-movement"))))
      ],tags:["avatar-earthbender"]})] : [effect("backgrounds","waterbending","Waterbending Training",{transfer:true,tags:["avatar-waterbender"]})],flags:{[EFFECTS]:{tags:[row.name]}}});
}
const skillsFolder = folder("bending-kit","Setting Skills","#335463");
const weaponsFolder = folder("bending-kit","Elemental Weapons","#664e34");
const attributes = {vigor:"vigor",agility:"agility",spirit:"spirit",smarts:"smarts",strength:"strength"};
for (const row of rules.skills) item("bending-kit",slug(row.name),row.name,"skill",
  {description:row.html,attribute:attributes[row.attribute],die:{sides:4,modifier:0}},{folder:skillsFolder});
for (const element of Object.keys(ELEMENTS)) for (const [kind,trait,damage,rangeType,range] of [["hurl","Shooting","2d6",1,"6/12/24"],["assault","Fighting","@str+d6",0,""]]) {
  for (const off of [false,true]) {
    const key = weaponKey(element,kind,off);
    item("bending-kit",key,weaponName(element,kind,off),"weapon",
      {category:"Natural Weapons",description:`<p>${trait}. ${ELEMENTS[element]} natural weapon. Use any trapping available to your bending background.</p>`,
        damage,rangeType,range,rof:1,weight:0,price:0,quantity:1,equippable:true,equipStatus:off?2:4,actions:{trait},favorite:true},
      {meta:{weapon:kind,off,element},flags:{[EFFECTS]:{tags:["elemental-weapon",`elemental-${kind}`,element]}},folder:weaponsFolder});
  }
}
const groups = Object.fromEntries(["Universal","Earth","Fire","Water"].map(name=>[name,folder("techniques",name,name==="Universal"?"#575981":"#335463")]));
const coreDamage = {blast:"2d6",burst:"2d6",jet:"2d8","elemental-barrage":"2d6","damage-field":"2d4","elemental-vortex":"2d4"};
const raisedDamage = new Set(["blast","burst","elemental-barrage"]);
const area = {impede:["medium"],tremor:["medium"],havoc:["medium","cone"],jet:["stream"],blast:["medium"],burst:["cone","stream"],veil:["medium"],
  "elemental-barrage":["scone"],"elemental-vortex":["medium"],"damage-field":["small"],"earth-shelter":["small"],"water-shelter":["small"]};
const direct = new Set(["blast","burst","jet","elemental-barrage","damage-field","elemental-vortex"]);
const offensive = new Set([...direct,"elemental-maneuver","blind","tremor","havoc","paralysis","banish","earth-entangle","water-entangle","water-bubble"]);
const targetModes = {launch:"choice","basic-elemental-manipulation":"choice","advanced-elemental-manipulation":"choice","advanced-earth-manipulation":"choice",
  "boost-lower-trait":"choice","manipulate-emotions":"choice","earth-move":"choice","water-move":"choice","analyse-foe":"self"};
const pendingArea = new Set(["blind","banish","earth-entangle","water-entangle","earth-move","water-move","damage-field"]);
const damageAdd = (id, formula) => ({id,type:"addDamageDice",enabled:true,system:{formula}});
const behavior = (id,type,system,triggers = ["onPlace"]) => ({id,type,enabled:true,system,triggers});
const rename = {"earth-armour":"Armour in Earth","water-armour":"Armour in Ice","earth-entangle":"Entangle (Earth)","water-entangle":"Entangle (Water)",
  "earth-shelter":"Shelter (Earth)","water-shelter":"Shelter (Water)","earth-move":"Move (Earth)","water-move":"Move (Water)"};
for (const row of rules.powers) {
  const element = row.group.toLowerCase();
  const nameKey = slug(row.name);
  const key = ["armour","entangle","shelter","move"].includes(nameKey) ? `${element}-${nameKey}` : nameKey;
  const shapes = [...(area[key] ?? [])];
  const mods = row.mods.map(mod => {
    const id = slug(mod.name);
    let penalties = [...mod.cost.replace(/-\s+(\d)/g,"-$1").matchAll(/[+−-]\d+/g)].map(m=>Number(m[0].replace("−","-")));
    if (!penalties.length && mod.cost.trim()==="-") penalties = [0];
    if (/to -3/.test(mod.cost)) penalties = [-1,-2,-3];
    if (key==="seismic-sense"&&id==="range") penalties=[-2,-4,-6];
    const replacement = (shape, target) => ({id:`${id}-shape-${target}`,type:"changeTemplate",enabled:true,system:{replacements:{[shape]:target}}});
    let options = penalties.map(penalty => ({
      id:`p${penalty<0?"m":"p"}${Math.abs(penalty)}`,cost:-2*penalty,
      label:penalties.length>1?`${penalty}`:""
    }));
    if (id==="area-effect" || id==="area-of-effect") {
      if (["blast","impede","veil","tremor"].includes(key)) options = [["small","Small Blast"],["large","Large Blast"]]
        .map(([shape,label])=>({id:shape,cost:options[0].cost,label,templateChanges:[replacement("medium",shape)]}));
      if (key==="burst") options=[{...options[0],label:"Medium Arc (manual shape)"}];
      if (key==="elemental-barrage") options=[{...options[0],label:"Large Cone",templateChanges:[replacement("scone","cone")]}];
      if (key==="damage-field") options=[{...options[0],label:"Medium Blast",templateChanges:[replacement("small","medium")]}];
    }
    if (id==="big" && key==="havoc" || id==="size"&&nameKey==="shelter")
      options=options.map(o=>({...o,templateChanges:[replacement(nameKey==="shelter"?"small":"medium","large")]}));
    if (key==="damage-field"&&id==="damage") options=options.map(o=>({...o,changes:[{id:"bigger-damage",type:"increaseDieType",enabled:true,system:{steps:"1",scope:"base"}}]}));
    if (id==="cone" && key==="tremor") options=options.map(o=>({...o,templateChanges:[replacement("medium","cone")]}));
    if (id==="damage" && ["blast","burst"].includes(key)) options=options.map(o=>({...o,changes:[damageAdd("extra-damage","1d6")]}));
    if (id.startsWith("greater-") && ["blast","burst"].includes(key)) options=options.map(o=>({...o,changes:[damageAdd("greater-damage","2d6")]}));
    if (key==="damage-field" && id==="greater-damage-field") options=options.map(o=>({...o,changes:[{id:"bigger-damage",type:"increaseDieType",enabled:true,system:{steps:"1",scope:"base"}},damageAdd("greater-field","1d6")]}));
    if (id==="duration" || id==="lasting-flames") {
      const m = mod.description.match(/(?:to|raised to) (?:<[^>]+>)?(\d+)\s*(minute|round|hour)?/i);
      if (m) options=options.map(o=>({...o,changes:[{id:"duration",type:"adjustDuration",enabled:true,system:{scope:"power",operation:"override",amount:Number(m[1]),unit:m[2]?`${m[2]}s`:"rounds"}}],
        templateChanges:shapes.length?[{id:"region-duration",type:"modifyExpiration",enabled:true,system:{expiration:"timed",duration:Number(m[1]),unit:m[2]?`${m[2]}s`:"rounds"}}]:[]}));
    }
    return {id,name:mod.epic?`${mod.name} (Epic)`:mod.name,description:mod.description,options};
  }).filter(m=>m.options.length);
  const flags = {
    [EFFECTS]:{tags:["bending-technique",...(offensive.has(key)?["offensive-technique"]:[]),...(direct.has(key)?["damaging-technique"]:[]),...(element!=="universal"?[element]:[])]},
    [POWERS]:{powerModifiers:mods.map(m=>({...m,options:m.options.map(({templateChanges,...o})=>o)}))}
  };
  if (raisedDamage.has(key)) flags[POWERS].powerRaises=[{id:"raise-1",level:1,changes:[damageAdd("raise-damage","1d6")]}];
  const applied = {"deadly-elements":["deadly","deadly-raise"],"earth-armour":["earth-armour","earth-armour-raise"],
    "water-armour":["ice-armour","ice-armour-raise"],quicken:["quicken","quicken-raise"],havoc:["havoc"],paralysis:["paralysis"],"elemental-vortex":["vortex"]}[key];
  if (applied) flags[POWERS].applyEffects={base:uuid("effects",applied[0]),...(applied[1]?{raised:uuid("effects",applied[1])}:{})};
  if (shapes.length) {
    const d = Number(row.duration?.match(/^\d+(?=\s*round|$)/)?.[0]);
    const unit = row.duration==="1 day" ? "days":"rounds";
    const range = row.range?.startsWith("Spirit") ? row.range.replace("Spirit","@spirit") : "";
    flags[TEMPLATES]={automation:{version:1,enabled:true,shapes,
      expiration:{enabled:true,amount:d||1,unit}, placementRange:{enabled:!!range,max:range||0},
      modifiers:mods.map(m=>({...m,options:m.options.map(({templateChanges,changes,...o})=>({...o,changes:templateChanges??[]}))})),
      behaviors:key==="impede"?[behavior("rough-ground","difficultTerrain",{multiplier:2})]:[]
    }};
  }
  const description = (row.rank ? "" : "<p><strong>Rank:</strong> Not specified in Avatar.md.</p>") + row.html +
    (key==="relief" ? `<p>For Numb, apply ${link("effects","numb","Numb")} or ${link("effects","numb-raise","Numb (Raise)")}.</p>` : "") +
    (["healing","accelerated-recovery"].includes(key) ? `<p>Use ${link("macros",key==="healing"?"water-healing":key, key==="healing"?"Waterbending Healing":"Accelerated Recovery","Macro")} to resolve treatment.</p>` : "");
  item("techniques",key,rename[key] ?? row.name,"power",{
    description,rank:row.rank ?? "",pp:2*Math.abs(Number(row.penalty?.match(/^-?\d+/)?.[0] ?? 0)),
    range:row.range?.replace("Spirit","@spi") ?? "",duration:row.duration ?? "",trapping:row.trapping ?? row.trappings ?? "",
    arcane:element==="universal" ? "Bending" : `${row.group}bending`,actions:{trait:key==="knacks"?"":"Bending",...(["healing","accelerated-recovery","water-bubble"].includes(key)?{additional:{tableAction:{
      name:key==="water-bubble"?"Sustain Bubble":"Treat Patient",type:"macro",macroActor:"self",
      uuid:uuid("macros",{"healing":"water-healing","water-bubble":"sustain-bubble"}[key]??key,"Macro")}}}:{})},
    innate:key==="knacks",damage:coreDamage[key] ?? "",templates:Object.fromEntries(shapes.map(s=>[s,true]))
  },{folder:groups[row.group],flags,meta:{technique:true,element,
    mode:shapes.length&&!["earth-shelter","water-shelter","damage-field"].includes(key)?"area":targetModes[key]??(row.range==="Self"?"self":"targets"),
    sourcePenalty:row.penalty, areaOptions:pendingArea.has(key)}});
}
add("techniques", JSON.parse(readFileSync(new URL("../content/puppet.json", import.meta.url))));
const commands = {
  setup:["Avatar Setup","setup"],stance:["Change Bending Stance","chooseStance"],martial:["Review Martial Bending","reviewLatest"],
  "sustain-bubble":["Sustain Water Bubble","sustainBubble"],
  "mundane-healing":["Mundane Healing","heal","mundane"],"water-healing":["Waterbending Healing","heal","water"],
  "accelerated-recovery":["Accelerated Recovery","heal","recovery"],"world-settings":["Avatar World Settings","worldSettings"]
};
for (const [key,[name,fn,arg]] of Object.entries(commands)) add("macros",{
  _id:stable(`macros/${key}`),name,type:"script",scope:"global",img:iconFor("macros",key),flags:{[ID]:{key,contentRevision:revision}},
  command:`const api = game.modules.get("${ID}")?.api;
if (!api) return ui.notifications.warn("Enable SWADE Pro-Bending first.");
try { await api.${fn}(${arg ? JSON.stringify(arg)+", " : ""}typeof actor === "undefined" ? undefined : actor); } catch (error) { ui.notifications.error(error.message, {console:true}); }`
});
for (const [command,name] of [["use","Use Signature Action"],["finish","End Signature Effect"],["reset","Reset Signature Action"]]) {
  const key = `signature-${command}`;
  add("macros",{_id:stable(`macros/${key}`),name,type:"script",scope:"global",
    img:`icons/svg/${{use:"direction",finish:"cancel",reset:"clockwork"}[command]}.svg`,flags:{[ID]:{key,contentRevision:revision}},
    command:`const api = game.modules.get("${ID}")?.api;
if (!api) return ui.notifications.warn("Enable SWADE Pro-Bending first.");
try { await api.signatureAction(typeof item === "undefined" ? null : item, "${command}"); }
catch (error) { ui.notifications.warn(error.message); }`});
}
add("rules",{_id:stable("rules/avatar"),name:"Avatar: Pro-Bending",pages:[
  {name:"At the Table",text:{format:1,content:`<h2>Getting started</h2><p>Drop a Nation and (for a bender) a Bending Background onto the actor. ${link("macros","setup","Avatar Setup","Macro")} handles your choices and can replace missing starter items or rule effects. Learn further Techniques by dragging them onto the sheet.</p>
  <p>A Bending Background grants Hurl and Assault for its element in both hands. Adding a generically named power to the actor's sheet adds the element to its name.</p>
  <p>Open Pro-Benders &amp; Republic City for 20 team folders, 12 solo benders, and city NPCs. Open the actor's Actions tab to use a signature move. The league caps NPC Advances at 11. Better Setting calculates combat rating from the stat block.</p>
  <p>${link("macros","stance","Change Bending Stance","Macro")} changes stances; a new encounter starts in Balanced. Review Martial Bending on the casting roll in chat. Backlash applies automatically on a critical failure. Use the actor’s Effects tab to toggle or remove either rule. Restore effects from Avatar Effects or Avatar Setup.</p>
  <p>Use ${link("macros","mundane-healing","Mundane Healing","Macro")}, ${link("macros","water-healing","Waterbending Healing","Macro")} or ${link("macros","accelerated-recovery","Accelerated Recovery","Macro")} with a medic selected and patient(s) targeted. For patients the caster cannot edit, the GM runs the macro.</p>
  <p>${link("macros","world-settings","Avatar World Settings","Macro")} is an optional GM action. More Skill Points and advancement awards are character creation and progression choices; track them at the table.</p>`}},
  {name:"Setting Rules",text:{format:1,content:rules.rules}},
  {name:"Character Questions",text:{format:1,content:rules.questions}}
].map(page=>({...page,_id:stable(`rules/page/${page.name}`),type:"text",title:{show:true,level:1}}))});
pack["pro-benders"] = buildProBenders(pack,stable,uuid);
writeFileSync(new URL("../content/packs.json",import.meta.url),JSON.stringify(pack,null,2)+"\n");
