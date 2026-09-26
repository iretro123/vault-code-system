import { describe, expect, it } from 'vitest';
import { verifyChartPng } from '../../workers/pulse-spy/capture-quality.js';

function png(width=2400,height=1400){
  const bytes=new Uint8Array(11000);bytes.set([137,80,78,71,13,10,26,10]);
  const header=new DataView(bytes.buffer);header.setUint32(8,13);header.setUint32(12,0x49484452);header.setUint32(16,width);header.setUint32(20,height);
  return bytes;
}
describe('original chart resolution',()=>{
  const bounds={width:1200,height:700};
  it('records true pixel dimensions for a 2x chart export',()=>{
    expect(verifyChartPng(png(),bounds)).toEqual({width:2400,height:1400,scale:2});
  });
  it('rejects JPEG or arbitrary bytes regardless of their file size',()=>{
    const bytes=new Uint8Array(11000);bytes.set([255,216,255]);
    expect(()=>verifyChartPng(bytes,bounds)).toThrow('chart-image-invalid');
  });
  it('rejects a 1x PNG instead of upscaling it',()=>{
    expect(()=>verifyChartPng(png(1200,700),bounds)).toThrow('chart-resolution-unavailable');
  });
  it('rejects an unrelated larger capture that does not match the chart area',()=>{
    expect(()=>verifyChartPng(png(2400,2200),bounds)).toThrow('chart-resolution-unavailable');
  });
  it('allows subpixel rounding and respects a typed-array byte offset',()=>{
    const storage=new Uint8Array(12000);storage.set(png(),37);
    expect(verifyChartPng(storage.subarray(37,11037),{width:1199.75,height:700.25})).toEqual({width:2400,height:1400,scale:2});
  });
});
