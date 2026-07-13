import { useEffect, useRef, useState } from "react";
import { type Creature, type Characteristics, recomputeDerived } from "../engine";
import { LocalStorageStore, FirebaseStore, SAVE_VERSION, firebaseConfigured, type RunState } from "../store";
import { STARTING_POTIONS, POTION_PRICE, sellValue, toWeapon, type WeaponOpt } from "../game/catalog";
import { applyGear, gearById, reqMetGear, type GearItem, type EquipSlot } from "../game/gear";
import { gainXp } from "../game/progression";
import { normalizeInventory } from "../game/weapons";
import { CharacterCreate } from "./CharacterCreate";
import { Hub } from "./Hub";
import { Dungeon } from "./Dungeon";
import { StatusBar } from "./StatusBar";
import { StatsPanel } from "./StatsPanel";
import { EquipPanel } from "./EquipPanel";
import { Shop } from "./Shop";
import { Forge } from "./Forge";
import { canForge, type Recipe } from "../game/forge";
import { mergeMats, type Mats } from "../game/materials";
import { MAX_CARGADOS, type Cargado } from "../game/cargados";
import type { RunResult } from "./Dungeon";

const store = firebaseConfigured ? new FirebaseStore() : new LocalStorageStore();
type Screen = "loading" | "create" | "hub" | "dungeon";
type Equipped = Partial<Record<EquipSlot, string>>;

export function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [player, setPlayer] = useState<Creature | null>(null);
  const [gold, setGold] = useState(0);
  const [potions, setPotions] = useState(STARTING_POTIONS);
  const [inventory, setInventory] = useState<WeaponOpt[]>([]);
  const [gear, setGear] = useState<GearItem[]>([]);
  const [equipped, setEquipped] = useState<Equipped>({});
  const [cargados, setCargados] = useState<Cargado[]>([]);
  const [materials, setMaterials] = useState<Mats>({});
  const [xp, setXp] = useState(0);
  const [points, setPoints] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showEquip, setShowEquip] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [showForge, setShowForge] = useState(false);
  const [levelMsg, setLevelMsg] = useState<string | null>(null);
  const [cargadoMsg, setCargadoMsg] = useState<string | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const runRef = useRef<RunState | null>(null);
  const gearRef = useRef<GearItem[]>([]);
  const equippedRef = useRef<Equipped>({});
  const materialsRef = useRef<Mats>({});

  const itemsOf = (g: GearItem[], eq: Equipped): GearItem[] =>
    (Object.values(eq).filter(Boolean) as string[]).map((id) => g.find((x) => x.id === id)).filter(Boolean) as GearItem[];
  const derive = (c: Creature, g = gearRef.current, eq = equippedRef.current): Creature => applyGear(c, itemsOf(g, eq));

  useEffect(() => {
    const num = (v: unknown, d: number) => (Number.isFinite(v as number) ? (v as number) : d);
    store.load().then((g) => {
      if (g?.player) {
        // migración: armadura vieja (armor) -> gear.chest
        let gr = g.gear ?? [];
        let eq: Equipped = g.equipped ?? {};
        const oldArmor = (g as { armor?: { id: string } | null }).armor;
        if ((!g.gear || g.gear.length === 0) && oldArmor) {
          const gi = gearById(oldArmor.id);
          if (gi) { gr = [gi]; eq = { chest: gi.id }; }
        }
        gearRef.current = gr; equippedRef.current = eq; setGear(gr); setEquipped(eq);
        setPlayer(derive(g.player, gr, eq));
        setGold(num(g.gold, 0)); setPotions(num(g.potions, STARTING_POTIONS));
        setInventory(normalizeInventory(g.inventory)); setCargados(g.cargados ?? []);
        materialsRef.current = g.materials ?? {}; setMaterials(g.materials ?? {});
        setXp(num(g.xp, 0)); setPoints(num(g.points, 0));
        const savedRun = g.run ?? null; runRef.current = savedRun; setRun(savedRun);
        setScreen(savedRun ? "dungeon" : "hub");
      } else setScreen("create");
    });
  }, []);

  const persist = (p: Creature, g: number, pot: number, inv: WeaponOpt[], x: number, pts: number, carg: Cargado[]) =>
    store.save({
      version: SAVE_VERSION, player: p, gold: g, potions: pot, inventory: inv,
      gear: gearRef.current, equipped: equippedRef.current, cargados: carg,
      materials: materialsRef.current, run: runRef.current, xp: x, points: pts, savedAt: new Date().toISOString(),
    });

  function onCheckpoint(rs: RunState) {
    runRef.current = rs; setRun(rs);
    if (player) persist(player, gold, potions, inventory, xp, points, cargados);
  }

  async function handleCreate(p: Creature, inv: WeaponOpt[]) {
    gearRef.current = []; equippedRef.current = {}; setGear([]); setEquipped({});
    materialsRef.current = {}; setMaterials({});
    const dp = derive(p, [], {});
    setPlayer(dp); setGold(0); setPotions(STARTING_POTIONS); setInventory(inv); setXp(0); setPoints(0); setCargados([]);
    await persist(dp, 0, STARTING_POTIONS, inv, 0, 0, []); setScreen("hub");
  }
  async function handleNew() {
    await store.clear(); setPlayer(null); setGold(0); setPotions(STARTING_POTIONS); setInventory([]);
    gearRef.current = []; equippedRef.current = {}; setGear([]); setEquipped({});
    setXp(0); setPoints(0); setCargados([]); materialsRef.current = {}; setMaterials({}); runRef.current = null; setRun(null); setScreen("create");
  }
  async function handleEquip(w: WeaponOpt) {
    if (!player) return;
    // arma a dos manos: libera la mano izquierda (el escudo queda guardado, no equipado)
    if (w.twoHanded && equippedRef.current.offhand) {
      const eq = { ...equippedRef.current }; delete eq.offhand; equippedRef.current = eq; setEquipped(eq);
    }
    const next = derive({ ...player, weapon: toWeapon(w) });
    setPlayer(next); await persist(next, gold, potions, inventory, xp, points, cargados);
  }
  function spendPoint(k: keyof Characteristics) {
    if (!player || points <= 0) return;
    const raised: Creature = { ...player, characteristics: { ...player.characteristics, [k]: player.characteristics[k] + 1 } };
    recomputeDerived(raised);
    const next = derive(raised);
    const np = points - 1;
    setPlayer(next); setPoints(np); persist(next, gold, potions, inventory, xp, np, cargados);
  }

  // ---- equipo (gear) ----
  function commitGear(gr: GearItem[], eq: Equipped) {
    gearRef.current = gr; equippedRef.current = eq; setGear(gr); setEquipped(eq);
    if (player) { const next = derive(player, gr, eq); setPlayer(next); persist(next, gold, potions, inventory, xp, points, cargados); }
  }
  function equipGear(item: GearItem) {
    if (!player || !reqMetGear(item, player.characteristics)) return;
    if (item.slot === "offhand" && player.weapon.twoHanded) return; // dos manos bloquea escudo
    const eq = { ...equipped, [item.slot]: item.id };
    commitGear(gear, eq);
  }
  function unequipSlot(slot: EquipSlot) {
    const eq = { ...equipped }; delete eq[slot]; commitGear(gear, eq);
  }
  function buyGear(item: GearItem) {
    if (!player || gold < item.price || !reqMetGear(item, player.characteristics)) return;
    if (item.slot === "offhand" && player.weapon.twoHanded) return;
    const gr = gear.some((x) => x.id === item.id) ? gear : [...gear, item];
    const eq = { ...equipped, [item.slot]: item.id };
    const ng = gold - item.price;
    gearRef.current = gr; equippedRef.current = eq; setGear(gr); setEquipped(eq); setGold(ng);
    const next = derive(player, gr, eq); setPlayer(next); persist(next, ng, potions, inventory, xp, points, cargados);
  }

  // ---- tienda ----
  function buyPotion() {
    if (gold < POTION_PRICE) return;
    const ng = gold - POTION_PRICE, npo = potions + 1;
    setGold(ng); setPotions(npo); if (player) persist(player, ng, npo, inventory, xp, points, cargados);
  }
  function buyWeapon(w: WeaponOpt) {
    if (gold < w.price) return;
    const ng = gold - w.price, ninv = [...inventory, w];
    setGold(ng); setInventory(ninv); if (player) persist(player, ng, potions, ninv, xp, points, cargados);
  }
  function sellDuplicates() {
    if (!player) return;
    const seen = new Set<string>(); const kept: WeaponOpt[] = []; let earned = 0;
    for (const w of inventory) { if (seen.has(w.id)) earned += sellValue(w); else { seen.add(w.id); kept.push(w); } }
    if (earned <= 0) return;
    const ng = gold + earned;
    setInventory(kept); setGold(ng); persist(player, ng, potions, kept, xp, points, cargados);
  }
  function sellWeapon(id: string) {
    if (!player) return;
    const copies = inventory.filter((w) => w.id === id).length;
    if (id === player.weapon.id && copies <= 1) return;
    const idx = inventory.findIndex((w) => w.id === id);
    if (idx < 0) return;
    const item = inventory[idx];
    const ninv = inventory.slice(0, idx).concat(inventory.slice(idx + 1));
    const ng = gold + sellValue(item);
    setInventory(ninv); setGold(ng); persist(player, ng, potions, ninv, xp, points, cargados);
  }

  function forgeItem(r: Recipe) {
    if (!player) return;
    const chk = canForge(r, gold, materials, player.characteristics);
    if (!chk.ok) return;
    const mats = { ...materials };
    for (const m of r.materials) mats[m.id] = (mats[m.id] ?? 0) - m.qty;
    materialsRef.current = mats; setMaterials(mats);
    const ng = gold - r.gold;
    if (r.kind === "weapon" && r.weapon) {
      const inv = [...inventory, r.weapon];
      setInventory(inv); setGold(ng); persist(player, ng, potions, inv, xp, points, cargados);
    } else if (r.kind === "armor" && r.gear) {
      const g = r.gear;
      const gr = gear.some((x) => x.id === g.id) ? gear : [...gear, g];
      const eq = { ...equipped, [g.slot]: g.id };
      gearRef.current = gr; equippedRef.current = eq; setGear(gr); setEquipped(eq); setGold(ng);
      const next = derive(player, gr, eq); setPlayer(next); persist(next, ng, potions, inventory, xp, points, cargados);
    }
  }

  async function handleRunEnd(r: RunResult) {
    const banked = r.outcome === "won" ? r.runGold : 0;
    const newGold = gold + banked;
    const raised: Creature = { ...r.player, modifiers: [] };
    const res = gainXp(raised, xp, r.points, r.runXp);
    raised.hp = raised.maxHp; raised.energy = raised.maxEnergy;
    const next = derive(raised);
    runRef.current = null; setRun(null);
    const newMats = mergeMats(materialsRef.current, r.materials);
    materialsRef.current = newMats; setMaterials(newMats);
    const inv = [...r.inventory, ...r.recoveredWeapons];
    let carg = cargados.filter((c) => !r.defeatedCargados.includes(c.id));
    if (r.newCargado) { if (carg.length >= MAX_CARGADOS) carg = carg.slice(1); carg = [...carg, r.newCargado]; }
    setPlayer(next); setGold(newGold); setPotions(r.potions); setInventory(inv); setXp(res.xp); setPoints(res.points); setCargados(carg);
    await persist(next, newGold, r.potions, inv, res.xp, res.points, carg);
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
      {screen === "hub" && player && <Hub player={player} gold={gold} potions={potions} inventory={inventory} equippedGear={itemsOf(gear, equipped)} onFight={() => { setLevelMsg(null); setCargadoMsg(null); runRef.current = null; setRun(null); setScreen("dungeon"); }} onNew={handleNew} onEquip={handleEquip} cargados={cargados} onOpenShop={() => setShowShop(true)} onOpenForge={() => setShowForge(true)} onOpenEquip={() => setShowEquip(true)} materials={materials} />}
      {screen === "dungeon" && player && <Dungeon player={player} potions={potions} inventory={inventory} points={points} cargados={cargados} resume={run} onCheckpoint={onCheckpoint} onExit={handleRunEnd} />}

      {showStats && player && <StatsPanel player={player} points={points} onSpend={spendPoint} onClose={() => setShowStats(false)} />}
      {showEquip && player && <EquipPanel player={player} gear={gear} equipped={equipped} onEquip={equipGear} onUnequip={unequipSlot} onClose={() => setShowEquip(false)} />}
      {showShop && player && <Shop player={player} gold={gold} potions={potions} inventory={inventory} equipped={equipped} onBuyPotion={buyPotion} onBuyWeapon={buyWeapon} onBuyGear={buyGear} onSell={sellWeapon} onSellAll={sellDuplicates} onClose={() => setShowShop(false)} />}
      {showForge && player && <Forge player={player} gold={gold} materials={materials} onForge={forgeItem} onClose={() => setShowForge(false)} />}
    </div>
  );
}
