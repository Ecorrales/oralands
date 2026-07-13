import { useReducer, useRef } from "react";
import {
  resolveAbility, getAbility, regenEnergy, isDead, diceroll,
  DEFAULT_TUNE, type Creature, type Modifier, type AbilitySpec,
} from "../engine";
import { POTION_HEAL_FRACTION, POTION_COST } from "../game/catalog";
import { EnemySprite } from "./EnemySprite";
import { enemyKind } from "../game/enemies";

type Who = number | "player";
interface FloatFx { id: number; who: Who; text: string; color: string; }
interface Battle {
  player: Creature; enemies: Creature[]; target: number; potions: number;
  groupEnergy: number; groupMaxEnergy: number; groupRegen: number;
  turnPtr: number; skip: Set<number>; guard: number;
  phase: "player" | "busy" | "enemy" | "over";
  log: { text: string; color: string }[];
  floats: FloatFx[];
  shakePlayer: boolean; flashPlayer: boolean;
  shake: boolean[]; flash: boolean[];
}
const KIND_ES: Record<string, string> = { undead: "no-muerto", rodent: "alimaña", beast: "bestia" };
const pillClass = (m: Modifier) => m.kind === "skip" ? "stun" : m.kind === "stat" ? "debuff" : "dot";
const movesOf = (c: Creature): AbilitySpec[] => (c.weapon.abilities ?? ["smash"]).map(getAbility).filter(Boolean) as AbilitySpec[];
const bestAffordable = (c: Creature, pool: number): AbilitySpec | null => {
  const ok = movesOf(c).filter((a) => a.energyCost <= pool);
  return ok.length ? ok.reduce((best, a) => (a.energyCost > best.energyCost ? a : best)) : null;
};

export function Combat({ player, enemies, potions, onEnd }: {
  player: Creature; enemies: Creature[]; potions: number;
  onEnd: (r: { survived: boolean; player: Creature; potions: number }) => void;
}) {
  const [, force] = useReducer((x) => x + 1, 0);
  const floatId = useRef(0);
  const b = useRef<Battle>(null!);

  if (b.current === null) {
    const p: Creature = { ...player, modifiers: [] as Modifier[] };
    const es: Creature[] = enemies.map((e) => ({ ...e, modifiers: [] as Modifier[] }));
    const maxE = Math.max(...es.map((e) => e.maxEnergy));
    const groupMax = maxE + (es.length - 1);
    b.current = {
      player: p, enemies: es, target: 0, potions,
      groupEnergy: groupMax, groupMaxEnergy: groupMax, groupRegen: Math.max(...es.map((e) => e.regen)),
      turnPtr: 0, skip: new Set(), guard: 0,
      phase: "player", log: [], floats: [],
      shakePlayer: false, flashPlayer: false, shake: es.map(() => false), flash: es.map(() => false),
    };
    const names = es.map((e) => e.name).join(", ");
    b.current.log.push({ text: es.length > 1 ? `Te rodean ${es.length}: ${names}.` : `Aparece ${names}.`, color: "var(--dim)" });
  }

  const pushLog = (text: string, color: string) => { const l = b.current.log; l.push({ text, color }); if (l.length > 7) l.shift(); };
  const spawnFloat = (who: Who, text: string, color: string) => {
    const id = ++floatId.current; b.current.floats.push({ id, who, text, color });
    setTimeout(() => { b.current.floats = b.current.floats.filter((f) => f.id !== id); force(); }, 950);
  };
  const doShake = (who: Who) => {
    const s = b.current;
    if (who === "player") { s.shakePlayer = true; s.flashPlayer = true; } else { s.shake[who] = true; s.flash[who] = true; }
    force();
    setTimeout(() => { if (who === "player") { s.shakePlayer = false; s.flashPlayer = false; } else { s.shake[who] = false; s.flash[who] = false; } force(); }, 450);
  };
  const consumeSkip = (c: Creature): boolean => { const i = c.modifiers.findIndex((m) => m.kind === "skip"); if (i >= 0) { c.modifiers.splice(i, 1); return true; } return false; };
  const ageMods = (c: Creature) => { c.modifiers.forEach((m) => m.duration--); c.modifiers = c.modifiers.filter((m) => m.duration > 0); };
  const tickDots = (c: Creature, who: Who) => {
    for (const m of c.modifiers) {
      if (m.kind !== "dot") continue;
      const dmg = m.dotSpec ? diceroll(m.dotSpec) : (m.dmg ?? 0);
      if (dmg > 0) { c.hp = Math.max(0, c.hp - dmg); spawnFloat(who, "-" + dmg, "#e8635a"); doShake(who); pushLog(`${c.name} sufre ${m.label} — ${dmg}.`, "var(--danger)"); }
    }
  };
  const allDead = () => b.current.enemies.every(isDead);
  const firstAlive = () => b.current.enemies.findIndex((e) => !isDead(e));
  const aliveTarget = (i: number) => (!isDead(b.current.enemies[i]) ? i : firstAlive());

  function selectTarget(i: number) { const s = b.current; if (s.phase === "player" && !isDead(s.enemies[i])) { s.target = i; force(); } }
  function useAbilityPlayer(ab: AbilitySpec) {
    const s = b.current;
    if (s.phase !== "player" || s.player.energy < ab.energyCost) return;
    const ti = aliveTarget(s.target);
    if (ti < 0) return;
    s.player.energy -= ab.energyCost;
    const tgt = s.enemies[ti];
    const r = resolveAbility(ab, s.player, tgt, DEFAULT_TUNE);
    if (!r.hit) { pushLog(`${s.player.name} usa ${ab.name} (${r.chance}%) pero falla.`, "var(--muted)"); force(); return; }
    tgt.hp = Math.max(0, tgt.hp - r.damage);
    doShake(ti); spawnFloat(ti, "-" + r.damage, "#e8635a");
    pushLog(`${s.player.name} usa ${ab.name} (${r.chance}%) — ${r.damage} a ${tgt.name}.`, "var(--accent)");
    if (r.modifiers.length && tgt.hp > 0) { tgt.modifiers.push(...r.modifiers); pushLog(`¡${r.effect!.label}! (${r.effect!.chance}%) sobre ${tgt.name}.`, "var(--warn)"); }
    if (isDead(tgt)) { pushLog(`¡${tgt.name} derrotado!`, "var(--success)"); if (allDead()) return endGame(true); s.target = firstAlive(); }
    force();
  }
  function usePotion() {
    const s = b.current;
    if (s.phase !== "player" || s.potions <= 0 || s.player.hp >= s.player.maxHp || s.player.energy < POTION_COST) return;
    s.potions -= 1; s.player.energy -= POTION_COST;
    const heal = Math.round(s.player.maxHp * POTION_HEAL_FRACTION);
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
    spawnFloat("player", "+" + heal, "#7fae5a"); pushLog(`${s.player.name} bebe una poción — +${heal} de vida.`, "var(--success)");
    force();
  }
  function endTurn() { const s = b.current; if (s.phase !== "player") return; ageMods(s.player); s.phase = "busy"; force(); setTimeout(enemyTurn, 400); }

  function enemyTurn() {
    const s = b.current; s.phase = "enemy";
    s.groupEnergy = Math.min(s.groupMaxEnergy, s.groupEnergy + s.groupRegen);
    s.enemies.forEach((e, i) => { if (!isDead(e)) tickDots(e, i); });
    if (allDead()) { force(); return endGame(true); }
    if (isDead(s.player)) { force(); return endGame(false); }
    s.skip = new Set();
    s.enemies.forEach((e, i) => { if (!isDead(e) && consumeSkip(e)) { s.skip.add(i); pushLog(`${e.name} aturdido, pierde su acción.`, "var(--warn)"); } });
    s.turnPtr = 0; s.guard = 0;
    force(); setTimeout(stepGroup, 500);
  }
  function stepGroup() {
    const s = b.current;
    if (isDead(s.player)) { force(); return endGame(false); }
    if (allDead()) { force(); return endGame(true); }
    if (++s.guard > 24) return groupDone();
    const n = s.enemies.length;
    let actor = -1; let ability: AbilitySpec | null = null;
    for (let k = 0; k < n; k++) {
      const idx = (s.turnPtr + k) % n; const e = s.enemies[idx];
      if (isDead(e) || s.skip.has(idx)) continue;
      const ab = bestAffordable(e, s.groupEnergy);
      if (ab) { actor = idx; ability = ab; break; }
    }
    if (actor < 0 || !ability) return groupDone();
    s.turnPtr = (actor + 1) % n; s.skip.add(actor);
    const e = s.enemies[actor];
    s.groupEnergy -= ability.energyCost;
    const r = resolveAbility(ability, e, s.player, DEFAULT_TUNE);
    if (!r.hit) { pushLog(`${e.name} usa ${ability.name} (${r.chance}%) pero falla.`, "var(--muted)"); force(); setTimeout(stepGroup, 650); return; }
    s.player.hp = Math.max(0, s.player.hp - r.damage);
    doShake("player"); spawnFloat("player", "-" + r.damage, "#e8635a");
    pushLog(`${e.name} usa ${ability.name} (${r.chance}%) — ${r.damage}.`, "var(--danger)");
    if (r.modifiers.length && s.player.hp > 0) { s.player.modifiers.push(...r.modifiers); pushLog(`¡${r.effect!.label}! sobre ${s.player.name}.`, "var(--warn)"); }
    if (isDead(s.player)) { force(); return endGame(false); }
    force(); setTimeout(stepGroup, 700);
  }
  function groupDone() { const s = b.current; s.enemies.forEach((e) => { if (!isDead(e)) ageMods(e); }); endEnemy(); }
  function endEnemy() { if (isDead(b.current.player)) return endGame(false); startPlayerTurn(); }
  function startPlayerTurn() {
    const s = b.current;
    regenEnergy(s.player);
    tickDots(s.player, "player");
    if (isDead(s.player)) { force(); return endGame(false); }
    if (consumeSkip(s.player)) { pushLog(`${s.player.name} aturdido, pierde el turno.`, "var(--warn)"); ageMods(s.player); s.phase = "busy"; force(); setTimeout(enemyTurn, 800); return; }
    if (isDead(s.enemies[s.target])) s.target = firstAlive();
    s.phase = "player"; force();
  }
  function endGame(win: boolean) { b.current.phase = "over"; pushLog(win ? "¡Grupo derrotado!" : `${b.current.player.name} cae…`, win ? "var(--success)" : "var(--danger)"); force(); }

  const s = b.current;
  const canAct = s.phase === "player";
  const moves = movesOf(s.player);
  const playerFloat = s.floats.find((f) => f.who === "player");

  return (
    <div className="panel">
      {s.enemies.length > 1 && s.phase !== "over" && <div className="targethint">Toca un enemigo para apuntarle</div>}
      <div className="enemyrow">
        {s.enemies.map((e, i) => {
          const dead = isDead(e);
          const sel = i === s.target && !dead;
          const fl = s.floats.find((f) => f.who === i);
          return (
            <div key={i} className={"enemy sm" + (sel ? " sel" : "") + (dead ? " dead" : "") + (s.shake[i] ? " shake" : "")} onClick={() => selectTarget(i)}>
              {s.flash[i] && <div className="flashfx" />}
              {fl && <div className="dmg" key={fl.id} style={{ color: fl.color }}>{fl.text}</div>}
              <EnemySprite enemy={e} dead={dead} />
              <div className="nm">{e.name}</div>
              <div className="mt">Nv {e.level} · {KIND_ES[enemyKind(e)]}</div>
              <div className="bar"><div style={{ width: Math.max(0, e.hp / e.maxHp * 100) + "%", background: "var(--hp)" }} /></div>
              <div className="hpt">{Math.max(0, Math.round(e.hp))} / {e.maxHp}</div>
              <div className="mods">{e.modifiers.map((m, j) => <span key={j} className={"pill " + pillClass(m)}>{m.label} {m.duration}t</span>)}</div>
            </div>
          );
        })}
      </div>

      <div className={"hero" + (s.shakePlayer ? " shake" : "")}>
        {s.flashPlayer && <div className="flashfx" />}
        {playerFloat && <div className="dmg" key={playerFloat.id} style={{ right: 12, left: "auto", color: playerFloat.color }}>{playerFloat.text}</div>}
        <div className="rw"><b>{s.player.name}</b><span>{Math.max(0, Math.round(s.player.hp))} / {s.player.maxHp}</span></div>
        <div className="bar"><div style={{ width: Math.max(0, s.player.hp / s.player.maxHp * 100) + "%", background: "var(--php)" }} /></div>
        <div className="rw" style={{ marginTop: 6 }}><span style={{ fontSize: 11 }}>energía</span><span>{s.player.energy} / {s.player.maxEnergy} ⚡</span></div>
        <div className="bar" style={{ height: 6 }}><div style={{ width: Math.max(0, s.player.energy / s.player.maxEnergy * 100) + "%", background: "var(--energy)" }} /></div>
        <div className="mods">{s.player.modifiers.map((m, i) => <span key={i} className={"pill " + pillClass(m)}>{m.label} {m.duration}t</span>)}</div>
      </div>

      <div className="log">{s.log.map((l, i) => <p key={i} style={{ color: l.color }}>{l.text}</p>)}</div>

      <div className="actions">
        {s.phase !== "over" ? (
          <>
            {moves.map((ab) => (
              <button key={ab.id} className="primary" disabled={!canAct || s.player.energy < ab.energyCost} title={ab.desc} onClick={() => useAbilityPlayer(ab)}>
                {ab.name} ({ab.energyCost}⚡)
              </button>
            ))}
            <button disabled={!canAct || s.potions <= 0 || s.player.hp >= s.player.maxHp || s.player.energy < POTION_COST} onClick={usePotion}>⚗ Poción {POTION_COST}⚡ ({s.potions})</button>
            <button disabled={!canAct} onClick={endTurn}>Terminar turno</button>
          </>
        ) : (
          <button className="primary" onClick={() => onEnd({ survived: !isDead(s.player), player: s.player, potions: s.potions })}>Continuar</button>
        )}
      </div>
    </div>
  );
}
