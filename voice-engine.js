/* ============================================================
   D.A.B.S.y — voice-engine.js
   Speech recognition (listening) + speech synthesis (speaking).
   Emits voice:* events; app.js wires these to the subtitle strip
   and the AI engine.
   ============================================================ */

(function(){
  const bus = window.DABSy.bus;
  const memory = window.DABSy.memory;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizer = null;
  let listening = false;

  function initRecognizer(){
    if(!SR) return null;
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-IN";
    r.onstart = ()=>{ listening = true; bus.emit("voice:listening:start"); };
    r.onend = ()=>{ listening = false; bus.emit("voice:listening:end"); };
    r.onerror = (e)=>{ listening = false; bus.emit("voice:listening:end"); bus.emit("voice:error", e); };
    r.onresult = (e)=>{
      const text = e.results[0][0].transcript;
      bus.emit("voice:heard", { text });
    };
    return r;
  }

  function startListening(){
    if(!SR){ bus.emit("voice:unsupported"); return; }
    if(listening) return;
    recognizer = recognizer || initRecognizer();
    try{ recognizer.start(); }catch(e){ /* already started */ }
  }
  function stopListening(){
    if(recognizer && listening) recognizer.stop();
  }

  /* ---------- speech synthesis ---------- */
  let voices = [];
  function loadVoices(){
    voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    bus.emit("voice:voices-ready", { voices });
  }
  if(window.speechSynthesis){
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function pickVoice(){
    const settings = memory.getSettings();
    if(settings.voiceURI){
      const v = voices.find(v=>v.voiceURI === settings.voiceURI);
      if(v) return v;
    }
    const order = ["en-IN","en-GB","en-US"];
    for(const lang of order){
      const v = voices.find(v=>v.lang === lang);
      if(v) return v;
    }
    return voices[0] || null;
  }

  function speak(text){
    if(!window.speechSynthesis || !text) { bus.emit("voice:speaking:end"); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if(v) utt.voice = v;
    utt.pitch = 1.08;
    utt.rate = 1.0;
    utt.onstart = ()=>bus.emit("voice:speaking:start");
    utt.onend = ()=>bus.emit("voice:speaking:end");
    utt.onerror = ()=>bus.emit("voice:speaking:end");
    window.speechSynthesis.speak(utt);
  }
  function stopSpeaking(){ if(window.speechSynthesis) window.speechSynthesis.cancel(); }

  window.DABSy = window.DABSy || {};
  window.DABSy.voice = { startListening, stopListening, speak, stopSpeaking, getVoices: ()=>voices, isListening: ()=>listening };
})();
