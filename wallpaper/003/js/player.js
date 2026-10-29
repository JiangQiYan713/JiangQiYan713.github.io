/* NOCTURNE / self-contained offline wallpaper runtime.
 * Art, layers and all animation parameters come from config/config.js.
 * No per-pixel interpolation, mesh deformation or hair alpha crossfades.
 * Each hair frame is a separately painted fully registered transparent PNG.
 */
(() => {
  'use strict';
  const cfg = window.WALLPAPER_CONFIG;
  const status = document.getElementById('boot-status');
  if (!cfg || !Array.isArray(cfg.layers)) {
    status.textContent = '配置加载失败：检查 config/config.js';
    console.error('NOCTURNE: missing valid offline manifest');
    return;
  }
  const SCENE_W = cfg.coordinateSystem.width;
  const SCENE_H = cfg.coordinateSystem.height;
  const PIXELS = cfg.coordinateSystem.pixelScale;
  const stage = document.getElementById('scene');
  const cityStage = document.getElementById('city-stage');
  const actorStage = document.getElementById('actor-stage');
  const pCanvas = document.getElementById('particles');
  const pctx = pCanvas.getContext('2d', { alpha: true });
  const state = { ...cfg.defaults };
  const mouse = { x: -9999, y: -9999, normX: 0, normY: 0, active: false };
  const parallax = { bgX:0,bgY:0,actorX:0,actorY:0 };
  const sprites = {};
  const layers = new Map();
  const pending = [];
  const missing = new Set();
  let pointDpr = 1, viewportW = innerWidth, viewportH = innerHeight;
  let start = performance.now(), last = start, lastLight = 0, activeParticleCount = 0;
  let cityCtx, cityCanvas, particles = [], loadingCount=0, loadedCount=0;
  let currentFrame = -1;
  const easing = (v,a,t) => v+(a-v)*t;
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const seeded = (s) => { let a=s>>>0; return () => {a += 0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};};
  const rand=seeded(9172026);

  function resetViewport() {
    viewportW = innerWidth; viewportH = innerHeight;
    // cover, not contain: never introduce blurred vertical/horizontal fill bands
    const scale = Math.max(viewportW / SCENE_W, viewportH / SCENE_H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
    pointDpr = Math.min(window.devicePixelRatio || 1, 2);
    pCanvas.width = Math.max(1,Math.round(viewportW*pointDpr));
    pCanvas.height = Math.max(1,Math.round(viewportH*pointDpr));
    pctx.setTransform(pointDpr,0,0,pointDpr,0,0);
    createParticles();
  }
  function makeLayerElement(layer) {
    const isCity = layer.id === 'city';
    const target = isCity ? cityStage : actorStage;
    const el = document.createElement(layer.kind==='sequence'?'canvas':'img');
    const b = layer.bounds;
    el.className = 'scene-item'; el.id = `asset-${layer.id}`;
    el.style.left=`${b.x}px`;el.style.top=`${b.y}px`;
    el.style.width=`${b.width*layer.scale}px`;el.style.height=`${b.height*layer.scale}px`;
    el.style.opacity=String(layer.opacity); el.style.zIndex=String(layer.zIndex);
    if(layer.kind==='sequence') {
      el.width=b.width*PIXELS;el.height=b.height*PIXELS;
      el.setAttribute('aria-hidden','true');
    } else {
      el.draggable=false;
      el.src=`./${layer.path}`;
      el.onerror=() => {missing.add(layer.path);updateError();};
    }
    target.appendChild(el);
    const obj={config:layer,element:el,ctx:layer.kind==='sequence'?el.getContext('2d',{alpha:true}):null,images:[],lastDrawn:-1,readyCount:0};
    layers.set(layer.id,obj);
    return obj;
  }
  function framePath(layer,i) {
    // Config-driven substitution. All paths are local and relative to index.html.
    return './'+layer.path.replace(/\{frame(?::0?(\d+)d)?\}/g,(_all,n)=>String(i).padStart(n?Number(n):3,'0'));
  }
  function drawFrame(obj,i) {
    if(obj.lastDrawn===i) return;
    const image = obj.images[i];
    if(!image || !image.complete || !image.naturalWidth) return;
    obj.ctx.clearRect(0,0,obj.element.width,obj.element.height);
    obj.ctx.drawImage(image,0,0,obj.element.width,obj.element.height);
    obj.lastDrawn=i;
  }
  function loadFrames() {
    for(const obj of layers.values()) {
      const {config:layer}=obj;
      if(layer.kind!=='sequence') continue;
      const count=layer.animation.frameCount;
      obj.images=new Array(count);
      for(let i=0;i<count;i++) {
        pending.push({obj,i,url:framePath(layer,i),priority:i===0?0:i<8?1:2});
      }
    }
    pending.sort((a,b)=>a.priority-b.priority||a.i-b.i);
    const total=pending.length;
    let cursor=0;
    async function worker() {
      while(cursor<total) {
        const task=pending[cursor++];
        try {
          const im=await new Promise((resolve,reject)=>{
            const image=new Image();image.onload=()=>resolve(image);
            image.onerror=()=>reject(new Error(task.url));image.src=task.url;
          });
          // decode() on a preloaded local file avoids a blank flash on first presentation.
          if (im.decode) {try{await im.decode();}catch(_e){}}
          task.obj.images[task.i]=im;
          task.obj.readyCount++;loadedCount++;
          if(task.i===0) drawFrame(task.obj,0);
        } catch(e) {missing.add(task.url);updateError();}
      }
    }
    return Promise.all(Array.from({length:6},worker)).then(()=>{
      if(!missing.size) {
        status.textContent=`已加载 ${loadedCount}/${total} 个发丝 PNG 帧，离线播放就绪`;
        document.getElementById('status-line').textContent=`${loadedCount}/${total} 帧已就绪`;
      }
      start=performance.now();
      document.dispatchEvent(new CustomEvent('nocturne-ready',{detail:{count:loadedCount,missing:[...missing]}}));
    });
  }
  function updateError() {
    const msg=`有 ${missing.size} 个资源加载失败，请解压整个 ZIP 后打开 index.html`;
    status.textContent=msg;
    document.getElementById('status-line').textContent=msg;
    console.warn('NOCTURNE resource errors:',[...missing]);
  }
  function setupCityLights(){
    cityCanvas=document.createElement('canvas');
    cityCanvas.id='city-window-lights';cityCanvas.className='scene-item';
    cityCanvas.width=SCENE_W*PIXELS;cityCanvas.height=SCENE_H*PIXELS;
    Object.assign(cityCanvas.style,{left:'0px',top:'0px',width:`${SCENE_W}px`,height:`${SCENE_H}px`,zIndex:'1'});
    cityStage.appendChild(cityCanvas);
    cityCtx=cityCanvas.getContext('2d',{alpha:true});cityCtx.setTransform(PIXELS,0,0,PIXELS,0,0);
  }
  function cityLights(now){
    if(!cityCtx) return;
    const lightCfg=cfg.environment.lights;
    const seconds=now/1000;
    cityCtx.setTransform(1,0,0,1,0,0);
    cityCtx.clearRect(0,0,cityCanvas.width,cityCanvas.height);
    cityCtx.setTransform(PIXELS,0,0,PIXELS,0,0);
    if(!state.cityLightsEnabled) return;
    const lights=lightCfg.windows;
    for(let i=0;i<lights.length;i++) {
      const w=lights[i];
      // Flicker is deterministic and local to an actual aperture, not arbitrary facade coordinates.
      // A slow base oscillation is blended with sparser electrical jitter.
      const breath=Math.sin(seconds*w.speed*.8+w.phase);
      const jitter=Math.sin(seconds*(w.speed*3.12)+w.phase*3.7);
      const pulse=(.55+.33*breath+.12*jitter);
      const alpha=clamp(w.base*state.lightIntensity*(.35+lightCfg.flicker*pulse),0,.96);
      if(alpha<.085)continue;
      cityCtx.globalAlpha=alpha;
      cityCtx.fillStyle=w.color;
      cityCtx.fillRect(w.x,w.y,w.w,w.h);
      if(i%11===0 && alpha>.35){
        cityCtx.globalAlpha=alpha*.13;
        cityCtx.fillRect(w.x-.6,w.y-.4,w.w+1.2,w.h+.8);
      }
    }
    cityCtx.globalAlpha=1;
  }
  function ambientFilters() {
    cityStage.style.setProperty('--city-brightness',state.backgroundBrightness);
    cityStage.style.setProperty('--city-saturation',state.saturation);
    cityStage.style.setProperty('--city-blur',state.backgroundBlur+'px');
  }
  function loadSprites(){
    Object.entries(cfg.environment.particles.sprites).forEach(([name,url])=>{
      const im=new Image();im.src='./'+url;
      im.onload=()=>sprites[name]=im;
      im.onerror=()=>{missing.add(url);updateError();};
    });
  }
  function newParticle(i){
    const ty=rand();
    const kind=ty<.22?'heart':ty<.57?'sparkle':'orb';
    return {
      x:rand()*viewportW,y:rand()*viewportH,vx:(rand()-.5)*.4,vy:-.15-rand()*.45,
      kind,scale:(kind==='heart'?7:kind==='sparkle'?5:3)+rand()*(kind==='heart'?13:13),
      alpha:.2+rand()*.55,phase:rand()*Math.PI*2,rot:rand()*Math.PI*2,spin:(rand()-.5)*.005,
      drift:(rand()-.5)*.014
    };
  }
  function createParticles(){
    const target=Math.max(0,Math.round(cfg.environment.particles.count*state.particleDensity));
    if(target>particles.length){for(let i=particles.length;i<target;i++)particles.push(newParticle(i));}
    activeParticleCount=target;
  }
  function animateParticles(now,dt){
    pctx.clearRect(0,0,viewportW,viewportH);
    if(!state.particlesEnabled)return;
    const params=cfg.environment.particles;
    const radius=params.radius;
    const mul=clamp(dt/16.666,0,2);
    for(let i=0;i<activeParticleCount;i++) {
      const p=particles[i];if(!p)continue;
      const dx=p.x-mouse.x, dy=p.y-mouse.y;
      const dist=Math.hypot(dx,dy);
      if(mouse.active&&dist<radius&&dist>1){
        const power=Math.pow(1-dist/radius,1.6)*state.mouseForce;
        // Repulsion plus rotational drift: direction, distribution AND velocity respond live to pointer.
        p.vx+=((dx/dist)*params.repulsion-(dy/dist)*params.swirl)*power*mul;
        p.vy+=((dy/dist)*params.repulsion+(dx/dist)*params.swirl)*power*mul;
      }
      p.vx=clamp(p.vx*.988+p.drift*mul,-3.2,3.2);
      p.vy=clamp(p.vy*.991+params.gravity*mul,-2.6,2.6);
      p.x+=p.vx*mul;p.y+=p.vy*mul;
      p.rot+=p.spin*mul;
      if(p.x< -35)p.x=viewportW+25;
      else if(p.x>viewportW+35)p.x=-25;
      if(p.y< -38){p.y=viewportH+28;p.x=rand()*viewportW; p.vy=-.15-rand()*.4;}
      else if(p.y>viewportH+38)p.y=-20;
      const img=sprites[p.kind];if(!img||!img.complete)continue;
      const twinkle=.72+.28*Math.sin(now*.0011+p.phase);
      pctx.save();pctx.globalAlpha=p.alpha*twinkle;
      pctx.translate(p.x,p.y);pctx.rotate(p.rot);
      pctx.drawImage(img,-p.scale,-p.scale,2*p.scale,2*p.scale);
      pctx.restore();
    }
  }
  function animate(now) {
    const dt=Math.min(55,now-last);last=now;
    // Smooth whole-group parallax preserves all registration points including hair roots.
    const desiredBGx=mouse.normX*2.5*state.parallaxAmount;
    const desiredBGy=mouse.normY*1.6*state.parallaxAmount;
    const desiredActorx=mouse.normX*2.5*state.parallaxAmount;
    const desiredActory=mouse.normY*1.6*state.parallaxAmount;
    parallax.bgX=easing(parallax.bgX,desiredBGx,.045);
    parallax.bgY=easing(parallax.bgY,desiredBGy,.045);
    parallax.actorX=easing(parallax.actorX,desiredActorx,.045);
    parallax.actorY=easing(parallax.actorY,desiredActory,.045);
    cityStage.style.transform=`translate3d(${parallax.bgX.toFixed(2)}px,${parallax.bgY.toFixed(2)}px,0)`;
    actorStage.style.transform=`translate3d(${parallax.actorX.toFixed(2)}px,${parallax.actorY.toFixed(2)}px,0)`;
    if(state.animationEnabled) {
      const elapsed=(now-start)/1000;
      for(const obj of layers.values()) {
        const layer=obj.config;if(layer.kind!=='sequence')continue;
        const a=layer.animation;
        const frame=(Math.floor(elapsed*a.fps*a.playbackSpeed*state.windSpeed+a.phase*a.frameCount)%a.frameCount+a.frameCount)%a.frameCount;
        drawFrame(obj,frame);
        currentFrame=frame;
      }
    }
    if(now-lastLight>=1000/cfg.environment.lights.fps){cityLights(now);lastLight=now;}
    animateParticles(now,dt);
    requestAnimationFrame(animate);
  }
  function setupControls() {
    const panel=document.getElementById('settings-panel'),toggle=document.getElementById('settings-toggle');
    function show(b){panel.hidden=!b;toggle.setAttribute('aria-expanded',String(b));}
    toggle.addEventListener('click',()=>show(panel.hidden));
    document.getElementById('settings-close').addEventListener('click',()=>show(false));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')show(false);});
    const present=(key,value)=>{
      if(['windSpeed','mouseForce','lightIntensity','parallaxAmount'].includes(key)) return Number(value).toFixed(2)+'×';
      if(['particleDensity','backgroundBrightness','saturation'].includes(key)) return Math.round(value*100)+'%';
      if(key==='backgroundBlur')return Number(value).toFixed(1)+' px';
      return String(value);
    };
    const inputs=Array.from(document.querySelectorAll('[data-config]'));
    function render(){
      for(const input of inputs){
        const key=input.dataset.config;
        if(input.type==='checkbox')input.checked=Boolean(state[key]);else input.value=state[key];
        const output=document.getElementById(key+'-value');if(output)output.textContent=present(key,state[key]);
      }
      ambientFilters();createParticles();
    }
    inputs.forEach(input=>input.addEventListener('input',()=>{
      const key=input.dataset.config;
      state[key]=input.type==='checkbox'?input.checked:Number(input.value);
      const output=document.getElementById(key+'-value');
      if(output)output.textContent=present(key,state[key]);
      if(['particleDensity'].includes(key))createParticles();
      if(['backgroundBrightness','backgroundBlur','saturation'].includes(key))ambientFilters();
    }));
    document.getElementById('reset-settings').addEventListener('click',()=>{Object.assign(state,cfg.defaults);render();});
    render();
  }
  function setupPointer() {
    window.addEventListener('pointermove',(e)=>{
      mouse.x=e.clientX;mouse.y=e.clientY;mouse.active=true;
      mouse.normX=clamp((e.clientX/viewportW-.5)*2,-1,1);
      mouse.normY=clamp((e.clientY/viewportH-.5)*2,-1,1);
    },{passive:true});
    document.addEventListener('pointerleave',()=>{
      mouse.active=false;mouse.normX=0;mouse.normY=0;
    });
  }
  function init(){
    cfg.layers.sort((a,b)=>a.zIndex-b.zIndex).forEach(makeLayerElement);
    setupCityLights();loadSprites();setupControls();setupPointer();
    window.addEventListener('resize',resetViewport,{passive:true});
    resetViewport();cityLights(performance.now());
    window.__NOCTURNE_DEBUG__={state,layers,missing,config:cfg,getCurrentFrame:()=>currentFrame,cityLightCount:cfg.environment.lights.windows.length};
    loadFrames();requestAnimationFrame(animate);
  }
  init();
})();
