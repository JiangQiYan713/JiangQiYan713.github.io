(()=>{
'use strict';
const conf=window.OC_SCENE_CONFIG;
const canvas=document.querySelector('#wallpaper');
const ctx=canvas.getContext('2d',{alpha:false,desynchronized:true});
const status=document.querySelector('#loadStatus');
const hud=document.querySelector('.hud');
const dims={w:0,h:0,dpr:1};
const mouse={x:-10000,y:-10000,active:false};
const TAU=Math.PI*2;
let assets={},particles=[],ready=false,last=0,debug=false,soloLayer=null;
const layers=[...conf.layers].sort((a,b)=>a.order-b.order);
const fileName=i=>`frame_${String(i).padStart(3,'0')}.png`;
function loadImage(path){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error(path));img.src=path;});}
async function loadAssets(){
  status.textContent='正在载入四层动画资源…';
  for(const layer of layers){
    let paths=Array.from({length:layer.frames},(_,i)=>`scene_pack/${layer.directory}/${fileName(i)}`);
    assets[layer.id]=await Promise.all(paths.map(loadImage));
  }
  ready=true;resize();requestAnimationFrame(loop);
  status.textContent='资源已就绪 · 4 层 / 66 帧';
  setTimeout(()=>document.querySelector('.loading').classList.add('loaded'),650);
}
function resize(){
  dims.w=innerWidth;dims.h=innerHeight;dims.dpr=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.floor(dims.w*dims.dpr);canvas.height=Math.floor(dims.h*dims.dpr);
  ctx.setTransform(dims.dpr,0,0,dims.dpr,0,0);
  const n=dims.w<800?conf.particles.countMobile:conf.particles.countDesktop;
  particles=Array.from({length:n},(_,i)=>({x:Math.random()*dims.w,y:Math.random()*dims.h,vx:0,vy:0,size:0.8+Math.random()*1.7,seed:Math.random()*TAU,speed:4+Math.random()*11,color:conf.particles.palette[i%conf.particles.palette.length]}));
}
function sceneRect(){
  const s=Math.max(dims.w/conf.designSize[0],dims.h/conf.designSize[1]);
  return {s,ox:(dims.w-conf.designSize[0]*s)*0.5,oy:(dims.h-conf.designSize[1]*s)*0.5};
}
function frameIndex(layer,t){
  if(layer.frames===1)return 0;
  const p=t*layer.fps+(layer.phase||0)*layer.frames;
  return ((Math.floor(p)%layer.frames)+layer.frames)%layer.frames;
}
function drawSceneLayers(t){
  const {s,ox,oy}=sceneRect();
  for(const layer of layers){
    if(debug&&soloLayer&&layer.id!==soloLayer)continue;
    const img=assets[layer.id][frameIndex(layer,t)];
    ctx.save();
    if(layer.filter){ctx.filter=`blur(${layer.filter.blur||0}px) brightness(${layer.filter.brightness??1})`;}
    ctx.globalAlpha=layer.alpha??1;
    const x=ox+(layer.position[0])*s,y=oy+(layer.position[1])*s;
    ctx.drawImage(img,x,y,layer.size[0]*s,layer.size[1]*s);
    ctx.restore();
  }
}
function drawCityLights(t){
  if(debug&&soloLayer&&soloLayer!=='background')return;
  const {s,ox,oy}=sceneRect();
  ctx.save();
  for(const spot of conf.windowLights.points){
    const wave=Math.pow((1+Math.sin(t*spot.speed+spot.phase))*0.5,7);
    const alpha=spot.strength*wave;
    if(alpha<0.018)continue;
    const x=ox+spot.x*s,y=oy+spot.y*s,sz=spot.size*s;
    ctx.globalAlpha=alpha;
    ctx.fillStyle='#fff0fc';
    ctx.fillRect(x,y,Math.max(1,sz*1.2),Math.max(1.2,sz*1.9));
  }
  ctx.restore();
}
function drawParticles(t,dt){
  if(debug&&soloLayer)return;
  for(const p of particles){
    p.vx*=Math.pow(0.92,dt*60);p.vy*=Math.pow(0.92,dt*60);
    p.vx+=Math.cos(p.seed+t*0.29)*0.008;
    p.vy-=0.0035;
    if(mouse.active){
      const dx=p.x-mouse.x,dy=p.y-mouse.y;
      const distance=Math.hypot(dx,dy);
      if(distance<conf.particles.radius&&distance>0.1){
        const f=(1-distance/conf.particles.radius)**2*conf.particles.repelForce;
        p.vx+=(dx/distance)*f*dt;
        p.vy+=(dy/distance)*f*dt;
      }
    }
    p.x+=(p.vx+Math.sin(t*0.6+p.seed)*0.15)*dt*60;
    p.y+=(p.vy-p.speed*0.025)*dt*60;
    if(p.x<-10)p.x=dims.w+10;
    if(p.x>dims.w+10)p.x=-10;
    if(p.y<-10){p.y=dims.h+10;p.x=Math.random()*dims.w;}
    ctx.globalAlpha=0.22+0.35*(0.5+0.5*Math.sin(t*0.85+p.seed));
    ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,TAU);ctx.fill();
  }
  ctx.globalAlpha=1;
}
function loop(time){
  if(!ready)return;
  const t=time/1000,dt=Math.min(Math.max((time-last)/1000,0),0.05)||0.016;last=time;
  ctx.fillStyle=debug&&soloLayer?'#656174':'#0b0619';ctx.fillRect(0,0,dims.w,dims.h);
  drawSceneLayers(t);drawCityLights(t);drawParticles(t,dt);
  requestAnimationFrame(loop);
}
addEventListener('resize',()=>ready&&resize());
addEventListener('pointermove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true;});
addEventListener('pointerleave',()=>mouse.active=false);
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k==='h')hud.classList.toggle('hidden');
  if(k==='d'){debug=!debug;soloLayer=null;hud.classList.remove('hidden');}
  if(debug){
    if(k==='0'){soloLayer=null;}
    else if('1234'.includes(k)&&k.length===1){soloLayer=layers[Number(k)-1]?.id||null;}
  }
  document.querySelector('#debugState').textContent=debug?('检查模式 '+(soloLayer||'全部图层')):'按 D 检查图层';
});
loadAssets().catch(e=>{console.error(e);status.textContent='资源载入失败：'+e.message;});
})();
