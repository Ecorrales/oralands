import { useEffect, useReducer, useRef, useState } from "react";
import type { Creature, Characteristics } from "../engine";
import { getAbility, recomputeDerived } from "../engine";
import { makeDungeonGroup, rollRoomCount } from "../game/enemies";
import { goldForEnemy, rollWeaponDrop } from "../game/loot";
import { xpForEnemy } from "../game/progression";
import { reqMet, STAT_ES, toWeapon, type WeaponOpt } from "../game/catalog";
import { graduateCargado, pickStolenIndex, type Cargado } from "../game/cargados";
import { Combat } from "./Combat";
import { StatsInline } from "./StatsInline";
import { InventoryInline } from "./InventoryInline";

const REST_FULL_SEC = 45;
const AMBUSH_CHANCE = 0.45;
const STALKER_CHANCE = 0.4;  // prob. por sala de toparte al cargado que acecha

export interface RunResult {
  player: Creature; outcome: "won" | "dead"; runGold: number; potions: number;
  inventory: WeaponOpt[]; runXp: number; points: number;
  newCargado: Cargado | null; defeatedCargados: string[]; recoveredWeapons: WeaponOpt[];
}

type Phase = "fight" | "cleared" | "camp" | "ambush" | "result";

export function Dungeon({ player, potions, inventory, points, cargados, onExit }: {
  player: Creature; potions: number; inventory: WeaponOpt[]; points: number; cargados: Cargado[];
  onExit: (r: RunResult) => void;
}) {
  const [, force] = useReducer((x) => x + 1, 0);
  const [stage, setStage] = useState(1);
  const [stageRooms, setStageRooms] = useState(() => rollRoomCount());
  const [roomInStage, setRoomInStage] = useState(0);
  const depth = useRef(0);
  const [group, setGroup] = useState<Creature[]>(() => makeDungeonGroup(0, 1));
  const [fightingCargado, setFightingCargado] = useState<Cargado | null>(null);
  const [phase, setPhase] = useState<Phase>("fight");
  const [outcome, setOutcome] = useState<"won" | "dead">("won");
  const [runGold, setRunGold] = useState(0);
  const [roomGold, setRoomGold] = useState(0);
  const [drop, setDrop] = useState<WeaponOpt | null>(null);
  const [picked, setPicked] = useState(false);
  const [equipped, setEquipped] = useState(false);
  const [resting, setResting] = useState(false);
  const [ambushGroup, setAmbushGroup] = useState<Creature[] | null>(null);
  const [stalkerPending, setStalkerPending] = useState(cargados.length > 0);

  const working = useRef<Creature>({ ...player, hp: player.maxHp, energy: player.maxEnergy, modifiers: [] });
  const potionsRef = useRef(potions);
  const invRef = useRef<WeaponOpt[]>([...inventory]);
  const runXp = useRef(0);
  const pointsRef = useRef(points);
  const campStart = useRef(0);
  const hpAtCamp = useRef(0);
  const ambushAt = useRef<number | null>(null);
  const stalker = useRef<Cargado | null>(cargados.length ? cargados[Math.floor(Math.random() * cargados.length)] : null);
  const newCargado = useRef<Cargado | null>(null);
  const defeated = useRef<string[]>([]);
  const recovered = useRef<WeaponOpt[]>([]);

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

  /** Genera la siguiente pelea: puede ser el cargado que acecha (al azar) o un grupo normal. */
  function nextFight(d: number, st: number): { enemies: Creature[]; cargado: Cargado | null } {
    if (stalker.current && Math.random() < STALKER_CHANCE) {
      const c = stalker.current; stalker.current = null; setStalkerPending(false);
      return { enemies: [{ ...c.creature, modifiers: [] }], cargado: c };
    }
    return { enemies: makeDungeonGroup(d, st), cargado: null };
  }

  function awardKill(count: number) {
    let g = 0;
    for (let i = 0; i < count; i++) { g += goldForEnemy(depth.current); runXp.current += xpForEnemy(depth.current); }
    setRoomGold(g); setRunGold((x) => x + g);
  }
  function onDeath(killers: Creature[], cargadoFight: boolean) {
    if (!cargadoFight) {
      const eqId = working.current.weapon.id ?? "";
      const idx = pickStolenIndex(invRef.current, eqId);
      let stolen: WeaponOpt | null = null;
      if (idx >= 0) { stolen = invRef.current[idx]; invRef.current = invRef.current.slice(0, idx).concat(invRef.current.slice(idx + 1)); }
      newCargado.current = graduateCargado(killers, runGold, stolen);
    }
    setOutcome("dead"); setPhase("result");
  }
  function defeatCargado(c: Cargado) {
    defeated.current.push(c.id);
    if (c.weapon) recovered.current.push(c.weapon);
    setRunGold((x) => x + c.gold);
  }
  function handleCombatEnd(res: { survived: boolean; player: Creature; potions: number }) {
    working.current = res.player; potionsRef.current = res.potions;
    const wasCargado = fightingCargado;
    if (!res.survived) { onDeath(group, !!wasCargado); return; }
    if (wasCargado) { defeatCargado(wasCargado); setFightingCargado(null); awardKill(1); }
    else awardKill(group.length);
    setDrop(rollWeaponDrop(depth.current)); setPicked(false); setEquipped(false);
    setPhase("cleared");
  }
  function handleAmbushEnd(res: { survived: boolean; player: Creature; potions: number }) {
    working.current = res.player; potionsRef.current = res.potions;
    if (!res.survived) { onDeath(ambushGroup ?? [], false); return; }
    awardKill(ambushGroup?.length ?? 1); setAmbushGroup(null); setPhase("camp");
  }
  function addToBag(d: WeaponOpt) { invRef.current = [...invRef.current, d]; }
  function pickUp(d: WeaponOpt) { addToBag(d); setPicked(true); }
  function equipDrop(d: WeaponOpt) { addToBag(d); working.current = { ...working.current, weapon: toWeapon(d) }; setPicked(true); setEquipped(true); }

  function advance() {
    depth.current += 1; setRoomInStage((r) => r + 1);
    working.current = { ...working.current, energy: working.current.maxEnergy };
    const nf = nextFight(depth.current, stage); setGroup(nf.enemies); setFightingCargado(nf.cargado); setPhase("fight");
  }
  function goCamp() { setPhase("camp"); }
  function startRest() {
    hpAtCamp.current = working.current.hp; campStart.current = Date.now();
    ambushAt.current = Math.random() < AMBUSH_CHANCE ? 4 + Math.random() * (REST_FULL_SEC * 0.7) : null;
    setResting(true);
  }
  function breakCamp() { setResting(false); }
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
  }
  function campEquip(w: WeaponOpt) { working.current = { ...working.current, weapon: toWeapon(w) }; force(); }
  function leaveDungeon() { setResting(false); setOutcome("won"); setPhase("result"); }
  function finish() {
    onExit({
      player: wp, outcome, runGold, potions: potionsRef.current, inventory: invRef.current,
      runXp: runXp.current, points: pointsRef.current,
      newCargado: newCargado.current, defeatedCargados: defeated.current, recoveredWeapons: recovered.current,
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
        <span className="goldmini">◈ {runGold} <span className="soft">sin asegurar</span> · ⚗ {potionsRef.current}</span>
      </div>
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
          <div className="ambushbanner">¡Emboscada! Te descubrieron mientras acampabas.</div>
          <Combat key={`a${stage}r${roomInStage}`} player={wp} enemies={ambushGroup} potions={potionsRef.current} onEnd={handleAmbushEnd} />
        </>
      )}

      {phase === "cleared" && (
        <div className="panel">
          <div className="cap">Sala despejada</div>
          <div className="loot">
            <div className="lootgold">◈ +{roomGold} oro</div>
            {drop ? (
              <div className={"dropcard" + (picked ? " done" : "")}>
                <div className="dropinfo"><b>{drop.name}</b><small>daño {drop.damage} · {moveText(drop.abilities)}</small></div>
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
          <div className="bar" style={{ margin: "12px 0 4px" }}><div style={{ width: hpBar(wp), background: "var(--php)" }} /></div>
          <div className="hprest">{Math.max(0, Math.round(wp.hp))} / {wp.maxHp} ♥ <span className="soft">— no se cura entre salas</span></div>
          <div className="actions" style={{ marginTop: 14 }}>
            {isLastOfStage
              ? <button className="primary" onClick={goCamp}>Llegar al campamento</button>
              : <button className="primary" onClick={advance}>Avanzar a la sala {roomInStage + 2}</button>}
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
