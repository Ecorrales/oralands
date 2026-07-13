import type { Creature } from "../engine";
import { enemyKind } from "../game/enemies";

export function EnemySprite({ enemy, dead }: { enemy: Creature; dead: boolean }) {
  const kind = enemyKind(enemy);
  const style = dead ? { opacity: 0.3, filter: "grayscale(1)" } : undefined;
  return (
    <div className="sprite" style={style}>
      {kind === "undead" && (
        <svg width="56" height="56" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
          <path d="M12 21a12 12 0 0124 0v5a5 5 0 01-3 4.6V36a2 2 0 01-2 2H17a2 2 0 01-2-2v-5.4A5 5 0 0112 26z" />
          <circle cx="19" cy="23" r="2.6" fill="currentColor" stroke="none" />
          <circle cx="29" cy="23" r="2.6" fill="currentColor" stroke="none" />
          <path d="M24 27l-2.2 4h4.4z" fill="currentColor" stroke="none" />
          <path d="M20 34v3M24 34v3.5M28 34v3" />
        </svg>
      )}
      {kind === "rodent" && (
        <svg width="56" height="56" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
          <ellipse cx="21" cy="30" rx="12" ry="7.5" /><circle cx="33" cy="26" r="6" />
          <circle cx="31" cy="20" r="2.4" /><circle cx="37" cy="21" r="2.4" />
          <circle cx="35.5" cy="26" r="1.1" fill="currentColor" stroke="none" />
          <path d="M10 30Q2 31 5 24" /><path d="M17 37v3M23 38v3" />
        </svg>
      )}
      {kind === "beast" && (
        <svg width="56" height="56" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
          <path d="M14 17l6 3 4-6 4 6 6-3-1.5 13a9.5 9.5 0 01-17 0z" />
          <circle cx="20.5" cy="27" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="27.5" cy="27" r="1.5" fill="currentColor" stroke="none" />
          <path d="M21 32h6l-3 4z" fill="currentColor" stroke="none" />
        </svg>
      )}
    </div>
  );
}
