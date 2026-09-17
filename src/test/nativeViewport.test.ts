import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const keyboard = vi.hoisted(() => ({ addListener: vi.fn().mockResolvedValue({remove:vi.fn()}), setAccessoryBarVisible:vi.fn().mockResolvedValue(undefined), setResizeMode:vi.fn().mockResolvedValue(undefined) }));
vi.mock('@capacitor/core', () => ({Capacitor:{isNativePlatform:()=>true}}));
vi.mock('@capacitor/keyboard', () => ({Keyboard:keyboard,KeyboardResize:{Body:'body'}}));
vi.mock('@/lib/nativeAuthPersistence', () => ({hydrateNativeAuthPersistence:()=>new Promise(()=>{})}));
vi.mock('@/lib/membershipReconciler', () => ({installMembershipReconciler:vi.fn()}));

let viewport: EventTarget & {height:number;width:number};
beforeEach(async()=>{
  vi.resetModules();vi.clearAllMocks();
  viewport=Object.assign(new EventTarget(),{height:844,width:390});
  vi.stubGlobal('visualViewport',viewport);
  await import('../main');
});
afterEach(()=>{
  document.body.innerHTML='';document.body.className='';document.documentElement.className='';
  document.body.style.removeProperty('--academy-keyboard-height');vi.unstubAllGlobals();
  document.documentElement.style.removeProperty('--academy-visible-height');
});

it('loads the native keyboard module and installs keyboard listeners',async()=>{
  await vi.waitFor(()=>expect(keyboard.addListener).toHaveBeenCalledWith('keyboardDidShow',expect.any(Function)));
  expect(keyboard.setResizeMode).toHaveBeenCalledWith({mode:'body'});
});

it('does not block horizontal touch gestures globally',()=>{
  const start=new Event('touchstart',{bubbles:true,cancelable:true});
  Object.defineProperty(start,'touches',{value:[{clientX:10,clientY:10}]});document.dispatchEvent(start);
  const move=new Event('touchmove',{bubbles:true,cancelable:true});
  Object.defineProperty(move,'touches',{value:[{clientX:100,clientY:12}]});document.dispatchEvent(move);
  expect(move.defaultPrevented).toBe(false);
});

it('distinguishes keyboard resizing from screen rotation and restores the navigation state',()=>{
  const input=document.createElement('input');document.body.append(input);input.focus();
  viewport.height=500;viewport.dispatchEvent(new Event('resize'));
  expect(document.documentElement.style.getPropertyValue('--academy-visible-height')).toBe('500px');
  expect(document.body.classList.contains('native-keyboard-open')).toBe(true);
  expect(document.body.style.getPropertyValue('--academy-keyboard-height')).toBe('344px');
  viewport.width=844;viewport.height=390;viewport.dispatchEvent(new Event('resize'));
  expect(document.body.classList.contains('native-keyboard-open')).toBe(false);
  expect(document.body.style.getPropertyValue('--academy-keyboard-height')).toBe('');
  input.blur();viewport.height=240;viewport.dispatchEvent(new Event('resize'));
  expect(document.body.classList.contains('native-keyboard-open')).toBe(false);
});

it('restores available height after keyboard dismissal',()=>{
  const input=document.createElement('input');document.body.append(input);input.focus();
  viewport.height=480;viewport.dispatchEvent(new Event('resize'));
  expect(document.documentElement.style.getPropertyValue('--academy-visible-height')).toBe('480px');
  input.blur();viewport.height=844;viewport.dispatchEvent(new Event('resize'));
  expect(document.documentElement.style.getPropertyValue('--academy-visible-height')).toBe('844px');
  expect(document.body.classList.contains('native-keyboard-open')).toBe(false);
});

it('does not reflow the app when the user pinch zooms',()=>{
  Object.assign(viewport,{scale:2,height:400});viewport.dispatchEvent(new Event('resize'));
  expect(document.documentElement.style.getPropertyValue('--academy-visible-height')).toBe('844px');
});

async function keyboardHandlers(){
  await vi.waitFor(()=>expect(keyboard.addListener).toHaveBeenCalledWith('keyboardDidShow',expect.any(Function)));
  const calls=keyboard.addListener.mock.calls as [string,(payload?:{keyboardHeight:number})=>void][];
  return {
    show:calls.find(([event])=>event==='keyboardDidShow')![1],
    hide:calls.find(([event])=>event==='keyboardDidHide')![1],
  };
}

it('shrinks the app using the native keyboard height when the viewport does not resize',async()=>{
  const {show,hide}=await keyboardHandlers();
  const input=document.createElement('textarea');document.body.append(input);input.focus();
  show({keyboardHeight:340});
  // Viewport stayed at 844 (Android edge-to-edge), so the full keyboard is subtracted once.
  expect(document.documentElement.style.getPropertyValue('--academy-visible-height')).toBe('504px');
  expect(document.body.classList.contains('native-keyboard-open')).toBe(true);
  expect(document.body.style.getPropertyValue('--academy-keyboard-height')).toBe('340px');
  hide();
  expect(document.documentElement.style.getPropertyValue('--academy-visible-height')).toBe('844px');
  expect(document.body.classList.contains('native-keyboard-open')).toBe(false);
});

it('does not subtract the keyboard twice when the viewport already shrank',async()=>{
  const {show,hide}=await keyboardHandlers();
  const input=document.createElement('textarea');document.body.append(input);input.focus();
  viewport.height=504;viewport.dispatchEvent(new Event('resize'));
  show({keyboardHeight:340});
  expect(document.documentElement.style.getPropertyValue('--academy-visible-height')).toBe('504px');
  expect(document.body.style.getPropertyValue('--academy-keyboard-height')).toBe('340px');
  hide();viewport.height=844;viewport.dispatchEvent(new Event('resize'));
  expect(document.documentElement.style.getPropertyValue('--academy-visible-height')).toBe('844px');
});

it('ignores the native keyboard height while the user pinch zooms',async()=>{
  const {show}=await keyboardHandlers();
  Object.assign(viewport,{scale:2});
  show({keyboardHeight:340});
  expect(document.documentElement.style.getPropertyValue('--academy-visible-height')).toBe('844px');
  expect(document.body.classList.contains('native-keyboard-open')).toBe(false);
});
