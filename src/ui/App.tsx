import { useEffect, useRef, useState } from "react";
import { type Creature, type Characteristics, recomputeDerived } from "../engine";
import { LocalStorageStore, FirebaseStore, SAVE_VERSION, firebaseConfigured, type RunState } from "../store";
import { STARTING_POTIONS, POTION_PRICE, sellValue, reqMet, toWeapon, type WeaponOpt, type ArmorOpt } from "../game/catalog";
import { gainXp } from "../game/progression";
import { normalizeInventory } from "../game/weapons";
import { CharacterCreate } from "./CharacterCreate";
import { Hub } from "./Hub";
import { Dungeon } from "./Dungeon";
import { StatusBar } from "./StatusBar";
import { StatsPanel } from "./StatsPanel";
import { Shop } from "./Shop";
import { Forge } from "./Forge";
import { canForge, type Recipe } from "../game/forge";
import { MAX_CARGADOS, type Cargado } from "../game/cargados";
import type { RunResult } from "./Dungeon";

// Firebase al mando cuando pegas tu config; si no, localStorage para poder jugar ya.
const store = firebaseConfigured ? new FirebaseStore() : new LocalStorageStore();
type Screen = "loading" | "create" | "hub" | "dungeon";

export function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [player, setPlayer] = useState<Creature | null>(null);
  const [gold, setGold] = useState(0);
  const [potions, setPotions] = useState(STARTING_POTIONS);
  const [inventory, setInventory] = useState<WeaponOpt[]>([]);
  const [armor, setArmor] = useState<ArmorOpt | null>(null);
  const [cargados, setCargados] = useState<Cargado[]>([]);
  const [xp, setXp] = useState(0);
  const [points, setPoints] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showForge, setShowForge] = useState(false);
  const [levelMsg, setLevelMsg] = useState<string | null>(null);
  const [cargadoMsg, setCargadoMsg] = useState<string | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const runRef = useRef<RunState | null>(null);

  useEffect(() => {
    const num = (v: unknown, d: number) => (Number.isFinite(v as number) ? (v as number) : d);
    store.load().then((g) => {
      if (g?.player) {
        setPlayer(g.player);
        setGold(num(g.gold, 0)); setPotions(num(g.potions, STARTING_POTIONS));
        setInventory(normalizeInventory(g.inventory)); setArmor(g.armor ?? null); setCargados(g.cargados ?? []);
        setXp(num(g.xp, 0)); setPoints(num(g.points, 0));
        const savedRun = g.run ?? null; runRef.current = savedRun; setRun(savedRun);
        setScreen(savedRun ? "dungeon" : "hub");   // retoma la bajada si quedó una a medias
      } else setScreen("create");
    });
  }, []);

  const persist = (p: Creature, g: number, pot: number, inv: WeaponOpt[], arm: ArmorOpt | null, x: number, pts: number, carg: Cargado[]) =>
    store.save({ version: SAVE_VERSION, player: p, gold: g, potions: pot, inventory: inv, armor: arm, cargados: carg, run: runRef.current, xp: x, points: pts, savedAt: new Date().toISOString() });

  function onCheckpoint(rs: RunState) {
    runRef.current = rs; setRun(rs);
    if (player) persist(player, gold, potions, inventory, armor, xp, points, cargados);
  }

  async function handleCreate(p: Creature, inv: WeaponOpt[]) {
    setPlayer(p); setGold(0); setPotions(STARTING_POTIONS); setInventory(inv); setArmor(null); setXp(0); setPoints(0);
    setCargados([]); await persist(p, 0, STARTING_POTIONS, inv, null, 0, 0, []); setScreen("hub");
  }
  async function handleNew() {
    await store.clear(); setPlayer(null); setGold(0); setPotions(STARTING_POTIONS); setInventory([]); setArmor(null); setXp(0); setPoints(0); setCargados([]); runRef.current = null; setRun(null); setScreen("create");
  }
  async function handleEquip(w: WeaponOpt) {
    if (!player) return;
    const next: Creature = { ...player, weapon: toWeapon(w) };
    setPlayer(next); await persist(next, gold, potions, inventory, armor, xp, points, cargados);
  }
  function spendPoint(k: keyof Characteristics) {
    if (!player || points <= 0) return;
    const next: Creature = { ...player, characteristics: { ...player.characteristics, [k]: player.characteristics[k] + 1 } };
    recomputeDerived(next);
    const np = points - 1;
    setPlayer(next); setPoints(np); persist(next, gold, potions, inventory, armor, xp, np, cargados);
  }

  // ---- tienda ----
  function buyPotion() {
    if (gold < POTION_PRICE) return;
    const ng = gold - POTION_PRICE, npo = potions + 1;
    setGold(ng); setPotions(npo); if (player) persist(player, ng, npo, inventory, armor, xp, points, cargados);
  }
  function buyWeapon(w: WeaponOpt) {
    if (gold < w.price) return;
    const ng = gold - w.price, ninv = [...inventory, w];
    setGold(ng); setInventory(ninv); if (player) persist(player, ng, potions, ninv, armor, xp, points, cargados);
  }
  function buyArmor(a: ArmorOpt) {
    if (!player || gold < a.price || !reqMet(a.req, player.characteristics)) return;
    const tags = player.tags.filter((t) => t !== "armor" && t !== "heavy armor");
    tags.push(a.tag);
    const next: Creature = { ...player, tags };
    const ng = gold - a.price;
    setPlayer(next); setArmor(a); setGold(ng); persist(next, ng, potions, inventory, a, xp, points, cargados);
  }
  function sellDuplicates() {
    if (!player) return;
    const seen = new Set<string>(); const kept: WeaponOpt[] = []; let earned = 0;
    for (const w of inventory) { if (seen.has(w.id)) earned += sellValue(w); else { seen.add(w.id); kept.push(w); } }
    if (earned <= 0) return;
    const ng = gold + earned;
    setInventory(kept); setGold(ng); persist(player, ng, potions, kept, armor, xp, points, cargados);
  }
  function sellWeapon(id: string) {
    if (!player) return;
    const copies = inventory.filter((w) => w.id === id).length;
    if (id === player.weapon.id && copies <= 1) return; // conserva la equipada
    const idx = inventory.findIndex((w) => w.id === id);
    if (idx < 0) return;
    const item = inventory[idx];
    const ninv = inventory.slice(0, idx).concat(inventory.slice(idx + 1));
    const ng = gold + sellValue(item);
    setInventory(ninv); setGold(ng); persist(player, ng, potions, ninv, armor, xp, points, cargados);
  }

  function forgeItem(r: Recipe) {
    if (!player) return;
    const chk = canForge(r, gold, inventory, player.characteristics);
    if (!chk.ok) return;
    let inv = [...inventory];
    for (const m of r.materials) {
      for (let n = 0; n < m.qty; n++) {
        const idx = inv.findIndex((w) => w.id === m.id);
        if (idx >= 0) inv = inv.slice(0, idx).concat(inv.slice(idx + 1));
      }
    }
    const ng = gold - r.gold;
    if (r.kind === "weapon" && r.weapon) {
      inv = [...inv, r.weapon];
      setInventory(inv); setGold(ng); persist(player, ng, potions, inv, armor, xp, points, cargados);
    } else if (r.kind === "armor" && r.armor) {
      const tags = player.tags.filter((t) => t !== "armor" && t !== "heavy armor");
      tags.push(r.armor.tag);
      const next: Creature = { ...player, tags };
      setPlayer(next); setArmor(r.armor); setInventory(inv); setGold(ng);
      persist(next, ng, potions, inv, r.armor, xp, points, cargados);
    }
  }

  async function handleRunEnd(r: RunResult) {
    const banked = r.outcome === "won" ? r.runGold : 0;
    const newGold = gold + banked;
    const next: Creature = { ...r.player, modifiers: [] };
    const res = gainXp(next, xp, r.points, r.runXp);
    next.hp = next.maxHp; next.energy = next.maxEnergy;
    // inventario: el que regresa (ya sin el arma robada) + armas recuperadas de cargados vencidos
    runRef.current = null; setRun(null);   // la bajada terminó
    const inv = [...r.inventory, ...r.recoveredWeapons];
    // cargados: quita los vencidos, agrega el nuevo (respetando el tope)
    let carg = cargados.filter((c) => !r.defeatedCargados.includes(c.id));
    if (r.newCargado) { if (carg.length >= MAX_CARGADOS) carg = carg.slice(1); carg = [...carg, r.newCargado]; }
    setPlayer(next); setGold(newGold); setPotions(r.potions); setInventory(inv); setXp(res.xp); setPoints(res.points); setCargados(carg);
    await persist(next, newGold, r.potions, inv, armor, res.xp, res.points, carg);
    if (res.leveled.length) setLevelMsg(`¡Subiste a nivel ${res.leveled[res.leveled.length - 1]}! +${res.leveled.length * 2} puntos.`);
    if (r.newCargado) setCargadoMsg(`☠ ${r.newCargado.creature.name} se llevó tu botín y ahora te acecha como némesis.`);
    else if (r.recoveredWeapons.length || r.defeatedCargados.length) setCargadoMsg(`Recuperaste tu botín de un némesis.`);
    setScreen("hub");
  }

  return (
    <div className="stage">
      {(screen === "loading" || screen === "create") && <h1 className="title">Dungeon</h1>}
      {player && screen !== "loading" && screen !== "create" && (
        <StatusBar level={player.level} xp={xp} points={points} onOpenStats={() => setShowStats(true)} />
      )}
      {levelMsg && screen === "hub" && <div className="lvlmsg" onClick={() => setLevelMsg(null)}>{levelMsg} <span className="soft">(toca para cerrar)</span></div>}
      {cargadoMsg && screen === "hub" && <div className="cargadomsg" onClick={() => setCargadoMsg(null)}>{cargadoMsg} <span className="soft">(toca para cerrar)</span></div>}

      {screen === "loading" && <p className="sub">Cargando…</p>}
      {screen === "create" && <CharacterCreate onCreate={handleCreate} />}
      {screen === "hub" && player && <Hub player={player} gold={gold} potions={potions} inventory={inventory} armor={armor} onFight={() => { setLevelMsg(null); setCargadoMsg(null); runRef.current = null; setRun(null); setScreen("dungeon"); }} onNew={handleNew} onEquip={handleEquip} cargados={cargados} onOpenShop={() => setShowShop(true)} onOpenForge={() => setShowForge(true)} />}
      {screen === "dungeon" && player && <Dungeon player={player} potions={potions} inventory={inventory} points={points} cargados={cargados} resume={run} onCheckpoint={onCheckpoint} onExit={handleRunEnd} />}

      {showStats && player && <StatsPanel player={player} points={points} onSpend={spendPoint} onClose={() => setShowStats(false)} />}
      {showShop && player && <Shop player={player} gold={gold} potions={potions} inventory={inventory} armor={armor} onBuyPotion={buyPotion} onBuyWeapon={buyWeapon} onBuyArmor={buyArmor} onSell={sellWeapon} onSellAll={sellDuplicates} onClose={() => setShowShop(false)} />}
      {showForge && player && <Forge player={player} gold={gold} inventory={inventory} onForge={forgeItem} onClose={() => setShowForge(false)} />}
    </div>
  );
}
