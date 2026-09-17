export interface MemberAttachment {type:'image'|'file'|'gif';path?:string;url?:string;filename?:string;mime?:string;size?:number}
export const allowedMemberFiles=['image/png','image/jpeg','image/gif','image/webp','application/pdf','video/mp4'];
export function validateMemberFile(file:Pick<File,'size'|'type'>) {
 if(!allowedMemberFiles.includes(file.type))return 'Choose a JPG, PNG, GIF, WebP, PDF, or MP4.';
 if(file.size>15*1024*1024)return 'Files must be 15 MB or smaller.';
 if(file.size===0)return 'This file is empty.';
 return null;
}
