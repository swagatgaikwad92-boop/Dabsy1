/* ============================================================
   D.A.B.S.y — pet-engine.js
   Gives DABSy continuity across sessions: notices neglect,
   rewards interaction, greets differently after an absence,
   notices long study sessions.
   ============================================================ */

(function(){
  const bus = window.DABSy.bus;
  const memory = window.DABSy.memory;
  const emotion = window.DABSy.emotion;

  const stats = memory.getPetStats();
  const now = Date.now();
  const awayMs = now - (stats.lastSeen || now);
  const awayHours = awayMs / 36e5;

  // returning after a while
  if(awayHours > 6){
    setTimeout(()=>{
      emotion.flashExpression("happy", 1400);
      bus.emit("dabsy:say", { text: awayHours > 24
        ? "Oh hey — it's been a while! Good to see you again."
        : "Welcome back." });
    }, 1900);
    stats.streak = 0;
  } else {
    stats.streak = (stats.streak||0) + 1;
  }

  stats.lastSeen = Date.now();
  memory.savePetStats(stats);

  // interaction rewards affection / energy; neglect raises boredom/sleepiness
  let lastInteractionAt = Date.now();
  function markInteraction(){
    lastInteractionAt = Date.now();
    emotion.nudge("affection", 0.03);
    emotion.nudge("boredom", -0.08);
    emotion.nudge("sleepiness", -0.05);
  }
  bus.on("face:tap", markInteraction);
  bus.on("face:doubletap", markInteraction);
  bus.on("voice:heard", markInteraction);

  setInterval(()=>{
    const idleMinutes = (Date.now() - lastInteractionAt) / 60000;
    if(idleMinutes > 6){
      emotion.nudge("boredom", 0.05);
      emotion.nudge("sleepiness", 0.04);
    }
    if(emotion.mood.sleepiness > 0.75 && emotion.getState() === "IDLE"){
      emotion.setState("SLEEPY");
    }
    const stats2 = memory.getPetStats();
    stats2.affection = emotion.mood.affection;
    memory.savePetStats(stats2);
  }, 30000);

  // long study session notice
  let studyStartedAt = null;
  bus.on("study:start", ()=>{ studyStartedAt = Date.now(); });
  bus.on("study:end", ()=>{
    if(!studyStartedAt) return;
    const mins = (Date.now() - studyStartedAt)/60000;
    memory.addHistory({ type:"study-session", minutes: Math.round(mins) });
    if(mins > 25){
      emotion.flashExpression("proud", 1600);
      bus.emit("dabsy:say", { text: "Solid session — proud of you for sticking with that." });
    }
    studyStartedAt = null;
  });

  window.DABSy = window.DABSy || {};
  window.DABSy.pet = { markInteraction };
})();
