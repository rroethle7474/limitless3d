(function(){
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* theme: light is the shipped default; ?theme=dark is an internal preview only */
  var qTheme = (location.search.match(/[?&]theme=(light|dark)/)||[])[1];
  if(qTheme) document.documentElement.setAttribute('data-theme', qTheme);

  /* ---------- mobile nav drawer ---------- */
  var burger = document.querySelector('.burger');
  var scrim = document.querySelector('.scrim');
  function closeMenu(){ document.body.classList.remove('menu-open'); if(burger) burger.setAttribute('aria-expanded','false'); }
  if(burger){
    burger.addEventListener('click', function(){
      var open = document.body.classList.toggle('menu-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  if(scrim) scrim.addEventListener('click', closeMenu);
  document.querySelectorAll('.drawer a').forEach(function(a){ a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape') closeMenu(); });
  window.addEventListener('resize', function(){ if(window.innerWidth>1024) closeMenu(); });

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('on'); io.unobserve(e.target); } });
  },{threshold:.15});
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  /* ---------- quote form ---------- */
  var qf = document.getElementById('quote-form');
  if(qf){
    qf.addEventListener('submit', function(e){
      e.preventDefault();
      var d = new FormData(qf);
      var payload = {};
      d.forEach(function(v,k){ payload[k]=v; });
      /* honeypot: only bots fill this, so drop it silently */
      if(payload.website){ return; }
      delete payload.website;
      payload.page = location.pathname;
      var btn = qf.querySelector('button[type=submit]');
      var label = btn.textContent;
      btn.textContent = 'Sending...'; btn.disabled = true;

      fetch('/api/quote', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
      }).then(function(r){
        if(!r.ok) throw new Error('endpoint not ready');
        success();
      }).catch(function(){
        /* no endpoint yet: hand off to the visitor's mail app so nothing is ever lost */
        var body = 'Name: '+(payload.name||'')+'\nPhone: '+(payload.phone||'-')+'\nEmail: '+(payload.email||'')+
                   '\nService: '+(payload.service||'')+'\n\n'+(payload.details||'');
        location.href = 'mailto:'+(qf.dataset.to||'limitless3ddesign@gmail.com')+'?subject='+
          encodeURIComponent('Quote request - '+(payload.service||'Custom work'))+'&body='+encodeURIComponent(body);
        btn.textContent = label; btn.disabled = false;
      });

      function success(){
        var ok = document.createElement('div');
        ok.className = 'form-ok';
        ok.innerHTML = '<div class="mono accent">Request received</div>'+
          '<h3>Thanks, we have got it.</h3>'+
          '<p>You will hear back from the workshop shortly, usually the same day.</p>';
        qf.replaceWith(ok);
      }
    });
  }

  /* ---------- build log spotlight ---------- */
  var stage = document.getElementById('show-stage');
  if(stage && window.SHOWCASE){
    var WORKS = window.SHOWCASE;
    var imgs = [document.getElementById('show-a'), document.getElementById('show-b')];
    var sweep = document.getElementById('show-sweep');
    var thumbs = document.getElementById('show-thumbs');
    var cur = 0, buf = 0, holdUntil = 0, seen = {on:false};
    WORKS.forEach(function(w){ var i=new Image(); i.src=w.img; });
    WORKS.forEach(function(w, i){
      var b = document.createElement('button');
      b.innerHTML = '<img src="'+w.img+'" alt="" loading="lazy">';
      b.setAttribute('aria-label', w.t);
      b.addEventListener('click', function(){ holdUntil = Date.now()+12000; show(i); });
      thumbs.appendChild(b);
    });
    var tBtns = thumbs.querySelectorAll('button');
    new IntersectionObserver(function(es){ seen.on = es[0].isIntersecting; },{threshold:.3}).observe(stage);
    function pad(n){ return (n<10?'0':'')+n; }
    function show(i){
      cur = i; var w = WORKS[i];
      buf = 1-buf;
      var inc = imgs[buf], out = imgs[1-buf];
      inc.src = w.img; inc.alt = w.t;
      inc.classList.add('on'); out.classList.remove('on');
      document.getElementById('show-kicker').textContent = w.k;
      document.getElementById('show-title').textContent = w.t;
      document.getElementById('show-sub').textContent = w.s;
      document.getElementById('show-count').textContent = pad(i+1)+' / '+pad(WORKS.length);
      tBtns.forEach(function(b,bi){ b.classList.toggle('on', bi===i); });
      if(!reduced){ sweep.classList.remove('go'); void sweep.offsetWidth; sweep.classList.add('go'); }
    }
    show(0);
    if(!reduced){
      setInterval(function(){
        if(!seen.on || Date.now()<holdUntil) return;
        show((cur+1)%WORKS.length);
      }, 5000);
    }
    var sx=null;
    stage.addEventListener('pointerdown', function(e){ sx=e.clientX; });
    stage.addEventListener('pointerup', function(e){
      if(sx===null) return;
      var dx=e.clientX-sx; sx=null;
      if(Math.abs(dx)>44){ holdUntil=Date.now()+12000; show((cur+(dx<0?1:WORKS.length-1))%WORKS.length); }
    });
  }

  /* ---------- shop category filter ---------- */
  var bar = document.querySelector('.shopbar');
  if(bar){
    var cards = Array.prototype.slice.call(document.querySelectorAll('.pcard'));
    var countEl = document.querySelector('.shop-count .n');
    bar.addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b) return;
      bar.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x===b); });
      var cat = b.dataset.cat, shown = 0;
      cards.forEach(function(c){
        var hit = (cat==='all' || (c.dataset.cats||'').split('|').indexOf(cat)>-1);
        c.style.display = hit ? '' : 'none';
        if(hit) shown++;
      });
      if(countEl) countEl.textContent = shown;
    });
  }

  /* ---------- product gallery ---------- */
  var pdpThumbs = document.querySelector('.pdp-thumbs');
  if(pdpThumbs){
    var main = document.querySelector('.pdp-main img');
    pdpThumbs.addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b) return;
      main.src = b.dataset.full;
      pdpThumbs.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on', x===b); });
    });
  }

  /* ---------- animated service visuals: perpetual loops ---------- */
  function e01(x){ return x<0?0:x>1?1:1-Math.pow(1-x,2.4); }
  function visWatch(el, obj){
    new IntersectionObserver(function(es){ obj.on = es[0].isIntersecting; },{threshold:.3}).observe(el);
  }
  function isDark(){ return document.documentElement.getAttribute('data-theme')==='dark'; }

  /* 01 scan: dots converge, measure line sweeps, dissolve, repeat */
  var vc = document.getElementById('viz-scan');
  if(vc){
    var vctx=vc.getContext('2d'), NN=340, pts=[], vis={on:false}, t0=null;
    function seed(){
      var W=vc.width=vc.clientWidth*2, H=vc.height=vc.clientHeight*2;
      pts=[];
      for(var i=0;i<NN;i++){
        var t=i/NN, th=t*Math.PI*2, d=1+Math.sin(th)*Math.sin(th);
        pts.push({rx:Math.random()*W, ry:Math.random()*H,
          tx:W/2+(W*.34)*Math.cos(th)/d, ty:H/2+(H*.62)*Math.sin(th)*Math.cos(th)/d});
      }
    }
    seed(); window.addEventListener('resize', seed);
    var CYC = 6.8;
    (function scanFrame(ts){
      requestAnimationFrame(scanFrame);
      if(!vis.on){ t0=null; return; }
      if(t0===null) t0=ts;
      var s = reduced ? 2 : ((ts-t0)/1000)%CYC;
      var W=vc.width, H=vc.height, dark=isDark();
      var conv = s<1.7 ? e01(s/1.7) : (s<5.2 ? 1 : (s<6.2 ? 1-e01((s-5.2)/1) : 0));
      var sweepX = (s>=1.9 && s<4.9) ? W*((s-1.9)/3) : -1;
      vctx.clearRect(0,0,W,H);
      if(sweepX>=0){
        var g=vctx.createLinearGradient(sweepX-70,0,sweepX+4,0);
        g.addColorStop(0,'rgba(94,23,235,0)'); g.addColorStop(1, dark?'rgba(180,154,255,.35)':'rgba(94,23,235,.22)');
        vctx.fillStyle=g; vctx.fillRect(sweepX-70,0,74,H);
      }
      for(var i=0;i<NN;i++){
        var p=pts[i];
        var x=p.rx+(p.tx-p.rx)*conv, y=p.ry+(p.ty-p.ry)*conv;
        var near = sweepX>=0 && Math.abs(x-sweepX)<46;
        vctx.fillStyle = near ? (dark?'#EDE6FF':'#2E0B8F') : (dark?'rgba(180,154,255,.8)':'rgba(74,18,188,.75)');
        var sz = near ? 4.4 : 2.4;
        vctx.fillRect(x-sz/2, y-sz/2, sz, sz);
      }
      if(sweepX>=0){ vctx.fillStyle = dark?'#B49AFF':'#5E17EB'; vctx.fillRect(sweepX,0,2,H); }
    })(0);
    visWatch(vc, vis);
  }

  /* 02 design: the drawing redraws itself */
  var cad = document.getElementById('viz-cad');
  if(cad){
    var items=[], vis2={on:false};
    cad.querySelectorAll('.draw').forEach(function(el){
      var len = el.getTotalLength ? el.getTotalLength() : 400;
      el._len = len;
      el.style.strokeDasharray = len;
      el.style.strokeDashoffset = reduced ? 0 : len;
      items.push(el);
    });
    visWatch(cad, vis2);
    if(!reduced){
      (function cadLoop(){
        if(vis2.on){
          items.forEach(function(el){ el.style.transition='none'; el.style.strokeDashoffset=el._len; });
          void cad.getBoundingClientRect();
          items.forEach(function(el,i){
            el.style.transition='stroke-dashoffset 1.3s ease '+(i*.16)+'s';
            el.style.strokeDashoffset=0;
          });
        }
        setTimeout(cadLoop, 6800);
      })();
    }
  }

  /* 03 print: nozzle lays each layer, stack resets */
  var vp = document.getElementById('viz-print');
  if(vp){
    var bars = Array.prototype.slice.call(vp.querySelectorAll('.layers i'));
    var noz = vp.querySelector('.nozzle');
    var layersEl = vp.querySelector('.layers');
    var vis3={on:false}, p0=null;
    visWatch(vp, vis3);
    var NB = bars.length, PER=.30, HOLD=1.7, FADE=.6;
    var TOT = NB*PER + HOLD + FADE;
    if(reduced){
      bars.forEach(function(b){ b.style.opacity=.92; b.style.transform='scaleX(1)'; });
    } else {
      (function printFrame(ts){
        requestAnimationFrame(printFrame);
        if(!vis3.on){ p0=null; return; }
        if(p0===null) p0=ts;
        var s=((ts-p0)/1000)%TOT;
        var vr = vp.getBoundingClientRect(), lr = layersEl.getBoundingClientRect();
        if(s < NB*PER){
          var li = Math.floor(s/PER), lp = (s%PER)/PER;
          for(var i=0;i<NB;i++){
            var done = i<li, isCur = i===li;
            bars[i].style.opacity = (done||isCur) ? .92 : 0;
            bars[i].style.transform = 'scaleX('+(done ? 1 : (isCur ? lp : 0))+')';
          }
          var y = lr.bottom - vr.top - (li+1)*(lr.height/NB);
          var x = lr.left - vr.left + lr.width*lp;
          noz.style.opacity = 1;
          noz.style.transform = 'translate('+(x-6)+'px,'+(y-5)+'px)';
        } else if(s < NB*PER+HOLD){
          bars.forEach(function(b){ b.style.opacity=.92; b.style.transform='scaleX(1)'; });
          noz.style.opacity = 0;
        } else {
          var f = 1-(s-NB*PER-HOLD)/FADE;
          bars.forEach(function(b){ b.style.opacity = .92*f; });
          noz.style.opacity = 0;
        }
      })(0);
    }
  }
})();
