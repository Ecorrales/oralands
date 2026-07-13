import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const res = await build({
  entryPoints: ["app/main.ts"],
  bundle: true, format: "iife", platform: "browser", target: "es2020",
  write: false, legalComments: "none",
});
const js = res.outputFiles[0].text;
const tpl = readFileSync("app/template.html", "utf8");
const html = tpl.replace("/*__BUNDLE__*/", () => js);
mkdirSync("dist", { recursive: true });
writeFileSync("dist/dungeon-play.html", html);
console.log("dist/dungeon-play.html  (" + Math.round(html.length/1024) + " KB) — abrible con doble clic");
