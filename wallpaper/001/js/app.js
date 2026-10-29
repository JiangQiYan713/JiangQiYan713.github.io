/* Offline canvas renderer. No fetch(), CORS, getImageData() or external dependencies. */
(function () {
  'use strict';
  const config = window.WALLPAPER_CONFIG;
  const canvas = document.getElementById('wallpaper');
  const statusEl = document.getElementById('loading-state');
  const ctx = canvas && canvas.getContext('2d', { alpha: false });
  if (!config || !ctx) {
    if (statusEl) statusEl.textContent = '配置或 Canvas 不可用。请确认文件已完整解压。';
    return;
  }
  const layers = [...config.layers].sort((a, b) => a.z - b.z);
  const defaults = config.defaults;
  const s = {
    width: innerWidth, height: innerHeight, dpr: 1,
    mouseX: innerWidth / 2, mouseY: innerHeight / 2,
    targetX: innerWidth / 2, targetY: innerHeight / 2,
    vx: 0, vy: 0, last: performance.now(), elapsed: 0,
    loaded: 0, total: layers.reduce((n, l) => n + l.frames.length, 0),
    ready: false, failed: [], assets: {}, particles: [],
    settings: Object.assign({}, defaults)
  };
  const lights = Array.isArray(window.WALLPAPER_LIGHTS) ? window.WALLPAPER_LIGHTS : [];
  window.WALLPAPER_DIAGNOSTICS = {state:s,lightsCount:lights.length};
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, w) => a + (b - a) * w;
  function updateStatus(text, error = false) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.classList.toggle('error', error);
    statusEl.hidden = !text;
  }
  function resize() {
    s.width = innerWidth; s.height = innerHeight;
    s.dpr = Math.min(devicePixelRatio || 1, 1.8);
    canvas.width = Math.max(1, Math.round(s.width * s.dpr));
    canvas.height = Math.max(1, Math.round(s.height * s.dpr));
    canvas.style.width = s.width + 'px';
    canvas.style.height = s.height + 'px';
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    rebuildParticles();
  }
  function loadImage(path) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let ended = false;
      const timeoutId = setTimeout(() => finish(false), 15000);
      function finish(ok) {
        if (ended) return;
        ended = true; clearTimeout(timeoutId);
        img.onload = img.onerror = null;
        if (ok && img.naturalWidth > 0) resolve(img);
        else reject(new Error('无法加载：' + path));
      }
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.decoding = 'async';
      img.src = path; // relative to index.html: works directly under file://
    });
  }
  async function loadOne(layer, index) {
    const path = layer.folder + layer.frames[index];
    try {
      const img = await loadImage(path);
      s.assets[layer.name][index] = img;
      s.loaded++;
      return true;
    } catch (err) {
      s.failed.push(path);
      console.error(err.message);
      return false;
    }
  }
  async function loadAssets() {
    for (const layer of layers) s.assets[layer.name] = Array(layer.frames.length).fill(null);
    updateStatus('正在加载初始画面…');
    // First show a usable wallpaper: only the five essential frame-zero sprites.
    await Promise.all(layers.map(l => loadOne(l, 0)));
    s.ready = true;
    const failedBase = layers.filter(l => !s.assets[l.name][0]);
    if (failedBase.length) {
      updateStatus('素材路径错误：' + failedBase.map(l => l.folder + l.frames[0]).join('、') + '\n请完整解压 ZIP 并从原目录打开 index.html。', true);
    } else {
      updateStatus('');
    }
    // Background load always reaches ready, even when a file is missing.
    // Secondary frames load opportunistically; playback uses frame 0 until ready.
    const jobs = [];
    for (const layer of layers) for (let i = 1; i < layer.frames.length; i++) jobs.push([layer, i]);
    for (let i = 0; i < jobs.length; i += 4) {
      await Promise.all(jobs.slice(i, i + 4).map(([layer, index]) => loadOne(layer, index)));
    }
    if (s.failed.length && !failedBase.length) {
      updateStatus('部分动画帧加载失败，已使用静态备份：' + s.failed.join('、'), true);
    }
  }
  function rebuildParticles() {
    const P = config.particles;
    const num = Math.round(s.settings.particleCount);
    s.particles = Array.from({length:num}, () => ({
      x:rnd(0,s.width),y:rnd(0,s.height),
      vx:rnd(-0.25,0.25),vy:rnd(-0.22,0.22),
      size:rnd(P.minSize,P.maxSize),alpha:rnd(0.25,0.85),
      heart:Math.random()<P.heartRatio,
      pulse:rnd(0.4,1.4),phase:rnd(0,Math.PI*2),
      color:P.palette[Math.floor(Math.random()*P.palette.length)]
    }));
  }
  function fit() {
    const W = config.canvas.width, H=config.canvas.height;
    const k=config.scene.fit==='contain' ? Math.min(s.width/W,s.height/H) : Math.max(s.width/W,s.height/H);
    return {k,x:(s.width-W*k)/2,y:(s.height-H*k)/2};
  }
  function frameFor(layer,t) {
    const list=s.assets[layer.name];
    if (!list) return null;
    if (list.length===1 || layer.type!=='animated-hair') return list[0];
    const speed=s.settings.hairStrength*(layer.playbackSpeed||1);
    const index=speed<0.001 ? 0 : Math.floor((t*(layer.fps||7)*speed + (layer.phase||0)*(layer.fps||7))%list.length);
    return list[index] || list[0];
  }
  function drawLayer(layer,F,t) {
    const img = frameFor(layer,t);
    if (!img) return;
    const W=config.canvas.width,H=config.canvas.height;
    const scale=layer.scale == null ? 1 : layer.scale;
    const w=W*scale*F.k,h=H*scale*F.k;
    // Center the independently redrawn transparent sprite canvas in the master
    // coordinate system BEFORE applying configured offsets (v1.0 bug fix).
    let x=F.x+(W*(1-scale)/2+(layer.offsetX||0))*F.k;
    let y=F.y+(H*(1-scale)/2+(layer.offsetY||0))*F.k;
    ctx.save();
    ctx.globalAlpha=layer.opacity==null?1:layer.opacity;
    if (layer.type==='background') {
      const px=(s.mouseX/s.width-0.5)*s.settings.parallax;
      const py=(s.mouseY/s.height-0.5)*s.settings.parallax*.55;
      ctx.filter='blur('+s.settings.backgroundBlur+'px) brightness('+s.settings.backgroundBrightness+') saturate('+s.settings.saturation+')';
      ctx.drawImage(img,x-px,y-py,w,h);
      ctx.restore();
      drawCityWindows(F,px,py,t);
      return;
    }
    // NO browser-side puppetry, alpha blending of different hair frames,
    // rectangle clipping or runtime deformation. Exactly one precomputed PNG.
    ctx.drawImage(img,x,y,w,h);
    ctx.restore();
  }
  function drawCityWindows(F,px,py,t) {
    if (!s.settings.showTwinkles || !lights.length) return;
    ctx.save();
    ctx.globalCompositeOperation='screen';
    const limit=Math.min(lights.length,config.twinkles.desiredCount||165);
    const intensity=s.settings.twinkleIntensity;
    for (let i=0;i<limit;i++) {
      const v=lights[i], x=F.x-px+v[0]*F.k,y=F.y-py+v[1]*F.k;
      const flicker=Math.max(0,Math.sin(t*v[6]+v[7]));
      const alpha=clamp((0.06+0.43*Math.pow(flicker,4))*v[5]*intensity,0,1);
      const r=(0.7+(i%3)*0.32)*F.k;
      ctx.globalAlpha=alpha;
      ctx.fillStyle='rgb('+v[2]+','+v[3]+','+v[4]+')';
      ctx.fillRect(x-r,y-r,r*2,r*2);
    }
    ctx.restore();
  }
  function stepParticles(dt) {
    const P=config.particles,R=config.scene.mouseInfluenceRadius;
    for (const p of s.particles) {
      const dx=p.x-s.mouseX,dy=p.y-s.mouseY;
      const d=Math.hypot(dx,dy)||1;
      if (d<R) {
        const f=(1-d/R)*P.mouseForce*(1+Math.min(10,Math.hypot(s.vx,s.vy)*0.1));
        p.vx+=dx/d*f*16-dy/d*P.mouseSwirl*12;
        p.vy+=dy/d*f*16+dx/d*P.mouseSwirl*12;
      }
      p.vx=(p.vx+P.driftX*.002)*.991;
      p.vy=(p.vy+P.driftY*.002)*.991;
      p.x+=p.vx*dt*60*s.settings.particleSpeed;
      p.y+=p.vy*dt*60*s.settings.particleSpeed;
      const pad=P.edgeWrapPadding;
      if (p.x < -pad) p.x=s.width+pad;
      if (p.x > s.width+pad) p.x=-pad;
      if (p.y < -pad) p.y=s.height+pad;
      if (p.y > s.height+pad) p.y=-pad;
    }
  }
  function heart(x,y,n) {
    ctx.beginPath();
    ctx.moveTo(x,y+n*.25);
    ctx.bezierCurveTo(x-n*.7,y-n*.50,x-n*1.4,y+n*.20,x,y+n);
    ctx.bezierCurveTo(x+n*1.4,y+n*.20,x+n*.7,y-n*.50,x,y+n*.25);
    ctx.closePath();ctx.fill();
  }
  function drawParticles(t) {
    if (!s.settings.showParticles) return;
    ctx.save();ctx.globalCompositeOperation='screen';
    for (const p of s.particles) {
      ctx.fillStyle=p.color;
      ctx.globalAlpha=p.alpha*(.7+.3*Math.sin(t*p.pulse+p.phase));
      if (p.heart) heart(p.x,p.y,p.size);
      else {ctx.beginPath();ctx.arc(p.x,p.y,p.size*.46,0,Math.PI*2);ctx.fill();}
    }
    ctx.restore();
  }
  function animate(now) {
    const dt=clamp((now-s.last)/1000,0,.04);
    s.last=now;
    if (!s.settings.pause) s.elapsed+=dt;
    s.vx=lerp(s.vx,s.targetX-s.mouseX,.18);
    s.vy=lerp(s.vy,s.targetY-s.mouseY,.18);
    s.mouseX=lerp(s.mouseX,s.targetX,.18);
    s.mouseY=lerp(s.mouseY,s.targetY,.18);
    ctx.clearRect(0,0,s.width,s.height);
    ctx.fillStyle=config.canvas.background;ctx.fillRect(0,0,s.width,s.height);
    if (s.ready) {
      if (!s.settings.pause) stepParticles(dt);
      const F=fit();
      for (const l of layers) drawLayer(l,F,s.elapsed);
      drawParticles(s.elapsed);
    }
    requestAnimationFrame(animate);
  }
  const panel=document.getElementById('settings-panel');
  document.getElementById('settings-toggle').addEventListener('click',()=>panel.classList.toggle('open'));
  document.addEventListener('keydown',e=>{if (e.key.toLowerCase()==='s')panel.classList.toggle('open');});
  document.addEventListener('pointermove',e=>{s.targetX=e.clientX;s.targetY=e.clientY;},{passive:true});
  document.addEventListener('pointerleave',()=>{s.targetX=s.width/2;s.targetY=s.height/2;});
  const controls=['backgroundBlur','backgroundBrightness','parallax','twinkleIntensity','hairStrength','particleCount','particleSpeed','showParticles','showTwinkles','pause'];
  function refreshControls() {
    for (const key of controls) {
      const el=document.getElementById(key),val=s.settings[key];
      if (!el) continue;
      if (el.type==='checkbox') el.checked=!!val;
      else el.value=val;
      const badge=document.querySelector('[data-value-for="'+key+'"]');
      if (badge) badge.textContent=key==='particleCount'||key==='parallax'?String(Math.round(val)):Number(val).toFixed(2);
    }
  }
  for (const key of controls) {
    const el=document.getElementById(key);
    if (!el)continue;
    el.addEventListener(el.type==='checkbox'?'change':'input',()=>{
      s.settings[key]=el.type==='checkbox'?el.checked:Number(el.value);
      if (key==='particleCount')rebuildParticles();
      refreshControls();
    });
  }
  document.getElementById('resetSettings').addEventListener('click',()=>{
    s.settings=Object.assign({},defaults);rebuildParticles();refreshControls();
  });
  window.addEventListener('resize',resize);
  resize();refreshControls();
  loadAssets().catch(e=>updateStatus('播放器发生错误：'+e.message,true));
  requestAnimationFrame(animate);
})();
