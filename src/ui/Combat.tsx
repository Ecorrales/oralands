import { useEffect, useReducer, useRef } from "react";
import { t, tName, abilityName, abilityDesc } from "../game/i18n";
import {
  resolveAbility, getAbility, regenEnergy, isDead, diceroll, mitigate, effectiveCharacteristics, hitChanceTuned,
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
const KIND_ES: Record<string, string> = { undead: t("kind.undead"), rodent: t("kind.rodent"), beast: t("kind.beast") };
const avgDice = (spec: string): number => { const m = /^(\d+)d(\d+)$/.exec((spec ?? "").trim()); return m ? +m[1] * (+m[2] + 1) / 2 : 0; };
const pillClass = (m: Modifier) => m.kind === "skip" ? "stun" : m.kind === "stat" ? "debuff" : "dot";
const movesOf = (c: Creature): AbilitySpec[] => {
  const ids = [...(c.weapon.abilities ?? ["smash"]), ...(c.grantedAbilities ?? [])];
  const uniq = ids.filter((id, i) => ids.indexOf(id) === i);
  return uniq.map(getAbility).filter(Boolean) as AbilitySpec[];
};
// Elige la habilidad a usar.
//  - nemesis=false (o sin enviar): comportamiento de siempre — el golpe más caro que pueda pagar (codicioso/tonto).
//  - nemesis=true (requiere target): comportamiento INTELIGENTE — daño esperado (acierto × daño),
//    remata si un golpe puede matar, y roba turno con aturdir.
const bestAffordable = (c: Creature, pool: number, nemesis = false, target?: Creature): AbilitySpec | null => {
  const affordable = movesOf(c).filter((a) => a.energyCost <= pool);
  if (!affordable.length) return null;

  if (!nemesis || !target) {
    // modo tonto: el más caro disponible
    return affordable.reduce((best, a) => (a.energyCost > best.energyCost ? a : best));
  }

  // modo listo (némesis)
  const eff = effectiveCharacteristics(c);
  const teff = effectiveCharacteristics(target);
  const estAcc = eff.intelligence * (2 * eff.dexterity + 1) + avgDice(c.weapon.accuracy);
  const estEva = Math.max(0, teff.dexterity * 3.5 + (target.evasionBonus ?? 0));
  const avgWr = avgDice(c.weapon.damage);
  const targetStunned = target.modifiers.some((m) => m.kind === "skip");

  const rows = affordable.map((ab) => {
    const hit = Math.min(97, Math.max(5, hitChanceTuned(estAcc, estEva) + (ab.accMod ?? 0))) / 100;
    const raw = Math.round(ab.damage(eff, target, avgWr) * (ab.dmgMod ?? 1));
    const dealt = mitigate(raw, target.defense ?? 0);
    const stun = ab.effect && ab.effect.name === "knockdown"
      ? Math.min(100, Math.max(0, ab.effect.chance(eff, target))) / 100 : 0;
    return { ab, hit, dealt, stun, expected: hit * dealt };
  });
  const maxExp = Math.max(...rows.map((r) => r.expected), 1);

  const scored = rows.map((r) => {
    // Rematador: si el golpe puede MATAR, domina; entre letales gana el de mayor prob. de acertar.
    if (r.dealt >= target.hp) return { ab: r.ab, score: 100000 + r.hit * 1000 };
    // Daño esperado + bono de tempo por aturdir (solo si el jugador NO está ya aturdido).
    const tempo = targetStunned ? 0 : r.stun * maxExp * 0.7;
    return { ab: r.ab, score: r.expected + tempo };
  });
  return scored.reduce((best, s) => (s.score > best.score ? s : best)).ab;
};

export function Combat({ player, enemies, potions, openWith, onEnd }: {
  player: Creature; enemies: Creature[]; potions: number;
  openWith?: "player" | "enemy";
  onEnd: (r: { survived: boolean; player: Creature; potions: number }) => void;
}) {
  const [, force] = useReducer((x) => x + 1, 0);
  const floatId = useRef(0);
  const enemiesOpenRef = useRef(false);
  const b = useRef<Battle>(null!);

  if (b.current === null) {
    const p: Creature = { ...player, modifiers: [] as Modifier[] };
    const es: Creature[] = enemies.map((e) => ({ ...e, modifiers: [] as Modifier[], energy: e.maxEnergy }));
    const maxE = Math.max(...es.map((e) => e.maxEnergy));
    const groupMax = maxE + (es.length - 1);
    // iniciativa: si viene decidida (némesis, por su ritual 1d20) se respeta; si no, 1d6 vs 1d6
    const d6 = () => 1 + Math.floor(Math.random() * 6);
    const enemiesOpen = openWith ? openWith === "enemy" : d6() > d6();
    b.current = {
      player: p, enemies: es, target: 0, potions,
      groupEnergy: groupMax, groupMaxEnergy: groupMax, groupRegen: Math.max(...es.map((e) => e.regen)),
      turnPtr: 0, skip: new Set(), guard: 0,
      phase: enemiesOpen ? "busy" : "player", log: [], floats: [],
      shakePlayer: false, flashPlayer: false, shake: es.map(() => false), flash: es.map(() => false),
    };
    const names = es.map((e) => tName(e.name)).join(", ");
    b.current.log.push({ text: es.length > 1 ? t("combat.surround", { n: es.length, names }) : t("combat.appears", { names }), color: "var(--dim)" });
    if (enemiesOpen && !openWith) b.current.log.push({ text: t("combat.enemiesFirst"), color: "var(--danger)" });
    enemiesOpenRef.current = enemiesOpen;
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
  const ageMods = (c: Creature) => { if (!Array.isArray(c.modifiers)) c.modifiers = []; c.modifiers.forEach((m) => m.duration--); c.modifiers = c.modifiers.filter((m) => m.duration > 0); };
  const tickDots = (c: Creature, who: Who) => {
    for (const m of c.modifiers ?? []) {
      if (m.kind !== "dot") continue;
      const dmg = m.dotSpec ? diceroll(m.dotSpec) : (m.dmg ?? 0);
      if (dmg > 0) { c.hp = Math.max(0, c.hp - dmg); spawnFloat(who, "-" + dmg, "#e8635a"); doShake(who); pushLog(t("combat.log.suffer", { name: tName(c.name), effect: tName(m.label), dmg }), "var(--danger)"); }
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
    if (!r.hit) { pushLog(t("combat.log.miss", { name: s.player.name, ability: abilityName(ab.id), chance: r.chance }), "var(--muted)"); force(); return; }
    const dealt = mitigate(r.damage, tgt.defense ?? 0);
    tgt.hp = Math.max(0, tgt.hp - dealt);
    doShake(ti); spawnFloat(ti, "-" + dealt, "#e8635a");
    pushLog(t("combat.log.playerHit", { name: s.player.name, ability: abilityName(ab.id), chance: r.chance, dmg: dealt, target: tName(tgt.name) }), "var(--accent)");
    if (r.modifiers.length && tgt.hp > 0) { tgt.modifiers.push(...r.modifiers); pushLog(t("combat.log.effectOn", { effect: tName(r.effect!.label), chance: r.effect!.chance, target: tName(tgt.name) }), "var(--warn)"); }
    if (isDead(tgt)) { pushLog(t("combat.log.defeated", { name: tName(tgt.name) }), "var(--success)"); if (allDead()) return endGame(true); s.target = firstAlive(); }
    force();
  }
  function usePotion() {
    const s = b.current;
    if (s.phase !== "player" || s.potions <= 0 || s.player.hp >= s.player.maxHp || s.player.energy < POTION_COST) return;
    s.potions -= 1; s.player.energy -= POTION_COST;
    const heal = Math.round(s.player.maxHp * POTION_HEAL_FRACTION);
    s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal);
    spawnFloat("player", "+" + heal, "#7fae5a"); pushLog(t("combat.log.potion", { name: s.player.name, heal }), "var(--success)");
    force();
  }
  function endTurn() { const s = b.current; if (s.phase !== "player") return; ageMods(s.player); s.phase = "busy"; force(); setTimeout(enemyTurn, 400); }

  /** Red de seguridad: si el turno enemigo lanza un error, no dejamos el combate
   *  congelado en "busy" — devolvemos el control al jugador y lo registramos. */
  function recoverToPlayer(where: string, e: unknown) {
    console.error(`combate (${where}):`, e);
    const s = b.current;
    if (!Array.isArray(s.player.modifiers)) s.player.modifiers = [];
    if (s.phase !== "over") s.phase = "player";
    force();
  }
  function enemyTurn() {
    try {
      const s = b.current; s.phase = "enemy";
      s.groupEnergy = Math.min(s.groupMaxEnergy, s.groupEnergy + s.groupRegen);
      s.enemies.forEach((e) => { if (e.nemesis && !isDead(e)) regenEnergy(e); });  // el némesis recupera su energía propia
      s.enemies.forEach((e, i) => { if (!isDead(e)) tickDots(e, i); });
      if (allDead()) { force(); return endGame(true); }
      if (isDead(s.player)) { force(); return endGame(false); }
      s.skip = new Set();
      s.enemies.forEach((e, i) => { if (!isDead(e) && consumeSkip(e)) { s.skip.add(i); pushLog(t("combat.log.stunnedAction", { name: tName(e.name) }), "var(--warn)"); } });
      s.turnPtr = 0; s.guard = 0;
      force(); setTimeout(stepGroup, 500);
    } catch (e) { recoverToPlayer("enemyTurn", e); }
  }
  function stepGroup() {
   try {
    const s = b.current;
    if (isDead(s.player)) { force(); return endGame(false); }
    if (allDead()) { force(); return endGame(true); }
    if (++s.guard > 50) return groupDone();
    const n = s.enemies.length;
    let actor = -1; let ability: AbilitySpec | null = null;
    for (let k = 0; k < n; k++) {
      const idx = (s.turnPtr + k) % n; const e = s.enemies[idx];
      if (isDead(e) || s.skip.has(idx)) continue;
      const pool = e.nemesis ? e.energy : s.groupEnergy;   // el némesis usa SU energía; los demás, el pool del grupo
      const ab = bestAffordable(e, pool, e.nemesis, s.player);
      if (ab) { actor = idx; ability = ab; break; }
    }
    if (actor < 0 || !ability) return groupDone();
    const e = s.enemies[actor];
    const isNem = !!e.nemesis;
    if (isNem) e.energy -= ability.energyCost; else s.groupEnergy -= ability.energyCost;
    const r = resolveAbility(ability, e, s.player, DEFAULT_TUNE);
    const chains = isNem && !!bestAffordable(e, e.energy);   // ¿le queda energía para otro golpe?
    const doneNow = () => { s.skip.add(actor); s.turnPtr = (actor + 1) % n; };
    if (!r.hit) {
      pushLog(t("combat.log.miss", { name: tName(e.name), ability: abilityName(ability.id), chance: r.chance }), "var(--muted)");
      if (!chains) doneNow();
      force(); setTimeout(stepGroup, chains ? 480 : 650); return;
    }
    const dealt = mitigate(r.damage, s.player.defense ?? 0);
    s.player.hp = Math.max(0, s.player.hp - dealt);
    doShake("player"); spawnFloat("player", "-" + dealt, "#e8635a");
    const neg = r.damage - dealt;
    pushLog(t("combat.log.enemyHit", { name: tName(e.name), ability: abilityName(ability.id), chance: r.chance, dmg: dealt, def: neg > 0 ? t("combat.log.byDefense", { n: neg }) : "" }), "var(--danger)");
    if (r.modifiers.length && s.player.hp > 0) { s.player.modifiers.push(...r.modifiers); pushLog(t("combat.log.effectOnPlayer", { effect: tName(r.effect!.label), name: s.player.name }), "var(--warn)"); }
    if (isDead(s.player)) { force(); return endGame(false); }
    const keepChaining = chains && s.player.hp > 0;
    if (!keepChaining) doneNow();   // si encadena, NO se marca skip: la próxima iteración lo vuelve a elegir
    force(); setTimeout(stepGroup, keepChaining ? 480 : 700);
   } catch (e) { recoverToPlayer("stepGroup", e); }
  }
  function groupDone() { const s = b.current; s.enemies.forEach((e) => { if (!isDead(e)) ageMods(e); }); endEnemy(); }
  function endEnemy() { if (isDead(b.current.player)) return endGame(false); startPlayerTurn(); }
  function playerCanAct(): boolean {
    const s = b.current;
    const ability = bestAffordable(s.player, s.player.energy) !== null;
    const potion = s.potions > 0 && s.player.hp < s.player.maxHp && s.player.energy >= POTION_COST;
    return ability || potion;
  }
  function startPlayerTurn() {
   try {
    const s = b.current;
    regenEnergy(s.player);
    tickDots(s.player, "player");
    if (isDead(s.player)) { force(); return endGame(false); }
    if (consumeSkip(s.player)) { pushLog(t("combat.log.stunnedTurn", { name: s.player.name }), "var(--warn)"); ageMods(s.player); s.phase = "busy"; force(); setTimeout(enemyTurn, 800); return; }
    if (isDead(s.enemies[s.target])) s.target = firstAlive();
    if (!playerCanAct()) {
      pushLog(t("combat.log.noEnergy", { name: s.player.name }), "var(--muted)");
      ageMods(s.player); s.phase = "busy"; force(); setTimeout(enemyTurn, 900); return;
    }
    s.phase = "player"; force();
   } catch (e) { recoverToPlayer("startPlayerTurn", e); }
  }
  function endGame(win: boolean) { b.current.phase = "over"; pushLog(win ? t("combat.groupDefeated") : t("combat.playerFalls", { name: b.current.player.name }), win ? "var(--success)" : "var(--danger)"); force(); }

  useEffect(() => {
    const s = b.current;
    if (enemiesOpenRef.current && s.phase === "busy") {
      // los enemigos ganaron la iniciativa: abren el combate
      setTimeout(enemyTurn, 700);
      return;
    }
    if (s.phase === "player" && !playerCanAct()) {
      pushLog(t("combat.log.noEnergy", { name: s.player.name }), "var(--muted)");
      ageMods(s.player); s.phase = "busy"; force(); setTimeout(enemyTurn, 900);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const s = b.current;
  const canAct = s.phase === "player";
  const moves = movesOf(s.player);
  const playerFloat = s.floats.find((f) => f.who === "player");

  return (
    <div className="panel combat">
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
              <div className="nm">{tName(e.name)}</div>
              <div className="mt">Nv {e.level} · {KIND_ES[enemyKind(e)]}</div>
              <div className="bar"><div style={{ width: Math.max(0, e.hp / e.maxHp * 100) + "%", background: "var(--hp)" }} /></div>
              <div className="hpt">{Math.max(0, Math.round(e.hp))} / {e.maxHp}</div>
              <div className="mods">{e.modifiers.map((m, j) => <span key={j} className={"pill " + pillClass(m)}>{tName(m.label)} {m.duration}t</span>)}</div>
            </div>
          );
        })}
      </div>

      <div className={"hero" + (s.shakePlayer ? " shake" : "")}>
        {s.flashPlayer && <div className="flashfx" />}
        {playerFloat && <div className="dmg" key={playerFloat.id} style={{ right: 12, left: "auto", color: playerFloat.color }}>{playerFloat.text}</div>}
        <div className="rw"><b>{s.player.name}</b><span>{Math.max(0, Math.round(s.player.hp))} / {s.player.maxHp}</span></div>
        <div className="bar"><div style={{ width: Math.max(0, s.player.hp / s.player.maxHp * 100) + "%", background: s.player.hp / s.player.maxHp < 0.2 ? "var(--danger)" : "var(--php)" }} /></div>
        <div className="rw" style={{ marginTop: 6 }}><span style={{ fontSize: 11 }}>{t("common.energyLbl")}</span><span>{s.player.energy} / {s.player.maxEnergy} ⚡</span></div>
        <div className="bar" style={{ height: 6 }}><div style={{ width: Math.max(0, s.player.energy / s.player.maxEnergy * 100) + "%", background: "var(--energy)" }} /></div>
        <div className="mods">{s.player.modifiers.map((m, i) => <span key={i} className={"pill " + pillClass(m)}>{tName(m.label)} {m.duration}t</span>)}</div>
      </div>

      <div className="log">{s.log.map((l, i) => <p key={i} style={{ color: l.color }}>{l.text}</p>)}</div>

      <div className="actions">
        {s.phase !== "over" ? (
          <>
            {(() => {
              const eff = effectiveCharacteristics(s.player);
              const avgWr = avgDice(s.player.weapon.damage);
              const tgt = s.enemies[aliveTarget(s.target)] ?? s.enemies[0];
              const estAcc = eff.intelligence * (2 * eff.dexterity + 1) + avgDice(s.player.weapon.accuracy);
              const teff = tgt ? effectiveCharacteristics(tgt) : null;
              const estEva = teff ? Math.max(0, teff.dexterity * 3.5 + (tgt.evasionBonus ?? 0)) : 0;
              return moves.map((ab) => {
                const raw = tgt ? Math.round(ab.damage(eff, tgt, avgWr) * (ab.dmgMod ?? 1)) : 0;
                const dealt = tgt ? mitigate(raw, tgt.defense ?? 0) : raw;
                const effPct = ab.effect && tgt ? Math.round(ab.effect.chance(eff, tgt)) : 0;
                const estHit = Math.round(Math.min(97, Math.max(5, hitChanceTuned(estAcc, estEva) + (ab.accMod ?? 0))));
                return (
                  <button key={ab.id} className="primary move" disabled={!canAct || s.player.energy < ab.energyCost} title={abilityDesc(ab.id)} onClick={() => useAbilityPlayer(ab)}>
                    <span className="mvtop">{abilityName(ab.id)} <span className="mvcost">{ab.energyCost}⚡</span></span>
                    <span className="mvmeta">{estHit}% · ≈{dealt}{ab.effect ? ` · ${tName(ab.effect.label)} ${effPct}%` : ""}</span>
                  </button>
                );
              });
            })()}
            {(() => {
              const usable = canAct && s.potions > 0 && s.player.hp < s.player.maxHp && s.player.energy >= POTION_COST;
              const lowHp = s.player.maxHp > 0 && s.player.hp / s.player.maxHp < 0.2;
              return (
                <button className={usable && lowHp ? "blink" : ""} disabled={!canAct || s.potions <= 0 || s.player.hp >= s.player.maxHp || s.player.energy < POTION_COST} onClick={usePotion}>⚗ {t("combat.potion")} {POTION_COST}⚡ ({s.potions})</button>
              );
            })()}
            <button disabled={!canAct} onClick={endTurn}>{t("combat.endTurn")}</button>
          </>
        ) : (
          <button className="primary" onClick={() => onEnd({ survived: !isDead(s.player), player: s.player, potions: s.potions })}>{t("common.continue")}</button>
        )}
      </div>
    </div>
  );
}
