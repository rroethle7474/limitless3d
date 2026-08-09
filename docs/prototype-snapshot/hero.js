(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var canHover = window.matchMedia('(hover: hover)').matches;
  var theme = document.documentElement.getAttribute('data-theme') || 'light';

  var canvas = document.getElementById('hero-canvas');
  var heroEl = document.getElementById('hero');
  var caption = document.getElementById('obj-caption');
  if(!canvas || !heroEl) return;

  var renderer = null;
  try{
    if(/[?&]nogl=1/.test(location.search)) throw new Error('nogl');
    if(!window.THREE) throw new Error('no three');
    renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true, alpha:true});
  }catch(err){ fallback(); return; }

  function fallback(){
    canvas.remove(); if(caption) caption.remove();
    heroEl.insertAdjacentHTML('beforeend',
      '<svg viewBox="0 0 100 50" fill="none" aria-hidden="true" style="position:absolute;z-index:1;right:6%;top:26%;width:min(44vw,560px);filter:drop-shadow(0 0 46px rgba(94,23,235,.4))">'+
      '<path d="M50 25 C42 8, 16 8, 12 25 C8 42, 34 42, 50 25 C66 8, 92 8, 88 25 C84 42, 58 42, 50 25 Z" stroke="#5E17EB" stroke-width="6" stroke-linecap="round"/></svg>');
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.localClippingEnabled = true;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(38, 1, .1, 100);
  camera.position.set(0, 1.4, 8.4);
  camera.lookAt(0, 0, 0);

  var THEMES = {
    dark:  { amb:[0x8890a8,.55], key:[0xffffff,1.05], rim:[0x5E17EB,13,20], fill:[0xB49AFF,4,16],
             pts:0xB49AFF, ptsBlend:'add', band:0xE7DDFF, shadow:.5 },
    light: { amb:[0xffffff,.85], key:[0xffffff,.95],  rim:[0x5E17EB,6,20],  fill:[0x4A12BC,2,16],
             pts:0x4A12BC, ptsBlend:'normal', band:0x2E0B8F, shadow:.17 }
  };
  var amb = new THREE.AmbientLight(); scene.add(amb);
  var key = new THREE.DirectionalLight(); key.position.set(3,5,4); scene.add(key);
  var rim = new THREE.PointLight(); rim.position.set(-3.4,1.2,-2.2); scene.add(rim);
  var fill = new THREE.PointLight(); fill.position.set(2.6,-1.4,2.6); scene.add(fill);

  /* the brand mark as a lemniscate with a gentle over/under weave */
  function lemni(t, out){
    var th = t * Math.PI * 2;
    var d = 1 + Math.sin(th)*Math.sin(th);
    var a = 2.15;
    out.set( a*Math.cos(th)/d, a*Math.sin(th)*Math.cos(th)/d, .34*Math.sin(2*th) );
    return out;
  }
  function brushR(t){ return .20 * (0.78 + 0.30*Math.sin(t*Math.PI*4 + .7)); }

  function buildTube(){
    var SEG=440, RAD=26, v=new THREE.Vector3(), v2=new THREE.Vector3();
    var pts=[]; for(var i=0;i<=SEG;i++){ pts.push(lemni(i/SEG,new THREE.Vector3())); }
    var pos=[], norm=[], idx=[];
    var tang=new THREE.Vector3(), nrm=new THREE.Vector3(0,0,1), bin=new THREE.Vector3();
    var prevN = new THREE.Vector3(0,0,1);
    for(var i=0;i<=SEG;i++){
      var p=pts[i];
      tang.subVectors(pts[(i+1)%SEG], pts[(i-1+SEG)%SEG]).normalize();
      bin.crossVectors(tang, prevN).normalize();
      nrm.crossVectors(bin, tang).normalize();
      prevN.copy(nrm);
      var r = brushR(i/SEG);
      for(var j=0;j<=RAD;j++){
        var an=j/RAD*Math.PI*2;
        var cx=Math.cos(an)*r, cy=Math.sin(an)*r;
        v.copy(nrm).multiplyScalar(cx).addScaledVector(bin,cy).add(p);
        pos.push(v.x,v.y,v.z);
        v2.copy(nrm).multiplyScalar(cx).addScaledVector(bin,cy).normalize();
        norm.push(v2.x,v2.y,v2.z);
      }
    }
    for(var i=0;i<SEG;i++){ for(var j=0;j<RAD;j++){
      var a=i*(RAD+1)+j, b=a+RAD+1;
      idx.push(a,b,a+1, b,b+1,a+1);
    }}
    var g=new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(norm,3));
    g.setIndex(idx);
    return g;
  }

  var geo = buildTube();
  geo.computeBoundingBox();
  var minY = geo.boundingBox.min.y, maxY = geo.boundingBox.max.y;

  var clipMain = new THREE.Plane(new THREE.Vector3(0,-1,0), minY);
  var clipBandLo = new THREE.Plane(new THREE.Vector3(0,1,0), -minY);
  var clipBandHi = new THREE.Plane(new THREE.Vector3(0,-1,0), minY);

  var mat = new THREE.MeshPhysicalMaterial({
    color:0x5E17EB, roughness:.34, metalness:.12, clearcoat:.45, clearcoatRoughness:.25,
    clippingPlanes:[clipMain], side:THREE.DoubleSide, transparent:true, opacity:1
  });
  var mesh = new THREE.Mesh(geo, mat);
  var bandMat = new THREE.MeshBasicMaterial({ clippingPlanes:[clipBandLo, clipBandHi], side:THREE.DoubleSide, toneMapped:false });
  var band = new THREE.Mesh(geo, bandMat);

  /* scan cloud: surface samples sorted by height so the print consumes them bottom up */
  var N = 2200;
  var samples = [];
  var sv=new THREE.Vector3(), st=new THREE.Vector3(), sb=new THREE.Vector3(), sn=new THREE.Vector3(0,0,1), sprev=new THREE.Vector3(0,0,1);
  for(var i=0;i<N;i++){
    var t = Math.random();
    var p = lemni(t, new THREE.Vector3());
    var p2 = lemni((t+.002)%1, new THREE.Vector3());
    st.subVectors(p2,p).normalize();
    sb.crossVectors(st, sprev).normalize();
    sn.crossVectors(sb, st).normalize();
    sprev.copy(sn);
    var an = Math.random()*Math.PI*2, r = brushR(t);
    sv.copy(sn).multiplyScalar(Math.cos(an)*r).addScaledVector(sb, Math.sin(an)*r).add(p);
    samples.push({x:sv.x, y:sv.y, z:sv.z});
  }
  samples.sort(function(a,b){ return a.y-b.y; });
  var target = new Float32Array(N*3), start = new Float32Array(N*3), sortedY = new Float64Array(N);
  for(var i=0;i<N;i++){ target[i*3]=samples[i].x; target[i*3+1]=samples[i].y; target[i*3+2]=samples[i].z; sortedY[i]=samples[i].y; }
  function randomizeStarts(){
    for(var i=0;i<N;i++){
      var th=Math.random()*Math.PI*2, ph=Math.acos(2*Math.random()-1), rr=3.4+Math.random()*2.6;
      start[i*3]  = rr*Math.sin(ph)*Math.cos(th);
      start[i*3+1]= rr*Math.cos(ph)*.7;
      start[i*3+2]= rr*Math.sin(ph)*Math.sin(th);
    }
  }
  randomizeStarts();
  var ptsGeo = new THREE.BufferGeometry();
  var ptsPos = new Float32Array(N*3); ptsPos.set(start);
  ptsGeo.setAttribute('position', new THREE.BufferAttribute(ptsPos,3));
  var ptsMat = new THREE.PointsMaterial({ size:.042, sizeAttenuation:true, transparent:true, opacity:.9, depthWrite:false });
  var points = new THREE.Points(ptsGeo, ptsMat);

  function shadowTexture(){
    var c=document.createElement('canvas'); c.width=c.height=256;
    var x=c.getContext('2d');
    var g=x.createRadialGradient(128,128,10,128,128,124);
    g.addColorStop(0,'rgba(0,0,0,1)'); g.addColorStop(.55,'rgba(0,0,0,.45)'); g.addColorStop(1,'rgba(0,0,0,0)');
    x.fillStyle=g; x.fillRect(0,0,256,256);
    return new THREE.CanvasTexture(c);
  }
  var shadowMat = new THREE.MeshBasicMaterial({map:shadowTexture(), transparent:true, opacity:.5, depthWrite:false});
  var shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.6,3.4), shadowMat);
  shadow.rotation.x = -Math.PI/2;
  shadow.position.y = minY - .55;

  var group = new THREE.Group();
  group.add(mesh); group.add(band); group.add(points);
  var rig = new THREE.Group();
  rig.add(group); rig.add(shadow);
  scene.add(rig);

  function applySceneTheme(){
    var T = THEMES[document.documentElement.getAttribute('data-theme')==='dark' ? 'dark' : 'light'];
    amb.color.setHex(T.amb[0]); amb.intensity = T.amb[1];
    key.color.setHex(T.key[0]); key.intensity = T.key[1];
    rim.color.setHex(T.rim[0]); rim.intensity = T.rim[1]; rim.distance = T.rim[2];
    fill.color.setHex(T.fill[0]); fill.intensity = T.fill[1]; fill.distance = T.fill[2];
    ptsMat.color.setHex(T.pts);
    ptsMat.blending = T.ptsBlend==='add' ? THREE.AdditiveBlending : THREE.NormalBlending;
    ptsMat.needsUpdate = true;
    bandMat.color.setHex(T.band);
    shadowMat.opacity = T.shadow;
  }
  applySceneTheme();

  /* per-tier placement so the free object works on every device */
  var LAY = {
    mobile:  { x:0,    y:1.42, s:.44, camZ:10.4 },
    tablet:  { x:1.15, y:.15,  s:.86, camZ:8.8 },
    desktop: { x:1.85, y:.05,  s:1,   camZ:8.4 }
  };
  function tierFor(w){ return w<=640 ? 'mobile' : (w<=1024 ? 'tablet' : 'desktop'); }
  var tier = null;
  function applyLayout(){
    var t = tierFor(window.innerWidth);
    if(t===tier) return;
    tier = t; var L = LAY[t];
    rig.position.set(L.x, L.y, 0);
    rig.scale.setScalar(L.s);
    camera.position.z = L.camZ;
  }
  function resize(){
    var w = heroEl.clientWidth, h = heroEl.clientHeight;
    renderer.setSize(w,h,false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
    applyLayout();
  }
  resize(); window.addEventListener('resize', resize);

  var PH = [
    {name:'scan',    dur:3.2},
    {name:'print',   dur:4.6},
    {name:'done',    dur:4.4},
    {name:'dissolve',dur:1.9}
  ];
  var phase = 0, pt = 0, TOTAL_LAYERS = 212;
  var qPhase = (location.search.match(/[?&]phase=(scan|print|done)/)||[])[1];
  if(/[?&]done=1/.test(location.search)) qPhase = 'done';
  var locked = !!qPhase || reduced;
  if(qPhase==='print'){ phase=1; pt=PH[1].dur*.62; }
  else if(qPhase==='done' || reduced){ phase=2; pt=0; }
  else if(qPhase==='scan'){ phase=0; pt=PH[0].dur*.7; }

  function ease(x){ return x<0?0:x>1?1:1-Math.pow(1-x,2.2); }
  function countBelow(h){
    var lo=0, hi=N;
    while(lo<hi){ var mid=(lo+hi)>>1; if(sortedY[mid]<h) lo=mid+1; else hi=mid; }
    return lo;
  }
  function setCaption(html){ if(caption && caption.innerHTML!==html) caption.innerHTML=html; }

  function applyPhase(){
    var name = PH[phase].name, e = ease(pt/PH[phase].dur);
    if(name==='scan'){
      mesh.visible=false; band.visible=false; points.visible=true;
      ptsMat.opacity = .25 + .65*Math.min(1,e*2.2);
      for(var i=0;i<N;i++){
        var k=i*3, d = ease(Math.min(1, e*1.25 - (i%17)/17*.25 ));
        ptsPos[k]=start[k]+(target[k]-start[k])*d;
        ptsPos[k+1]=start[k+1]+(target[k+1]-start[k+1])*d;
        ptsPos[k+2]=start[k+2]+(target[k+2]-start[k+2])*d;
      }
      ptsGeo.attributes.position.needsUpdate=true;
      ptsGeo.setDrawRange(0,N);
      setCaption('SCANNING&hellip; <b>'+Math.round(e*100)+'%</b>');
    } else if(name==='print'){
      mesh.visible=true; band.visible=true; points.visible=true;
      mat.opacity=1;
      var h = minY + (maxY-minY)*e;
      /* clipping planes are world space: map local height through the rig transform */
      var s = rig.scale.x, hw = rig.position.y + s*h;
      clipMain.constant = hw; clipBandHi.constant = hw; clipBandLo.constant = -(hw - .055*s);
      var printed = countBelow(h);
      ptsGeo.setDrawRange(printed, N-printed);
      setCaption('PRINTING&hellip; <b>'+Math.round(e*100)+'%</b> &middot; LAYER <b>'+Math.max(1,Math.round(e*TOTAL_LAYERS))+'</b>/'+TOTAL_LAYERS);
    } else if(name==='done'){
      mesh.visible=true; band.visible=false; points.visible=false;
      mat.opacity=1; clipMain.constant = 1000;
      setCaption('COMPLETE &middot; <b>0.02 MM</b> ACCURACY'+(canHover?' &middot; DRAG TO SPIN':''));
    } else {
      mesh.visible=true; band.visible=false; points.visible=true;
      mat.opacity = 1-e;
      ptsMat.opacity = .9*e;
      for(var i=0;i<N;i++){
        var k=i*3, d = ease(e);
        ptsPos[k]=target[k]+(start[k]-target[k])*d;
        ptsPos[k+1]=target[k+1]+(start[k+1]-target[k+1])*d;
        ptsPos[k+2]=target[k+2]+(start[k+2]-target[k+2])*d;
      }
      ptsGeo.attributes.position.needsUpdate=true;
      ptsGeo.setDrawRange(0,N);
      setCaption('&nbsp;');
    }
  }

  var targRY = 0, velY = 0, dragging=false, px=0;
  canvas.addEventListener('pointerdown', function(e){ dragging=true; px=e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', function(e){
    if(!dragging) return;
    targRY += (e.clientX-px)*.008; velY=(e.clientX-px)*.008; px=e.clientX;
  });
  window.addEventListener('pointerup', function(){ dragging=false; });

  var parX=0, parY=0;
  if(canHover && !reduced){
    window.addEventListener('pointermove', function(e){
      parX = (e.clientX/window.innerWidth - .5);
      parY = (e.clientY/window.innerHeight - .5);
    });
  }

  var heroVisible = true;
  new IntersectionObserver(function(es){ heroVisible = es[0].isIntersecting; },{threshold:0}).observe(heroEl);

  var clock = new THREE.Clock();
  function tick(){
    requestAnimationFrame(tick);
    if(!heroVisible) return;
    var dt = Math.min(clock.getDelta(), .05);
    if(!locked){
      pt += dt;
      if(pt >= PH[phase].dur){
        pt = 0; phase = (phase+1)%PH.length;
        if(phase===0) randomizeStarts();
      }
    }
    rig.position.x = LAY[tier].x + parX*.35;
    rig.position.y = LAY[tier].y - parY*.22;
    applyPhase();
    if(!dragging){
      if(Math.abs(velY)>.0004){ targRY+=velY; velY*=.94; }
      else if(!reduced){ targRY += dt*(PH[phase].name==='done' ? .3 : .1); }
    }
    group.rotation.y += (targRY-group.rotation.y)*.12;
    renderer.render(scene,camera);
  }
  applyPhase();
  tick();
})();
