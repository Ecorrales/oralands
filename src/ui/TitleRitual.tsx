import { useEffect, useState } from "react";
import type { AwardedTitle } from "../game/titles";
import { getLang } from "../game/i18n";

/**
 * Ritual de coronación: el heraldo narra el PORQUÉ verso por verso → se revela el TÍTULO al final.
 * Estética oscura/ritual (halo dorado que respira, ceniza dorada, sigilo NOX girando).
 */
export function TitleRitual({ title, onDone }: { title: AwardedTitle; onDone: () => void }) {
  const [ready, setReady] = useState(false);
  // parte el "porqué" en frases para revelarlas escalonadas (efecto verso por verso)
  const verses = (title.why || "").split(/(?<=[.…])\s+/).filter((v) => v.trim().length);
  const base = 1.2;          // arranque de la 1ª frase
  const gap = 2.0;           // separación entre frases
  const revealAt = base + verses.length * gap + 0.4;   // cuándo aparece el título
  const btnAt = revealAt + 2.0;

  useEffect(() => {
    const id = setTimeout(() => setReady(true), (btnAt + 0.4) * 1000);
    return () => clearTimeout(id);
  }, [btnAt]);

  const lead = getLang() === "es" ? "Se te conocerá como" : "You shall be known as";

  return (
    <div className="tr-stage" onClick={(e) => e.stopPropagation()}>
      <style>{`
        .tr-stage{position:fixed;inset:0;z-index:1000;display:flex;flex-direction:column;align-items:center;justify-content:center;
          padding:34px;text-align:center;background:radial-gradient(120% 90% at 50% 42%,#161009,#050403 74%);animation:tr-in .6s ease-out}
        @keyframes tr-in{from{opacity:0}to{opacity:1}}
        .tr-halo{position:absolute;inset:0;pointer-events:none;background:radial-gradient(42% 34% at 50% 44%,rgba(201,162,74,.10),transparent 70%);animation:tr-breathe 4.5s ease-in-out infinite}
        @keyframes tr-breathe{0%,100%{opacity:.4}50%{opacity:1}}
        .tr-embers{position:absolute;inset:0;pointer-events:none;overflow:hidden}
        .tr-ember{position:absolute;bottom:-10px;width:3px;height:3px;border-radius:50%;background:var(--accent,#c9a24a);box-shadow:0 0 6px 1px rgba(201,162,74,.6);animation:tr-rise linear infinite}
        @keyframes tr-rise{0%{transform:translateY(0);opacity:0}12%{opacity:.8}100%{transform:translateY(-105vh);opacity:0}}
        .tr-core{position:relative;z-index:3;display:flex;flex-direction:column;align-items:center;gap:16px;max-width:540px}
        .tr-sigil{position:absolute;top:-64px;width:120px;height:120px;opacity:0;z-index:-1;animation:tr-wake 3s ease-out .5s forwards, tr-spin 60s linear 3s infinite}
        @keyframes tr-wake{from{opacity:0;transform:scale(.7)}to{opacity:.13;transform:scale(1)}}
        @keyframes tr-spin{to{transform:rotate(360deg)}}
        .tr-kicker{font-family:var(--mono,monospace);font-size:12px;letter-spacing:.32em;text-transform:uppercase;color:var(--accent,#c9a24a);opacity:0;animation:tr-up .9s ease-out .4s forwards}
        .tr-verse{font-family:Georgia,"Iowan Old Style",serif;font-size:18px;line-height:1.7;color:#cdbb98;opacity:0;transform:translateY(14px);max-width:32ch}
        .tr-div{width:0;height:1px;background:linear-gradient(90deg,transparent,var(--accent,#c9a24a),transparent);margin:8px 0}
        .tr-lead{font-family:Georgia,serif;font-size:15px;color:var(--muted,#9a8f7d);opacity:0}
        .tr-title-wrap{opacity:0;position:relative}
        .tr-flash{position:absolute;inset:-40px;pointer-events:none;opacity:0;background:radial-gradient(circle,rgba(233,224,210,.5),transparent 60%)}
        .tr-title{font-family:Georgia,"Iowan Old Style",serif;font-size:36px;font-weight:700;line-height:1.12;color:var(--ink,#e8e0d2);text-shadow:0 0 40px rgba(201,162,74,.5)}
        .tr-honor{font-family:var(--mono,monospace);font-size:11.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--dim,#6f6656);margin-top:12px;opacity:0}
        .tr-go{margin-top:24px;background:linear-gradient(180deg,#d7b25a,var(--accent,#c9a24a));color:var(--accent-ink,#1a1509);border:1px solid #8a6d2f;border-radius:11px;padding:14px 40px;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 10px 26px rgba(0,0,0,.4);opacity:0;pointer-events:none}
        .tr-go.tr-ready{pointer-events:auto}
        .tr-go:active{transform:scale(.97)}
        @keyframes tr-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tr-reveal{0%{opacity:0;transform:scale(.82);filter:blur(8px)}60%{opacity:1;filter:blur(0)}100%{opacity:1;transform:scale(1)}}
        @keyframes tr-flash{0%{opacity:0;transform:scale(.5)}30%{opacity:.9}100%{opacity:0;transform:scale(1.4)}}
        @keyframes tr-grow{to{width:180px}}
      `}</style>

      <div className="tr-halo" />
      <div className="tr-embers">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className="tr-ember" style={{ left: `${Math.random() * 100}%`, animationDuration: `${6 + Math.random() * 7}s`, animationDelay: `${Math.random() * 8}s` }} />
        ))}
      </div>

      <div className="tr-core">
        <svg className="tr-sigil" viewBox="0 0 48 48" fill="none" stroke="var(--accent,#c9a24a)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="24" r="13.5" />
          <path d="M15 33 V15 L33 33 V15" />
          <path d="M12 12 L36 36 M36 12 L12 36" />
        </svg>

        <div className="tr-kicker">{getLang() === "es" ? "El calabozo pronuncia un nombre" : "The dungeon speaks a name"}</div>

        {verses.map((v, i) => (
          <p key={i} className="tr-verse" style={{ animation: `tr-up 1.1s ease-out ${base + i * gap}s forwards` }}>{v}</p>
        ))}

        <div className="tr-div" style={{ animation: `tr-grow 1.2s ease-out ${revealAt - 0.6}s forwards` }} />
        <div className="tr-lead" style={{ animation: `tr-up 1s ease-out ${revealAt - 0.4}s forwards` }}>{lead}</div>

        <div className="tr-title-wrap" style={{ animation: `tr-reveal 1.6s cubic-bezier(.2,.8,.2,1) ${revealAt}s forwards` }}>
          <div className="tr-flash" style={{ animation: `tr-flash 1.2s ease-out ${revealAt + 0.1}s` }} />
          <div className="tr-title">{title.name}</div>
        </div>
        {title.founder && <div className="tr-honor" style={{ animation: `tr-up 1s ease-out ${revealAt + 1.4}s forwards` }}>· {getLang() === "es" ? "uno de los Tres" : "one of the Three"} ·</div>}

        <button className={"tr-go" + (ready ? " tr-ready" : "")} style={{ animation: `tr-up .9s ease-out ${btnAt}s forwards` }} onClick={onDone}>
          {getLang() === "es" ? "Lo llevaré con honor" : "I shall bear it with honor"}
        </button>
      </div>
    </div>
  );
}
