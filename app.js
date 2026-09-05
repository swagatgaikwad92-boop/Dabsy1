/* ============================================================
   D.A.B.S.y — app.js
   The conductor. Wires voice <-> AI <-> face/subtitle, and
   renders the panels that don't have their own engine file
   (Room, Memory, Settings).
   ============================================================ */

(function(){
  const bus = window.DABSy.bus;
  const emotion = window.DABSy.emotion;
  const memory = window.DABSy.memory;
  const voice = window.DABSy.voice;
  const ai = window.DABSy.ai;

  const subtitle = document.getElementById("subtitle");
  const inputDock = document.getElementById("input-dock");
  const micBtn = document.getElementById("mic-btn");
  const textInput = document.getElementById("text-input");

  /* ---------- subtitle helper ---------- */
  let subtitleTimer = null;
  function showSubtitle(text, holdMs=4200){
    subtitle.textContent = text;
    subtitle.classList.add("visible");
    clearTimeout(subtitleTimer);
    subtitleTimer = setTimeout(()=>subtitle.classList.remove("visible"), holdMs);
  }

  /* ---------- input dock reveal on tap, hides after idle ---------- */
  let dockHideTimer = null;
  function showDock(){
    inputDock.classList.add("visible");
    clearTimeout(dockHideTimer);
    dockHideTimer = setTimeout(()=>inputDock.classList.remove("visible"), 9000);
  }
  bus.on("face:tap", ({count})=>{ if(count===1) showDock(); });

  /* ---------- mic button ---------- */
  micBtn.addEventListener("click", ()=>{
    if(voice.isListening()){ voice.stopListening(); }
    else { voice.startListening(); }
  });
  bus.on("voice:listening:start", ()=>{
    micBtn.classList.add("live");
    emotion.setState("LISTENING");
    showSubtitle("Listening…", 6000);
  });
  bus.on("voice:listening:end", ()=>{
    micBtn.classList.remove("live");
  });
  bus.on("voice:unsupported", ()=>{
    showSubtitle("Speech recognition isn't supported in this browser — try typing instead.");
  });

  /* ---------- text input fallback ---------- */
  textInput.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" && textInput.value.trim()){
      handleUserUtterance(textInput.value.trim());
      textInput.value = "";
    }
  });

  bus.on("voice:heard", ({text})=>handleUserUtterance(text));

  async function handleUserUtterance(text){
    showDock();
    showSubtitle(text, 2600);
    memory.addSession("user", text);
    emotion.setState("THINKING");

    const recent = memory.getSession(6).map(m=>`${m.role}: ${m.text}`).join("\n");
    const result = await ai.askDABSy(text, { context: recent });

    memory.addSession("dabsy", result.text);
    memory.addHistory({ type:"chat", user: text, reply: result.text });

    if(result.state && result.state !== "CONFUSED_FALLBACK"){
      emotion.setState(result.state);
    } else {
      emotion.setState("IDLE");
    }

    voice.speak(result.text);
    showSubtitle(result.text, Math.min(9000, 2600 + result.text.length*40));
  }

  bus.on("dabsy:say", ({text})=>{
    showSubtitle(text, Math.min(8000, 2600 + text.length*40));
    voice.speak(text);
  });

  bus.on("face:overtapped", ()=>{
    emotion.flashExpression("playful", 1400);
    bus.emit("dabsy:say", { text: "Okay okay, I'm awake!" });
  });

  bus.on("face:longpress", ()=>{
    emotion.flashExpression("curious", 900);
  });

  /* ---------- Settings panel ---------- */
  const geminiKeyInput = document.getElementById("gemini-key");
  const voiceSelect = document.getElementById("voice-select");
  const soundToggle = document.getElementById("sound-toggle");
  const saveSettingsBtn = document.getElementById("save-settings");

  function populateSettings(){
    const s = memory.getSettings();
    geminiKeyInput.value = s.geminiKey || "";
    soundToggle.checked = s.sound !== false;
    const voices = voice.getVoices();
    voiceSelect.innerHTML = "";
    voices.forEach(v=>{
      const opt = document.createElement("option");
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      if(v.voiceURI === s.voiceURI) opt.selected = true;
      voiceSelect.appendChild(opt);
    });
  }
  bus.on("voice:voices-ready", populateSettings);
  populateSettings();

  saveSettingsBtn.addEventListener("click", ()=>{
    memory.saveSettings({
      geminiKey: geminiKeyInput.value.trim(),
      voiceURI: voiceSelect.value,
      sound: soundToggle.checked,
    });
    bus.emit("dabsy:say", { text: "Settings saved." });
  });

  bus.on("world:opened", ({tab})=>{
    if(tab === "settings") populateSettings();
    if(tab === "memory") renderMemoryPanel();
    if(tab === "room") renderRoom();
  });

  /* ---------- Memory panel ---------- */
  function renderMemoryPanel(){
    const el = document.getElementById("memory-body");
    const prefs = memory.getPreferences();
    const history = memory.getHistory().slice(-15).reverse();

    el.innerHTML = "";

    const prefTitle = document.createElement("div");
    prefTitle.className = "hint";
    prefTitle.textContent = "Things I've been told to remember";
    el.appendChild(prefTitle);

    if(prefs.length === 0){
      const empty = document.createElement("div");
      empty.className = "hint";
      empty.textContent = "Nothing yet.";
      el.appendChild(empty);
    }
    prefs.forEach((p, i)=>{
      const row = document.createElement("div");
      row.className = "mem-row";
      row.innerHTML = `<span>${escapeHtml(p.text)}</span>`;
      const del = document.createElement("button"); del.textContent = "Forget";
      del.onclick = ()=>{ memory.removePreference(i); renderMemoryPanel(); };
      row.appendChild(del);
      el.appendChild(row);
    });

    const histTitle = document.createElement("div");
    histTitle.className = "hint";
    histTitle.style.marginTop = "10px";
    histTitle.textContent = "Recent history";
    el.appendChild(histTitle);

    history.forEach(h=>{
      const row = document.createElement("div");
      row.className = "mem-row";
      const label = h.type === "study-session" ? `Studied for ${h.minutes} min`
        : h.type === "chat" ? `"${h.user}"`
        : h.type;
      row.innerHTML = `<span>${escapeHtml(label)}</span>`;
      el.appendChild(row);
    });

    const clearBtn = document.createElement("button");
    clearBtn.className = "util-btn";
    clearBtn.style.marginTop = "10px";
    clearBtn.textContent = "Clear all history";
    clearBtn.onclick = ()=>{ memory.clearHistory(); renderMemoryPanel(); };
    el.appendChild(clearBtn);
  }

  /* ---------- Room panel: simple evolving grid of stats ---------- */
  function renderRoom(){
    const el = document.getElementById("room-grid");
    const stats = memory.getPetStats();
    const tasks = memory.getTasks();
    const done = tasks.filter(t=>t.done).length;
    el.innerHTML = "";
    [
      { label: "Affection", value: Math.round((stats.affection||0.4)*100)+"%" },
      { label: "Tasks done", value: `${done}/${tasks.length}` },
      { label: "Study sessions", value: memory.getHistory().filter(h=>h.type==="study-session").length },
      { label: "Streak", value: `${stats.streak||0} visits in a row` },
    ].forEach(item=>{
      const row = document.createElement("div");
      row.className = "task-row";
      row.innerHTML = `<span>${item.label}</span><span>${item.value}</span>`;
      el.appendChild(row);
    });
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
})();
