import { useEffect, useRef, useState } from "react";
import { getLang } from "../game/i18n";

const TXT = {
  es: {
    kickerSealed: "Un legado sellado", hint: "Rompe el sello",
    guardian: "El Guardián de las Criptas te habla", title: "Escucha, tú que respiras",
    intro: "Soy el que vela estas criptas desde antes de tu primer aliento. Presta atención, porque no lo repetiré, y la oscuridad no perdona al que no escucha.",
    l1: "I · El descenso", v1: "Elegirás una mazmorra y bajarás, sala por sala, cazando lo que se arrastra en la penumbra. Cada sala despejada te acerca al fondo… y al peligro. Nadie te obliga a seguir bajando: retírate con tu botín cuando el miedo pese más que la codicia.",
    l2: "II · Tu fuerza es finita", v2: "Tu energía se gasta como sangre, no como agua: cada golpe la consume, y sin ella quedas a merced de las fauces. Y escoge bien tu acero — un arma pesada muerde más hondo, pero exige más de ti. Empuña la que sirva a tu mano, no la más brillante.",
    l3: "III · Los que acechan", v3: "Si caes, no todo termina: de tu muerte nace un némesis, un enemigo que empuñará el arma que te robó y que jamás olvidará tu nombre. Y mantén los ojos abiertos al acampar o rebuscar — la penumbra esconde emboscadas, y bajar la guardia se paga con sangre.",
    l4: "IV · La profecía", v4: "Y lo más importante, grábatelo: mientras seas débil, el mundo apenas te nota. Pero cuando tu nombre cobre peso —al alcanzar el vigésimo segundo umbral— las criptas despertarán. Los némesis que entonces te cacen serán más fuertes, más astutos, y te estarán esperando. Crece rápido… o crece con cuidado.",
    sigil: "— Ahora ve. La oscuridad no espera. —", cta: "Descender",
  },
  en: {
    kickerSealed: "A sealed legacy", hint: "Break the seal",
    guardian: "The Guardian of the Crypts speaks", title: "Listen, you who breathe",
    intro: "I have watched these crypts since before your first breath. Heed me, for I will not repeat it, and the dark does not forgive those who fail to listen.",
    l1: "I · The descent", v1: "You will choose a dungeon and descend, room by room, hunting what crawls in the gloom. Each cleared room brings you closer to the depths… and to danger. No one forces you deeper: leave with your loot when fear outweighs greed.",
    l2: "II · Your strength is finite", v2: "Your energy spends like blood, not water: each blow consumes it, and without it you are at the mercy of the maw. And choose your steel well — a heavy weapon bites deeper but demands more of you. Wield the one that suits your hand, not the brightest.",
    l3: "III · Those that lurk", v3: "If you fall, it is not the end: from your death a nemesis is born, a foe that will wield the weapon it stole and never forget your name. And keep your eyes open when you camp or search — the gloom hides ambushes, and lowering your guard is paid in blood.",
    l4: "IV · The prophecy", v4: "And most important, mark this: while you are weak, the world barely notices you. But when your name gains weight —upon reaching the twenty-second threshold— the crypts will awaken. The nemeses that hunt you then will be stronger, craftier, and waiting. Grow fast… or grow carefully.",
    sigil: "— Now go. The dark does not wait. —", cta: "Descend",
  },
};

const Sigil = ({ cls, stroke }: { cls: string; stroke: string }) => (
  <svg className={cls} viewBox="0 0 48 48" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="24" cy="24" r="13.5" />
    <path d="M15 33 V15 L33 33 V15" />
    <path d="M12 12 L36 36 M36 12 L12 36" />
  </svg>
);

export function ScrollTutorial({ onDone }: { onDone: () => void }) {
  const T = TXT[getLang()] ?? TXT.es;
  const [opened, setOpened] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const [showCue, setShowCue] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const breakSeal = () => {
    if (opened) return;
    setBreaking(true);
    setTimeout(() => { setOpened(true); setShowCue(true); }, 480);
  };

  useEffect(() => {
    if (!opened || !wrapRef.current) return;
    const els = wrapRef.current.querySelectorAll(".st-verse, .st-foot");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.35, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [opened]);

  return (
    <div className="st-overlay">
      {!opened && (
        <div className={"st-sealed" + (breaking ? " leaving" : "")}>
          <div className="st-kicker-mono">{T.kickerSealed}</div>
          <div className="st-rolled">
            <button className={"st-seal" + (breaking ? " breaking" : "")} onClick={breakSeal} aria-label={T.hint}>
              <Sigil cls="st-sigil-svg" stroke="#3a1512" />
            </button>
          </div>
          <div className="st-hint">{T.hint}</div>
        </div>
      )}

      {showCue && (
        <div className="st-cue">
          <span>{getLang() === "en" ? "Unfurl" : "Desenrolla"}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </div>
      )}

      <div className={"st-scrollwrap" + (opened ? " open" : "")} ref={wrapRef} onScroll={() => setShowCue(false)}>
        <div className="st-dowel top" />
        <div className="st-parchment">
          <div className="st-p-kicker">{T.guardian}</div>
          <div className="st-p-title">{T.title}</div>
          <div className="st-p-rule" />
          <p className="st-verse st-drop">{T.intro}</p>
          <p className="st-verse"><span className="st-lead">{T.l1}</span>{T.v1}</p>
          <p className="st-verse"><span className="st-lead">{T.l2}</span>{T.v2}</p>
          <p className="st-verse"><span className="st-lead">{T.l3}</span>{T.v3}</p>
          <p className="st-verse prophecy"><span className="st-lead">{T.l4}</span>{T.v4}</p>
          <div className="st-foot">
            <Sigil cls="st-foot-sigil" stroke="#7c6338" />
            <div className="st-p-sigil">{T.sigil}</div>
            <button className="st-continue" onClick={onDone}>{T.cta}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
