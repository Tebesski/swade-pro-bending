import {readFileSync, mkdirSync, mkdtempSync, renameSync, rmSync, existsSync} from "node:fs";
import {join, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const root = fileURLToPath(new URL("..",import.meta.url));
const req = createRequire(resolve(process.env.FOUNDRY_APP ?? "C:/Program Files/Foundry Virtual Tabletop/resources/app","package.json"));
const {ClassicLevel} = req("classic-level");
const read = file => JSON.parse(readFileSync(join(root,file),"utf8").replace(/^\uFEFF/,""));
const manifest = read("module.json"), packs = read("content/packs.json");
const keys = {Actor:"actors",Item:"items",JournalEntry:"journal",Macro:"macros"};
const requested = process.argv.slice(2);
const selected = manifest.packs.filter(({name})=>!requested.length || requested.includes(name));
if (requested.some(name=>!selected.some(pack=>pack.name===name))) throw new Error("Unknown compendium name.");
const working = mkdtempSync(join(root,".packs-build-"));
try {
  for (const {name,type} of selected) {
    const db = new ClassicLevel(join(working,name));
    const ops = [];
    const embedded = {actors:["items","effects"],items:["effects"],journal:["pages"]};
    function push(prefix, id, data) {
      const value = {...data};
      for (const name of embedded[prefix.split(".").at(-1)] ?? []) {
        const children = value[name] ?? [];
        for (const child of children) push(`${prefix}.${name}`,`${id}.${child._id}`,child);
        value[name] = children.map(child=>child._id);
      }
      ops.push({type:"put",key:`!${prefix}!${id}`,value:JSON.stringify(value)});
    }
    for (const {documentName,...doc} of packs[name]) {
      const prefix = documentName==="Folder"?"folders":keys[type];
      push(prefix,doc._id,doc);
    }
    try { await db.batch(ops); await db.compactRange("!","~"); } finally { await db.close(); }
  }
  const out = join(root,"packs"), old = join(working,"previous");
  mkdirSync(out,{recursive:true});
  mkdirSync(old);
  const moved = [], installed = [];
  try {
    for (const {name} of selected) {
      if (existsSync(join(out,name))) {
        renameSync(join(out,name),join(old,name));
        moved.push(name);
      }
      renameSync(join(working,name),join(out,name));
      installed.push(name);
    }
  } catch (error) {
    for (const name of installed) renameSync(join(out,name),join(working,name));
    for (const name of moved) renameSync(join(old,name),join(out,name));
    throw error;
  }
} finally { rmSync(working,{recursive:true,force:true}); }
