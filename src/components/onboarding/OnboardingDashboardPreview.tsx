import { Link } from "react-router-dom";
import home from "@/assets/onboarding-tour/home.png";

export function OnboardingDashboardPreview() {
  return <main style={{ minHeight:"100dvh", background:"#080e18", color:"#eef4ff", padding:"24px 16px", display:"flex", alignItems:"center", flexDirection:"column", gap:16 }}>
    <header style={{maxWidth:440, width:"100%"}}>
      <strong>Home · Design preview</strong>
      <p style={{fontSize:13, color:"#a7b6cc", marginTop:8}}>Onboarding complete. This is a saved Home screenshot, not a signed-in account.</p>
    </header>
    <img src={home} alt="Saved screenshot of the Vault OS Home dashboard" style={{width:"100%", maxWidth:390, height:"auto", borderRadius:24, border:"1px solid #ffffff20"}}/>
    <nav aria-label="Preview actions" style={{display:"flex", gap:24, fontSize:14}}>
      <Link to="/__preview/onboarding" style={{color:"#8bb7ff"}}>Replay onboarding</Link>
      <Link to="/auth" style={{color:"#8bb7ff"}}>Log in to real dashboard</Link>
    </nav>
  </main>;
}
