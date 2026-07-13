// UI sobre el MOTOR REAL. Pantalla de creación de personaje + combate.
import {
  makeCreature, resolveSmash, regenEnergy, isDead, initiativeOrder,
  getHealthForLevel, maxEnergy, energyRegen, DEFAULT_TUNE,
  type Creature, type Characteristics,
} from "../src/engine";

const $ = (id: string) => document.getElementById(id)!;

/* ---------------- catálogo (capa de app; el engine no cambia) ---------------- */
interface WeaponOpt { id: string; name: string; damage: string; accuracy: string; req: Partial<Characteristics>; note: string; }
interface ArmorOpt { id: string; name: string; tags: string[]; req: Partial<Characteristics>; note: string; }

const WEAPONS: WeaponOpt[] = [
  { id: "club",   name: "Garrote",  damage: "1d4", accuracy: "1d6", req: {}, note: "básico" },
  { id: "dagger", name: "Daga",     damage: "1d3", accuracy: "1d6", req: {}, note: "rápida, débil" },
  { id: "sword",  name: "Espada",   damage: "2d4", accuracy: "2d5", req: { strength: 5, dexterity: 5 }, note: "equilibrada" },
];
// Sin armadura al crear: la protección es botín que se gana en la cripta.
const ARMORS: ArmorOpt[] = [
  { id: "none", name: "Sin armadura", tags: [], req: {}, note: "arrancas sin protección" },
];

const STAT_KEYS: (keyof Characteristics)[] = ["strength", "vitality", "dexterity", "intelligence"];
const STAT_ES: Record<string, string> = { strength: "Fuerza", vitality: "Vitalidad", dexterity: "Destreza", intelligence: "Inteligencia" };
const BUDGET = 20, MINV = 1, MAXV = 10;

/* ---------------- creación ---------------- */
const draft: Characteristics = { strength: 5, vitality: 5, dexterity: 5, intelligence: 5 };
let chosenWeapon = "club";
let chosenArmor = "none";

const used = () => STAT_KEYS.reduce((s, k) => s + draft[k], 0);
const remaining = () => BUDGET - used();
const reqMet = (req: Partial<Characteristics>) => STAT_KEYS.every((k) => (req[k] ?? 0) <= draft[k]);

function renderCreate() {
  // stats
  const box = $("stats"); box.innerHTML = "";
  for (const k of STAT_KEYS) {
    const row = document.createElement("div"); row.className = "statrow";
    row.innerHTML =
      `<span class="sname">${STAT_ES[k]}</span>` +
      `<button class="step" data-dec="${k}" ${draft[k] <= MINV ? "disabled" : ""}>−</button>` +
      `<b class="sval">${draft[k]}</b>` +
      `<button class="step" data-inc="${k}" ${draft[k] >= MAXV || remaining() <= 0 ? "disabled" : ""}>+</button>`;
    box.appendChild(row);
  }
  $("remaining").textContent = String(remaining());
  // derived (fórmulas del motor, en vivo)
  $("dhp").textContent = String(getHealthForLevel(draft.vitality, 1));
  $("den").textContent = String(maxEnergy(draft.strength, 1));
  $("dre").textContent = String(energyRegen(draft.strength, 1));
  // weapons
  const wl = $("weapons"); wl.innerHTML = "";
  for (const w of WEAPONS) {
    const ok = reqMet(w.req);
    if (!ok && chosenWeapon === w.id) chosenWeapon = "club";
    const reqTxt = Object.entries(w.req).map(([k, v]) => `${STAT_ES[k].slice(0, 3).toLowerCase()} ${v}`).join(" · ") || "—";
    const el = document.createElement("button");
    el.className = "opt" + (chosenWeapon === w.id ? " sel" : "") + (ok ? "" : " locked");
    el.disabled = !ok; el.dataset.w = w.id;
    el.innerHTML = `<b>${w.name}</b><small>daño ${w.damage} · prec ${w.accuracy}</small><small class="req">${ok ? w.note : "req: " + reqTxt}</small>`;
    wl.appendChild(el);
  }
  const nameOk = ($("pname") as HTMLInputElement).value.trim().length > 0;
  ($("begin") as HTMLButtonElement).disabled = !nameOk;
}

$("stats").addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  if (t.dataset.inc && remaining() > 0 && draft[t.dataset.inc as keyof Characteristics] < MAXV) draft[t.dataset.inc as keyof Characteristics]++;
  if (t.dataset.dec && draft[t.dataset.dec as keyof Characteristics] > MINV) draft[t.dataset.dec as keyof Characteristics]--;
  renderCreate();
});
$("weapons").addEventListener("click", (e) => { const id = (e.target as HTMLElement).closest<HTMLElement>("[data-w]")?.dataset.w; if (id) { chosenWeapon = id; renderCreate(); } });
$("pname").addEventListener("input", renderCreate);
$("begin").addEventListener("click", startFight);

/* ---------------- combate ---------------- */
let player: Creature, skel: Creature, phase: "player" | "busy" | "enemy" | "over";

function startFight() {
  const name = ($("pname") as HTMLInputElement).value.trim() || "Héroe";
  const w = WEAPONS.find((x) => x.id === chosenWeapon)!;
  const a = ARMORS.find((x) => x.id === chosenArmor)!;
  player = makeCreature(name, { ...draft }, 1, { name: w.name, damage: w.damage, accuracy: w.accuracy }, a.tags);
  $("create").style.display = "none"; $("fight").style.display = "block";
  $("pname2").textContent = name;
  resetFight();
}

function log(html: string, color: string) {
  const p = document.createElement("p"); p.style.color = color; p.innerHTML = html;
  const l = $("log"); l.appendChild(p); while (l.children.length > 6) l.removeChild(l.firstElementChild!); l.scrollTop = l.scrollHeight;
}
function retrig(el: HTMLElement, cls: string) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
function floatN(layer: HTMLElement, txt: string, col: string) { const d = document.createElement("div"); d.className = "dmg"; d.textContent = txt; d.style.color = col; layer.appendChild(d); setTimeout(() => d.remove(), 950); }
function renderMods(el: HTMLElement, c: Creature) { el.innerHTML = ""; c.modifiers.forEach((m) => { const s = document.createElement("span"); s.className = "pill " + (m.kind === "skip" ? "stun" : "dot"); s.textContent = m.label + " " + m.duration + "t"; el.appendChild(s); }); }
function render() {
  $("emeta").textContent = "Nv 1 · no-muerto";
  ($("ehp") as HTMLElement).style.width = Math.max(0, skel.hp / skel.maxHp * 100) + "%"; $("ehpt").textContent = Math.max(0, Math.round(skel.hp)) + " / " + skel.maxHp;
  ($("hhp") as HTMLElement).style.width = Math.max(0, player.hp / player.maxHp * 100) + "%"; $("hhpt").textContent = Math.max(0, Math.round(player.hp)) + " / " + player.maxHp;
  ($("hen") as HTMLElement).style.width = Math.max(0, player.energy / player.maxEnergy * 100) + "%"; $("het").textContent = player.energy + " / " + player.maxEnergy + " \u26a1";
  renderMods($("emods"), skel); renderMods($("hmods"), player);
}
function setBtns(on: boolean) { ($("attack") as HTMLButtonElement).disabled = !on || player.energy < 2; ($("wait") as HTMLButtonElement).disabled = !on; }
function consumeSkip(c: Creature): boolean { const i = c.modifiers.findIndex((m) => m.kind === "skip"); if (i >= 0) { c.modifiers.splice(i, 1); return true; } return false; }

function playerAttack() {
  if (phase !== "player" || player.energy < 2) return;
  phase = "busy"; setBtns(false); player.energy -= 2;
  const r = resolveSmash(player, skel, DEFAULT_TUNE);
  if (!r.hit) { log(`${player.name} ataca (${r.chance}%) pero <b>falla</b>.`, "var(--muted)"); render(); return afterPlayer(); }
  skel.hp = Math.max(0, skel.hp - r.damage);
  retrig($("esprite"), "shake"); retrig($("eflash"), "go"); floatN($("edmg"), "-" + r.damage, "#e8635a");
  log(`${player.name} golpea (${r.chance}%) \u2014 dado ${r.weaponRoll}\u00d7${player.characteristics.strength} = <b>${r.damage}</b>.`, "var(--accent)");
  if (r.knockdown && skel.hp > 0) { skel.modifiers.push(...r.modifiers); log(`\u00a1Derribo! (${Math.round(r.knockdownChance)}%) Esqueleto aturdido.`, "var(--warn)"); }
  render(); afterPlayer();
}
function afterPlayer() { if (isDead(skel)) return endGame(true); setTimeout(enemyTurn, 600); }
function enemyTurn() {
  phase = "enemy";
  if (consumeSkip(skel)) { log("Esqueleto aturdido, pierde el turno.", "var(--warn)"); render(); return endEnemy(); }
  const r = resolveSmash(skel, player, DEFAULT_TUNE);
  if (!r.hit) { log(`Esqueleto ataca (${r.chance}%) pero falla.`, "var(--muted)"); return endEnemy(); }
  player.hp = Math.max(0, player.hp - r.damage);
  retrig($("hcard"), "shake"); retrig($("hflash"), "go"); floatN($("hdmg"), "-" + r.damage, "#e8635a");
  if (r.knockdown && player.hp > 0) { player.modifiers.push(...r.modifiers); log(`\u00a1Derribo! ${player.name} aturdido.`, "var(--warn)"); }
  log(`Esqueleto golpea (${r.chance}%) \u2014 <b>${r.damage}</b>.`, "var(--danger)"); render(); endEnemy();
}
function endEnemy() { if (isDead(player)) return endGame(false); setTimeout(() => { regenEnergy(player); render(); phase = "player"; setBtns(true); }, 500); }
function playerWait() { if (phase !== "player") return; phase = "busy"; setBtns(false); regenEnergy(player); log(`${player.name} recupera aliento (+${player.regen}\u26a1).`, "var(--muted)"); render(); afterPlayer(); }
function endGame(win: boolean) {
  phase = "over"; ($("attack") as HTMLButtonElement).disabled = true; ($("wait") as HTMLButtonElement).disabled = true;
  if (win) { ($("esprite") as HTMLElement).style.opacity = ".3"; ($("esprite") as HTMLElement).style.filter = "grayscale(1)"; log("\u00a1Esqueleto derrotado!", "var(--success)"); }
  else log(`${player.name} cae en la cripta\u2026`, "var(--danger)");
}
function resetFight() {
  skel = makeCreature("Esqueleto", { strength: 4, vitality: 4, dexterity: 4, intelligence: 3 }, 1, { name: "rusty sword", damage: "1d5", accuracy: "1d4" }, ["undead"]);
  player.hp = player.maxHp; player.energy = player.maxEnergy; player.modifiers = [];
  $("log").innerHTML = ""; phase = "player";
  ($("esprite") as HTMLElement).style.opacity = "1"; ($("esprite") as HTMLElement).style.filter = "none";
  const order = initiativeOrder([player, skel]).map((c) => c.name).join(" \u203a ");
  render(); setBtns(true);
  log(`Combate iniciado. Iniciativa: ${order}.`, "var(--dim)");
}
$("attack").addEventListener("click", playerAttack);
$("wait").addEventListener("click", playerWait);
$("reset").addEventListener("click", resetFight);
$("newchar").addEventListener("click", () => { $("fight").style.display = "none"; $("create").style.display = "block"; });

renderCreate();
