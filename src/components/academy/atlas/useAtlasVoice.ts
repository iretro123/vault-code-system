import { useCallback, useEffect, useRef, useState } from 'react';

/** Opt-in device speech only. Never falls back to a remote voice or microphone. */
export function useAtlasVoice() {
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
  const [speaking,setSpeaking]=useState<string|null>(null);
  const [error,setError]=useState('');
  const active=useRef<SpeechSynthesisUtterance|null>(null);
  const supported=typeof window!=='undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const stop=useCallback(()=>{
    if(active.current){ active.current.onend=null;active.current.onerror=null;active.current=null;window.speechSynthesis.cancel(); }
    setSpeaking(null);
  },[]);
  useEffect(()=>{
    if(!supported)return;
    const refresh=()=>setVoices(window.speechSynthesis.getVoices().filter(v=>v.localService && /^en(?:-|_)/i.test(v.lang)));
    refresh();window.speechSynthesis.addEventListener('voiceschanged',refresh);
    return ()=>{window.speechSynthesis.removeEventListener('voiceschanged',refresh);stop();};
  },[supported,stop]);
  const speak=useCallback((id:string,text:string)=>{
    if(speaking===id){stop();return;}
    stop();setError('');
    if(!supported || !voices.length){setError('No local English voice is available in this browser. You can still read every answer.');return;}
    const voice=voices.find(v=>/Samantha|Daniel|Karen/i.test(v.name)) || voices.find(v=>v.default) || voices[0];
    const utterance=new SpeechSynthesisUtterance(text);
    utterance.voice=voice;utterance.lang=voice.lang;utterance.rate=.97;
    utterance.onend=()=>{if(active.current===utterance){active.current=null;setSpeaking(null);}};
    utterance.onerror=()=>{if(active.current===utterance){active.current=null;setSpeaking(null);setError('Audio could not play. Try Listen again, or continue reading.');}};
    active.current=utterance;setSpeaking(id);window.speechSynthesis.speak(utterance);
  },[speaking,stop,supported,voices]);
  return {speak,stop,speaking,error,available:supported&&voices.length>0};
}
