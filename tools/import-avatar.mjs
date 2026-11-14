import {readFileSync, writeFileSync} from "node:fs";
import {createRequire} from "node:module";
import {resolve} from "node:path";
const req = createRequire(resolve(process.env.FOUNDRY_APP ?? "C:/Program Files/Foundry Virtual Tabletop/resources/app", "package.json"));
const showdown = req("showdown");
const markdown = new showdown.Converter({simpleLineBreaks: false, literalMidWordUnderscores: true});
const raw = readFileSync(process.argv[2], "utf8").replace(/\r/g, "");
const clean = text => text.replace(/^<div data-node-type=.*?<\/div>\s*$/gm, "").replace(/^\s*,\s*$/gm,"\n").trim();
const html = text => markdown.makeHtml(clean(text));
function section(name, next) {
  const start = raw.indexOf("# " + name + "\n");
  if (start < 0) throw Error(name);
  const end = next ? raw.indexOf("# " + next + "\n", start + name.length + 3) : raw.length;
  if (end < 0) throw Error(next);
  return clean(raw.slice(start + name.length + 3, end));
}
function blocks(source) {
  const matches = [...source.matchAll(/^([^\n#][^\n]+)\n(={3,}|-{3,})\s*$/gm)];
  let group = "";
  return matches.flatMap(([_, name, mark], i) => {
    if (mark[0] === "=") { group = name; return []; }
    const text = clean(source.slice(matches[i].index + matches[i][0].length, matches[i+1]?.index ?? source.length))
      .replace(/(?:\n|^)\* \* \*\s*$/, "").trim();
    return [{group, name, text}];
  });
}
const groups = ["Background Edges", "Weird Edges", "Technique Edges", "Combat Edges", "Stance Edges", "Professional Edges", "SBT Edges"];
const ends = ["Bending", "Technique Edges", "Combat Edges", "Questions", "Professional Edges", "Skills", null];
const powers = blocks(section("Techniques", "Setting Rules")).map(({group, name, text}) => {
  const fields = {};
  const rows = text.split("\n");
  while (rows.length && /^\*\*/.test(rows[0])) {
    const [field, ...rest] = rows.shift().replaceAll("**", "").replaceAll("\\", "").split(":");
    fields[field.toLowerCase()] = rest.join(":").trim();
  }
  const mods = [];
  let epic = false;
  for (const row of text.split("\n")) {
    if (/\*\*Epic Modifiers/.test(row)) epic = true;
    const m = row.match(/^\*\s+\*\*(.*?)\s*\(([^)]+)\)\s*:?\s*\*\*\s*:?(.*)$/);
    if (!m) continue;
    const [, mod, cost, detail] = m;
    mods.push({name: mod.replace(/\*\*/g,"").trim(), cost, description: html(detail.trim()), epic});
  }
  return {group, name, ...fields, html: html(rows.join("\n").split(/^\*\*(?:Epic )?Modifiers?:\*\*\s*$/mi, 1)[0]), mods};
});
const edges = groups.flatMap((category, i) => blocks(section(category, ends[i])).filter(row => !row.name.startsWith("Restricted SWADE")).map(({group, name, text}) => ({
  category: category.replace(" Edges", ""), group, name,
  requirements: text.match(/^\*\*Requirements(?:\*\*|:)(?:\*\*|:)?\s*(.*)$/m)?.[1] ?? "",
  stance: text.match(/^\*\*Stance:\*\*\s*(.*)$/m)?.[1] ?? "",
  html: html(text)
})));
const backgrounds = blocks(section("Bending Backgrounds","Weird Edges")).slice(1).map(({name,text}) => ({name,html:html(text)}));
const nations = [];
for (const {group,name,text} of blocks(section("Nations","Stance Edges"))) {
  if (nations.at(-1)?.name !== group) nations.push({name:group,html:""});
  nations.at(-1).html += `<h3>${name}</h3>${html(text)}\n`;
}
const skills = [...section("Skills","Edges").matchAll(/^### (.+?) \(([^)]+)\)\n([\s\S]*?)(?=^### |$$(?![\s\S]))/gm)]
  .map(([,name,attribute,body])=>({name,attribute:attribute.toLowerCase(),html:html(body.trim().replace(/(?:\n|^)\* \* \*\s*$/, ""))}));
const stances = [...section("Bending Stances","Background Edges").matchAll(/^### (.+?)\n([\s\S]*?)(?=^### |$$(?![\s\S]))/gm)]
  .map(([,name,body])=>({name,html:html(body)}));
if (powers.length !== 43 || edges.length !== 56 || nations.length !== 5 || stances.length !== 3 || backgrounds.length !== 3 || skills.length !== 21)
  throw new Error(JSON.stringify({powers:powers.length, edges:edges.length, nations:nations.length, stances:stances.length, backgrounds:backgrounds.length, skills:skills.length}));
const data = {powers, edges, backgrounds, nations, skills, stances,
  rules: html(section("Rules","Bending Stances")), questions: html(section("Questions","Nations"))};
writeFileSync(new URL("../content/avatar.json",import.meta.url), JSON.stringify(data,null,2)+"\n");
