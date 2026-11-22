(() => {
  "use strict";
  const defaults = { azimuth: 2.48, elevation: 0.49 };
  const materials = [
    [0.81, 0.84, 0.85], [0.88, 0.85, 0.79], [0.62, 0.67, 0.70],
    [0.56, 0.70, 0.77], [0.74, 0.79, 0.69], [0.84, 0.78, 0.66]
  ];
  const vertexSource = `
    attribute vec3 pos;
    attribute vec3 normal;
    uniform vec3 right, up, eye;
    uniform vec2 scale;
    varying vec3 face;
    void main() {
      gl_Position=vec4(dot(pos,right)*scale.x,dot(pos,up)*scale.y,-dot(pos,eye)*0.48,1.0);
      face=normal;
    }`;
  const fragmentSource = `
    precision highp float;
    varying vec3 face;
    uniform vec3 color, eye;
    uniform float edge;
    void main() {
      vec3 n=normalize(face);
      if(dot(n,eye)<0.0) n=-n;
      float shade=0.72+0.22*max(0.0,dot(n,normalize(vec3(-0.4,0.9,0.45))))+0.06*abs(n.y);
      gl_FragColor=vec4(mix(color*shade, color*0.65, edge),1.0);
    }`;

  function createProgram(gl) {
    const program=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]) {
      const shader=gl.createShader(type);
      gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      gl.attachShader(program,shader);gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    return program;
  }

  function makeGeometry(buffer) {
    const bytes=Uint8Array.from(atob(window.murWorkshopMesh),char=>char.charCodeAt(0));
    const data=new DataView(bytes.buffer);
    let cursor=0;
    const word=()=>{const n=data.getUint32(cursor,true);cursor+=4;return n;};
    return materials.map(()=>{
      const nVertices=word(),nFaces=word();
      const vertices=[];
      for(let v=0;v<nVertices;v++) {
        vertices.push([0,1,2].map(()=>{const n=data.getInt16(cursor,true);cursor+=2;return n/15000;}));
      }
      const positions=[],edges=new Map();
      for(let f=0;f<nFaces;f++) {
        const ids=[0,1,2].map(()=>{const i=data.getUint16(cursor,true);cursor+=2;return i;});
        const [a,b,c]=ids.map(i=>vertices[i]);
        const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]);
        const raw=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
        const length=Math.hypot(...raw);
        if(!length)continue;
        const normal=raw.map(x=>x/length);
        for(const point of [a,b,c])positions.push(...point,...normal);
        for(let j=0;j<3;j++) {
          const first=ids[j],last=ids[(j+1)%3];
          const key=Math.min(first,last)*65536+Math.max(first,last);
          const old=edges.get(key);
          if(!old)edges.set(key,{first,last,normal,visible:true,shared:false});
          else {
            const angle=Math.abs(normal.reduce((sum,x,i)=>sum+x*old.normal[i],0));
            old.visible=(old.shared&&old.visible)||angle<0.80;
            old.shared=true;
          }
        }
      }
      const outline=[];
      for(const e of edges.values()) {
        if(!e.visible)continue;
        for(const i of [e.first,e.last])outline.push(...vertices[i],...e.normal);
      }
      return {triangles:buffer(positions),outline:buffer(outline)};
    });
  }

  // Some lecture-room browsers disable WebGL. Render the same mesh with a
  // small depth buffer there, including its actual edges and roof selection.
  function drawSoftware(context,groups,w,h,right,up,eye,xScale,yScale,cut) {
    const pixels=context.createImageData(w,h);
    const colors=new Uint32Array(pixels.data.buffer);
    const depth=new Float32Array(w*h).fill(-Infinity);
    const pack=(color,k)=>{const [r,g,b]=color.map(x=>Math.round(255*x*k));return (255<<24)|(b<<16)|(g<<8)|r;};
    const project=(data,i)=>{
      const dot=axis=>axis[0]*data[i]+axis[1]*data[i+1]+axis[2]*data[i+2];
      return [(1+dot(right)*xScale)*w/2,(1-dot(up)*yScale)*h/2,dot(eye)];
    };
    for(const lines of [false,true]) {
      groups.forEach((group,g)=>{
        if(cut&&g===0)return;
        const data=lines?group.outline:group.triangles,shadeColor=materials[g];
        if(lines) {
          const color=pack(shadeColor,.65);
          for(let i=0;i<data.length;i+=12) {
            const a=project(data,i),b=project(data,i+6);
            const steps=Math.max(1,Math.ceil(Math.max(Math.abs(a[0]-b[0]),Math.abs(a[1]-b[1]))));
            for(let s=0;s<=steps;s++) {
              const t=s/steps,x=Math.floor(a[0]+(b[0]-a[0])*t),y=Math.floor(a[1]+(b[1]-a[1])*t);
              if(x<0||x>=w||y<0||y>=h)continue;
              const z=a[2]+(b[2]-a[2])*t,index=y*w+x;
              if(z>=depth[index]-.004)colors[index]=color;
            }
          }
          return;
        }
        for(let i=0;i<data.length;i+=18) {
          const a=project(data,i),b=project(data,i+6),c=project(data,i+12);
          const dx1=b[0]-a[0],dx2=c[0]-a[0],dy1=b[1]-a[1],dy2=c[1]-a[1];
          const area=dx1*dy2-dy1*dx2;
          if(Math.abs(area)<.01)continue;
          const nx=data[i+3],ny=data[i+4],nz=data[i+5];
          const facing=nx*eye[0]+ny*eye[1]+nz*eye[2]>0?1:-1;
          const color=pack(shadeColor,.72+.22*Math.max(0,facing*(-.38*nx+.85*ny+.43*nz))+.06*Math.abs(ny));
          const left=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),endX=Math.min(w-1,Math.ceil(Math.max(a[0],b[0],c[0])));
          const top=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),endY=Math.min(h-1,Math.ceil(Math.max(a[1],b[1],c[1])));
          for(let y=top;y<=endY;y++) {
            const py=y+.5-a[1];
            let u=((left+.5-a[0])*dy2-py*dx2)/area,v=(dx1*py-dy1*(left+.5-a[0]))/area;
            const du=dy2/area,dv=-dy1/area;
            for(let x=left;x<=endX;x++,u+=du,v+=dv) {
              if(u<0||v<0||u+v>1)continue;
              const z=a[2]+u*(b[2]-a[2])+v*(c[2]-a[2]),index=y*w+x;
              if(z>=depth[index]){depth[index]=z;colors[index]=color;}
            }
          }
        }
      });
    }
    context.putImageData(pixels,0,0);
  }

  function prepare(host) {
    host.innerHTML=`<div class="mur-model-stage"><img class="mur-model-poster" src="model/overview.webp" alt="Аксонометрия цеха судоремонтного завода">
      <canvas tabindex="0" role="img" aria-label="Объёмная модель цеха. Для вращения используйте стрелки клавиатуры или перетащите изображение."></canvas></div>
      <div class="mur-model-bar"><span class="mur-model-hint">Перетащите, чтобы повернуть</span>
        <div class="mur-model-tools"><button type="button" class="mur-roof" aria-pressed="false">Снять кровлю</button>
        <button type="button" class="mur-reset" aria-label="Вернуть исходный ракурс" title="Вернуть исходный ракурс">Сбросить вид</button></div></div>`;
    const canvas=host.querySelector("canvas"),stage=canvas.parentElement;
    const roof=host.querySelector(".mur-roof"),reset=host.querySelector(".mur-reset");
    const hint=host.querySelector(".mur-model-hint");
    const state={...defaults};
    let cut=false,scheduled=false,grab=null,azimuthStart=0,elevationStart=0;
    let gl,context,program,geometry,p,n,uniforms;
    function staticMode(){
      host.classList.remove("mur-ready");host.classList.add("mur-static");
      hint.textContent="Исходный вид модели";canvas.tabIndex=-1;
    }
    try {
      gl=canvas.getContext("webgl",{alpha:true,antialias:true,premultipliedAlpha:false});
      if(gl) {
        program=createProgram(gl);gl.useProgram(program);
        p=gl.getAttribLocation(program,"pos");n=gl.getAttribLocation(program,"normal");
        uniforms=Object.fromEntries(["right","up","eye","scale","color","edge"].map(k=>[k,gl.getUniformLocation(program,k)]));
        geometry=makeGeometry(values=>{
          const id=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,id);
          gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(values),gl.STATIC_DRAW);
          return {id,count:values.length/6};
        });
      } else {
        context=canvas.getContext("2d");
        if(!context){staticMode();return;}
        geometry=makeGeometry(values=>new Float32Array(values));
      }
    }catch(error){console.warn("3D model:",error.message);staticMode();return;}
    function draw() {
      scheduled=false;
      const width=stage.clientWidth,height=stage.clientHeight;
      if(!width||!height)return;
      const ratio=gl?Math.min(devicePixelRatio||1,2):Math.min(1,840/width,540/height);
      const w=Math.round(width*ratio),h=Math.round(height*ratio);
      if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;}
      const a=state.azimuth,b=state.elevation;
      const right=[Math.cos(a),0,-Math.sin(a)];
      const up=[-Math.sin(a)*Math.sin(b),Math.cos(b),-Math.cos(a)*Math.sin(b)];
      const eye=[Math.sin(a)*Math.cos(b),Math.sin(b),Math.cos(a)*Math.cos(b)];
      const bounds=[1,.157,.331];
      const radius=axis=>axis.reduce((r,x,i)=>r+Math.abs(x)*bounds[i],0);
      const yScale=.88/Math.max(radius(up),radius(right)/(w/h));
      if(context) {
        drawSoftware(context,geometry,w,h,right,up,eye,yScale/(w/h),yScale,cut);
        host.classList.add("mur-ready");return;
      }
      gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      gl.uniform3fv(uniforms.right,right);gl.uniform3fv(uniforms.up,up);gl.uniform3fv(uniforms.eye,eye);
      gl.uniform2f(uniforms.scale,yScale/(w/h),yScale);
      gl.enableVertexAttribArray(p);gl.enableVertexAttribArray(n);
      for(const lines of [false,true]) {
        if(lines)gl.disable(gl.POLYGON_OFFSET_FILL);
        else {gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(1,1);}
        gl.uniform1f(uniforms.edge,lines?1:0);
        geometry.forEach((group,i)=>{
          if(i===0&&cut)return;
          const batch=lines?group.outline:group.triangles;
          gl.bindBuffer(gl.ARRAY_BUFFER,batch.id);
          gl.vertexAttribPointer(p,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(n,3,gl.FLOAT,false,24,12);
          gl.uniform3fv(uniforms.color,materials[i]);gl.drawArrays(lines?gl.LINES:gl.TRIANGLES,0,batch.count);
        });
      }
      host.classList.add("mur-ready");
    }
    function requestDraw(){if(!scheduled){scheduled=true;requestAnimationFrame(draw);}}
    function elevate(value){state.elevation=Math.max(.08,Math.min(1.42,value));}
    function setCut(value){cut=value;roof.textContent=cut?"Вернуть кровлю":"Снять кровлю";roof.setAttribute("aria-pressed",String(cut));requestDraw();}
    roof.addEventListener("click",()=>setCut(!cut));
    reset.addEventListener("click",()=>{Object.assign(state,defaults);setCut(false);});
    canvas.addEventListener("pointerdown",e=>{
      if(!e.isPrimary||e.button!==0)return;
      grab=[e.clientX,e.clientY];azimuthStart=state.azimuth;elevationStart=state.elevation;
      canvas.setPointerCapture(e.pointerId);canvas.classList.add("grabbing");
    });
    canvas.addEventListener("pointermove",e=>{
      if(!grab||!canvas.hasPointerCapture(e.pointerId))return;
      state.azimuth=azimuthStart-(e.clientX-grab[0])*.009;
      elevate(elevationStart+(e.clientY-grab[1])*.007);requestDraw();
    });
    for(const event of ["lostpointercapture","pointercancel","pointerup"])canvas.addEventListener(event,()=>{grab=null;canvas.classList.remove("grabbing");});
    canvas.addEventListener("keydown",e=>{
      const action={ArrowLeft:()=>state.azimuth-=.12,ArrowRight:()=>state.azimuth+=.12,ArrowUp:()=>elevate(state.elevation+.09),ArrowDown:()=>elevate(state.elevation-.09)}[e.key];
      if(!action||e.ctrlKey||e.metaKey||e.altKey)return;
      e.preventDefault();e.stopPropagation();action();requestDraw();
    });
    new ResizeObserver(requestDraw).observe(stage);
    canvas.addEventListener("webglcontextlost",()=>{staticMode();});
    requestDraw();
  }
  for(const host of document.querySelectorAll("[data-mur-model]"))prepare(host);
})();
