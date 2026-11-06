import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowDown, Sparkles } from "lucide-react";
import selection from "./selection.json";

export default function DiscoveryHero() {
  const [selected, setSelected] = useState(0);
  const item = selection.items[selected];
  return (
    <section className="discovery-hero" aria-label="La sélection Animer">
      <div className="discovery-art" aria-hidden="true">
        {selection.items.map((anime, i) => <img key={anime.slug} src={anime.cover} alt="" className={`discovery-poster discovery-poster-${i} ${selected === i ? "is-selected" : ""}`} fetchPriority={i === 0 ? "high" : "auto"} />)}
      </div>
      <div className="discovery-copy">
        <span className="discovery-label"><Sparkles size={13} /> LA SÉLECTION ANIMER</span>
        <h2>Encore un<br /><em>épisode.</em></h2>
        <p>Des histoires qui restent.<br />Et la prochaine qui t’attend.</p>
        <div className="discovery-actions">
          <Link to={`/anime/${item.slug}`} className="discovery-primary">Découvrir l’anime <ArrowRight size={17} /></Link>
          <button onClick={() => document.getElementById("catalogue")?.scrollIntoView({ behavior: document.documentElement.classList.contains("reduce-motion") ? "instant" : "smooth", block: "start" })}>Explorer <ArrowDown size={15} /></button>
        </div>
      </div>
      <div className="discovery-bottom">
        <div className="discovery-caption"><span>À DÉCOUVRIR</span><strong>{item.title}</strong></div>
        <div className="discovery-picker" role="group" aria-label="Choisir un anime à découvrir">
          {selection.items.map((anime, i) => <button key={anime.slug} aria-label={`Découvrir ${anime.title}`} aria-pressed={selected === i} onClick={() => setSelected(i)}><span>{String(i + 1).padStart(2,"0")}</span><span className="discovery-picker-line" /></button>)}
        </div>
      </div>
    </section>
  );
}
