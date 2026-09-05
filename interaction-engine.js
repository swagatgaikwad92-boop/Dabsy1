/* ============================================================
   D.A.B.S.y — interaction-engine.js
   All raw touch/pointer handling lives here. Translates gestures
   into bus events; never touches AI/voice logic directly.
   ============================================================ */

(function(){
  const bus = window.DABSy.bus;
  const stage = document.getElementById("stage");
  const face = document.getElementById("face");
  const bowtie = document.getElementById("bowtie");

  let lastTapTime = 0;
  let tapCount = 0;
  let tapResetTimer = null;
  let longPressTimer = null;
  let pressedAt = 0;

  function onFacePointerDown(e){
    const p = point(e);
    pressedAt = Date.now();
    window.DABSy.face.lookAt(p.x, p.y);
    ripplePick(p);

    longPressTimer = setTimeout(()=>{
      bus.emit("face:longpress", { x:p.x, y:p.y });
      longPressTimer = null;
    }, 550);
  }

  function onFacePointerUp(e){
    if(longPressTimer){ clearTimeout(longPressTimer); longPressTimer = null; }
    const now = Date.now();
    const held = now - pressedAt;
    if(held > 550) return; // handled as long-press already

    const gap = now - lastTapTime;
    lastTapTime = now;

    if(gap < 320){
      tapCount++;
    } else {
      tapCount = 1;
    }
    clearTimeout(tapResetTimer);
    tapResetTimer = setTimeout(()=>{
      // resolve single vs double after the double-tap window closes
      if(tapCount >= 2){
        bus.emit("face:doubletap");
      } else {
        bus.emit("face:tap", { count: tapCount });
      }
      tapCount = 0;
    }, 260);
  }

  function point(e){
    if(e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if(e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function ripplePick(p){
    const rect = face.getBoundingClientRect();
    const relX = p.x - rect.left;
    const index = relX < rect.width/2 ? 0 : 1;
    bus.emit("face:ripple", { index });
  }

  face.addEventListener("pointerdown", onFacePointerDown);
  face.addEventListener("pointerup", onFacePointerUp);
  face.addEventListener("pointercancel", ()=>{ if(longPressTimer){ clearTimeout(longPressTimer); longPressTimer=null; } });

  /* ---------- bow tie: double tap opens Utility tab directly ---------- */
  let btLast = 0;
  bowtie.addEventListener("pointerdown", (e)=>{
    e.stopPropagation();
    const now = Date.now();
    if(now - btLast < 320){
      bus.emit("world:open", { tab: "utility" });
    }
    btLast = now;
  });

  /* ---------- repeated rapid tapping -> playful/annoyed reaction ---------- */
  let rapidCount = 0;
  let rapidTimer = null;
  bus.on("face:tap", ()=>{
    rapidCount++;
    clearTimeout(rapidTimer);
    rapidTimer = setTimeout(()=>{ rapidCount = 0; }, 2500);
    if(rapidCount >= 5){
      bus.emit("face:overtapped");
      rapidCount = 0;
    }
  });

  window.DABSy = window.DABSy || {};
  window.DABSy.interaction = {}; // reserved for future extension (drag, swipe carousel)
})();
