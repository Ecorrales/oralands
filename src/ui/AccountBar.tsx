import type { AuthInfo } from "../store";
import { t } from "../game/i18n";

/** Barra de cuenta: muestra el estado de sesión y permite vincular/entrar con Google.
 *  Solo se renderiza cuando Firebase está conectado. */
export function AccountBar({ auth, busy, msg, onLink, onSignOut }: {
  auth: AuthInfo | null;
  busy: boolean;
  msg: string | null;
  onLink: () => void;
  onSignOut: () => void;
}) {
  const signedIn = !!auth && !auth.isAnonymous;
  return (
    <div className="accountbar">
      {signedIn ? (
        <>
          <span className="acctstate"><span className="acctdot on" /> {auth?.email ?? "cuenta Google"}</span>
          <button className="small ghost" disabled={busy} onClick={onSignOut}>{t("account.signOut")}</button>
        </>
      ) : (
        <>
          <span className="acctstate"><span className="acctdot" />{t("account.guest")}</span>
          <button className="small" disabled={busy} onClick={onLink}>{busy ? "…" : t("account.google")}</button>
        </>
      )}
      {msg && <span className="acctmsg">{msg}</span>}
    </div>
  );
}
