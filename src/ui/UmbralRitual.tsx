import { useEffect, useRef, useState } from "react";
import { getLang } from "../game/i18n";

const TXT = {
  es: {
    kicker: "El vigésimo segundo umbral",
    title: "Tu nombre pesa sobre el mundo",
    v1a: "Ya no eres un don nadie que se arrastra en la penumbra. Has descendido lo suficiente, has sangrado lo suficiente. ",
    v1b: "Las criptas han despertado a tu nombre.",
    v2a: "Desde esta noche, los que te hagan caer volverán por ti. ", v2rec: "Recordarán.", v2b: " Empuñarán lo que te roben. Crecerán con cada derrota tuya. Y aprenderán a ", v2think: "pensar", v2c: ".",
    gaze: "Has mirado al vacío… y te devolvió la mirada.",
    warn: "Más fuertes. Más astutos. Te estarán esperando en la oscuridad.",
    cta: "Que vengan",
  },
  en: {
    kicker: "The twenty-second threshold",
    title: "Your name weighs upon the world",
    v1a: "You are no longer a nobody crawling in the gloom. You have descended enough, bled enough. ",
    v1b: "The crypts have awakened to your name.",
    v2a: "From this night, those who bring you down will come back for you. ", v2rec: "They will remember.", v2b: " They will wield what they steal. They will grow with every defeat of yours. And they will learn to ", v2think: "think", v2c: ".",
    gaze: "You gazed into the void… and it gazed back.",
    warn: "Stronger. Craftier. They will be waiting in the dark.",
    cta: "Let them come",
  },
};

const EYES = [[18, 26], [80, 20], [12, 68], [86, 74], [30, 84], [68, 88], [8, 44], [90, 48]];

export function UmbralRitual({ onDone }: { onDone: () => void }) {
  const T = TXT[getLang()] ?? TXT.es;
  const [leaving, setLeaving] = useState(false);
  const [ready, setReady] = useState(false);
  const eyesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timers: number[] = [];
    // los ojos esperan a la frase del vacío (~4.2s) y se encienden uno a uno
    EYES.forEach(([x, y], i) => {
      timers.push(window.setTimeout(() => {
        const host = eyesRef.current; if (!host) return;
        const gap = 14 + Math.random() * 6;
        [-gap / 2, gap / 2].forEach((dx) => {
          const e = document.createElement("div");
          e.className = "um-eye lit";
          e.style.left = `calc(${x}% + ${dx}px)`;
          e.style.top = `${y}%`;
          host.appendChild(e);
        });
      }, 4200 + i * 230));
    });
    timers.push(window.setTimeout(() => setReady(true), 6700));
    return () => timers.forEach(clearTimeout);
  }, []);

  const finish = () => { setLeaving(true); setTimeout(onDone, 500); };

  return (
    <div className={"um-stage" + (leaving ? " leaving" : "")}>
      <div className="um-pulse" />
      <div className="um-eyes" ref={eyesRef} />
      <div className="um-core">
        <svg className="um-sigil throb" viewBox="0 0 48 48" fill="none" stroke="var(--danger)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="24" r="13.5" />
          <path d="M15 33 V15 L33 33 V15" />
          <path d="M12 12 L36 36 M36 12 L12 36" />
        </svg>
        <div className="um-kicker">{T.kicker}</div>
        <div className="um-title">{T.title}</div>
        <div className="um-rule" />
        <p className="um-verse v1">{T.v1a}<span className="accent">{T.v1b}</span></p>
        <p className="um-verse v2">{T.v2a}<em>{T.v2rec}</em>{T.v2b}<em>{T.v2think}</em>{T.v2c}</p>
        <p className="um-verse gaze">{T.gaze}</p>
        <p className="um-verse warn">{T.warn}</p>
        <button className={"um-go" + (ready ? " ready" : "")} onClick={finish}>{T.cta}</button>
      </div>
    </div>
  );
}
