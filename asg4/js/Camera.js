// Camera.js - First-person camera for the virtual world

class Camera {
  constructor(canvas) {
    this.fov = 60;
    this.eye = new Vector3([16.5, 1.5, 16.5]);
    this.at  = new Vector3([16.5, 1.5, 15.5]);
    this.up  = new Vector3([0, 1, 0]);
    this.speed = 0.15;
    this.alpha = 3;

    this.viewMatrix = new Matrix4();
    this.projectionMatrix = new Matrix4();

    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
      this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
    );
    this.projectionMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);
  }

  canMoveTo(nx, nz) {
    let radius = 0.25;
    let checks = [[nx-radius,nz-radius],[nx+radius,nz-radius],[nx-radius,nz+radius],[nx+radius,nz+radius]];
    for (let c of checks) {
      let gx = Math.floor(c[0]), gz = Math.floor(c[1]);
      if (gx < 0 || gx >= 32 || gz < 0 || gz >= 32) return false;
      if (typeof g_map !== 'undefined' && g_map[gx] && g_map[gx][gz] > 0) return false;
    }
    return true;
  }

  updateViewMatrix() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
      this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
    );
  }

  moveForward() {
    let f = new Vector3(); f.set(this.at); f.sub(this.eye); f.elements[1]=0; f.normalize(); f.mul(this.speed);
    let nx=this.eye.elements[0]+f.elements[0], nz=this.eye.elements[2]+f.elements[2];
    if(!this.canMoveTo(nx,nz)) return;
    this.eye.add(f); this.at.add(f); this.updateViewMatrix();
  }
  moveBackwards() {
    let b = new Vector3(); b.set(this.eye); b.sub(this.at); b.elements[1]=0; b.normalize(); b.mul(this.speed);
    let nx=this.eye.elements[0]+b.elements[0], nz=this.eye.elements[2]+b.elements[2];
    if(!this.canMoveTo(nx,nz)) return;
    this.eye.add(b); this.at.add(b); this.updateViewMatrix();
  }
  moveLeft() {
    let f=new Vector3(); f.set(this.at); f.sub(this.eye); let s=Vector3.cross(this.up,f); s.normalize(); s.mul(this.speed);
    let nx=this.eye.elements[0]+s.elements[0], nz=this.eye.elements[2]+s.elements[2];
    if(!this.canMoveTo(nx,nz)) return;
    this.eye.add(s); this.at.add(s); this.updateViewMatrix();
  }
  moveRight() {
    let f=new Vector3(); f.set(this.at); f.sub(this.eye); let s=Vector3.cross(f,this.up); s.normalize(); s.mul(this.speed);
    let nx=this.eye.elements[0]+s.elements[0], nz=this.eye.elements[2]+s.elements[2];
    if(!this.canMoveTo(nx,nz)) return;
    this.eye.add(s); this.at.add(s); this.updateViewMatrix();
  }
  panLeft(deg) {
    let angle=(deg!==undefined&&deg!==null)?deg:this.alpha;
    let f=new Vector3(); f.set(this.at); f.sub(this.eye);
    let rotationMatrix=new Matrix4(); rotationMatrix.setRotate(angle,this.up.elements[0],this.up.elements[1],this.up.elements[2]);
    let f_prime=rotationMatrix.multiplyVector3(f); this.at.set(this.eye); this.at.add(f_prime); this.updateViewMatrix();
  }
  panRight(deg) { let angle=(deg!==undefined&&deg!==null)?deg:this.alpha; this.panLeft(-angle); }
  panUp(deg) {
    let f=new Vector3(); f.set(this.at); f.sub(this.eye);
    let right=Vector3.cross(f,this.up); right.normalize();
    let rotationMatrix=new Matrix4(); rotationMatrix.setRotate(deg,right.elements[0],right.elements[1],right.elements[2]);
    let f_prime=rotationMatrix.multiplyVector3(f);
    let pitchCheck=f_prime.elements[1]/f_prime.magnitude();
    if(Math.abs(pitchCheck)<0.95){ this.at.set(this.eye); this.at.add(f_prime); this.updateViewMatrix(); }
  }
  getTargetBlock() {
    let f=new Vector3(); f.set(this.at); f.sub(this.eye); f.normalize();
    for(let t=0.5;t<5;t+=0.2){ let x=Math.floor(this.eye.elements[0]+f.elements[0]*t), y=Math.floor(this.eye.elements[1]+f.elements[1]*t), z=Math.floor(this.eye.elements[2]+f.elements[2]*t);
      if(x>=0&&x<32&&z>=0&&z<32&&y>=0) return {x,y,z,dist:t}; }
    return null;
  }
}
