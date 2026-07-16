import { useEffect, useRef, useState } from "react";
import { t, tName } from "../game/i18n";
import type { Cargado } from "../game/cargados";

const d20 = () => 1 + Math.floor(Math.random() * 20);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Ritual de iniciativa contra el némesis: 1d20 vs 1d20 (puro). El mayor abre (empate → jugador).
 *  Llama onDone(playerFirst) al terminar, y de ahí arranca la fase de combate. */
export function NemesisInitiative({ cargado, onDone }: {
  cargado: Cargado; onDone: (playerFirst: boolean) => void;
}) {
  const name = tName(cargado.creature.name);
  const [youDie, setYouDie] = useState<string>("–");
  const [foeDie, setFoeDie] = useState<string>("–");
  const [rolling, setRolling] = useState(false);
  const [verdict, setVerdict] = useState<{ text: string; foe: boolean } | null>(null);
  const [showBtn, setShowBtn] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const result = useRef<boolean>(true);
  const alive = useRef(true);

  useEffect(() => {
    (async () => {
      await sleep(1300);                    // deja entrar el nombre + etiqueta
      const rYou = d20(), rFoe = d20();
      result.current = !(rFoe > rYou);      // empate → jugador abre
      setRolling(true);
      const start = performance.now();
      let delay = 45;
      while (performance.now() - start < 1100 && alive.current) {
        setYouDie(String(d20())); setFoeDie(String(d20()));
        await sleep(delay); delay += 6;
      }
      if (!alive.current) return;
      setRolling(false); setYouDie(String(rYou)); setFoeDie(String(rFoe));
      await sleep(500);
      const foeFirst = rFoe > rYou;
      setVerdict({ foe: foeFirst, text: foeFirst ? t("nemInit.foeFirst", { name }) : t("nemInit.youFirst") });
      await sleep(400);
      setShowBtn(true);
    })();
    return () => { alive.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const begin = () => { setLeaving(true); setTimeout(() => onDone(result.current), 300); };

  return (
    <div className={"nem-init" + (leaving ? " leaving" : "")}>
      <div className="ni-stage">
        <div className="ni-kicker">{t("nemInit.reach")}</div>
        <div className="ni-name">{name}</div>
        <div className="ni-sub">— {t("nemInit.initiative")} —</div>
        <div className="ni-arena">
          <div className="ni-side">
            <div className="ni-who you">{t("nemInit.you")}</div>
            <div className={"ni-die you" + (rolling ? " rolling" : "") + (verdict && !verdict.foe ? " win" : verdict ? " lose" : "")}>{youDie}</div>
          </div>
          <div className="ni-vs">VS</div>
          <div className="ni-side">
            <div className="ni-who foe">{t("nemInit.foe")}</div>
            <div className={"ni-die foe" + (rolling ? " rolling" : "") + (verdict && verdict.foe ? " win" : verdict ? " lose" : "")}>{foeDie}</div>
          </div>
        </div>
        <div className={"ni-verdict" + (verdict ? (verdict.foe ? " foe show" : " you show") : "")}>{verdict?.text}</div>
        <button className={"ni-go" + (showBtn ? " show" : "")} onClick={begin}>{t("nemInit.begin")}</button>
      </div>
    </div>
  );
}
