import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { exportLocalData, importLocalData } from "../local/database";
import { accountClient } from "../lib/animerAccount";

export default function AccountPage() {
  const [session, setSession] = useState(undefined);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!accountClient) return;
    const { data: { subscription } } = accountClient.auth.onAuthStateChange(
      (_event, nextSession) => setSession(nextSession),
    );
    return () => subscription.unsubscribe();
  }, []);

  async function run(action, failureMessage) {
    if (busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const message = await action();
      if (message) setFeedback({ message });
    } catch (error) {
      setFeedback({
        error: true,
        message: error.status === 429
          ? "Trop de demandes. Attendez avant de réessayer."
          : failureMessage,
      });
    } finally {
      setBusy(false);
    }
  }

  function requestCode(event) {
    event.preventDefault();
    const address = sentTo || email.trim();
    run(async () => {
      const { error } = await accountClient.auth.signInWithOtp({ email: address });
      if (error) throw error;
      setSentTo(address);
      setCode("");
      return "Code envoyé. Pensez à vérifier vos courriers indésirables.";
    }, "Impossible d’envoyer le code. Vérifiez l’adresse ou réessayez plus tard.");
  }

  function verifyCode(event) {
    event.preventDefault();
    run(async () => {
      const { error } = await accountClient.auth.verifyOtp({
        email: sentTo, token: code.trim(), type: "email",
      });
      if (error) throw error;
      setSentTo("");
      setCode("");
    }, "Code incorrect ou expiré. Vérifiez-le ou demandez un nouveau code.");
  }

  function saveBackup() {
    if (!window.confirm("Remplacer la sauvegarde en ligne par la bibliothèque de cet appareil ?")) return;
    run(async () => {
      const backup = exportLocalData();
      const { error } = await accountClient.from("animer_library_backups").upsert({
        user_id: session.user.id, backup,
      });
      if (error) throw error;
      return "Bibliothèque sauvegardée sur votre compte.";
    }, "Impossible d’enregistrer la sauvegarde en ligne.");
  }

  function restoreBackup() {
    run(async () => {
      const { data, error } = await accountClient.from("animer_library_backups")
        .select("backup").eq("user_id", session.user.id).maybeSingle();
      if (error) throw error;
      if (!data) return "Ce compte ne contient encore aucune sauvegarde.";
      if (!window.confirm("Remplacer les favoris, les listes et la progression de cet appareil par la sauvegarde du compte ?")) return;
      const { data: { session: current } } = await accountClient.auth.getSession();
      if (current?.user.id !== session.user.id) throw new Error("Session modifiée");
      importLocalData(data.backup);
      window.location.reload();
    }, "Impossible de restaurer la sauvegarde du compte.");
  }

  function signOut() {
    run(async () => {
      const { error } = await accountClient.auth.signOut({ scope: "local" });
      if (error) throw error;
      setEmail("");
      setSentTo("");
      setCode("");
      return "Vous êtes déconnecté.";
    }, "Impossible de vous déconnecter. Réessayez.");
  }

  return (
    <section className="local-settings">
      <h1>Mon compte</h1>
      <div className="glass-panel">
        {!accountClient ? (
          <p>Les comptes en ligne sont indisponibles sur ce déploiement. <Link to="/settings">Gérer ma sauvegarde locale</Link></p>
        ) : session === undefined ? (
          <p role="status">Vérification de la session…</p>
        ) : session ? (
          <>
            <p>Connecté avec <strong>{session.user.email}</strong></p>
            <button type="button" disabled={busy} onClick={signOut}>Se déconnecter</button>
            <h2>Sauvegarde du compte</h2>
            <p>Emportez vos favoris, listes et progression sur un autre appareil. La sauvegarde et la restauration se font à la demande. Une copie locale reste accessible sur cet appareil après la déconnexion.</p>
            <button type="button" disabled={busy} onClick={saveBackup}>Sauvegarder en ligne</button>
            <button type="button" disabled={busy} onClick={restoreBackup}>Restaurer sur cet appareil</button>
          </>
        ) : sentTo ? (
          <>
            <p>Saisissez le code envoyé à <strong>{sentTo}</strong>.</p>
            <form onSubmit={verifyCode}>
              <label htmlFor="account-code">Code de connexion</label>
              <input id="account-code" autoComplete="one-time-code" inputMode="numeric"
                pattern="[0-9]{6}" maxLength={6} required value={code}
                onChange={(event) => setCode(event.target.value)} />
              <button disabled={busy}>Valider le code</button>
            </form>
            <button type="button" disabled={busy} onClick={requestCode}>Renvoyer le code</button>
            <button type="button" disabled={busy} onClick={() => {
              setSentTo("");
              setCode("");
              setFeedback(null);
            }}>Changer d’adresse</button>
          </>
        ) : (
          <form onSubmit={requestCode}>
            <p>Créez un compte ou reconnectez-vous avec un code reçu par e-mail.</p>
            <label htmlFor="account-email">Adresse e-mail</label>
            <input id="account-email" type="email" autoComplete="email" required
              value={email} onChange={(event) => setEmail(event.target.value)} />
            <button disabled={busy}>Envoyer un code</button>
          </form>
        )}
        {busy && <p role="status">Opération en cours…</p>}
        {feedback && <p role={feedback.error ? "alert" : "status"}>{feedback.message}</p>}
      </div>
    </section>
  );
}
