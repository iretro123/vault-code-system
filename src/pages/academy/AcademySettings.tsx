import {useState,useEffect} from "react";
import {useSearchParams,Link} from "react-router-dom";
import {User,UserRound,BarChart3,Bell,Shield,HelpCircle,Database,CreditCard,ArrowLeft,Search} from "lucide-react";
import {SettingsProfile} from "@/components/settings/SettingsProfile";
import {SettingsAccount} from "@/components/settings/SettingsAccount";
import {SettingsTradingPrefs} from "@/components/settings/SettingsTradingPrefs";
import {SettingsNotifications} from "@/components/settings/SettingsNotifications";
import {SettingsPrivacy} from "@/components/settings/SettingsPrivacy";
import {SettingsSecurity} from "@/components/settings/SettingsSecurity";
import {SettingsHelp} from "@/components/settings/SettingsHelp";
import {SettingsBilling} from "@/components/settings/SettingsBilling";
import {isBillingVisible} from "@/lib/featureFlags";
import {Input} from "@/components/ui/input";
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {isLocalDesignPreview} from "@/integrations/supabase/localPreviewFetch";
import "./academy-settings.css";
import "./settings-simple.css";

const ITEMS=[
 {id:"profile",label:"My profile",group:"Your account",icon:User,description:"How you show up in the Vault community.",Component:SettingsProfile},
 {id:"account",label:"Account",group:"Your account",icon:UserRound,description:"Manage your account and account deletion.",Component:SettingsAccount},
 {id:"security",label:"Password & security",group:"Your account",icon:Shield,description:"Keep your sign-in details secure.",Component:SettingsSecurity},
 {id:"billing",label:"Membership & billing",group:"Your account",icon:CreditCard,description:"Manage your membership and billing options.",Component:SettingsBilling},
 {id:"notifications",label:"Notifications",group:"Your experience",icon:Bell,description:"Choose what you hear from Vault.",Component:SettingsNotifications},
 {id:"trading",label:"Trading preferences",group:"Your experience",icon:BarChart3,description:"Set the defaults that fit the way you trade.",Component:SettingsTradingPrefs},
 {id:"privacy",label:"Privacy & data",group:"Your experience",icon:Database,description:"Control your information and privacy preferences.",Component:SettingsPrivacy},
 {id:"help",label:"Help & support",group:"Support",icon:HelpCircle,description:"Find answers and get a hand when you need one.",Component:SettingsHelp},
] as const;
export default function AcademySettings(){
 const [params,setParams]=useSearchParams();
 const items=ITEMS.filter(i=>isBillingVisible()||i.id!=="billing");
 const returned=isBillingVisible()&&params.get("billing")==="returned";
 const selected=returned?"billing":items.find(i=>i.id===params.get("section"))?.id||"profile";
 const current=items.find(i=>i.id===selected)!;
 const [visited,setVisited]=useState<string[]>([selected]);
 const [search,setSearch]=useState("");
 useEffect(()=>{setVisited(prev=>prev.includes(selected)?prev:[...prev,selected]);},[selected]);
 useEffect(()=>{if(returned){const next=new URLSearchParams(params);next.delete("billing");next.set("section","billing");setParams(next,{replace:true});}},[returned,params,setParams]);
 const choose=(id:string)=>{const next=new URLSearchParams(params);next.set("section",id);next.delete("focus");setParams(next);};
 return <div className="vault-settings" data-section={selected}>
   <aside className="vs-navigation">
     <Link to="/academy/home" className="vs-back"><ArrowLeft size={16}/> Back to Vault</Link>
     <div className="vs-nav-title">Settings</div>
     <div className="vs-mobile-picker"><Select value={selected} onValueChange={choose}>
       <SelectTrigger aria-label="Settings page" className="vs-section-trigger"><span className="vs-picker-value"><current.icon size={18}/><SelectValue/></span></SelectTrigger>
       <SelectContent className="vs-section-menu" sideOffset={6} position="popper">
         {items.map(({id,label,icon:Icon})=><SelectItem className="vs-section-option" key={id} value={id} textValue={label}><span className="vs-option-label"><Icon size={18}/>{label}</span></SelectItem>)}
       </SelectContent>
     </Select></div>
     <label className="vs-search"><Search size={16}/><Input aria-label="Find a setting" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a setting"/></label>
     <nav aria-label="Settings sections">
       {["Your account","Your experience","Support"].map(group=>{
         const matches=items.filter(i=>i.group===group&&(i.label+" "+i.description).toLowerCase().includes(search.trim().toLowerCase()));
         return matches.length?<div className="vs-nav-group" key={group}><h2>{group}</h2>{matches.map(({id,label,icon:Icon})=><button key={id} aria-current={selected===id?"page":undefined} onClick={()=>choose(id)}><Icon size={18}/><span>{label}</span></button>)}</div>:null;
       })}
       {!items.some(i=>(i.label+" "+i.description).toLowerCase().includes(search.trim().toLowerCase()))&&<p className="vs-no-results">No settings found. Try “profile” or “privacy”.</p>}
     </nav>
   </aside>
   <main className="vs-main">
     <header className="vs-page-heading"><h1>{current.label}</h1></header>
     {isLocalDesignPreview()&&<p className="vs-local-note">Local workspace · Live settings are not saved from this preview.</p>}
     <div className="vs-panels">
       {items.filter(i=>visited.includes(i.id)||i.id===selected).map(({id,Component})=><section key={id} hidden={selected!==id} aria-label={items.find(i=>i.id===id)!.label}><Component/></section>)}
     </div>
   </main>
 </div>;
}
