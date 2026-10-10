/** Native SVG conveyor. No raster artwork, image slices, or erased backgrounds. */
import { mk, pointer, register, spring, stepS, tween, tset, tval, tdone, reducedMotion, disposer } from './kernel';
export type StationId = 'lead' | 'call' | 'action';
export type SelectionSource = 'pointer' | 'keyboard' | 'touch';
export interface ConveyorMountOptions {
  stage:HTMLElement; svg:SVGSVGElement;
  onStationChange?:(station:StationId|null,source:SelectionSource|null,anchor?:{xPercent:number;yPercent:number})=>void;
  speed?:number; viewBox?:{width:number;height:number};
}
export interface ConveyorInstance {
  setStation(station:StationId|null,source?:SelectionSource):void;
  setSpeed(speed:number):void;setPaused(paused:boolean):void;destroy():void;
}
let instanceId=0;
export function mountBusinessConveyor({stage,svg,onStationChange,speed=1}:ConveyorMountOptions):ConveyorInstance {
  const bag=disposer(),prefix=`conveyor-${++instanceId}`;
  const root=mk('g',{},svg);
  const g=(parent:Element=root,attrs:Record<string,string|number>={})=>mk('g',attrs,parent);
  const p=(d:string,parent:Element=root,cls='sil')=>mk('path',{d,class:cls},parent);
  const detail=(d:string,parent:Element=root)=>p(d,parent,'nf lo');
  const oval=(cx:number,cy:number,rx:number,ry:number,parent:Element=root)=>mk('ellipse',{cx,cy,rx,ry,class:'sil'},parent);
  const defs=mk('defs',{},svg);
  // Subtle vector shading describes curved solid surfaces without raster assets.
  const surface=mk('linearGradient',{id:`${prefix}-surface`,x1:0,y1:0,x2:0,y2:1},defs);
  mk('stop',{offset:'0%','stop-color':'#fff'},surface);
  mk('stop',{offset:'100%','stop-color':'#eeeeeb'},surface);
  const face=(d:string,parent:Element=root)=>{
    const el=p(d,parent);el.setAttribute('style',`fill:url(#${prefix}-surface)`);return el;
  };
  function bearing(x:number,y:number,r:number,parent:Element=root) {
    oval(x,y,r,r*1.06,parent);oval(x,y,r*.52,r*.57,parent);
    detail(`M${x-r*.2} ${y-r*.7}q${r*.8} 0 ${r*.8} ${r*.9}`,parent);
  }
  function foot(x:number,y:number,h:number,parent:Element=root) {
    face(`M${x} ${y}l13 2v${h}l-13-2Z`,parent);
    p(`M${x-10} ${y+h}l17-5 19 6v8l-18 6-18-5Z`,parent);
    detail(`M${x-10} ${y+h}l18 5 18-4M${x+8} ${y+h+5}v8`,parent);
  }
  // Rounded calendar stand. Its four-by-three grid follows the paper plane.
  const calendar=g();
  p('M1428 109l27 132-45 21-12-20Z',calendar);
  detail('M1428 117l20 118-35 15',calendar);
  face('M1242 68q0-5 6-4l181 40 5 8-24 150-192-40Z',calendar);
  p('M1244 68l182 40-25 148-190-38Z',calendar);
  detail('M1248 74l171 39-22 134',calendar);
  for(let row=0;row<3;row++)for(let col=0;col<4;col++) {
    const x=1256+col*39-row*6,y=108+row*39+col*8;
    p(`M${x} ${y}l28 6-4 28-28-6Z`,calendar,'lo');
  }
  [1277,1332,1389].forEach((x,i)=>{
    const y=80+i*12;
    face(`M${x} ${y}c-18 4-14-35 2-35 17 0 12 25 7 25l-5-2c5-8 5-17-1-16-7 2-10 24-1 22Z`,calendar);
  });
  // Back supports attach to the conveyor body; none float below the belt.
  foot(1520,363,51);foot(1120,318,30);
  const bed=g();
  p('M187 213L1020 301 1084 257Q1091 253 1103 256L1512 325Q1557 337 1580 357L1533 396 1128 323 1048 390 188 266Z',bed);
  p('M194 211L1020 299 1085 256Q1091 253 1104 256L1517 326Q1537 331 1550 343L1510 376 1130 311 1050 368 192 246Z',bed);
  detail('M204 218l816 89 69-45 426 71M201 241l850 121 78-58 382 65',bed);
  for(let x=250;x<1030;x+=37)detail(`M${x} ${217+(x-250)*.107}l-49 35`,bed);
  for(let x=1148;x<1510;x+=37)detail(`M${x} ${264+(x-1148)*.169}l-44 40`,bed);
  detail('M1037 300l-56 57M1061 281l-52 61M1088 263l-50 88M1115 264l-52 82',bed);
  const beltClip=mk('clipPath',{id:`${prefix}-belt`,clipPathUnits:'userSpaceOnUse'},defs);
  p('M175 182L1020 281 1084 239 1558 317 1566 384 1130 325 1050 383 172 257Z',beltClip);
  const platen=g();
  face('M699 242l141 22q6 1 1 6l-41 34-142-24v-6Z',platen);
  p('M699 238l141 23q6 1 1 6l-41 31-142-24Z',platen);
  const cardLane=g(root,{'clip-path':`url(#${prefix}-belt)`});
  function dossier(parent:Element,transform:string) {
    const card=g(parent,{transform});
    face('M-41 33l103 17 48-33v7L65 59q-3 2-8 1L-44 43v-6Z',card);
    p('M-3 0q3-2 8-1l103 17q6 1 1 5L65 53q-3 2-8 1L-43 38q-5-1-1-4Z',card);
    detail('M-39 42L59 57l45-32',card);
    oval(9,19,10,5,card);
    detail('M-5 32q2-11 14-9 14 2 16 12M38 18l36 6M34 27l37 6M34 37l23 4',card);
    return card;
  }
  const cards=[0,1,2,3].map(i=>{
    const card=dossier(cardLane,'');card.setAttribute('data-moving-part',`dossier-${i}`);return card;
  });
  // Feeder follows the reference's continuous S-shaped housing and deep curved cheek.
  const feeder=g();
  face('M11 71Q7 30 117 1l29 9q9 3 11 16 3 41 25 57 31 18 47 53 11 25 39 29l44 10v24l-74-15q-45-9-67-37L86 135 20 119Z',feeder);
  p('M27 68Q24 35 117 10l24 8q4 43 20 64 12 15 33 27 16 11 29 40 12 25 47 30l32 7v12l-74-12-106-40-59-31Z',feeder);
  detail('M117 10v41M141 18l-1 37M150 88q18 17 33 23 14 10 29 42',feeder);
  function uprightCard(x:number,y:number,angle:number,parent:Element){
    const card=g(parent,{transform:`translate(${x} ${y}) rotate(${angle})`});
    face('M-7 5h105v77H-7Z',card);
    p('M0 0h97q5 0 5 6v71q0 5-5 5H0q-5 0-5-5V6q0-6 5-6Z',card);
    detail('M-9 8v68q0 8 8 10M-13 12v59q0 14 12 18',card);
    oval(25,28,9,11,card);
    detail('M11 51q0-13 13-13 14 0 14 14M48 24h36M48 35h31M47 47h35M12 65h68',card);
  }
  uprightCard(46,83,-19,feeder);uprightCard(89,138,-19,feeder);
  face('M11 70q-1 24 31 49 20 18 27 50 7 31 34 42 34 17 73 21v58q-100-12-144-50-21-18-21-46Z',feeder);
  p('M11 70q-1 24 31 49 20 18 27 50 7 31 34 42 34 17 73 21l10-7q-46-7-75-24-21-13-29-41-9-35-36-56Q23 84 27 68Z',feeder);
  detail('M20 110v83q0 39 58 64 39 17 88 22M175 236v45',feeder);
  oval(156,236,6,7,feeder);oval(161,273,1.5,1.5,feeder);
  foot(24,247,38,feeder);
  const feederCard=dossier(feeder,'translate(207 192) scale(1.05)');feederCard.setAttribute('data-moving-part','feeder-card');
  // Far gantry rail and upright, with a visible curved elbow and fasteners.
  const gantry=g();
  face('M625 109q-1-10 10-16l24-14 21 14-24 17-5 17Z',gantry);
  face('M659 79l99-44q12-2 25 7 6 5 6 17v45l-18 6V65l-91 39Z',gantry);
  p('M659 79l99-44q12-2 25 7l-109 48Z',gantry);
  face('M857 154l24-10q14-2 21 9v132l-28 12V169Z',gantry);
  p('M877 155l15 4v131l-15-3Z',gantry);
  detail('M890 166v107',gantry);oval(882,165,2,2,gantry);
  bearing(887,284,16,gantry);
  p('M695 92l73-29q8-2 7 8v9l-74 27Z',gantry);bearing(765,73,6,gantry);
  // Four suspension rods sit behind the receiver and travelling dossier.
  const rods=g();
  [701,715].forEach(x=>{
    face(`M${x} 143l6 1v115l-6-1Z`,rods);oval(x+3,258,8,3,rods);
    oval(x+3,265,8,3,rods);
  });
  [817,832].forEach(x=>{
    face(`M${x} 202l6 1v76l-6-1Z`,rods);oval(x+3,277,8,3,rods);oval(x+3,284,8,3,rods);
  });
  const handset=g(root,{'data-moving-part':'handset'});
  // Rounded earpiece cups, a broad arched handle, and inner crease.
  face('M685 122q-3-19 18-26 42-17 97 17 59 35 73 64 8 18 3 30-6 20-31 21-25 0-38-17-13-17 0-32-25-25-65-40-8 18-31 16-25-1-26-19Z',handset);
  face('M684 124q-8 17 4 27 15 12 35 6 17-4 20-17-30 4-59-16Z',handset);
  face('M807 181q-15 13-10 29 7 23 35 24 34 0 43-24l2-13q-10 21-36 19-25-2-34-35Z',handset);
  p('M685 122q2-20 25-25 43-9 90 23 47 30 68 63 12 21 4 28-25 12-45-2-2-39-72-72-29-14-48-10Z',handset);
  detail('M711 106q48-2 96 36 32 24 42 50M699 135q18 14 37 5M805 205q21 20 53 10',handset);
  [697,703,709,715].forEach(x=>oval(x,148,1,1,handset));
  [812,819,826,833].forEach((x,i)=>oval(x,219+i*1.6,1,1,handset));
  // Near rounded column and broad pivot housing anchor the telephone station.
  const upright=g();
  face('M625 109q0-15 15-17 16-2 24 14v224l-24 14-15-7Z',upright);
  p('M625 109q0-15 15-17 13 0 17 15v235l-32-6Z',upright);
  detail('M650 113v195',upright);bearing(640,113,8,upright);
  face('M611 289q0-21 21-20 19 2 25 22v64l-31 8-15-6Z',upright);
  p('M611 289q0-20 16-18 17 2 17 21v66l-33-5Z',upright);bearing(627,293,7,upright);
  // Press support with cylindrical cap, rounded head, and plunger.
  const press=g();
  face('M1149 150l27-18q14-7 23-2v146l-17 7-16-4V157Z',press);
  face('M1149 138l31-16q13-3 25 5 11 10 4 27l-45 23-15-18Z',press);
  bearing(1201,148,10,press);
  face('M1123 110l17 3v72l-17-3Z',press);oval(1132,183,13,4,press);
  face('M1117 101v31q12 10 29 0v-31Z',press);oval(1132,101,15,6,press);
  const pressHead=g(root,{'data-moving-part':'press'});
  face('M1080 188l33-18 63 11q6 1 6 7v43q0 6-7 10l-20 11-70-13q-5-1-5-7Z',pressHead);
  p('M1080 188l67 12q7 1 7 8v41l-69-12q-5-1-5-7Z',pressHead);
  detail('M1085 187l63 12 29-15',pressHead);
  p('M1105 217l9 10 16-16',pressHead,'nf sil');
  face('M1121 245l12 2v17l-12-2Z',press);oval(1127,266,12,4,press);oval(1127,273,12,4,press);
  // Receiver cradle and physical stack of rounded dossiers.
  const output=g();
  p('M1364 301l-10-3v49l14 3Z',output);p('M1354 298l9-5 10 4v49l-9 4v-46l-10-3Z',output);
  for(let i=0;i<11;i++)dossier(output,`translate(1454 ${303-i*4}) scale(1.05)`);
  // Front faces have rounded end rollers, following the exact two belt planes.
  const rail=g();
  face('M200 239L1034 363q20 2 21 20v13L203 267q-20-3-19-18 1-11 16-10Z',rail);
  p('M207 240l827 123q16 2 16 18t-19 17L207 276q-24-4-25-21 0-17 25-15Z',rail);
  detail('M214 247l815 122M214 270l815 122',rail);
  face('M1050 378l77-62v36l-69 44q-10 6-20 3Z',rail);
  face('M1127 316l371 66q21 4 26-11l45-24v23l-46 35q-8 8-26 4l-370-66Z',rail);
  p('M1127 316l371 66q18 3 18 19t-18 19l-371-69Z',rail);
  detail('M1135 325l356 63M1135 344l356 67',rail);
  [216,340,503,679,878,1034].forEach(x=>bearing(x,257+(x-216)*.146,10,rail));
  bearing(1500,401,9,rail);oval(1141,336,5,6,rail);
  // Continuous curled end and output guard, attached to the actual receiving bed.
  face('M1515 373l40-30q17-5 31 9 15 18-1 30l-60 35-18 2q29-18 8-46Z',rail);
  detail('M1531 370l33-22q12 0 18 11 5 9-5 16l-45 29',rail);
  p('M1511 375v-32q0-8 6-11l61-35q8-4 11 3v31l-7 4v-28l-62 35v30Z',rail);
  foot(250,285,31,rail);foot(506,322,33,rail);foot(1026,399,19,rail);foot(1492,419,14,rail);
  // The near pivot stands in front of the belt face.
  root.appendChild(upright);
  const ids:StationId[]=['lead','call','action'];
  const anchors=[{xPercent:15,yPercent:24},{xPercent:54,yPercent:18},{xPercent:72,yPercent:29}];
  let selected=-1,source:SelectionSource|null=null,paused=false,hidden=document.hidden,phase=0,userSpeed=speed;
  const rate=spring(1),phoneLift=tween(0),pressDrop=tween(0),feedLift=tween(0);
  let lastPhone=NaN,lastPress=NaN,lastFeed=NaN;
  const route=(x:number)=>x<990?195+(x-270)*.146:x<1100?300-(x-990)*.51:244+(x-1100)*.175;
  // Every machine follows a passing dossier on the same clock. Pausing freezes
  // that clock, so the belt and mechanisms cannot drift apart or snap on resume.
  const passingCard=(stationX:number)=>Math.max(...cards.map((_,i)=>{
    const x=270+(phase+i*295)%1180;
    const distance=Math.abs(x-stationX);
    return distance<65?(1+Math.cos(Math.PI*distance/65))/2:0;
  }));
  const loop=register(stage,(dt,now)=>{
    const speedSettling=stepS(rate,dt);
    const settling=speedSettling||!tdone(phoneLift,now)||!tdone(pressDrop,now)||!tdone(feedLift,now);
    const moving=!paused&&!hidden&&!reducedMotion();
    if(moving)phase=(phase+dt*70*rate.x*userSpeed)%1180;
    if(moving||dt===0)cards.forEach((card,i)=>{
      const x=270+(phase+i*295)%1180;
      card.setAttribute('transform',`translate(${x} ${route(x)}) scale(1.04)`);
    });
    const ambient=reducedMotion()?0:1;
    const l=tval(phoneLift,now)+ambient*5*passingCard(740);
    const d=tval(pressDrop,now)+ambient*8*passingCard(1130);
    const f=tval(feedLift,now)+ambient*3*(1-Math.cos(phase/295*Math.PI*2))/2;
    if(l!==lastPhone){handset.setAttribute('transform',`translate(0 ${-l})`);lastPhone=l;}
    if(d!==lastPress){pressHead.setAttribute('transform',`translate(0 ${d})`);lastPress=d;}
    if(f!==lastFeed){feederCard.setAttribute('transform',`translate(207 ${192-f}) scale(1.05)`);lastFeed=f;}
    return !hidden&&(moving||settling);
  });
  loop.wake();bag.add(loop.unregister);
  function select(index:number,nextSource:SelectionSource) {
    if(index===selected&&source===nextSource)return;
    selected=index;source=index<0?null:nextSource;rate.t=index<0?1:.25;
    const now=performance.now();tset(phoneLift,index===1?10:0,now,0);tset(pressDrop,index===2?10:0,now,0);tset(feedLift,index===0?7:0,now,0);
    [feederCard,handset,pressHead].forEach((part,i)=>part.querySelectorAll('.sil').forEach(el=>el.classList.toggle('hi',i===index)));
    onStationChange?.(index<0?null:ids[index],source,index<0?undefined:anchors[index]);loop.wake();
  }
  const hit=([px,py]:[number,number])=>{
    const rect=stage.getBoundingClientRect(),scale=Math.min(rect.width/1600,rect.height/460);
    const x=(px*rect.width/1600-(rect.width-1600*scale)/2)/scale;
    const y=(py*rect.height/460-(rect.height-460*scale)/2)/scale;
    const index=x>=10&&x<=310&&y>=0&&y<=295?0:
      x>=610&&x<=910&&y>=35&&y<=363?1:
      x>=1075&&x<=1460&&y>=55&&y<=310?2:-1;
    stage.style.cursor=index>=0?'pointer':'';
    return index;
  };
  bag.add(pointer(stage,{
    move:(point,e)=>{if(e.pointerType!=='touch')select(hit(point),'pointer');},
    down:(point,e)=>{const i=hit(point);select(e.pointerType==='touch'&&i===selected?-1:i,e.pointerType==='touch'?'touch':'pointer');},
    leave:()=>{stage.style.cursor='';if(source==='pointer')select(-1,'pointer');},
  },{width:1600,height:460}));
  bag.on(document,'visibilitychange',()=>{hidden=document.hidden;loop.wake();});
  bag.add(()=>svg.replaceChildren());
  return {setStation:(station,s='keyboard')=>select(station?ids.indexOf(station):-1,s),setSpeed:s=>{userSpeed=Math.max(0,s);loop.wake();},setPaused:p=>{paused=p;loop.wake();},destroy:bag.dispose};
}
