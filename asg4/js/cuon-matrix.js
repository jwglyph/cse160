// cuon-matrix.js - Matrix and Vector utilities for WebGL
// Extended with invert/transpose for normal matrix calculations

class Vector3 {
  constructor(opt_src) {
    this.elements = new Float32Array(3);
    if (opt_src && typeof opt_src === 'object') {
      this.elements[0] = opt_src[0] || 0;
      this.elements[1] = opt_src[1] || 0;
      this.elements[2] = opt_src[2] || 0;
    }
  }
  set(src) {
    if (src instanceof Vector3) { this.elements[0]=src.elements[0]; this.elements[1]=src.elements[1]; this.elements[2]=src.elements[2]; }
    else { this.elements[0]=src[0]; this.elements[1]=src[1]; this.elements[2]=src[2]; }
    return this;
  }
  sub(other) { if(other instanceof Vector3){this.elements[0]-=other.elements[0];this.elements[1]-=other.elements[1];this.elements[2]-=other.elements[2];} return this; }
  add(other) { if(other instanceof Vector3){this.elements[0]+=other.elements[0];this.elements[1]+=other.elements[1];this.elements[2]+=other.elements[2];} return this; }
  mul(scalar) { this.elements[0]*=scalar; this.elements[1]*=scalar; this.elements[2]*=scalar; return this; }
  normalize() { let e=this.elements; let len=Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]); if(len>0.00001){e[0]/=len;e[1]/=len;e[2]/=len;} return this; }
  cross(other) { let a=this.elements,b=other.elements; let x=a[1]*b[2]-a[2]*b[1],y=a[2]*b[0]-a[0]*b[2],z=a[0]*b[1]-a[1]*b[0]; a[0]=x;a[1]=y;a[2]=z; return this; }
  static cross(a,b) { let v=new Vector3(); let ae=a.elements,be=b.elements; v.elements[0]=ae[1]*be[2]-ae[2]*be[1]; v.elements[1]=ae[2]*be[0]-ae[0]*be[2]; v.elements[2]=ae[0]*be[1]-ae[1]*be[0]; return v; }
  magnitude() { let e=this.elements; return Math.sqrt(e[0]*e[0]+e[1]*e[1]+e[2]*e[2]); }
}

class Matrix4 {
  constructor(opt_src) {
    this.elements = new Float32Array(16);
    if (opt_src && opt_src instanceof Matrix4) { this.elements.set(opt_src.elements); }
    else { this.setIdentity(); }
  }
  setIdentity() { let e=this.elements; e[0]=1;e[4]=0;e[8]=0;e[12]=0; e[1]=0;e[5]=1;e[9]=0;e[13]=0; e[2]=0;e[6]=0;e[10]=1;e[14]=0; e[3]=0;e[7]=0;e[11]=0;e[15]=1; return this; }
  set(src) { this.elements.set(src.elements); return this; }
  multiply(other) {
    let a=this.elements,b=other.elements,r=new Float32Array(16);
    for(let i=0;i<4;i++) for(let j=0;j<4;j++) r[i+j*4]=a[i]*b[j*4]+a[i+4]*b[j*4+1]+a[i+8]*b[j*4+2]+a[i+12]*b[j*4+3];
    this.elements=r; return this;
  }
  concat(other) { return this.multiply(other); }
  multiplyVector3(v) { let e=this.elements,p=v.elements,result=new Vector3(),r=result.elements; r[0]=e[0]*p[0]+e[4]*p[1]+e[8]*p[2]; r[1]=e[1]*p[0]+e[5]*p[1]+e[9]*p[2]; r[2]=e[2]*p[0]+e[6]*p[1]+e[10]*p[2]; return result; }
  multiplyVector4(v) { let e=this.elements,p=v,r=new Float32Array(4); r[0]=e[0]*p[0]+e[4]*p[1]+e[8]*p[2]+e[12]*p[3]; r[1]=e[1]*p[0]+e[5]*p[1]+e[9]*p[2]+e[13]*p[3]; r[2]=e[2]*p[0]+e[6]*p[1]+e[10]*p[2]+e[14]*p[3]; r[3]=e[3]*p[0]+e[7]*p[1]+e[11]*p[2]+e[15]*p[3]; return r; }
  setTranslate(x,y,z) { this.setIdentity(); this.elements[12]=x; this.elements[13]=y; this.elements[14]=z; return this; }
  translate(x,y,z) { let t=new Matrix4(); t.setTranslate(x,y,z); return this.multiply(t); }
  setScale(x,y,z) { let e=this.elements; e[0]=x;e[4]=0;e[8]=0;e[12]=0; e[1]=0;e[5]=y;e[9]=0;e[13]=0; e[2]=0;e[6]=0;e[10]=z;e[14]=0; e[3]=0;e[7]=0;e[11]=0;e[15]=1; return this; }
  scale(x,y,z) { let s=new Matrix4(); s.setScale(x,y,z); return this.multiply(s); }
  setRotate(angle,x,y,z) {
    let rad=Math.PI*angle/180.0,s=Math.sin(rad),c=Math.cos(rad),len=Math.sqrt(x*x+y*y+z*z);
    if(len===0) return this.setIdentity();
    x/=len;y/=len;z/=len; let nc=1-c,e=this.elements;
    e[0]=x*x*nc+c;   e[4]=x*y*nc-z*s; e[8]=x*z*nc+y*s;  e[12]=0;
    e[1]=y*x*nc+z*s; e[5]=y*y*nc+c;   e[9]=y*z*nc-x*s;  e[13]=0;
    e[2]=z*x*nc-y*s; e[6]=z*y*nc+x*s; e[10]=z*z*nc+c;   e[14]=0;
    e[3]=0;           e[7]=0;           e[11]=0;           e[15]=1;
    return this;
  }
  rotate(angle,x,y,z) { let r=new Matrix4(); r.setRotate(angle,x,y,z); return this.multiply(r); }
  setLookAt(eyeX,eyeY,eyeZ,atX,atY,atZ,upX,upY,upZ) {
    let fx=atX-eyeX,fy=atY-eyeY,fz=atZ-eyeZ;
    let len=Math.sqrt(fx*fx+fy*fy+fz*fz);
    if(len===0){fx=0;fy=0;fz=-1;}else{fx/=len;fy/=len;fz/=len;}
    let sx=fy*upZ-fz*upY,sy=fz*upX-fx*upZ,sz=fx*upY-fy*upX;
    len=Math.sqrt(sx*sx+sy*sy+sz*sz);
    if(len===0){sx=0;sy=0;sz=0;}else{sx/=len;sy/=len;sz/=len;}
    let ux=sy*fz-sz*fy,uy=sz*fx-sx*fz,uz=sx*fy-sy*fx;
    let e=this.elements;
    e[0]=sx;e[4]=sy;e[8]=sz;e[12]=-(sx*eyeX+sy*eyeY+sz*eyeZ);
    e[1]=ux;e[5]=uy;e[9]=uz;e[13]=-(ux*eyeX+uy*eyeY+uz*eyeZ);
    e[2]=-fx;e[6]=-fy;e[10]=-fz;e[14]=(fx*eyeX+fy*eyeY+fz*eyeZ);
    e[3]=0;e[7]=0;e[11]=0;e[15]=1;
    return this;
  }
  setPerspective(fovy,aspect,near,far) {
    let rad=Math.PI*fovy/180.0,t=near*Math.tan(rad/2),r=t*aspect,e=this.elements;
    e[0]=near/r;e[4]=0;e[8]=0;e[12]=0;
    e[1]=0;e[5]=near/t;e[9]=0;e[13]=0;
    e[2]=0;e[6]=0;e[10]=-(far+near)/(far-near);e[14]=-2*far*near/(far-near);
    e[3]=0;e[7]=0;e[11]=-1;e[15]=0;
    return this;
  }
  setInverseOf(other) {
    let s=other.elements, d=this.elements, inv=new Float32Array(16);
    inv[0]=s[5]*s[10]*s[15]-s[5]*s[11]*s[14]-s[9]*s[6]*s[15]+s[9]*s[7]*s[14]+s[13]*s[6]*s[11]-s[13]*s[7]*s[10];
    inv[4]=-s[4]*s[10]*s[15]+s[4]*s[11]*s[14]+s[8]*s[6]*s[15]-s[8]*s[7]*s[14]-s[12]*s[6]*s[11]+s[12]*s[7]*s[10];
    inv[8]=s[4]*s[9]*s[15]-s[4]*s[11]*s[13]-s[8]*s[5]*s[15]+s[8]*s[7]*s[13]+s[12]*s[5]*s[11]-s[12]*s[7]*s[9];
    inv[12]=-s[4]*s[9]*s[14]+s[4]*s[10]*s[13]+s[8]*s[5]*s[14]-s[8]*s[6]*s[13]-s[12]*s[5]*s[10]+s[12]*s[6]*s[9];
    inv[1]=-s[1]*s[10]*s[15]+s[1]*s[11]*s[14]+s[9]*s[2]*s[15]-s[9]*s[3]*s[14]-s[13]*s[2]*s[11]+s[13]*s[3]*s[10];
    inv[5]=s[0]*s[10]*s[15]-s[0]*s[11]*s[14]-s[8]*s[2]*s[15]+s[8]*s[3]*s[14]+s[12]*s[2]*s[11]-s[12]*s[3]*s[10];
    inv[9]=-s[0]*s[9]*s[15]+s[0]*s[11]*s[13]+s[8]*s[1]*s[15]-s[8]*s[3]*s[13]-s[12]*s[1]*s[11]+s[12]*s[3]*s[9];
    inv[13]=s[0]*s[9]*s[14]-s[0]*s[10]*s[13]-s[8]*s[1]*s[14]+s[8]*s[2]*s[13]+s[12]*s[1]*s[10]-s[12]*s[2]*s[9];
    inv[2]=s[1]*s[6]*s[15]-s[1]*s[7]*s[14]-s[5]*s[2]*s[15]+s[5]*s[3]*s[14]+s[13]*s[2]*s[7]-s[13]*s[3]*s[6];
    inv[6]=-s[0]*s[6]*s[15]+s[0]*s[7]*s[14]+s[4]*s[2]*s[15]-s[4]*s[3]*s[14]-s[12]*s[2]*s[7]+s[12]*s[3]*s[6];
    inv[10]=s[0]*s[5]*s[15]-s[0]*s[7]*s[13]-s[4]*s[1]*s[15]+s[4]*s[3]*s[13]+s[12]*s[1]*s[7]-s[12]*s[3]*s[5];
    inv[14]=-s[0]*s[5]*s[14]+s[0]*s[6]*s[13]+s[4]*s[1]*s[14]-s[4]*s[2]*s[13]-s[12]*s[1]*s[6]+s[12]*s[2]*s[5];
    inv[3]=-s[1]*s[6]*s[11]+s[1]*s[7]*s[10]+s[5]*s[2]*s[11]-s[5]*s[3]*s[10]-s[9]*s[2]*s[7]+s[9]*s[3]*s[6];
    inv[7]=s[0]*s[6]*s[11]-s[0]*s[7]*s[10]-s[4]*s[2]*s[11]+s[4]*s[3]*s[10]+s[8]*s[2]*s[7]-s[8]*s[3]*s[6];
    inv[11]=-s[0]*s[5]*s[11]+s[0]*s[7]*s[9]+s[4]*s[1]*s[11]-s[4]*s[3]*s[9]-s[8]*s[1]*s[7]+s[8]*s[3]*s[5];
    inv[15]=s[0]*s[5]*s[10]-s[0]*s[6]*s[9]-s[4]*s[1]*s[10]+s[4]*s[2]*s[9]+s[8]*s[1]*s[6]-s[8]*s[2]*s[5];
    let det=s[0]*inv[0]+s[1]*inv[4]+s[2]*inv[8]+s[3]*inv[12];
    if(Math.abs(det)<1e-8) return this;
    det=1.0/det;
    for(let i=0;i<16;i++) d[i]=inv[i]*det;
    return this;
  }
  invert() { let t=new Matrix4(this); this.setInverseOf(t); return this; }
  transpose() {
    let e=this.elements, t;
    t=e[1];e[1]=e[4];e[4]=t; t=e[2];e[2]=e[8];e[8]=t; t=e[3];e[3]=e[12];e[12]=t;
    t=e[6];e[6]=e[9];e[9]=t; t=e[7];e[7]=e[13];e[13]=t; t=e[11];e[11]=e[14];e[14]=t;
    return this;
  }
}
