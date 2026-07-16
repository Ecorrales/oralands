import { useEffect, useRef, useState } from "react";
import { t, tName } from "../game/i18n";
import type { Cargado } from "../game/cargados";

type Mode = "born" | "ascended";

/** Ritual de pantalla completa: nace un némesis (moriste) o asciende (te volvió a ganar). */
export function NemesisRitual({ cargado, mode, onDone }: {
  cargado: Cargado; mode: Mode; onDone: () => void;
}) {
  const [step, setStep] = useState(0);   // controla la cascada de elementos
  const [leaving, setLeaving] = useState(false);
  const timers = useRef<number[]>([]);
  const name = tName(cargado.creature.name);
  const level = cargado.creature.level;
  const kind = tName(cargado.kindLabel);
  const weapon = cargado.weapon ? tName(cargado.weapon.name) : null;
  const gold = cargado.gold;

  useEffect(() => {
    const seq = mode === "born"
      ? [500, 1600, 2500, 3400, 4200, 5000]   // fell, rune, rises, name, meta/warn, button
      : [400, 1100, 2000, 3000];              // returns, name, grown, button
    seq.forEach((ms, i) => { timers.current.push(window.setTimeout(() => setStep(i + 1), ms)); });
    return () => { timers.current.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => { setLeaving(true); setTimeout(onDone, 300); };
  const shown = (n: number) => (step >= n ? " in" : "");

  // nombre por palabras (para que no se parta en el salto de línea)
  const words = name.split(" ");
  let li = 0;

  return (
    <div className={"nemesis-ritual" + (mode === "ascended" ? " ascend" : "") + (leaving ? " leaving" : "")}>
      <div className="nr-stage">
        {mode === "born" ? (
          <>
            <div className={"nr-fell" + shown(1)}>{t("ritual.fell")}</div>
            <div className={"nr-rune" + shown(2)}>☠</div>
            <div className={"nr-rises" + shown(3)}>{t("ritual.rises")}</div>
            <div className="nr-name">
              {step >= 4 && words.map((w, wi) => (
                <span className="nr-word" key={wi}>
                  {[...w].map((c, ci) => {
                    const d = li++ * 0.045;
                    return <span className="nr-ch" key={ci} style={{ animationDelay: d + "s" }}>{c}</span>;
                  })}
                </span>
              ))}
            </div>
            <div className={"nr-title" + shown(5)}>
              — {weapon ? t("ritual.bornTitle", { kind, weapon }) : t("ritual.bornTitleNoWeapon", { kind })} —
            </div>
            <div className={"nr-meta" + shown(5)}>{t("common.lvAbbr")} <b>{level}</b> · {kind}</div>
            <div className={"nr-warn" + shown(5)}>
              {weapon ? t("ritual.bornWarn", { weapon, gold }) : t("ritual.bornWarnNoWeapon", { gold })}<br />
              {t("ritual.reclaim")}
            </div>
            <button className={"nr-go" + shown(6)} onClick={finish}>{t("ritual.acceptEnemy")}</button>
          </>
        ) : (
          <>
            <div className={"nr-rune" + shown(1)}>☠</div>
            <div className="nr-name">
              {step >= 2 && words.map((w, wi) => (
                <span className="nr-word" key={wi}>
                  {[...w].map((c, ci) => {
                    const d = li++ * 0.045;
                    return <span className="nr-ch" key={ci} style={{ animationDelay: d + "s" }}>{c}</span>;
                  })}
                </span>
              ))}
            </div>
            <div className={"nr-returns" + shown(3)}>{t("ritual.ascendReturns")}</div>
            <div className={"nr-grown" + shown(3)}>{t("ritual.ascendGrown", { n: level })}</div>
            <button className={"nr-go" + shown(4)} onClick={finish}>{t("ritual.face")}</button>
          </>
        )}
      </div>
    </div>
  );
}
