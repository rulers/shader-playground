import {advance, random, clamp, CAMERA_Z} from './simulation.mjs';

export const OPENING_SECONDS = 3;
const TAN = Math.tan(Math.PI / 8);
const smooth = x => { x=clamp(x,0,1);return x*x*(3-2*x); };

// CPU-only entrance state. The normal flock, mesh, colours and wing phases are
// retained; no individual Mesh, GPU attribute or material is allocated here.
export class Opening {
  constructor(state, enabled=true) {
    this.state=state;
    const n=state.count;
    this.starts=new Float64Array(n);this.durations=new Float64Array(n);
    this.sources=new Float64Array(n*3);this.initialVelocity=new Float64Array(n*3);
    this.targets=new Float64Array(n*2);this.endVelocity=new Float64Array(n*2);
    this.offsets=new Float64Array(n*2);this.mask=new Uint8Array(n);
    this.released=new Uint8Array(n);this.floor=new Float32Array(n);
    this.order=new Uint16Array(n);this.sampled=new Float64Array(6);
    // Early arrivals leave the viewport before the normal inward turn takes over.
    state.openingReturn=new Uint8Array(n);
    this.reset(enabled);
  }
  // Call only after resetFlock, so the existing composition is captured as the
  // destination. Release order and variation use a separate, reproducible RNG.
  reset(enabled=true) {
    const s=this.state,n=s.count,rng=random(0x42565254);
    this.time=0;this.depthRate=1;this.active=enabled;this.visible=enabled?1:n;
    this.offsets.fill(0);this.mask.fill(enabled?1:0);s.openingReturn.fill(0);
    this.released.fill(enabled?0:1);this.floor.fill(enabled?0:1);
    for(let i=0;i<n;i++)this.order[i]=i;
    for(let i=n-1;i>0;i--){const j=Math.floor(rng()*(i+1)),id=this.order[i];this.order[i]=this.order[j];this.order[j]=id;}
    let total=0;
    for(let rank=0;rank<n;rank++){total+=.45+rng()*1.1;this.starts[this.order[rank]]=total;}
    const first=this.starts[this.order[0]],range=total-first;
    for(let i=0;i<n;i++) {
      const fraction=range>0?(this.starts[i]-first)/range:0;
      // Gentle first 0.2s, then a denser, irregular stream through 1.4s.
      this.starts[i]=fraction<.06?fraction/.06*.2:.2+(fraction-.06)/.94*1.2;
      this.durations[i]=Math.min(.90+rng()*.80,OPENING_SECONDS-.05-this.starts[i]);
      const k=i*3,p=i*2,z=s.depth[i],halfH=(CAMERA_Z-z)*TAN;
      this.targets[p]=s.positions[k]/(halfH*s.aspect);this.targets[p+1]=s.positions[k+1]/halfH;
      if(enabled&&fraction<.22){
        const outward=1.35/Math.max(Math.abs(this.targets[p]),Math.abs(this.targets[p+1]),.0001);
        this.targets[p]*=outward;this.targets[p+1]*=outward;s.openingReturn[i]=1;
      }
      this.sources[k]=(rng()-.5)*.65;this.sources[k+1]=(rng()-.5)*.65;this.sources[k+2]=-31-rng()*8;
      const tx=s.positions[k],ty=s.positions[k+1],length=Math.hypot(tx,ty)||1;
      const angle=Math.atan2(-tx,ty)+(rng()-.5)*.8,speed=s.speed[i]*(.65+rng()*.25);
      this.endVelocity[p]=-Math.sin(angle)*speed;this.endVelocity[p+1]=Math.cos(angle)*speed;
      const radial=Math.max(length*(.55+rng()*.8)/this.durations[i],7+rng()*5);
      const bend=(rng()<.5?-1:1)*(2+rng()*4);
      this.initialVelocity[k]=(tx/length*radial-ty/length*bend)*Math.min(1,s.aspect);
      this.initialVelocity[k+1]=ty/length*radial+tx/length*bend;
      this.initialVelocity[k+2]=(z-this.sources[k+2])/this.durations[i]*(1.2+rng()*1.3);
    }
    if(enabled)this.apply(0,this.depthRate,1,0,0,0);
  }
  // Position and derivative of a cubic Hermite flight. The endpoint follows the
  // existing depth oscillator. Its moving-target derivative is cancelled in the
  // end tangent, so x/y handoff velocity is exactly the selected normal velocity.
  sample(i,u,depthRate=1) {
    const s=this.state,k=i*3,p=i*2,d=this.durations[i],u2=u*u,u3=u2*u;
    const a=2*u3-3*u2+1,b=u3-2*u2+u,c=-2*u3+3*u2,e=u3-u2;
    const da=(6*u2-6*u)/d,db=3*u2-4*u+1,dc=(-6*u2+6*u)/d,de=3*u2-2*u;
    const phase=s.wing[i*4+3],rate=.8+phase*.08,theta=s.flightTime*rate+phase;
    const offset=1.35*(Math.sin(theta)-Math.sin(phase));
    const dz=1.35*rate*Math.cos(theta)*depthRate,ddz=-1.35*rate*rate*Math.sin(theta)*depthRate*depthRate;
    const targetZ=s.depth[i]+offset,halfH=(CAMERA_Z-targetZ)*TAN;
    for(let axis=0;axis<2;axis++) {
      const factor=this.targets[p+axis]*(axis===0?s.aspect:1);
      const target=factor*halfH,dt=-factor*TAN*dz,ddt=-factor*TAN*ddz;
      const start=this.sources[k+axis],v0=this.initialVelocity[k+axis],v1=this.endVelocity[p+axis]-dt;
      this.sampled[axis]=a*start+b*d*v0+c*target+e*d*v1;
      this.sampled[axis+3]=da*start+db*v0+dc*target+de*v1+c*dt-e*d*ddt;
    }
    this.sampled[2]=a*this.sources[k+2]+b*d*this.initialVelocity[k+2]+c*s.depth[i]+c*offset;
    this.sampled[5]=da*this.sources[k+2]+db*this.initialVelocity[k+2]+dc*s.depth[i]+dc*offset+c*dz;
    return this.sampled;
  }
  advance(seconds,activity=1,strength=.8) {
    if(!this.active){advance(this.state,seconds,activity,strength);return;}
    const dt=clamp(seconds,0,.1),windX=this.state.wind.vx,windY=this.state.wind.vy;
    // Only already-finished butterflies use the existing integrator. Global wing
    // time, depth time and wind decay remain the original simulation's job.
    advance(this.state,dt,activity,strength,this.mask);
    this.time+=Math.max(0,seconds)*activity;
    if(seconds>0&&activity>0)this.depthRate=dt/seconds;
    this.apply(dt,this.depthRate,activity,strength,windX,windY);
  }
  apply(dt,depthRate,activity,strength,windX,windY) {
    const s=this.state;let controlled=0,visible=0;
    for(let i=0;i<s.count;i++) {
      if(this.time>=this.starts[i])visible++;
      if(!this.mask[i])continue;
      const k=i*3,p=i*2,age=this.time-this.starts[i];
      if(age<0) {
        s.positions[k]=this.sources[k];s.positions[k+1]=this.sources[k+1];s.positions[k+2]=this.sources[k+2];
        s.gust[p]=s.gust[p+1]=0;controlled++;continue;
      }
      const u=age>=this.durations[i]-1e-10?1:clamp(age/this.durations[i],0,1);
      // Wind is evaluated at the displayed (not destination) position. The
      // original force, limits and decay are retained, including activity zero.
      const windDt=activity>0?Math.min(dt,Math.max(0,age/activity)):dt;
      const steps=Math.max(1,Math.ceil(windDt*60)),h=windDt/steps;
      let wx=windX,wy=windY;
      const halfH=(CAMERA_Z-s.positions[k+2])*TAN;
      const dx=s.positions[k]/halfH-s.wind.x*s.aspect,dy=s.positions[k+1]/halfH-s.wind.y;
      const weight=Math.exp(-(dx*dx+dy*dy)/(.30*.30))*strength;
      for(let step=0;step<steps;step++) {
        s.gust[p]=clamp(s.gust[p]*Math.exp(-h*2.6)+wx*halfH*weight*h*1.4,-3,3);
        s.gust[p+1]=clamp(s.gust[p+1]*Math.exp(-h*2.6)+wy*halfH*weight*h*1.4,-3,3);
        this.offsets[p]+=s.gust[p]*h;this.offsets[p+1]+=s.gust[p+1]*h;
        wx*=Math.exp(-h*7);wy*=Math.exp(-h*7);
      }
      const path=this.sample(i,u,depthRate);
      s.positions[k]=path[0]+this.offsets[p];s.positions[k+1]=path[1]+this.offsets[p+1];s.positions[k+2]=path[2];
      s.velocity[k]=path[3];s.velocity[k+1]=path[4];
      const vx=path[3]*activity+s.gust[p],vy=path[4]*activity+s.gust[p+1];
      if(vx*vx+vy*vy>.0004) {
        const heading=Math.atan2(-vx,vy);
        if(!this.released[i]){s.pose[p]=heading;s.pose[p+1]=Math.sin(heading)*1.32;}
        else {
          const delta=Math.atan2(Math.sin(heading-s.pose[p]),Math.cos(heading-s.pose[p]));
          s.pose[p]+=delta*(1-Math.exp(-dt*7));
          s.pose[p+1]+=(Math.sin(s.pose[p])*1.32-s.pose[p+1])*(1-Math.exp(-dt*5));
        }
      }
      this.released[i]=1;this.floor[i]=smooth((u-.30)/.70);
      if(u===1) {
        this.mask[i]=0;this.floor[i]=1;
        s.velocity[k]=this.endVelocity[p];s.velocity[k+1]=this.endVelocity[p+1];
        s.goal[i]=Math.atan2(-s.velocity[k],s.velocity[k+1]);
      } else controlled++;
    }
    this.visible=visible;this.active=controlled>0;
  }
  resize(ratio) {
    if(!this.active)return;
    for(let i=0;i<this.state.count;i++){
      this.sources[i*3]*=ratio;this.initialVelocity[i*3]*=ratio;
      this.endVelocity[i*2]*=ratio;this.offsets[i*2]*=ratio;
    }
  }
}
