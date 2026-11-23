import {cpSync, mkdtempSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";
import {ID, EFFECTS, POWERS, TEMPLATES, flag} from "../scripts/shared.mjs";

// The installed Technique pack can contain GM edits, including reimported documents with new IDs.
// Work on snapshots so a roster build never opens either original database for writing.
export async function installedTechniques(defaults) {
  const app = process.env.FOUNDRY_APP || "C:/Program Files/Foundry Virtual Tabletop/resources/app";
  const {ClassicLevel} = createRequire(resolve(app,"package.json"))("classic-level");
  const temporary = mkdtempSync(join(tmpdir(),"avatar-techniques-"));
  const read = async name=>{
    const directory = join(temporary,name);
    cpSync(fileURLToPath(new URL("../packs/"+name,import.meta.url)),directory,{recursive:true,
      filter:path=>!/[\\/](?:LOCK|lost)$/.test(path)});
    const database = new ClassicLevel(directory,{valueEncoding:"json",createIfMissing:false});
    try { return (await database.iterator({gt:"!items!",lt:"!items!~"}).all()).map(([,doc])=>doc); }
    finally { await database.close(); }
  };
  try {
    const techniques = await read("techniques"), effects = await read("effects");
    const byKey = new Map(techniques.map(doc=>[flag(doc,"key"),doc]));
    return defaults.map(base=>{
      const live = byKey.get(flag(base,"key"));
      if (!base.system || !live) return base;
      const system = {...base.system};
      for (const key of ["description","rank","pp","range","duration","damage","templates","ap","bonusDamageDice","bonusDamageDie"]) {
        if (Object.hasOwn(live.system,key)) system[key] = live.system[key];
      }
      system.actions = {...base.system.actions,...live.system.actions,additional:{
        ...base.system.actions?.additional,...live.system.actions?.additional
      }};
      const flags = {...base.flags};
      for (const mod of [EFFECTS,POWERS,TEMPLATES]) if (live.flags?.[mod]) flags[mod] = structuredClone(live.flags[mod]);
      const strong = flags[POWERS]?.applyEffects?.modifiers?.strong?.pm2;
      if (flag(base,"key")==="blind" && Array.isArray(strong) && strong.some(uuid=>uuid.startsWith("Item."))) {
        const effect = effects.find(doc=>doc.name==="Strong Blind");
        if (!effect) throw new Error("Blind needs a compendium effect for its Strong modifier.");
        flags[POWERS].applyEffects.modifiers.strong.pm2 = strong.map(uuid=>uuid.startsWith("Item.")
          ? `Compendium.${ID}.effects.Item.${effect._id}` : uuid);
      }
      return {...base,_id:live._id,name:live.name,img:live.img,system,flags};
    });
  } finally { rmSync(temporary,{recursive:true,force:true}); }
}
