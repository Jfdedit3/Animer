/** Official Nartya APKs cannot update this independently signed Yoru package. */
export async function installAppUpdate() {
  throw new Error("Ce client indépendant se met à jour avec les APK Yoru. Les mises à jour officielles Nartya ne sont pas compatibles.");
}
