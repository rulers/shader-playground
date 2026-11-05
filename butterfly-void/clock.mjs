// Active wall time is independent of the bounded flight integrator.
export class ArtworkClock {
  time = 0;
  last = null;
  resume(now) { if(this.last===null)this.last=now; }
  tick(now) {
    if(this.last===null)return 0;
    const elapsed=Math.max(0,(now-this.last)/1000);
    this.last=Math.max(this.last,now);this.time+=elapsed;
    return elapsed;
  }
  pause(now) { this.tick(now);this.last=null; }
  reset() { this.time=0;this.last=null; }
  step(seconds) { this.time+=Math.max(0,seconds); }
}
