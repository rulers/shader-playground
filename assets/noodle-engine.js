// Original Canvas 2D study. Positions and input stay in JavaScript; no GPU dependency.
export function mountNoodles({ mode = 'day' } = {}) {
  const night = mode === 'night';
  const canvas = document.querySelector('#noodles');
  const ctx = canvas.getContext('2d');
  const status = document.querySelector('#state-label');
  if (!ctx) { status.textContent = 'Canvas 2Dを利用できません。'; return; }
  const palette = night ? ['#ff74d8','#d9fc53','#57e5ff','#ff9656','#a99bff','#ffed6a'] : ['#f47770','#ffc83e','#32b6aa','#a68add','#ef9460','#5da9d4'];
  const background = night ? '#1638ba' : '#fff4db';
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const controls = ['speed','elasticity','influence'].map(name => document.querySelector(`#control-${name}`));
  const defaults = night ? [1,0.8,0.7] : [1,0.8,0.35];
  const values = [...defaults];
  const pauseButton = document.querySelector('#pause');
  const toggle = document.querySelector('#settings-toggle');
  const panel = document.querySelector('#settings-panel');
  let width = 1, height = 1, thickness = 30, noodles = [], time = 0, last = 0;
  let paused = false, pointer = null, dragged = null, hovered = -1;
  let held = false, holdSource = null, charge = 0, burst = 0, freeze = 0, activeUntil = 0;
  let reduced = media.matches, recovering = false;
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  const say = text => { if (status.textContent !== text) status.textContent = text; };
  function openPanel(open) {
    panel.hidden = !open; toggle.setAttribute('aria-expanded',String(open));
    toggle.textContent = open ? '−' : '＋';
    toggle.setAttribute('aria-label',open ? '調整UIを閉じる' : '調整UIを開く');
  }
  toggle.addEventListener('click', () => openPanel(panel.hidden));
  document.querySelector('#settings-close')?.addEventListener('click', () => {openPanel(false);toggle.focus();});
  controls.forEach((input,i) => {
    input.value = defaults[i];
    const update = () => { values[i] = Number(input.value); input.parentElement.querySelector('output').value = values[i].toFixed(2); activeUntil = performance.now()+2200; };
    input.addEventListener('input',update);update();
  });
  function base(i,j) {
    const u = j/11;
    // Slightly oblique strands cross without filling every available pixel.
    const slope = [0.36,-0.25,0.18,-0.3,0.32,-0.1][i];
    const y = [0.21,0.37,0.5,0.65,0.79,0.91][i];
    const wave = Math.sin(u*Math.PI*2.3+i*1.8)*height*(i%2 ? .058 : .075);
    return {x:(u*1.22-.11)*width, y:(y+(u-.5)*slope)*height+wave};
  }
  function resize() {
    const previousW = width, previousH = height;
    width = innerWidth; height = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1,2);
    canvas.width = Math.round(width*dpr);canvas.height = Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    thickness = clamp(Math.min(width,height)*.065,22,53);
    if (!noodles.length) noodles = Array.from({length:6},(_,i)=>Array.from({length:12},(_,j)=>({...base(i,j),dx:0,dy:0,vx:0,vy:0})));
    else noodles.forEach((line,i)=>line.forEach((p,j)=>{
      const home=base(i,j);p.dx*=width/previousW;p.dy*=height/previousH;p.x=home.x+p.dx;p.y=home.y+p.dy;
    }));
    cancelInteraction(); activeUntil=performance.now()+1800; draw();
  }
  function wake() { activeUntil = performance.now()+2600; }
  function cancelInteraction() {
    const captured = pointer;
    pointer=null;dragged=null;held=false;holdSource=null;charge=0;hovered=-1;recovering=false;
    if (captured !== null && canvas.hasPointerCapture(captured)) canvas.releasePointerCapture(captured);
  }
  function reset() {
    cancelInteraction();time=0;burst=0;freeze=0;
    noodles.forEach((line,i)=>line.forEach((p,j)=>Object.assign(p,base(i,j),{dx:0,dy:0,vx:0,vy:0})));
    controls.forEach((input,i)=>{input.value=defaults[i];input.dispatchEvent(new Event('input'));});
    say(night?'押して、ためて、離す。':'つまんで、踊ろう。');draw();
  }
  document.querySelector('#reset').addEventListener('click',reset);
  function setPaused(value) {
    paused=value;cancelInteraction();pauseButton.setAttribute('aria-pressed',String(paused));
    pauseButton.textContent=paused?'再生':'一時停止';say(paused?'一時停止中':reduced?'自動の揺れを低減中':night?'押して、ためて、離す。':'つまんで、踊ろう。');wake();
  }
  pauseButton.addEventListener('click',()=>setPaused(!paused));
  function location(event) { const r=canvas.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top}; }
  function pick(pos) {
    let best=null, distance=thickness*1.1;
    noodles.forEach((line,i)=>line.forEach((p,j)=>{
      if(j===11)return;const q=line[j+1],vx=q.x-p.x,vy=q.y-p.y;
      const t=clamp(((pos.x-p.x)*vx+(pos.y-p.y)*vy)/(vx*vx+vy*vy||1),0,1);
      const d=Math.hypot(pos.x-p.x-t*vx,pos.y-p.y-t*vy);
      if(d<distance){distance=d;best={line:i,point:j+t,x:pos.x,y:pos.y};}
    }));return best;
  }
  function impulse(x,y,power=1) {
    noodles.forEach(line=>line.forEach(p=>{
      const dx=p.x-x,dy=p.y-y,d=Math.hypot(dx,dy),fall=Math.exp(-d/Math.max(width,height)*5);
      p.vx+=(dx/(d||1))*130*power*fall;p.vy+=(dy/(d||1))*130*power*fall-70*power*fall;
    }));wake();
  }
  function startHold(source) { if(held)return;recovering=false;held=true;holdSource=source;charge=0;wake();say('HOLD — リズムをためる…'); }
  function releaseHold() {
    if(!held)return;
    const energy=clamp(charge,0,1);recovering=energy>.02;held=false;holdSource=null;charge=0;
    if(energy>.02){burst=energy*values[2];if(burst>0)impulse(width*.5,height*.5,burst*4);say(burst>0?'DISCO!':'ゆっくりリズムへ。');}
    else say('押して、ためて、離す。');wake();
  }
  canvas.addEventListener('pointerdown',event=>{
    if(paused||pointer!==null||held||event.button!==0)return;
    event.preventDefault();canvas.focus({preventScroll:true});pointer=event.pointerId;canvas.setPointerCapture(pointer);wake();
    if(night){startHold('pointer');return;}
    const pos=location(event);dragged=pick(pos);
    if(dragged)say('のばして…');else impulse(pos.x,pos.y);
  });
  canvas.addEventListener('pointermove',event=>{
    const pos=location(event);
    if(pointer===event.pointerId&&dragged){dragged.x=clamp(pos.x,-width*.15,width*1.15);dragged.y=clamp(pos.y,-height*.15,height*1.15);wake();}
    else if(pointer===null&&!night){const next=pick(pos)?.line??-1;if(next!==hovered){hovered=next;draw();}}
  });
  canvas.addEventListener('pointerleave',()=>{hovered=-1;});
  canvas.addEventListener('pointerup',event=>{
    if(pointer!==event.pointerId)return;
    if(night)releaseHold();else if(dragged)say('ぷるん。');
    dragged=null;pointer=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);wake();
  });
  canvas.addEventListener('pointercancel',()=>{cancelInteraction();wake();say('操作をキャンセルしました');});
  canvas.addEventListener('lostpointercapture',()=>{if(pointer!==null){cancelInteraction();wake();}});
  canvas.addEventListener('keydown',event=>{
    if(event.code==='Space'){event.preventDefault();if(event.repeat)return;if(night&&!paused&&!held)startHold('keyboard');else if(!night)setPaused(!paused);}
    if(!paused&&event.key.startsWith('Arrow')){event.preventDefault();const x=width*(event.key==='ArrowLeft'?.25:event.key==='ArrowRight'?.75:.5);const y=height*(event.key==='ArrowUp'?.25:event.key==='ArrowDown'?.75:.5);impulse(x,y);}
  });
  canvas.addEventListener('keyup',event=>{if(event.code==='Space'&&holdSource==='keyboard'){event.preventDefault();releaseHold();}});
  canvas.addEventListener('blur',()=>{cancelInteraction();wake();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){cancelInteraction();wake();if(!panel.hidden){openPanel(false);toggle.focus();}}});
  document.addEventListener('visibilitychange',()=>{last=0;cancelInteraction();});
  window.addEventListener('blur',()=>{cancelInteraction();last=0;});
  media.addEventListener('change',event=>{reduced=event.matches;cancelInteraction();wake();say(reduced?'自動の揺れを低減中':'つまんで、踊ろう。');});
  window.addEventListener('resize',resize);
  function step(dt) {
    time+=dt*values[0];
    freeze+=(Number(held)-freeze)*Math.min(1,dt*7);
    if(held)charge=Math.min(1,charge+dt*.65);
    burst*=Math.exp(-dt*2);
    if(recovering&&!held&&burst<.025&&freeze<.02){recovering=false;say('DANCE — 押して、ためて、離す。');}
    const amplitude=reduced?0:(night?15:5)*(1-freeze);
    const stiffness=36+values[1]*43, damping=night?9:11;
    // Calculate forces from the same positions before integrating each point.
    const force=noodles.map((line,i)=>line.map((p,j)=>{
      const home=base(i,j),u=j/11;
      const wobble=Math.sin(time*(night?3.5:1.1)+i*1.2+u*4)*amplitude;
      const compression=night?freeze*(.025+charge*.025)*values[1]:0;
      let tx=home.x+(width*.5-home.x)*compression;
      let ty=home.y+wobble+(height*.5-home.y)*compression;
      if(dragged&&dragged.line===i){const fall=Math.exp(-Math.pow(j-dragged.point,2)/2.4);tx+=(dragged.x-home.x)*fall;ty+=(dragged.y-home.y)*fall;}
      if(dragged&&dragged.line!==i){const d=Math.hypot(home.x-dragged.x,home.y-dragged.y);const fall=Math.exp(-d/140)*values[2]*.18;tx+=(dragged.x-home.x)*fall;ty+=(dragged.y-home.y)*fall;}
      let fx=(tx-p.x)*stiffness-p.vx*damping,fy=(ty-p.y)*stiffness-p.vy*damping;
      for(const k of [j-1,j+1])if(line[k]){fx+=(line[k].dx-p.dx)*14;fy+=(line[k].dy-p.dy)*14;}
      return {fx,fy,home};
    }));
    noodles.forEach((line,i)=>line.forEach((p,j)=>{
      const {fx,fy,home}=force[i][j];p.vx=clamp(p.vx+fx*dt,-1400,1400);p.vy=clamp(p.vy+fy*dt,-1400,1400);
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.dx=p.x-home.x;p.dy=p.y-home.y;
    }));
  }
  function path(line) {
    ctx.beginPath();ctx.moveTo(line[0].x,line[0].y);
    for(let j=1;j<line.length-1;j++)ctx.quadraticCurveTo(line[j].x,line[j].y,(line[j].x+line[j+1].x)/2,(line[j].y+line[j+1].y)/2);
    ctx.lineTo(line[11].x,line[11].y);
  }
  function draw() {
    ctx.fillStyle=background;ctx.fillRect(0,0,width,height);
    ctx.fillStyle=night?'#ffffff0c':'#342b400e';
    const spacing=night?52:30;
    for(let x=15;x<width;x+=spacing)for(let y=15;y<height;y+=spacing){ctx.beginPath();ctx.arc(x,y,night?1.1:.8,0,Math.PI*2);ctx.fill();}
    if(night){ctx.strokeStyle='#ffffff09';ctx.lineWidth=1;for(let r=100;r<Math.max(width,height);r+=95){ctx.beginPath();ctx.arc(width*.65,height*.45,r,0,Math.PI*2);ctx.stroke();}}
    ctx.lineCap='round';ctx.lineJoin='round';
    noodles.forEach((line,i)=>{
      ctx.save();
      ctx.translate(0,night?5:6);path(line);ctx.strokeStyle=night?'#07194c55':'#51325317';ctx.lineWidth=thickness+3;ctx.stroke();ctx.restore();
      path(line);ctx.strokeStyle=palette[i];ctx.lineWidth=thickness*(night?1+Math.sin(time*3.5+i)*.035*(1-freeze)+burst*.09:1);
      ctx.shadowColor=night?palette[i]:'transparent';ctx.shadowBlur=night?12:0;ctx.stroke();ctx.shadowBlur=0;
      ctx.save();ctx.translate(0,-thickness*.17);path(line);ctx.lineWidth=thickness*.13;ctx.strokeStyle=night?'#ffffff45':'#ffffff5a';ctx.stroke();ctx.restore();
      if(hovered===i&&!paused){path(line);ctx.lineWidth=thickness+4;ctx.strokeStyle='#ffffff30';ctx.stroke();}
    });
  }
  function frame(now) {
    const dt=last?Math.min((now-last)/1000,.04):0;last=now;
    if(!document.hidden&&!paused&&(!reduced||held||dragged||now<activeUntil)){
      const steps=Math.max(1,Math.ceil(dt/(1/120)));for(let k=0;k<steps;k++)step(dt/steps);draw();
    }
    requestAnimationFrame(frame);
  }
  resize();say(reduced?'自動の揺れを低減中':night?'押して、ためて、離す。':'つまんで、踊ろう。');requestAnimationFrame(frame);
}
