import {useEffect,useRef,useState} from 'react';
import {Paperclip,FileText,X,Send} from 'lucide-react';
import {supabase} from '@/integrations/supabase/client';
import {isLocalDesignPreview} from '@/integrations/supabase/localPreviewFetch';
import {GifPicker} from '@/components/academy/chat/GifPicker';
import {EmojiPicker} from '@/components/academy/chat/EmojiPicker';
import {allowedMemberFiles,validateMemberFile,type MemberAttachment} from '@/lib/memberAttachments';
export function MemberMediaTools({conversation,userId,disabled,onEmoji,onSend}:{conversation:string;userId:string;disabled:boolean;onEmoji:(emoji:string)=>void;onSend:(attachment:MemberAttachment)=>Promise<boolean>}) {
 const input=useRef<HTMLInputElement>(null),mounted=useRef(true),uploadPath=useRef<string|null>(null);
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 async function sendFile(){
  if(!file||busy||disabled)return;setBusy(true);setError('');
  try{
   let attachment:MemberAttachment={type:file.type.startsWith('image/')?'image':'file',filename:file.name,mime:file.type,size:file.size};
   if(isLocalDesignPreview())attachment.url=URL.createObjectURL(file);
   else{
    const path=uploadPath.current||`${conversation}/${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-100)}`;
    if(!uploadPath.current){const {error:err}=await supabase.storage.from('vault-member-files').upload(path,file,{upsert:false,contentType:file.type});if(err)throw err;uploadPath.current=path;}
    attachment.path=path;
   }
   if(!mounted.current){if(attachment.url?.startsWith('blob:'))URL.revokeObjectURL(attachment.url);return;}
   await onSend(attachment); // Transport owns failed-send retry with the same message ID.
   if(mounted.current){setFile(null);uploadPath.current=null;}
  }catch{if(mounted.current)setError('Upload failed. Your file is still here. Try again.');}
  finally{if(mounted.current)setBusy(false);}
 }
 return <div className="vm-media-tools"><div className="vm-tool-row">
  <input ref={input} aria-label="Choose attachment" type="file" hidden accept={allowedMemberFiles.join(',')} onChange={e=>{const picked=e.target.files?.[0];e.target.value='';if(!picked)return;const issue=validateMemberFile(picked);setError(issue||'');if(!issue){setFile(picked);uploadPath.current=null;}}}/>
  <button type="button" aria-label="Attach file" disabled={disabled||busy} onClick={()=>input.current?.click()}><Paperclip size={19}/></button>
  <fieldset disabled={disabled||busy}><EmojiPicker onSelect={onEmoji}/><GifPicker onSelect={url=>{if(!disabled&&!busy)void onSend({type:'gif',url});}}/></fieldset>
  <small>Files up to 15 MB</small>
 </div>{file&&<div className="vm-pending-file"><FileText size={18}/><span>{file.name}</span><button type="button" disabled={busy||disabled} onClick={()=>void sendFile()} aria-label="Send attachment">{busy?'Uploading…':<Send size={17}/>}</button><button type="button" disabled={busy} aria-label="Remove attachment" onClick={()=>{setFile(null);uploadPath.current=null;}}><X size={17}/></button></div>}{error&&<p role="alert">{error}</p>}</div>;
}
export function MemberMedia({attachment}:{attachment:MemberAttachment}) {
 const [url,setUrl]=useState(''),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;setUrl('');setError(false);
  if(attachment.type==='gif'){
   try{const u=new URL(attachment.url||'');if(u.protocol==='https:'&&/^(?:[a-z0-9-]+\.)?giphy\.com$/.test(u.hostname))setUrl(u.href);else setError(true);}catch{setError(true);}
   return;
  }
  if(isLocalDesignPreview()&&attachment.url?.startsWith('blob:')){setUrl(attachment.url);return;}
  if(!attachment.path){setError(true);return;}
  const sign=async()=>{try{const {data,error:err}=await supabase.storage.from('vault-member-files').createSignedUrl(attachment.path!,900);if(err||!data)throw err;if(active)setUrl(data.signedUrl);}catch{if(active)setError(true);}};
  void sign();const timer=setInterval(sign,12*60*1000);
  return()=>{active=false;clearInterval(timer);};
 },[attachment.path,attachment.url,attachment.type,retry]);
 if(error)return <button className="vm-file-link" onClick={()=>setRetry(v=>v+1)}>Attachment unavailable · Retry</button>;
 if(!url)return <span className="vm-muted">Loading attachment…</span>;
 return <div className="vm-attachment">{attachment.type==='gif'||attachment.type==='image'?<img src={url} alt={attachment.filename||'GIF'} loading="lazy" onError={()=>setError(true)}/>:<a className="vm-file-link" href={url} target="_blank" rel="noopener noreferrer" download={attachment.filename}><FileText size={20}/><span>{attachment.filename||'Download file'}<small>{attachment.size?`${(attachment.size/1024/1024).toFixed(1)} MB`:''} · Open file</small></span></a>}</div>;
}
