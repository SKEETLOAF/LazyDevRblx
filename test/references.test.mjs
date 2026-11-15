import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decodeReference,ReferenceMediaError} from '../src/reference-media.mjs';
import {ReferenceStore,ReferenceInputError} from '../src/references.mjs';
import {encodeRgbaPng,ViewportStore} from '../src/viewport.mjs';

const tinyGif=Buffer.from('R0lGODlhAgABAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQICAAAACwAAAAAAgABAAAIBQABAAgIACH5BAgQAAAALAAAAAACAAEAgQAA/wAAAAAAAAAAAAgFAAEACAgAOw==','base64');
const sample=(r=240,g=40,b=20)=>encodeRgbaPng(Buffer.from([r,g,b,255,r,g,b,255]),2,1);
test('PNG preserves actual pixels and returns grounded palette metrics',()=>{
  const data=decodeReference(sample());assert.equal(data.format,'png');
  assert.equal(data.frames.length,1);assert.deepEqual([...data.frames[0].pixels.slice(0,4)],[240,40,20,255]);
  const store=new ReferenceStore();const meta=store.ingest(sample(),{label:'Orb explosion',mediaType:'image/png'});
  assert.equal(meta.quantitativeAvailable,true);assert.equal(meta.frameCount,1);
  const r=store.read(meta.referenceId);assert.equal(r.images.length,1);
  assert.equal(r.images[0].mimeType,'image/png');assert.equal(r.analysis.frameMetrics[0].edgeFraction,0);
  assert.equal(r.analysis.qualityAssessment,'not_assessed');
  assert.equal(r.analysis.keyframeIndices[0],0);
});
test('GIF decoding deconstructs frame timing and peak visual change',()=>{
  const a=decodeReference(tinyGif,'image/gif');assert.equal(a.format,'gif');
  assert.equal(a.frames.length,2);assert.deepEqual(a.frames.map(f=>f.durationMs),[80,160]);
  assert.equal(a.loopCount,0);assert.equal(a.frames[0].pixels[0],255);
  assert.equal(a.frames[1].pixels[2],255);
  const store=new ReferenceStore();const r=store.read(store.ingest(tinyGif,{label:'Impact reference'}).referenceId);
  assert.equal(r.metadata.totalDurationMs,240);assert.equal(r.images.length,2);
  assert.equal(r.images[0].atMs,0);assert.equal(r.images[1].atMs,80);
  assert.equal(r.analysis.frameMetrics[1].changedSampleFraction,1);
  assert.equal(r.analysis.peakVisualChange.frameIndex,1);
  assert.ok(r.analysis.frameMetrics.every(f=>f.luminanceGrid3x3.length===9));
});
test('JPEG and WebP provide model-visible pixels but no fabricated color scores',()=>{
  const jpeg=Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAADAAQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDxyiiiv3E8w//Z','base64');
  const webp=Buffer.from('UklGRjoAAABXRUJQVlA4IC4AAACQAQCdASoEAAMAAUAmJaACdLoAA5gA/vtV4/+lwf/S4P/pcH/pcH8bss4bpAAA','base64');
  for(const [data,type] of [[jpeg,'jpeg'],[webp,'webp']]){
    const store=new ReferenceStore();const meta=store.ingest(data,{label:type});
    assert.equal(meta.format,type);assert.equal(meta.quantitativeAvailable,false);
    assert.equal(meta.width,4);assert.equal(meta.height,3);
    const ref=store.read(meta.referenceId);
    assert.equal(ref.images[0].mimeType,type==='jpeg'?'image/jpeg':'image/webp');
    assert.deepEqual(ref.images[0].bytes,data);
    assert.deepEqual(ref.analysis.frameMetrics,[]);
  }
});
test('reference files are bounded, validate labels and actual signatures',()=>{
  const store=new ReferenceStore();
  assert.throws(()=>store.ingest(sample(),{label:''}),ReferenceInputError);
  assert.throws(()=>store.ingest(sample(),{label:'\r\nHTTP'}),ReferenceInputError);
  assert.throws(()=>store.ingest(sample(),{label:'a'.repeat(101)}),ReferenceInputError);
  assert.throws(()=>store.ingest(sample(),{label:'Test',mediaType:'image/gif'}),ReferenceInputError);
  assert.throws(()=>store.ingest(Buffer.from('hello world'),{label:'Test'}),ReferenceInputError);
  assert.throws(()=>decodeReference(Buffer.alloc(8*1024*1024+1)),ReferenceMediaError);
  assert.throws(()=>decodeReference(tinyGif.subarray(0,40)),ReferenceMediaError);
  assert.throws(()=>decodeReference(sample().subarray(0,30)),ReferenceMediaError);
  assert.equal(store.list().length,0);
});
test('imported reference snapshots are immutable and finite in memory',()=>{
  const store=new ReferenceStore();const bytes=sample();
  const first=store.ingest(bytes,{label:'first'});bytes[50]=0;
  assert.equal(store.read(first.referenceId).images[0].bytes[0],137);
  for(let i=0;i<8;i++)store.ingest(sample(),{label:'ref'+i});
  assert.equal(store.list().length,6);
  assert.throws(()=>store.read(first.referenceId),/expired/);
});
test('viewport compare returns measured deltas but explicitly no artistic verdict',()=>{
  const store=new ReferenceStore();const v=new ViewportStore();
  const ref=store.ingest(sample(240,40,20),{label:'reference'});
  const view=v.inspect({pixels:Buffer.from([20,100,230,255,20,100,230,255]),width:2,height:1});
  const result=store.compare(ref.referenceId,view.viewportId,v);
  assert.equal(result.qualityVerdict,'not_assessed');
  assert.equal(result.comparisonMode,'summary_statistics_only');
  assert.notEqual(result.viewportMinusReference.saturationMean,undefined);
  assert.match(result.warning,/No camera, subject, frame timing, or spatial alignment/);
  assert.throws(()=>store.compare('does-not-exist',view.viewportId,v),/expired/);
});
