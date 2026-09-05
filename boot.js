/* ============================================================
   D.A.B.S.y — boot.js
   Runs last. Kicks off the wake-up animation and removes the
   boot veil once the face has resolved into view.
   ============================================================ */

(function(){
  document.body.classList.add("booting");
  window.addEventListener("DOMContentLoaded", ()=>{
    setTimeout(()=>{
      document.body.classList.remove("booting");
    }, 2200);
  });

  // study:launch convenience — allows other UI to say "study this"
  window.DABSy?.bus?.on("study:launch", (payload)=>{
    // handled in study-engine.js; kept here as a documented entry point
  });
})();
