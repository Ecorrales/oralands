import { useEffect, useReducer, useRef, useState } from "react";
import type { Creature, Characteristics } from "../engine";
import { getAbility, recomputeDerived } from "../engine";
import { makeDungeonGroup, rollRoomCount, enemyKind } from "../game/enemies";
import { rollRoomMaterials, rollSearchMaterials, mergeMats, matsSummary, matIcon, matName, type Mats } from "../game/materials";
import { goldForEnemy, goldDropChance, rollWeaponDrop, rollNoGoldLine } from "../game/loot";
import { xpForEnemy, gainXp, POINTS_PER_LEVEL } from "../game/progression";
import { reqMet, STAT_ES, toWeapon, type WeaponOpt } from "../game/catalog";
import { graduateCargado, pickStolenIndex, type Cargado } from "../game/cargados";
import { SEARCH_SEC, SEARCH_AMBUSH_CHANCE, searchChance, searchGold, biomeOf, searchOutcome, searchIntro } from "../game/search";
import type { RunState } from "../store/PlayerStore";
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
  materials: Mats;
}

type Phase = "fight" | "cleared" | "camp" | "ambush" | "result";

export function Dungeon({ player, potions, inventory, xp, points, cargados, resume, onCheckpoint, onExit }: {
  player: Creature; potions: number; inventory: WeaponOpt[]; xp: number; points: number; cargados: Cargado[];
  resume: RunState | null; onCheckpoint: (rs: RunState) => void;
  onExit: (r: RunResult) => void;
}) {
  const [, force] = useReducer((x) => x + 1, 0);
  const [stage, setStage] = useState(resume?.stage ?? 1);
  const [stageRooms, setStageRooms] = useState(() => resume?.stageRooms ?? rollRoomCount());
  const [roomInStage, setRoomInStage] = useState(resume?.roomInStage ?? 0);
  const depth = useRef(resume?.depth ?? 0);
  const [group, setGroup] = useState<Creature[]>(() => resume ? [] : makeDungeonGroup(0, 1));
  const [fightingCargado, setFightingCargado] = useState<Cargado | null>(null);
  const [phase, setPhase] = useState<Phase>(resume?.phase ?? "fight");
  const [outcome, setOutcome] = useState<"won" | "dead">("won");
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
           : (cargados.length ? cargados[Math.floor(Math.random() * cargados.length)] : null)
  );
  const newCargado = useRef<Cargado | null>(null);
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

  function buildRun(over: Partial<RunState>): RunState {
    return {
      stage, stageRooms, roomInStage, depth: depth.current,
      player: working.current, potions: potionsRef.current, inventory: invRef.current,
      runGold: runGoldRef.current, runXp: xpRef.current, points: pointsRef.current,
      phase: "camp", drop, picked, equipped, roomGold, searched,
      resting: false, campStartMs: campStart.current, hpAtCamp: hpAtCamp.current, ambushAtSec: ambushAt.current,
      stalkerId: stalker.current?.id ?? null, defeated: defeated.current, recovered: recovered.current,
      runMaterials: runMats.current,
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
        ambushAt.current = null; setResting(false);
        setAmbushGroup(makeDungeonGroup(depth.current, stage)); setPhase("ambush");
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
        setSearchText("Te emboscaron mientras rebuscabas — no alcanzaste a hallar nada.");
        ambushReturn.current = "cleared";
        setAmbushGroup(makeDungeonGroup(depth.current, stage)); setPhase("ambush");
        return;
      }
      searchProgress.current = Math.min(1, elapsed / SEARCH_SEC);
      if (elapsed >= SEARCH_SEC) {
        setSearching(false); setSearched(true);
        let extra = "";
        if (searchFound.current) {
          runGoldRef.current += searchGoldAmt.current; setRunGold(runGoldRef.current);
          const mats = rollSearchMaterials(enemyKind(group[0] ?? working.current), depth.current);
          runMats.current = mergeMats(runMats.current, mats);
          extra = ` (+◈${searchGoldAmt.current} · ${matsSummary(mats)})`;
        }
        setSearchText(searchOutcome(biomeOf(group), searchFound.current) + extra);
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
    return { enemies: makeDungeonGroup(d, st), cargado: null };
  }

  function awardKill(enemies: Creature[]) {
    let g = 0, xpGain = 0;
    for (const e of enemies) {
      xpGain += xpForEnemy(depth.current);
      if (Math.random() < goldDropChance(enemyKind(e))) g += goldForEnemy(depth.current);
    }
    runGoldRef.current += g; setRoomGold(g); setRunGold(runGoldRef.current);
    noGoldLine.current = g > 0 ? "" : rollNoGoldLine();
    setRoomXp(xpGain);
    // subir de nivel EN VIVO: la XP de la sala se convierte en niveles + puntos al instante
    const res = gainXp(working.current, xpRef.current, pointsRef.current, xpGain);
    xpRef.current = res.xp; pointsRef.current = res.points;
    if (res.leveled.length) {
      const to = res.leveled[res.leveled.length - 1];
      setLevelUp(`¡Nivel ${to}! +${res.leveled.length * POINTS_PER_LEVEL} puntos — repártelos en el campamento.`);
    }
  }
  function onDeath(killers: Creature[], cargadoFight: boolean) {
    if (!cargadoFight) {
      const eqId = working.current.weapon.id ?? "";
      const idx = pickStolenIndex(invRef.current, eqId);
      let stolen: WeaponOpt | null = null;
      if (idx >= 0) { stolen = invRef.current[idx]; invRef.current = invRef.current.slice(0, idx).concat(invRef.current.slice(idx + 1)); }
      newCargado.current = graduateCargado(killers, runGoldRef.current, stolen);
    }
    setOutcome("dead"); setPhase("result");
  }
  function defeatCargado(c: Cargado) {
    defeated.current.push(c.id);
    if (c.weapon) recovered.current.push(c.weapon);
    runGoldRef.current += c.gold; setRunGold(runGoldRef.current);
  }
  function handleCombatEnd(res: { survived: boolean; player: Creature; potions: number }) {
    working.current = res.player; potionsRef.current = res.potions;
    const wasCargado = fightingCargado;
    if (!res.survived) { onDeath(group, !!wasCargado); return; }
    if (wasCargado) { defeatCargado(wasCargado); setFightingCargado(null); awardKill(group); }
    else awardKill(group);
    const kind = enemyKind(group[0] ?? working.current);
    const mats = rollRoomMaterials(kind, depth.current);
    runMats.current = mergeMats(runMats.current, mats);
    setRoomMats(mats);
    const d = rollWeaponDrop(depth.current);
    setDrop(d); setPicked(false); setEquipped(false);
    setSearched(false); setSearching(false); setSearchText(null); searchProgress.current = 0;
    setPhase("cleared");
    onCheckpoint(buildRun({ phase: "cleared", drop: d, picked: false, equipped: false, searched: false }));
  }
  function handleAmbushEnd(res: { survived: boolean; player: Creature; potions: number }) {
    working.current = res.player; potionsRef.current = res.potions;
    if (!res.survived) { onDeath(ambushGroup ?? [], false); return; }
    awardKill(ambushGroup ?? []); setAmbushGroup(null); setResting(false); ambushAt.current = null;
    const back = ambushReturn.current;
    setPhase(back);
    onCheckpoint(buildRun({ phase: back, resting: false }));
  }
  function addToBag(d: WeaponOpt) { invRef.current = [...invRef.current, d]; }
  function pickUp(d: WeaponOpt) { addToBag(d); setPicked(true); onCheckpoint(buildRun({ phase: "cleared", picked: true })); }
  function equipDrop(d: WeaponOpt) { addToBag(d); working.current = { ...working.current, weapon: toWeapon(d) }; setPicked(true); setEquipped(true); onCheckpoint(buildRun({ phase: "cleared", picked: true, equipped: true })); }

  function advance() {
    depth.current += 1; setRoomInStage((r) => r + 1);
    working.current = { ...working.current, energy: working.current.maxEnergy };
    const nf = nextFight(depth.current, stage); setGroup(nf.enemies); setFightingCargado(nf.cargado); setPhase("fight");
  }
  function goCamp() { setPhase("camp"); onCheckpoint(buildRun({ phase: "camp", resting: false })); }
  function startRest() {
    hpAtCamp.current = working.current.hp; campStart.current = Date.now(); ambushReturn.current = "camp";
    ambushAt.current = Math.random() < AMBUSH_CHANCE ? 4 + Math.random() * (REST_FULL_SEC * 0.7) : null;
    setResting(true);
    onCheckpoint(buildRun({ phase: "camp", resting: true }));
  }
  function startSearch() {
    searchStart.current = Date.now(); searchProgress.current = 0;
    searchFound.current = Math.random() < searchChance(wp.characteristics.dexterity, wp.characteristics.intelligence);
    searchGoldAmt.current = searchFound.current ? searchGold(depth.current) : 0;
    searchAmbushAt.current = Math.random() < SEARCH_AMBUSH_CHANCE ? 2 + Math.random() * (SEARCH_SEC * 0.6) : null;
    setSearchText(null); setSearching(true);
  }
  function breakCamp() { setResting(false); onCheckpoint(buildRun({ phase: "camp", resting: false })); }
  function continueDeeper() {
    const ns = stage + 1;
    depth.current += 1; setStage(ns); setStageRooms(rollRoomCount()); setRoomInStage(0);
    working.current = { ...working.current, energy: working.current.maxEnergy }; setResting(false);
    const nf = nextFight(depth.current, ns); setGroup(nf.enemies); setFightingCargado(nf.cargado); setPhase("fight");
  }
  function campSpend(k: keyof Characteristics) {
    if (pointsRef.current <= 0) return;
    const c = working.current;
    working.current = { ...c, characteristics: { ...c.characteristics, [k]: c.characteristics[k] + 1 } };
    recomputeDerived(working.current);
    pointsRef.current -= 1; force();
    onCheckpoint(buildRun({ phase: "camp", resting }));
  }
  function campEquip(w: WeaponOpt) { working.current = { ...working.current, weapon: toWeapon(w) }; force(); onCheckpoint(buildRun({ phase: "camp", resting })); }
  function leaveDungeon() { setResting(false); setOutcome("won"); setPhase("result"); }
  function finish() {
    onExit({
      player: wp, outcome, runGold: runGoldRef.current, potions: potionsRef.current, inventory: invRef.current,
      xp: xpRef.current, points: pointsRef.current,
      newCargado: newCargado.current, defeatedCargados: defeated.current, recoveredWeapons: recovered.current,
      materials: runMats.current,
    });
  }

  const dropOk = drop ? reqMet(drop.req, wp.characteristics) : false;
  const dropReqTxt = drop ? Object.entries(drop.req).map(([k, v]) => `${STAT_ES[k].slice(0, 3).toLowerCase()} ${v}`).join(" · ") : "";
  const moveText = (ids: string[]) => ids.map((id) => { const a = getAbility(id); return a ? a.name : id; }).join(" · ");
  const hpBar = (c: Creature) => Math.max(0, c.hp / c.maxHp * 100) + "%";

  return (
    <div>
      <div className="crawlbar">
        <span>Cripta · etapa {stage} · sala {Math.min(roomInStage + 1, stageRooms)}/{stageRooms}</span>
        <span className="goldmini">Nv {wp.level} · ◈ {runGold} <span className="soft">sin asegurar</span> · ⚗ {potionsRef.current}</span>
      </div>
      {levelUp && phase !== "result" && (
        <div className="levelbanner" onClick={() => setLevelUp(null)}>⬆ {levelUp} <span className="soft">(toca para cerrar)</span></div>
      )}
      {stalkerPending && phase !== "result" && (
        <div className="stalkerbanner">☠ Un némesis acecha esta cripta{stalker.current ? `: ${stalker.current.creature.name}` : ""}.</div>
      )}
      <div className="crawltrack">
        {Array.from({ length: stageRooms }).map((_, i) => (
          <span key={i} className={"node" + (i < roomInStage ? " done" : i === roomInStage ? " now" : "")} />
        ))}
      </div>

      {phase === "fight" && (
        <>
          {fightingCargado && <div className="cargadobanner">☠ {fightingCargado.creature.name} — el némesis que se llevó tu botín. Véncelo para recuperarlo.</div>}
          <Combat key={`s${stage}r${roomInStage}`} player={wp} enemies={group} potions={potionsRef.current} onEnd={handleCombatEnd} />
        </>
      )}

      {phase === "ambush" && ambushGroup && (
        <>
          <div className="ambushbanner">¡Emboscada! Te descubrieron mientras {ambushReturn.current === "cleared" ? "rebuscabas la sala" : "acampabas"}.</div>
          <Combat key={`a${stage}r${roomInStage}`} player={wp} enemies={ambushGroup} potions={potionsRef.current} onEnd={handleAmbushEnd} />
        </>
      )}

      {phase === "cleared" && (
        <div className="panel">
          <div className="cap">Sala despejada</div>
          <div className="loot">
            <div className="lootgold">{roomGold > 0 ? `◈ +${roomGold} oro` : <span className="nogold">{noGoldLine.current || "Sin oro esta vez."}</span>}</div>

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
                <div className="dropinfo"><b>{drop.name}</b><small>daño {drop.damage} · {drop.twoHanded ? "dos manos" : "una mano"} · {moveText(drop.abilities)}</small></div>
                {picked ? <span className="equipped">{equipped ? "equipada ✓" : "en mochila ✓"}</span> : (
                  <div className="dropbtns">
                    {dropOk && <button className="small" onClick={() => equipDrop(drop)}>Equipar</button>}
                    <button className="small ghost" onClick={() => pickUp(drop)}>Recoger</button>
                    {!dropOk && <span className="locked">req: {dropReqTxt}</span>}
                  </div>
                )}
              </div>
            ) : <div className="nodrop">Sin arma en esta sala.</div>}
          </div>

          <div className="searchbox">
            {searching ? (
              <>
                <p className="searchtxt">{searchIntro(biomeOf(group))}</p>
                <div className="obsbar"><div style={{ width: (searchProgress.current * 100) + "%" }} /></div>
                <div className="obslbl">Observando…</div>
              </>
            ) : searched ? (
              <p className={"searchtxt" + (searchText && searchText.includes("+◈") ? " hit" : "")}>{searchText}</p>
            ) : (
              <button className="small ghost full" onClick={startSearch}>🔍 Rebuscar la sala</button>
            )}
          </div>

          <div className="bar" style={{ margin: "12px 0 4px" }}><div style={{ width: hpBar(wp), background: "var(--php)" }} /></div>
          <div className="hprest">{Math.max(0, Math.round(wp.hp))} / {wp.maxHp} ♥ <span className="soft">— no se cura entre salas</span></div>
          <div className="actions" style={{ marginTop: 14 }}>
            {isLastOfStage
              ? <button className="primary" disabled={searching} onClick={goCamp}>Llegar al campamento</button>
              : <button className="primary" disabled={searching} onClick={advance}>Avanzar a la sala {roomInStage + 2}</button>}
          </div>
        </div>
      )}

      {phase === "camp" && (
        <div className="panel">
          <div className="cap">🏕️ Campamento · etapa {stage} despejada</div>
          <div className="bar" style={{ margin: "6px 0 4px" }}><div style={{ width: hpBar(wp), background: "var(--php)" }} /></div>
          <div className="hprest">{Math.max(0, Math.round(wp.hp))} / {wp.maxHp} ♥</div>
          {resting ? (
            <>
              <p className="clearmsg" style={{ marginTop: 10 }}>Descansando junto al fuego… la vida se recupera con el tiempo. Cuidado: podrían emboscarte.</p>
              <div className="actions" style={{ marginTop: 14 }}>
                <button className="primary" onClick={breakCamp}>Levantar campamento</button>
              </div>
            </>
          ) : (
            <>
              <p className="clearmsg" style={{ marginTop: 10 }}>Sobreviviste la etapa {stage}. ¿Descansas, bajas más profundo, o sales con el botín?</p>
              <div className="campactions">
                <button onClick={startRest} disabled={wp.hp >= wp.maxHp}>Acampar y descansar</button>
                <button className="primary" onClick={continueDeeper}>Bajar más profundo (etapa {stage + 1})</button>
                <button onClick={leaveDungeon}>Salir del dungeon (◈ {runGold})</button>
              </div>
              <p className="foot">Descansar recupera vida con el tiempo real (aunque cierres), pero la paz puede ser falsa. Bajar más profundo sube el peligro y el botín. Salir asegura tu oro.</p>
            </>
          )}

          <div className="cap" style={{ marginTop: 18 }}>Características {pointsRef.current > 0 && <span className="tag">{pointsRef.current} pts</span>}</div>
          <div className="campblock"><StatsInline player={wp} points={pointsRef.current} onSpend={campSpend} /></div>

          <div className="cap" style={{ marginTop: 16 }}>Inventario</div>
          <div className="campblock"><InventoryInline player={wp} inventory={invRef.current} onEquip={campEquip} /></div>
        </div>
      )}

      {phase === "result" && (
        <div className="panel">
          <div className="cap">{outcome === "won" ? "Saliste de la cripta" : "Caíste en la cripta"}</div>
          {outcome === "won" ? (
            <><p className="clearmsg">Regresas al refugio con vida.</p><div className="banner ok">◈ {runGold} oro asegurado</div></>
          ) : (
            <>
              <p className="clearmsg">Caíste en la etapa {stage}, sala {roomInStage + 1}.</p>
              <div className="banner bad">Perdiste ◈ {runGold} oro de la bajada.</div>
              {newCargado.current && (
                <div className="cargadograd">
                  <b>☠ {newCargado.current.creature.name}</b> nació de entre tus verdugos como némesis.
                  <div className="soft">Se llevó ◈ {newCargado.current.gold}{newCargado.current.weapon ? ` y tu ${newCargado.current.weapon.name}` : ""}. Acechará tus próximas bajadas.</div>
                </div>
              )}
            </>
          )}
          <div className="actions" style={{ marginTop: 14 }}>
            <button className="primary" onClick={finish}>Volver al refugio</button>
          </div>
        </div>
      )}
    </div>
  );
}
