import { Link } from 'react-router-dom';
import { Download, Package, Monitor, ArrowLeft, ShieldCheck, ExternalLink } from 'lucide-react';
export const LINUX_VERSION = '1.11.0';
const release = 'https://github.com/Jfdedit3/Animer/releases';
const tag = 'v1.11.0-linux';
const files = `${release}/download/${tag}/`;
export default function LinuxDownloads() {
  return <section className="local-settings linux-downloads">
    <Link to="/" className="local-back"><ArrowLeft size={17} />Retour aux anime</Link>
    <p className="local-eyebrow">ANIMER SUR TON ORDINATEUR</p>
    <h1>Télécharger pour Linux</h1>
    <p>L’interface et le relais vidéo du site dans une application de bureau. Sans compte, avec les apparences Animer et Nartya Anime, et une bibliothèque enregistrée sur cet ordinateur.</p>
    <div className="linux-platform"><Monitor size={18} /><span>Version {LINUX_VERSION} · Linux 64 bits · x86_64 / amd64</span></div>
    <div className="linux-download-grid">
      <article className="glass-panel"><Download size={27} /><h2>AppImage</h2><p>Application portable : télécharge le fichier, rends-le exécutable, puis ouvre-le.</p><a className="linux-download-button" href={files + `Animer-${LINUX_VERSION}-linux-x86_64.AppImage`}><Download size={17} />Télécharger l’AppImage</a><code>chmod +x Animer-{LINUX_VERSION}-linux-x86_64.AppImage</code><small>Si FUSE n’est pas installé, lance le fichier avec l’option <code>--appimage-extract-and-run</code>.</small></article>
      <article className="glass-panel"><Package size={27} /><h2>Debian / Ubuntu</h2><p>Paquet .deb avec un raccourci dans le menu des applications et les dépendances gérées par le système.</p><a className="linux-download-button" href={files + `Animer-${LINUX_VERSION}-linux-x86_64.deb`}><Download size={17} />Télécharger le .deb</a><code>sudo apt install ./Animer-{LINUX_VERSION}-linux-x86_64.deb</code><small>Pour les distributions Debian et Ubuntu sur processeur x86_64. Cette version n’est pas destinée aux machines ARM.</small></article>
    </div>
    <div className="glass-panel"><ShieldCheck size={24} /><h2>Retrouver ta bibliothèque</h2><p>L’application possède sa propre sauvegarde locale. Sur le site, exporte ta bibliothèque depuis Paramètres → Sauvegarde locale, puis importe le fichier JSON dans les paramètres de l’application.</p><p>Les fiches et la lecture vidéo nécessitent Internet. La bibliothèque et les réglages restent enregistrés entre les lancements. Les mises à jour de l’application se téléchargent depuis cette page.</p><Link to="/settings">Ouvrir les paramètres →</Link></div>
    <p><a href={`${release}/tag/${tag}`} target="_blank" rel="noopener noreferrer">Voir la version sur GitHub <ExternalLink size={14} /></a> · <a href={files + 'SHA256SUMS.txt'}>Empreintes SHA-256</a> · <a href={files + 'animer-linux-source.tar.gz'}>Code source de cette version</a></p>
  </section>;
}
