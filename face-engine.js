/* ============================================================
   D.A.B.S.y — face-engine.js
   Owns the DOM face. Listens to emotion-engine events and turns
   them into visible behaviour: expression classes, blinking,
   idle micro-looks, look-at-touch, recoil, talk rhythm.
   ============================================================ */

(function(){
  const face = document.getElementById("face");
  const eyes = [document.getElementById("eye-left"), document.getElementById("eye-right")];
  const bus = window.DABSy.bus;

  let currentExpression = "neutral";

  function setExpression(name){
    face.classList.forEach(c=>{ if(c.startsWith("exp-")) face.classList.remove(c); });
    face.classList.add("exp-" + name);
    currentExpression = name;
  }
  setExpression("neutral");

  bus.on("expression:set", ({name}) => setExpression(name));

  /* ---------- blinking (independent, irregular) ---------- */
  function scheduleBlink(){
    const delay = 2200 + Math.random()*4200;
    setTimeout(()=>{
      blinkOnce();
      scheduleBlink();
    }, delay);
  }
  function blinkOnce(double=false){
    eyes.forEach(e=>e.classList.add("blinking"));
    setTimeout(()=>{
      eyes.forEach(e=>e.classList.remove("blinking"));
      if(double) setTimeout(()=>blinkOnce(false), 160);
    }, 110);
  }
  scheduleBlink();
  // occasional double-blink
  setInterval(()=>{ if(Math.random() < 0.15) blinkOnce(true); }, 9000);

  /* ---------- idle micro-look: eyes drift slightly, then settle ---------- */
  function microLook(){
    if(currentExpression === "sleepy") return;
    const dx = (Math.random()*10-5).toFixed(1) + "px";
    const dy = (Math.random()*6-3).toFixed(1) + "px";
    eyes.forEach(e=>{
      e.style.setProperty("--lx", dx);
      e.style.setProperty("--ly", dy);
      e.classList.remove("micro-look"); void e.offsetWidth; e.classList.add("micro-look");
    });
    setTimeout(()=>{ // settle back
      eyes.forEach(e=>{
        e.style.setProperty("--lx", "0px");
        e.style.setProperty("--ly", "0px");
        e.classList.remove("micro-look"); void e.offsetWidth; e.classList.add("micro-look");
      });
    }, 1400 + Math.random()*1200);
  }
  setInterval(()=>{ if(Math.random() < 0.5) microLook(); }, 5200);

  /* ---------- idle breathing toggle ---------- */
  face.classList.add("idle-breathe");
  eyes.forEach(e=>e.querySelector(".eye-glow").classList.add("ambient"));

  /* ---------- look-at a point on screen (touch reaction) ---------- */
  function lookAt(x, y){
    const rect = face.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const dx = Math.max(-8, Math.min(8, (x-cx)/40));
    const dy = Math.max(-5, Math.min(5, (y-cy)/60));
    eyes.forEach(e=>{
      e.style.setProperty("--lx", dx+"px");
      e.style.setProperty("--ly", dy+"px");
      e.classList.remove("micro-look"); void e.offsetWidth; e.classList.add("micro-look");
    });
  }

  /* ---------- recoil (surprise burst) ---------- */
  function recoil(){
    eyes.forEach(e=>{
      e.classList.remove("recoil"); void e.offsetWidth; e.classList.add("recoil");
    });
  }
  bus.on("face:recoil", recoil);

  /* ---------- touch ripple ---------- */
  function ripple(eyeEl){
    const r = document.createElement("div");
    r.className = "touch-ripple";
    eyeEl.appendChild(r);
    setTimeout(()=>r.remove(), 500);
  }
  bus.on("face:ripple", ({index})=>{
    if(eyes[index]) ripple(eyes[index]);
  });

  /* ---------- talking rhythm ---------- */
  let talkInterval = null;
  function startTalking(){
    eyes.forEach(e=>e.classList.add("talking"));
  }
  function stopTalking(){
    eyes.forEach(e=>e.classList.remove("talking"));
  }
  bus.on("voice:speaking:start", startTalking);
  bus.on("voice:speaking:end", stopTalking);

  window.DABSy = window.DABSy || {};
  window.DABSy.face = { setExpression, lookAt, recoil, blinkOnce };
})();
