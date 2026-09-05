/* ============================================================
   D.A.B.S.y — study-engine.js
   Turns a question/topic into a step-by-step explanation shown
   in the projection surface, and speaks a short spoken summary
   separately so long text never clutters the subtitle strip.
   ============================================================ */

(function(){
  const bus = window.DABSy.bus;
  const ai = window.DABSy.ai;
  const voice = window.DABSy.voice;
  const projectionContent = document.getElementById("projection-content");
  const studyQuestion = document.getElementById("study-question");
  const studyStart = document.getElementById("study-start");

  function renderSteps(title, stepsText){
    projectionContent.innerHTML = "";
    const h = document.createElement("h3");
    h.textContent = title;
    projectionContent.appendChild(h);

    // split model output into steps on blank lines or numbered markers
    const chunks = stepsText.split(/\n{2,}|(?=^\d+[\.\)])/m).map(s=>s.trim()).filter(Boolean);
    chunks.forEach((chunk, i)=>{
      const div = document.createElement("div");
      div.className = "step" + (i===0 ? " highlight" : "");
      div.textContent = chunk;
      projectionContent.appendChild(div);
    });
  }

  async function startStudy(topic){
    if(!topic || !topic.trim()) return;
    bus.emit("world:close");
    bus.emit("projection:open");
    projectionContent.innerHTML = "<h3>Thinking it through…</h3>";

    const result = await ai.askDABSy(
      `Teach this step by step, in short numbered steps, for a Class 11 science student: ${topic}`,
      { context: "Study Mode: produce a clear step-by-step explanation, one idea per step." }
    );

    renderSteps(topic.length > 60 ? topic.slice(0,60)+"…" : topic, result.text);

    // short spoken summary rather than reading the whole thing aloud
    const summary = result.text.split(/\n/).find(l=>l.trim().length > 0) || "Here's the breakdown.";
    voice.speak(summary.replace(/^\d+[\.\)]\s*/, ""));
  }

  studyStart.addEventListener("click", ()=>{
    startStudy(studyQuestion.value);
    studyQuestion.value = "";
  });

  bus.on("study:launch", ({topic})=>startStudy(topic));

  window.DABSy = window.DABSy || {};
  window.DABSy.study = { startStudy };
})();
