import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { platform } from '../platform';
import { ANIME4K_MODES, isAnime4kSupported } from '../utils/anime4k';
import { allowsAnime4k, MOBILE_ANIME4K_MODES } from '../utils/anime4kPolicy';
import Anime4kWarningModal from '../components/player/Anime4kWarningModal';

export default function Movie4kSettings() {
  const mode = useSettingsStore(s => s.movie4kMode);
  const [pending, setPending] = useState(null);
  const supported = allowsAnime4k(platform) && isAnime4kSupported({ mobile: platform.isMobile });
  const modes = platform.isMobile ? MOBILE_ANIME4K_MODES : ANIME4K_MODES;
  const select = value => {
    if (value === 'off') useSettingsStore.getState().setSetting('movie4kMode', 'off');
    else setPending(value);
  };
  return <div className="mv-panel mv-upscale-panel">
    <Sparkles size={25} /><h2>Movie 4K</h2>
    <p>Améliore la netteté des films et séries avec le moteur Anime4K. Le réglage est enregistré sur cet appareil, séparément de celui des anime.</p>
    <label htmlFor="movie4k-mode">Amélioration de l’image</label>
    <select id="movie4k-mode" value={mode} disabled={!supported} onChange={event => select(event.target.value)}>
      <option value="off">Désactivé</option>
      {modes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    {!supported && <p role="status">Movie 4K n’est pas disponible avec ce navigateur ou ce GPU. La lecture vidéo reste utilisable sans cet effet.</p>}
    <small>Également disponible dans les réglages du lecteur, pendant la lecture. Le résultat dépend de la source et du GPU ; il ne s’agit pas d’une vidéo 4K native. Sur les images réelles, les contours peuvent paraître trop accentués.</small>
    {pending && <Anime4kWarningModal label="Movie 4K" mode={pending} onCancel={() => setPending(null)} onConfirm={() => {
      const settings = useSettingsStore.getState();
      settings.setSetting('movie4kWarningAcknowledged', true);
      settings.setSetting('movie4kMode', pending);
      setPending(null);
    }} />}
  </div>;
}
