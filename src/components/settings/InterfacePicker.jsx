import { Check, LayoutTemplate } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';

const choices = [
  { id: 'animer', title: 'Animer', description: 'L’interface actuelle du site : vert nuit, surfaces en verre et sélection illustrée.' },
  { id: 'nartya', title: 'Nartya Anime', description: 'Violet sombre et corail, navigation compacte et grande bannière pour découvrir un anime.' },
];

export default function InterfacePicker() {
  const selected = useSettingsStore(s => s.webInterface);
  const setSetting = useSettingsStore(s => s.setSetting);
  return <div className="glass-panel interface-picker">
    <h2><LayoutTemplate size={20} aria-hidden="true" />Interface du site</h2>
    <p>Garde l’apparence Animer ou choisis une interface inspirée de Nartya Anime. Tu peux changer à tout moment.</p>
    <div className="interface-choices" role="group" aria-label="Choisir l’interface du site">
      {choices.map(choice => <button type="button" key={choice.id} aria-pressed={selected === choice.id} onClick={() => setSetting('webInterface', choice.id)} className={`interface-choice interface-choice-${choice.id}`}>
        <span className="interface-preview" aria-hidden="true"><span className="interface-preview-nav"><i /><i /><i /></span><span className="interface-preview-content"><i /><span><b /><b /><b /></span></span></span>
        <span className="interface-choice-title">{choice.title}{selected === choice.id && <Check size={18} aria-hidden="true" />}</span>
        <span className="interface-choice-description">{choice.description}</span>
      </button>)}
    </div>
    <p className="interface-saved" role="status">Interface {choices.find(choice => choice.id === selected)?.title} sélectionnée. Le choix est enregistré automatiquement sur cet appareil.</p>
  </div>;
}
