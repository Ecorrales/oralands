import type { AuthInfo } from "../store";

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
          <button className="small ghost" disabled={busy} onClick={onSignOut}>Cerrar sesión</button>
        </>
      ) : (
        <>
          <span className="acctstate"><span className="acctdot" /> Invitado · guardado en la nube</span>
          <button className="small" disabled={busy} onClick={onLink}>{busy ? "…" : "Entrar con Google"}</button>
        </>
      )}
      {msg && <span className="acctmsg">{msg}</span>}
    </div>
  );
}
