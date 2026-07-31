import { useEffect, useReducer, useRef, useState } from "react";
import { statAbbr, t, tName, abilityName } from "../game/i18n";
import type { Creature, Characteristics } from "../engine";
import { getAbility, recomputeDerived, getHealthForLevel, ENERGY_MAX, energyRaiseCost, BASE_POTION_SLOTS, MAX_POTION_SLOTS, potionSlotCost } from "../engine";
import { makeDungeonGroup, rollRoomCount, enemyKind, makeMimic } from "../game/enemies";
import { pickDungeon, dungeonById } from "../game/dungeons";
import { rollRoomTrap, trapDamage, type Trap } from "../game/traps";
import { DungeonEntry } from "./DungeonEntry";
import { KeyRitual } from "./KeyRitual";
import { NemesisInitiative } from "./NemesisInitiative";
import { rollRoomMaterials, rollSearchMaterials, mergeMats, matsSummary, matIcon, matName, type Mats } from "../game/materials";
import { goldForEnemy, goldDropChance, rollWeaponDrop, rollNoGoldLine } from "../game/loot";
import { xpForEnemy, gainXp, POINTS_PER_LEVEL } from "../game/progression";
import { reqMet, STAT_ES, toWeapon, type WeaponOpt, NEMESIS_AWAKEN_LEVEL } from "../game/catalog";
import { graduateCargado, levelUpCargado, pickStolenIndex, cargadoHome, type Cargado } from "../game/cargados";
import { SEARCH_SEC, SEARCH_AMBUSH_CHANCE, searchChance, searchGold, searchOutcome, searchIntro } from "../game/search";
import type { RunState } from "../store/PlayerStore";
import { baseSpecies, type CharStats } from "../game/charStats";
import { Combat } from "./Combat";
import { StatsInline } from "./StatsInline";
import { InventoryInline } from "./InventoryInline";

const REST_FULL_SEC = 45;
const AMBUSH_CHANCE = 0.45;
const STALKER_CHANCE = 0.4;  // prob. por sala de toparte al cargado que acecha

export interface RunResult {
  player: Creature; outcome: "won" | "dead"; runGold: number; potions: number;
  inventory: WeaponOpt[]; xp: number; points: number;
  newCargado: Cargado | null; defeatedCargados: string[]; recoveredWeapons: WeaponOpt[];
  leveledCargado: Cargado | null;   // némesis que te ganó de nuevo y subió de nivel
  materials: Mats;
  runStats?: Partial<CharStats>;   // deltas de estadísticas de esta bajada
}

type Phase = "fight" | "cleared" | "camp" | "ambush" | "result" | "chest";
type ChestType = "tesoro" | "trampa" | "mimic";

const CHEST_FLOOR_CHANCE = 0.3;      // prob. de que un piso tenga UN cofre
const CHEST_INVESTIGATE_FRAC = 0.5;   // investigar cuesta 50% de la energía máxima (redondeo arriba)
const CHEST_TRAP_HP_FRAC = 0.15;      // trampa a ciegas = 15% de la vida máxima
// decide en qué cuarto del piso cae el cofre (o -1 = sin cofre). Cualquier cuarto, incluido el primero.
const rollChestRoom = (rooms: number): number => Math.random() < CHEST_FLOOR_CHANCE ? Math.floor(Math.random() * rooms) : -1;
const rollChestOutcome = (): ChestType => (["tesoro", "trampa", "mimic"] as ChestType[])[Math.floor(Math.random() * 3)];
// tesoro = la vida que TENDRÍA un mímico aquí ÷ 2 (el premio siente el peligro que esquivaste).
// mímico: vit base 8 + depth/2 (mismo escalado que makeMimic), nivel = piso.
const rollChestGold = (depth: number, stage: number): number => {
  const mimicVit = 8 + Math.floor(depth / 2);
  const base = getHealthForLevel(mimicVit, stage) / 2;
  return Math.max(1, Math.round(base * (0.85 + Math.random() * 0.3)));   // ±15% de variación
};

export function Dungeon({ player, potions, inventory, xp, points, cargados, resume, dungeonId, startStage, unlockedFloors, onUnlockFloor, onCheckpoint, onExit }: {
  player: Creature; potions: number; inventory: WeaponOpt[]; xp: number; points: number; cargados: Cargado[];
  resume: RunState | null; dungeonId?: string | null; startStage?: number;
  unlockedFloors?: Record<string, number[]>; onUnlockFloor?: (dungeonId: string, floor: number) => void;
  onCheckpoint: (rs: RunState) => void;
  onExit: (r: RunResult) => void;
}) {
  const [, force] = useReducer((x) => x + 1, 0);
  const [stage, setStage] = useState(resume?.stage ?? startStage ?? 1);
  const initialRooms = resume?.stageRooms ?? rollRoomCount();
  const [stageRooms, setStageRooms] = useState(initialRooms);
  const [roomInStage, setRoomInStage] = useState(resume?.roomInStage ?? 0);
  const depth = useRef(resume?.depth ?? (startStage && startStage > 1 ? (startStage - 1) * 5 : 0));
  const dungeon = useRef(resume ? dungeonById(resume.dungeonId) : (dungeonId ? dungeonById(dungeonId) : pickDungeon()));
  // cofre del piso: en qué cuarto cae (-1 = ninguno). No se persiste entre recargas (v1).
  const chestRoom = useRef<number>(resume ? -1 : rollChestRoom(initialRooms));
  const [chestType, setChestType] = useState<ChestType | null>(resume ? null : (chestRoom.current === 0 ? rollChestOutcome() : null));
  const [chestSeen, setChestSeen] = useState(false);   // ¿investigaste? (revela el contenido)
  const [chestDone, setChestDone] = useState(false);   // ¿resuelto? (muestra botón continuar)
  const [chestMsg, setChestMsg] = useState<string>("");
  const [mimicOpen, setMimicOpen] = useState<"player" | "enemy" | undefined>(undefined);
  const [group, setGroup] = useState<Creature[]>(() => resume ? [] : makeDungeonGroup(0, 1, dungeon.current.kinds));
  const [fightingCargado, setFightingCargado] = useState<Cargado | null>(null);
  const [pendingNemesis, setPendingNemesis] = useState<Cargado | null>(null);          // némesis esperando su ritual de iniciativa
  const [confirmEquip, setConfirmEquip] = useState<WeaponOpt | null>(null);            // confirmación antes de cambiar de arma
  const [nemesisOpenWith, setNemesisOpenWith] = useState<"player" | "enemy" | undefined>(undefined);
  const [phase, setPhase] = useState<Phase>(resume?.phase ?? (chestRoom.current === 0 ? "chest" : "fight"));
  const [outcome, setOutcome] = useState<"won" | "dead">("won");
  const [entering, setEntering] = useState(!resume);   // transición de entrada solo en bajadas nuevas
  const [runGold, setRunGold] = useState(resume?.runGold ?? 0);
  const [roomGold, setRoomGold] = useState(resume?.roomGold ?? 0);
  const [roomXp, setRoomXp] = useState(0);
  const [roomMats, setRoomMats] = useState<Mats>({});
  const [drop, setDrop] = useState<WeaponOpt | null>(resume?.drop ?? null);
  const [picked, setPicked] = useState(resume?.picked ?? false);
  const [equipped, setEquipped] = useState(resume?.equipped ?? false);
  const [resting, setResting] = useState(resume?.resting ?? false);
  const [ambushGroup, setAmbushGroup] = useState<Creature[] | null>(null);
  const [stalkerPending, setStalkerPending] = useState(false);
  const [searched, setSearched] = useState(resume?.searched ?? false);
  const [searching, setSearching] = useState(false);
  const [searchText, setSearchText] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<string | null>(null);

  const working = useRef<Creature>(resume ? { ...resume.player, modifiers: [] } : { ...player, hp: player.maxHp, energy: player.maxEnergy, modifiers: [] });
  const potionsRef = useRef(resume?.potions ?? potions);
  const invRef = useRef<WeaponOpt[]>([...(resume?.inventory ?? inventory)]);
  const xpRef = useRef(resume ? resume.runXp : xp);
  const runGoldRef = useRef(resume?.runGold ?? 0);
  const pointsRef = useRef(resume?.points ?? points);
  const campStart = useRef(resume?.campStartMs ?? 0);
  const hpAtCamp = useRef(resume?.hpAtCamp ?? 0);
  const ambushAt = useRef<number | null>(resume?.ambushAtSec ?? null);
  const stalker = useRef<Cargado | null>(
    resume ? (resume.stalkerId ? cargados.find((c) => c.id === resume.stalkerId) ?? null : null)
           : (() => {
               // TERRITORIAL: solo acechan los némesis cuya guarida es ESTA mazmorra
               const locals = cargados.filter((c) => cargadoHome(c) === dungeon.current.id);
               return locals.length ? locals[Math.floor(Math.random() * locals.length)] : null;
             })()
  );
  const newCargado = useRef<Cargado | null>(null);
  const leveledCargado = useRef<Cargado | null>(null);
  const roomTrap = useRef<Trap | null>(null);
  const [trapMsg, setTrapMsg] = useState<string | null>(null);
  const [trapAlert, setTrapAlert] = useState<string | null>(null);   // alerta propia al DETECTAR una trampa
  const [keyAlert, setKeyAlert] = useState<number | null>(null);      // piso desbloqueado por una llave encontrada
  const defeated = useRef<string[]>(resume?.defeated ? [...resume.defeated] : []);
  const recovered = useRef<WeaponOpt[]>(resume?.recovered ? [...resume.recovered] : []);
  const searchStart = useRef(0);
  const searchAmbushAt = useRef<number | null>(null);
  const searchFound = useRef(false);
  const searchGoldAmt = useRef(0);
  const ambushReturn = useRef<"camp" | "cleared">("camp");
  const searchProgress = useRef(0);
  const runMats = useRef<Mats>(resume?.runMaterials ? { ...resume.runMaterials } : {});
  const noGoldLine = useRef<string>(resume && (resume.roomGold ?? 0) === 0 && resume.phase === "cleared" ? rollNoGoldLine() : "");

  useEffect(() => { setStalkerPending(stalker.current != null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runStats = useRef<Partial<CharStats>>(resume?.runStats ?? {});
  const sBump = (k: keyof CharStats, n = 1) => { (runStats.current as any)[k] = (((runStats.current as any)[k] as number) ?? 0) + n; };
  const sMap = (k: keyof CharStats, sub: string, n = 1) => { const m = ((runStats.current as any)[k] ??= {}) as Record<string, number>; m[sub] = (m[sub] ?? 0) + n; };
  const sMax = (k: keyof CharStats, v: number) => { (runStats.current as any)[k] = Math.max(((runStats.current as any)[k] as number) ?? 0, v); };
  const mergeDelta = (delta?: Partial<CharStats>) => { if (!delta) return; for (const [k, v] of Object.entries(delta)) { if (v && typeof v === "object") { for (const [sk, sv] of Object.entries(v as Record<string, number>)) sMap(k as keyof CharStats, sk, sv); } else if (typeof v === "number") sBump(k as keyof CharStats, v); } };
  function buildRun(over: Partial<RunState>): RunState {
    return {
      stage, stageRooms, roomInStage, depth: depth.current,
      player: working.current, potions: potionsRef.current, inventory: invRef.current,
      runGold: runGoldRef.current, runXp: xpRef.current, points: pointsRef.current,
      phase: "camp", drop, picked, equipped, roomGold, searched,
      resting: false, campStartMs: campStart.current, hpAtCamp: hpAtCamp.current, ambushAtSec: ambushAt.current,
      stalkerId: stalker.current?.id ?? null, defeated: defeated.current, recovered: recovered.current,
      runMaterials: runMats.current, dungeonId: dungeon.current.id,
      runStats: runStats.current,
      ...over,
    };
  }

  const wp = working.current;
  const isLastOfStage = roomInStage + 1 >= stageRooms;

  useEffect(() => {
    if (phase !== "camp" || !resting) return;
    const id = setInterval(() => {
      const elapsed = (Date.now() - campStart.current) / 1000;
      if (ambushAt.current != null && elapsed >= ambushAt.current) {
        ambushAt.current = null; setResting(false); sBump("ambushed");
        setAmbushGroup(makeDungeonGroup(depth.current, stage, dungeon.current.kinds)); setPhase("ambush");
        return;
      }
      const healed = Math.min(wp.maxHp, hpAtCamp.current + (elapsed / REST_FULL_SEC) * wp.maxHp);
      working.current.hp = healed;
      if (healed >= wp.maxHp) setResting(false);
      force();
    }, 250);
    return () => clearInterval(id);
  }, [phase, resting]); // eslint-disable-line react-hooks/exhaustive-deps

  // barra de observación al rebuscar la sala
  useEffect(() => {
    if (phase !== "cleared" || !searching) return;
    const id = setInterval(() => {
      const elapsed = (Date.now() - searchStart.current) / 1000;
      if (searchAmbushAt.current != null && elapsed >= searchAmbushAt.current) {
        searchAmbushAt.current = null; setSearching(false); setSearched(true);
        setSearchText(t("dungeon.ambushedSearch"));
        ambushReturn.current = "cleared"; sBump("ambushed");
        setAmbushGroup(makeDungeonGroup(depth.current, stage, dungeon.current.kinds)); setPhase("ambush");
        return;
      }
      searchProgress.current = Math.min(1, elapsed / SEARCH_SEC);
      if (elapsed >= SEARCH_SEC) {
        setSearching(false); setSearched(true);
        let extra = "";
        if (searchFound.current) {
          runGoldRef.current += searchGoldAmt.current; setRunGold(runGoldRef.current);
          const mats = rollSearchMaterials(enemyKind(group[0] ?? working.current), working.current.level);
          runMats.current = mergeMats(runMats.current, mats);
          extra = ` (+◈${searchGoldAmt.current} · ${matsSummary(mats)})`;
        }
        if (roomTrap.current) { setTrapAlert(tName(roomTrap.current.detect)); sBump("trapsFound"); roomTrap.current = null; }
        setSearchText(searchOutcome(dungeon.current.biome, searchFound.current) + extra);
        onCheckpoint(buildRun({ phase: "cleared", searched: true }));
      }
      force();
    }, 200);
    return () => clearInterval(id);
  }, [phase, searching]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Genera la siguiente pelea: puede ser el cargado que acecha (al azar) o un grupo normal. */
  function nextFight(d: number, st: number): { enemies: Creature[]; cargado: Cargado | null } {
    if (stalker.current && Math.random() < STALKER_CHANCE) {
      const c = stalker.current; stalker.current = null; setStalkerPending(false);
      return { enemies: [{ ...c.creature, modifiers: [] }], cargado: c };
    }
    return { enemies: makeDungeonGroup(d, st, dungeon.current.kinds), cargado: null };
  }

  function awardKill(enemies: Creature[]) {
    let g = 0, xpGain = 0;
    for (const e of enemies) {
      xpGain += xpForEnemy(depth.current);
      if (Math.random() < goldDropChance(enemyKind(e))) g += goldForEnemy(depth.current);
      sMap("killsBySpecies", baseSpecies(e.name)); sMap("killsByType", enemyKind(e)); sBump("killsTotal");
    }
    runGoldRef.current += g; setRoomGold(g); setRunGold(runGoldRef.current);
    noGoldLine.current = g > 0 ? "" : rollNoGoldLine();
    setRoomXp(xpGain);
    // subir de nivel EN VIVO: la XP de la sala se convierte en niveles + puntos al instante
    const res = gainXp(working.current, xpRef.current, pointsRef.current, xpGain);
    xpRef.current = res.xp; pointsRef.current = res.points;
    if (res.leveled.length) {
      const to = res.leveled[res.leveled.length - 1];
      setLevelUp(t("dungeon.levelUp", { to, pts: res.leveled.length * POINTS_PER_LEVEL }));
    }
  }
  function onDeath(killers: Creature[], defeatedBy: Cargado | null) {
    const awakened = wp.level >= NEMESIS_AWAKEN_LEVEL;
    // los MÍMICOS (aberraciones) solo salen de cofres: nunca se gradúan a némesis territorial.
    const killerIsMimic = killers.some((k) => (k.tags ?? []).includes("aberration"));
    if (defeatedBy) {
      // te ganó un némesis que ya existía: sube de nivel ESE mismo — pero solo si el sistema está despierto (nv22+)
      if (awakened) leveledCargado.current = levelUpCargado(defeatedBy, wp.level);
    } else if (killers.length > 0 && !killerIsMimic) {
      // LÍMITE TERRITORIAL: si esta mazmorra YA tiene un guardián, ese sube de nivel (no nace otro).
      const guardian = cargados.find((c) => cargadoHome(c) === dungeon.current.id);
      if (guardian) {
        if (awakened) leveledCargado.current = levelUpCargado(guardian, wp.level);   // menor: no sube, no ritual
      } else {
        let stolen: WeaponOpt | null = null;
        if (awakened) {
          // solo un némesis despierto te ROBA el arma (la saca de tu inventario)
          const eqId = working.current.weapon.id ?? "";
          const idx = pickStolenIndex(invRef.current, eqId);
          if (idx >= 0) { stolen = invRef.current[idx]; invRef.current = invRef.current.slice(0, idx).concat(invRef.current.slice(idx + 1)); }
        }
        newCargado.current = graduateCargado(killers, runGoldRef.current, stolen, dungeon.current.id, awakened);
      }
    }
    setOutcome("dead");
    finish("dead");   // sin pantalla de resultado: la muerte lleva directo al ritual del némesis (en el hub)
  }
  function defeatCargado(c: Cargado) {
    defeated.current.push(c.id);
    if (c.weapon) recovered.current.push(c.weapon);
    runGoldRef.current += c.gold; setRunGold(runGoldRef.current);
  }
  function handleCombatEnd(res: { survived: boolean; player: Creature; potions: number; statsDelta?: Partial<CharStats> }) {
    working.current = res.player; potionsRef.current = res.potions; mergeDelta(res.statsDelta);
    const wasCargado = fightingCargado;
    if (!res.survived) { onDeath(group, wasCargado); return; }
    if (wasCargado) { defeatCargado(wasCargado); setFightingCargado(null); awardKill(group); }
    else awardKill(group);
    // el MÍMICO se disfrazó de tesoro: al vencerlo, suelta su botín (el oro que imitaba).
    if (group.some((e) => (e.tags ?? []).includes("aberration"))) {
      const hoard = rollChestGold(depth.current, stage);
      runGoldRef.current += hoard; setRunGold(runGoldRef.current); setRoomGold(hoard);
      noGoldLine.current = "";
    }
    sBump("roomsCleared"); sMap("weaponUses", working.current.weapon.id ?? "?");
    const kind = enemyKind(group[0] ?? working.current);
    const mats = rollRoomMaterials(kind, depth.current);
    runMats.current = mergeMats(runMats.current, mats);
    setRoomMats(mats);
    roomTrap.current = rollRoomTrap(dungeon.current.biome);   // ¿esta sala esconde una trampa?
    const d = rollWeaponDrop(depth.current);
    setDrop(d); setPicked(false); setEquipped(false);
    setSearched(false); setSearching(false); setSearchText(null); searchProgress.current = 0;
    setPhase("cleared");
    onCheckpoint(buildRun({ phase: "cleared", drop: d, picked: false, equipped: false, searched: false }));
  }
  function handleAmbushEnd(res: { survived: boolean; player: Creature; potions: number; statsDelta?: Partial<CharStats> }) {
    working.current = res.player; potionsRef.current = res.potions; mergeDelta(res.statsDelta);
    if (!res.survived) { onDeath(ambushGroup ?? [], null); return; }
    awardKill(ambushGroup ?? []); setAmbushGroup(null); setResting(false); ambushAt.current = null;
    const back = ambushReturn.current;
    setPhase(back);
    onCheckpoint(buildRun({ phase: back, resting: false }));
  }
  function addToBag(d: WeaponOpt) { invRef.current = [...invRef.current, d]; }
  function pickUp(d: WeaponOpt) { addToBag(d); setPicked(true); onCheckpoint(buildRun({ phase: "cleared", picked: true })); }
  function equipDrop(d: WeaponOpt) { addToBag(d); working.current = { ...working.current, weapon: toWeapon(d) }; setPicked(true); setEquipped(true); onCheckpoint(buildRun({ phase: "cleared", picked: true, equipped: true })); }

  /** Al dejar una sala sin rebuscarla, una trampa oculta se dispara. Devuelve true si te mató. */
  function springTrapIfAny(): boolean {
    const trap = roomTrap.current;
    roomTrap.current = null;
    if (!trap) return false;
    sBump("trapsSprung");
    const dmg = trapDamage(trap, wp.maxHp);
    working.current = { ...working.current, hp: Math.max(0, working.current.hp - dmg) };
    setTrapMsg(`⚠ ${tName(trap.name)} — ${tName(trap.trigger)} (−${dmg} ${t("dungeon.hpLoss")})`);
    if (working.current.hp <= 0) { onDeath([], null); return true; }
    return false;
  }
  function advance() {
    setTrapMsg(null); setTrapAlert(null); setKeyAlert(null);
    if (springTrapIfAny()) return;
    depth.current += 1;
    const nextRoom = roomInStage + 1;
    setRoomInStage(nextRoom);
    working.current = { ...working.current, energy: working.current.maxEnergy };
    if (nextRoom === chestRoom.current) enterChest();
    else beginEncounter(nextFight(depth.current, stage));
  }

  // ── COFRES ──────────────────────────────────────────────────────────────
  /** Entra a una sala de cofre: decide el contenido y muestra la tarjeta cerrada. */
  function enterChest() {
    setChestType(rollChestOutcome());
    setChestSeen(false); setChestDone(false); setChestMsg("");
    setMimicOpen(undefined);
    setPhase("chest");
  }
  /** Investigar: cuesta 50% de la energía máxima (redondeo arriba), revela el contenido. */
  function chestInvestigate() {
    const cost = Math.ceil(working.current.maxEnergy * CHEST_INVESTIGATE_FRAC);
    if (working.current.energy < cost) return;
    working.current = { ...working.current, energy: working.current.energy - cost };
    setChestSeen(true);
    const key = chestType === "tesoro" ? "chest.hint.tesoro" : chestType === "trampa" ? "chest.hint.trampa" : "chest.hint.mimic";
    setChestMsg(t(key)); force();
  }
  /** Abrir: resuelve según el contenido. */
  function chestOpen() {
    if (chestType === "tesoro") {
      const g = rollChestGold(depth.current, stage);
      runGoldRef.current += g; setRunGold(runGoldRef.current); setRoomGold(g);
      setChestMsg(t("chest.result.tesoro", { n: g })); setChestDone(true);
    } else if (chestType === "trampa") {
      if (chestSeen) {                         // investigada → desarmada: sin daño + un poco de oro
        const g = Math.round(rollChestGold(depth.current, stage) * 0.4);
        runGoldRef.current += g; setRunGold(runGoldRef.current); setRoomGold(g);
        setChestMsg(t("chest.result.trapDisarmed", { n: g })); setChestDone(true);
      } else {                                 // a ciegas → daño (% de vida máxima)
        const dmg = Math.max(1, Math.round(working.current.maxHp * CHEST_TRAP_HP_FRAC));
        working.current = { ...working.current, hp: Math.max(0, working.current.hp - dmg) };
        sBump("trapsSprung");
        if (working.current.hp <= 0) { onDeath([], null); return; }
        setChestMsg(t("chest.result.trapSprung", { n: dmg })); setChestDone(true); force();
      }
    } else {                                   // mímico → combate real
      setGroup([makeMimic(depth.current, stage)]);
      setFightingCargado(null);
      setMimicOpen(chestSeen ? "player" : "enemy");   // investigado = tú primero; a ciegas = él primero
      setPhase("fight");
    }
  }
  /** Seguir de largo: deja el cofre intacto. */
  function chestLeave() { setChestMsg(t("chest.result.left")); setChestDone(true); }

  /** Arranca un encuentro: si es némesis, primero su ritual de iniciativa (sin montar combate). */
  function beginEncounter(nf: { enemies: Creature[]; cargado: Cargado | null }) {
    setGroup(nf.enemies); setFightingCargado(nf.cargado); setMimicOpen(undefined);
    // ritual de iniciativa SOLO para némesis despierto (jugador nv22+); el menor pelea sin ceremonia
    if (nf.cargado && working.current.level >= NEMESIS_AWAKEN_LEVEL) { setPendingNemesis(nf.cargado); }
    else { setNemesisOpenWith(undefined); setPhase("fight"); }
  }

  function goCamp() {
    if (springTrapIfAny()) return;
    // LLAVE DE PROFUNDIDAD: garantizada al despejar un piso múltiplo de 5 (fin de piso = ir a campamento).
    const dgId = dungeon.current.id;
    const already = (unlockedFloors?.[dgId] ?? []).includes(stage);
    if (stage % 5 === 0 && !already) { onUnlockFloor?.(dgId, stage); setKeyAlert(stage); }
    sBump("floorsCleared"); sMax("deepestFloor", stage);
    setPhase("camp"); onCheckpoint(buildRun({ phase: "camp", resting: false }));
  }
  function startRest() {
    sBump("timesCamped");
    hpAtCamp.current = working.current.hp; campStart.current = Date.now(); ambushReturn.current = "camp";
    ambushAt.current = Math.random() < AMBUSH_CHANCE ? 4 + Math.random() * (REST_FULL_SEC * 0.7) : null;
    setResting(true);
    onCheckpoint(buildRun({ phase: "camp", resting: true }));
  }
  function startSearch() {
    setTrapAlert(null); setKeyAlert(null); sBump("roomsSearched");
    searchStart.current = Date.now(); searchProgress.current = 0;
    searchFound.current = Math.random() < searchChance(wp.characteristics.dexterity, wp.characteristics.intelligence);
    searchGoldAmt.current = searchFound.current ? searchGold(depth.current) : 0;
    searchAmbushAt.current = Math.random() < SEARCH_AMBUSH_CHANCE ? 2 + Math.random() * (SEARCH_SEC * 0.6) : null;
    setSearchText(null); setSearching(true);
  }
  function breakCamp() { setResting(false); onCheckpoint(buildRun({ phase: "camp", resting: false })); }
  function continueDeeper() {
    const ns = stage + 1; sMax("deepestFloor", ns);
    depth.current += 1; setStage(ns);
    const rooms = rollRoomCount(); setStageRooms(rooms);
    chestRoom.current = rollChestRoom(rooms);   // ¿este piso nuevo tiene cofre? ¿en qué cuarto?
    setRoomInStage(0);
    working.current = { ...working.current, energy: working.current.maxEnergy }; setResting(false);
    if (chestRoom.current === 0) enterChest();
    else beginEncounter(nextFight(depth.current, ns));
  }
  function campSpend(k: keyof Characteristics) {
    if (pointsRef.current <= 0) return;
    const c = working.current;
    working.current = { ...c, characteristics: { ...c.characteristics, [k]: c.characteristics[k] + 1 } };
    recomputeDerived(working.current);
    pointsRef.current -= 1; force();
  }

  function campRaiseEnergy() {
    const c = working.current;
    if (c.maxEnergy >= ENERGY_MAX) return;
    const cost = energyRaiseCost(c.maxEnergy);
    if (pointsRef.current < cost) return;
    working.current = { ...c, maxEnergy: c.maxEnergy + 1, energy: c.maxEnergy + 1 };
    pointsRef.current -= cost; force();
  }

  function campRaisePotionSlot() {
    const c = working.current;
    const cur = c.maxPotions ?? BASE_POTION_SLOTS;
    if (cur >= MAX_POTION_SLOTS) return;
    const cost = potionSlotCost(cur);
    if (pointsRef.current < cost) return;
    working.current = { ...c, maxPotions: cur + 1 };
    pointsRef.current -= cost; force();
    onCheckpoint(buildRun({ phase: "camp", resting }));
  }
  function campEquip(w: WeaponOpt) { working.current = { ...working.current, weapon: toWeapon(w) }; force(); onCheckpoint(buildRun({ phase: "camp", resting })); }
  function leaveDungeon() { setResting(false); setOutcome("won"); setPhase("result"); }
  function finish(outcomeArg?: "won" | "dead") {
    onExit({
      player: wp, outcome: outcomeArg ?? outcome, runGold: runGoldRef.current, potions: potionsRef.current, inventory: invRef.current,
      xp: xpRef.current, points: pointsRef.current,
      newCargado: newCargado.current, defeatedCargados: defeated.current, recoveredWeapons: recovered.current,
      leveledCargado: leveledCargado.current,
      materials: runMats.current,
      runStats: runStats.current,
    });
  }

  const dropOk = drop ? reqMet(drop.req, wp.characteristics) : false;
  const dropReqTxt = drop ? Object.entries(drop.req ?? {}).map(([k, v]) => `${statAbbr(k).toLowerCase()} ${v}`).join(" · ") : "";
  const moveText = (ids: string[]) => ids.map((id) => { const a = getAbility(id); return a ? abilityName(a.id) : id; }).join(" · ");
  const hpBar = (c: Creature) => Math.max(0, c.hp / c.maxHp * 100) + "%";
  const hpColor = (c: Creature) => c.hp / c.maxHp < 0.2 ? "var(--danger)" : "var(--php)";

  return (
    <div>
      {entering && (
        <DungeonEntry
          name={tName(dungeon.current.name)}
          desc={tName(dungeon.current.desc)}
          floor={stage}
          onDone={() => setEntering(false)}
        />
      )}
      {confirmEquip && (
        <div className="confirm-overlay" onClick={() => setConfirmEquip(null)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">{t("equipConfirm.title")}</div>
            <div className="confirm-compare">
              <div className="confirm-w cur">
                <span className="confirm-lbl">{t("equipConfirm.current")}</span>
                <b>{tName(wp.weapon.name)}</b>
                <small>{t("common.damageLbl")}{wp.weapon.damage}</small>
              </div>
              <span className="confirm-arrow">→</span>
              <div className="confirm-w new">
                <span className="confirm-lbl">{t("equipConfirm.new")}</span>
                <b>{tName(confirmEquip.name)}</b>
                <small>{t("common.damageLbl")}{confirmEquip.damage}</small>
              </div>
            </div>
            <div className="confirm-btns">
              <button className="ghost" onClick={() => setConfirmEquip(null)}>{t("equipConfirm.cancel")}</button>
              <button className="primary" onClick={() => { equipDrop(confirmEquip); setConfirmEquip(null); }}>{t("equipConfirm.yes")}</button>
            </div>
          </div>
        </div>
      )}
      {pendingNemesis && (
        <NemesisInitiative
          cargado={pendingNemesis}
          onDone={(playerFirst) => { setNemesisOpenWith(playerFirst ? "player" : "enemy"); setPendingNemesis(null); setPhase("fight"); }}
        />
      )}
      {keyAlert !== null && (
        <KeyRitual dungeon={tName(dungeon.current.name)} floor={keyAlert} onDone={() => setKeyAlert(null)} />
      )}
      <div className="crawlbar">
        <span>{tName(dungeon.current.short)} · {t("dungeon.stage")} {stage} · {t("dungeon.room")} {Math.min(roomInStage + 1, stageRooms)}/{stageRooms}</span>
        <span className="goldmini">{t("common.lvAbbr")} {wp.level} · ◈ {runGold} <span className="soft">{t("status.unsecured")}</span> · ⚗ {potionsRef.current}</span>
      </div>
      {trapMsg && phase !== "result" && (
        <div className="trapbanner" onClick={() => setTrapMsg(null)}>{trapMsg} <span className="soft">(toca para cerrar)</span></div>
      )}
      {stage === 1 && roomInStage === 0 && phase === "fight" && (
        <div className="dungeonintro"><b>{tName(dungeon.current.name)}</b><span>{tName(dungeon.current.desc)}</span></div>
      )}
      {levelUp && phase !== "result" && (
        <div className="levelbanner" onClick={() => setLevelUp(null)}>⬆ {levelUp} <span className="soft">(toca para cerrar)</span></div>
      )}
      {stalkerPending && phase !== "result" && (
        <div className="stalkerbanner">{stalker.current ? t("dungeon.stalkerNamed", { name: tName(stalker.current.creature.name), level: stalker.current.creature.level }) : t("dungeon.stalkerAnon")}</div>
      )}
      <div className="crawltrack">
        {Array.from({ length: stageRooms }).map((_, i) => (
          <span key={i} className={"node" + (i < roomInStage ? " done" : i === roomInStage ? " now" : "")} />
        ))}
      </div>

      {phase === "fight" && (
        <>
          {fightingCargado && <div className="cargadobanner">☠ {fightingCargado.creature.name} (Nv {fightingCargado.creature.level}) — el némesis que se llevó tu botín. Véncelo para recuperarlo.</div>}
          <Combat key={`s${stage}r${roomInStage}`} player={wp} enemies={group} potions={potionsRef.current} openWith={fightingCargado ? nemesisOpenWith : mimicOpen} onEnd={handleCombatEnd} />
        </>
      )}

      {phase === "chest" && (() => {
        const invCost = Math.ceil(wp.maxEnergy * CHEST_INVESTIGATE_FRAC);
        const revealed = chestSeen || chestDone;
        const danger = revealed && (chestType === "trampa" || chestType === "mimic");
        const col = danger ? "var(--danger)" : "var(--accent)";
        const cardName = !revealed ? t("chest.name")
          : chestType === "tesoro" ? t("chest.name.tesoro")
          : chestType === "trampa" ? t("chest.name.trampa") : t("chest.name.mimic");
        const isMimicRevealed = revealed && chestType === "mimic";
        return (
          <>
            <div className="chestcard" style={{ border: `1.5px solid ${col}`, borderRadius: 14, padding: "16px 14px", textAlign: "center", marginBottom: 14 }}>
              <svg width="70" height="58" viewBox="0 0 76 62" fill="none" stroke={col} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", margin: "0 auto" }}>
                {isMimicRevealed ? (
                  <>
                    <rect x="12" y="30" width="52" height="26" rx="3.5" />
                    <path d="M12 28 Q38 12 64 28" />
                    <path d="M14 30 l5 -6 l5 6 l5 -6 l5 6 l5 -6 l5 6 l5 -6 l5 6 l5 -6 l5 6" strokeWidth="2" />
                    <path d="M30 44 Q38 50 46 44" strokeWidth="2" />
                  </>
                ) : (
                  <>
                    <rect x="12" y="26" width="52" height="30" rx="3.5" />
                    <path d="M12 32 Q38 13 64 32" />
                    <line x1="12" y1="37" x2="64" y2="37" />
                    <rect x="34" y="33" width="8" height="9" rx="1.5" fill={col} stroke="none" />
                  </>
                )}
              </svg>
              <div className="chestname" style={{ fontWeight: 700, fontSize: 16, marginTop: 8, color: danger ? "var(--danger)" : "var(--ink)" }}>{cardName}</div>
              {isMimicRevealed && <div className="chestsub" style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{t("chest.mimicSub")}</div>}
            </div>

            <div className="bar" style={{ margin: "10px 0 4px" }}><div style={{ width: hpBar(wp), background: hpColor(wp) }} /></div>
            <div className="hprest">{Math.max(0, Math.round(wp.hp))} / {wp.maxHp} ♥</div>
            <div className="bar" style={{ margin: "10px 0 4px" }}><div style={{ width: (wp.energy / wp.maxEnergy * 100) + "%", background: "var(--energy)" }} /></div>
            <div className="hprest">{wp.energy} / {wp.maxEnergy} ⚡</div>

            {chestMsg && <div className="chestlog" style={{ background: "var(--panel2, #1b1610)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px", margin: "12px 0", fontSize: 13.5, lineHeight: 1.6, color: danger ? "var(--danger)" : "var(--ink)" }}>{chestMsg}</div>}

            <div className="actions" style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 9 }}>
              {chestDone ? (
                isLastOfStage
                  ? <button className="primary" onClick={goCamp}>{t("dungeon.toCamp")}</button>
                  : <button className="primary" onClick={advance}>{t("dungeon.advanceToRoom", { n: roomInStage + 2 })}</button>
              ) : !chestSeen ? (
                <>
                  <button className="primary" onClick={chestOpen}>{t("chest.open")}</button>
                  <button className="ghost" disabled={wp.energy < invCost} onClick={chestInvestigate}>{t("chest.investigate", { n: invCost })}</button>
                  <button className="ghost" onClick={chestLeave}>{t("chest.leave")}</button>
                </>
              ) : (
                <>
                  <button className="primary" onClick={chestOpen}>
                    {chestType === "tesoro" ? t("chest.openTesoro") : chestType === "trampa" ? t("chest.openTrampa") : t("chest.face")}
                  </button>
                  <button className="ghost" onClick={chestLeave}>{t("chest.leave")}</button>
                </>
              )}
            </div>
          </>
        );
      })()}

      {phase === "ambush" && ambushGroup && (
        <>
          <div className="ambushbanner">{ambushReturn.current === "cleared" ? t("dungeon.ambushSearch") : t("dungeon.ambushCamp")}</div>
          <Combat key={`a${stage}r${roomInStage}`} player={wp} enemies={ambushGroup} potions={potionsRef.current} onEnd={handleAmbushEnd} />
        </>
      )}

      {phase === "cleared" && (
        <div className="panel">
          <div className="cap">{t("dungeon.roomCleared")}</div>
          <div className="loot">
            <div className="lootgold">{roomGold > 0 ? t("dungeon.goldReward", { n: roomGold }) : <span className="nogold">{noGoldLine.current ? tName(noGoldLine.current) : t("dungeon.noGoldFallback")}</span>}</div>

            <div className="rewardrow">
              {roomXp > 0 && <span className="rewardxp">+{roomXp} XP</span>}
              {Object.keys(roomMats).length > 0 && (
                <div className="rewardmats">
                  {Object.entries(roomMats).map(([id, n]) => (
                    <span className="rewardmat" key={id}>{matIcon(id)} {matName(id)} <b>×{n}</b></span>
                  ))}
                </div>
              )}
            </div>

            {drop ? (
              <div className={"dropcard" + (picked ? " done" : "")}>
                <div className="dropinfo"><b>{tName(drop.name)}</b><small>{t("common.damageLbl")}{drop.damage} · {drop.twoHanded ? t("common.twoHandsLong") : t("common.oneHandLong")} · {moveText(drop.abilities)}</small></div>
                {picked ? <span className="equipped">{equipped ? t("dungeon.equippedTag") : t("dungeon.inBagTag")}</span> : (
                  <div className="dropbtns">
                    {dropOk && <button className="small" onClick={() => setConfirmEquip(drop)}>{t("common.equipVerb")}</button>}
                    <button className="small ghost" onClick={() => pickUp(drop)}>{t("dungeon.pickUp")}</button>
                    {!dropOk && <span className="locked">req: {dropReqTxt}</span>}
                  </div>
                )}
              </div>
            ) : <div className="nodrop">{t("dungeon.noWeaponHere")}</div>}
          </div>

          {searched && trapAlert && (
            <div className="trapfound">
              <div className="trapfound-h">⚠ {t("dungeon.trapFound")}</div>
              <div className="trapfound-b">{trapAlert}</div>
            </div>
          )}

          {!searched && !searching ? (
            <button className="searchbox searchcard-btn" onClick={startSearch}>{t("dungeon.searchRoom")}</button>
          ) : (
            <div className="searchbox">
              {searching ? (
                <>
                  <p className="searchtxt">{searchIntro(dungeon.current.biome)}</p>
                  <div className="obsbar"><div style={{ width: (searchProgress.current * 100) + "%" }} /></div>
                  <div className="obslbl">{t("dungeon.searching")}</div>
                </>
              ) : (
                <p className={"searchtxt" + (searchText && searchText.includes("+◈") ? " hit" : "")}>{searchText}</p>
              )}
            </div>
          )}

          <div className="bar" style={{ margin: "12px 0 4px" }}><div style={{ width: hpBar(wp), background: hpColor(wp) }} /></div>
          <div className="hprest">{Math.max(0, Math.round(wp.hp))} / {wp.maxHp} ♥ <span className="soft">{t("dungeon.noHealBetween")}</span></div>
          <div className="actions" style={{ marginTop: 14 }}>
            {isLastOfStage
              ? <button className="primary" disabled={searching} onClick={goCamp}>{t("dungeon.toCamp")}</button>
              : <button className="primary" disabled={searching} onClick={advance}>{t("dungeon.advanceToRoom", { n: roomInStage + 2 })}</button>}
          </div>
        </div>
      )}

      {phase === "camp" && (
        <div className="panel">
          <div className="cap">{t("dungeon.campTitle", { stage })}</div>
          <div className="bar" style={{ margin: "6px 0 4px" }}><div style={{ width: hpBar(wp), background: hpColor(wp) }} /></div>
          <div className="hprest">{Math.max(0, Math.round(wp.hp))} / {wp.maxHp} ♥</div>
          {resting ? (
            <>
              <p className="clearmsg" style={{ marginTop: 10 }}>{t("dungeon.restingFlavor")}</p>
              <div className="actions" style={{ marginTop: 14 }}>
                <button className="primary" onClick={breakCamp}>{t("dungeon.breakCamp")}</button>
              </div>
            </>
          ) : (
            <>
              <p className="clearmsg" style={{ marginTop: 10 }}>{t("dungeon.campPrompt", { stage })}</p>
              <div className="campactions">
                <button onClick={startRest} disabled={wp.hp >= wp.maxHp}>{t("dungeon.restHere")}</button>
                <button className="primary" onClick={continueDeeper}>{t("dungeon.deeper", { n: stage + 1 })}</button>
                <button onClick={leaveDungeon}>{t("dungeon.leave", { gold: runGold })}</button>
              </div>
              <p className="foot">{t("dungeon.campHint")}</p>
            </>
          )}

          <div className="cap" style={{ marginTop: 18 }}>{t("dungeon.characteristics")} {pointsRef.current > 0 && <span className="tag">{t("common.ptsTag", { n: pointsRef.current })}</span>}</div>
          <div className="campblock"><StatsInline player={wp} points={pointsRef.current} onSpend={campSpend} onRaiseEnergy={campRaiseEnergy} onRaisePotionSlot={campRaisePotionSlot} /></div>

          <div className="cap" style={{ marginTop: 16 }}>{t("dungeon.inventory")}</div>
          <div className="campblock"><InventoryInline player={wp} inventory={invRef.current} onEquip={campEquip} /></div>
        </div>
      )}

      {phase === "result" && (
        <div className="panel">
          <div className="cap">{outcome === "won" ? t("dungeon.leftCrypt") : t("dungeon.fellCrypt")}</div>
          {outcome === "won" ? (
            <><p className="clearmsg">{t("dungeon.returnAlive")}</p><div className="banner ok">{t("dungeon.goldSecured", { gold: runGold })}</div></>
          ) : (
            <>
              <p className="clearmsg">{t("dungeon.fellStage", { stage, room: roomInStage + 1 })}</p>
              <div className="banner bad">{t("dungeon.goldLost", { gold: runGold })}</div>
              {newCargado.current && (
                <div className="cargadograd">
                  <b>☠ {newCargado.current.creature.name}</b> {t("dungeon.cargadoBorn")}
                  <div className="soft">{t("dungeon.cargadoStole", { gold: newCargado.current.gold, weapon: newCargado.current.weapon ? t("dungeon.andYour", { weapon: tName(newCargado.current.weapon.name) }) : "" })}</div>
                </div>
              )}
            </>
          )}
          <div className="actions" style={{ marginTop: 14 }}>
            <button className="primary" onClick={() => finish()}>{t("dungeon.returnRefuge")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
