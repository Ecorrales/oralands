import { useRegisterSW } from "virtual:pwa-register/react";
import { t } from "../game/i18n";

/** Aparece SOLO cuando hay una versión nueva del juego lista. Un toque la activa y recarga. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="updatebar">
      <span className="update-txt">✦ {t("update.available")}</span>
      <div className="update-actions">
        <button className="update-btn" onClick={() => updateServiceWorker(true)}>{t("update.now")}</button>
        <button className="update-later" onClick={() => setNeedRefresh(false)}>{t("update.later")}</button>
      </div>
    </div>
  );
}
