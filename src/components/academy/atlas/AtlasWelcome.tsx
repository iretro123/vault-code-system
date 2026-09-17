import {useEffect,useState} from 'react';

export default function AtlasWelcome({name,active,skip}:{name:string;active:boolean;skip:boolean}){
  const title=`Hey ${name}. What are you working on?`;
  const subtitle='Ask your question below. We’ll start from there.';
  const total=Array.from(title).length+Array.from(subtitle).length;
  const [count,setCount]=useState(0);
  useEffect(()=>{
    if(!active)return;
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    if(skip||motion.matches){setCount(total);return;}
    setCount(0);
    const timer=setInterval(()=>setCount(n=>{if(n>=total){clearInterval(timer);return total;}return n+1;}),34);
    const stop=()=>{if(motion.matches){clearInterval(timer);setCount(total);}};
    motion.addEventListener('change',stop);
    return()=>{clearInterval(timer);motion.removeEventListener('change',stop);};
  },[active,skip,total,name]);
  const heading=Array.from(title),sub=Array.from(subtitle);
  return <div className="atlas-intro">
    <h2 aria-label={title} className="atlas-type-line"><span aria-hidden="true" className="atlas-type-space">{title}</span><span aria-hidden="true" className="atlas-type-ink">{heading.slice(0,count).join('')}{count<heading.length&&<i className="atlas-type-caret"/>}</span></h2>
    <p aria-label={subtitle} className="atlas-type-line"><span aria-hidden="true" className="atlas-type-space">{subtitle}</span><span aria-hidden="true" className="atlas-type-ink">{sub.slice(0,Math.max(0,count-heading.length)).join('')}{count>=heading.length&&count<total&&<i className="atlas-type-caret"/>}</span></p>
  </div>;
}
