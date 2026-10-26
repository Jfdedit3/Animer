import {Link} from "react-router-dom";
import {ArrowLeft} from "lucide-react";
import YoruExperienceSection from "@/components/settings/YoruExperienceSection";
export default function ExperiencePage(){return <main className="yoru-provider-page"><Link to="/" className="yoru-icon-button" aria-label="Retour"><ArrowLeft size={22}/></Link><YoruExperienceSection/></main>;}
