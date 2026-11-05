const layout = [
  [-.26,-.17,.078,'circle','#355f9e'], [.01,-.22,.075,'bar','#df6248'],
  [.24,-.12,.083,'semi','#242a30'], [-.17,.17,.074,'square','#df6248'],
  [.07,.13,.085,'circle','#355f9e'], [.29,.22,.071,'bar','#e2cfa6']
];
export function createState() {
  return { pieces:layout.map(([x,y,r,shape,color],id)=>({id,hx:x,hy:y,x,y,r,shape,color,vx:0,vy:0,angle:id*.35,turn:0})),pointer:null,strength:1 };
}
export function reset(state) { Object.assign(state,createState()); }
export function step(state, dt) {
  dt=Math.min(Math.max(dt,0),1/30);
  const steps=Math.max(1,Math.ceil(dt*120));
  for(let k=0;k<steps;k++) integrate(state,dt/steps);
}
function integrate(state,dt) {
  const p=state.pieces;
  const forces=p.map(a=>{
    let fx=(a.hx-a.x)*26-a.vx*10,fy=(a.hy-a.y)*26-a.vy*10;
    if(state.pointer){
      const dx=state.pointer.x-a.x,dy=state.pointer.y-a.y,d=Math.hypot(dx,dy);
      const w=Math.exp(-((d/.24)**2))*state.strength;
      fx+=dx*55*w;fy+=dy*55*w;
    }
    return {fx,fy};
  });
  for(let i=0;i<p.length;i++)for(let j=i+1;j<p.length;j++) {
    const dx=p[j].x-p[i].x,dy=p[j].y-p[i].y,d=Math.hypot(dx,dy),gap=p[i].r+p[j].r+.018;
    if(d<gap){const nx=d>1e-8?dx/d:1,ny=d>1e-8?dy/d:0,f=(gap-d)*160;
      forces[i].fx-=nx*f;forces[i].fy-=ny*f;forces[j].fx+=nx*f;forces[j].fy+=ny*f;}
  }
  p.forEach((a,i)=>{
    a.vx=Math.max(-1,Math.min(1,a.vx+forces[i].fx*dt));a.vy=Math.max(-1,Math.min(1,a.vy+forces[i].fy*dt));
    a.x=Math.max(-.44,Math.min(.44,a.x+a.vx*dt));a.y=Math.max(-.36,Math.min(.36,a.y+a.vy*dt));
    const target=state.pointer?Math.atan2(state.pointer.y-a.y,state.pointer.x-a.x)*.22:0;
    a.turn+=(target-a.turn)*Math.min(1,dt*8);
  });
}
export function moving(state){return state.pieces.some(a=>Math.hypot(a.vx,a.vy)>.0005||Math.hypot(a.x-a.hx,a.y-a.hy)>.0005||Math.abs(a.turn)>.0005);}
