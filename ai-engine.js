/* ============================================================
   D.A.B.S.y — ai-engine.js
   Talks to Gemini. Exports askDABSy(prompt, opts) which returns
   { text, state, expression }. Gemini is asked to reply with a
   small JSON envelope so the behaviour engine doesn't have to
   guess mood from prose — but we fail safe if it doesn't comply.
   ============================================================ */

(function(){
  const memory = window.DABSy.memory;
  const MODEL = "gemini-3.6-flash";
  const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  const VALID_STATES = ["IDLE","CURIOUS","HAPPY","FOCUSED","THINKING","SURPRISED","PLAYFUL","STUDY_FOCUS"];

  function systemPrompt(context){
    const prefs = memory.getPreferences().map(p=>p.text).join("; ") || "none yet";
    return [
      "You are D.A.B.S.y, a small, warm, quietly witty AI companion that lives on someone's desk.",
      "You are talking to a Class 11 science student in India. Keep answers clear, encouraging, and not overly long unless it's a study explanation.",
      `Known preferences about the user: ${prefs}.`,
      context ? `Context: ${context}` : "",
      "Reply with ONLY a JSON object, no markdown fences, in this exact shape:",
      '{"reply": "<what you say out loud, plain text, no markdown>", "state": "<one of IDLE|CURIOUS|HAPPY|FOCUSED|THINKING|SURPRISED|PLAYFUL|STUDY_FOCUS>"}',
      "Pick the state that matches the emotional tone of your reply."
    ].filter(Boolean).join("\n");
  }

  function safeParse(raw){
    try{
      const cleaned = raw.trim().replace(/^```json/i,"").replace(/^```/,"").replace(/```$/,"").trim();
      const obj = JSON.parse(cleaned);
      return {
        text: typeof obj.reply === "string" ? obj.reply : raw,
        state: VALID_STATES.includes(obj.state) ? obj.state : "IDLE",
      };
    }catch(e){
      return { text: raw, state: "IDLE" };
    }
  }

  async function askDABSy(prompt, opts={}){
    const settings = memory.getSettings();
    const key = settings.geminiKey;
    if(!key){
      return { text: "I don't have an API key yet — add one in Settings so I can actually think.", state: "CONFUSED_FALLBACK" };
    }

    const parts = [{ text: systemPrompt(opts.context) + "\n\nUser: " + prompt }];
    if(opts.imageBase64){
      parts.push({ inline_data: { mime_type: "image/jpeg", data: opts.imageBase64 } });
    }

    const body = {
      contents: [{ role: "user", parts }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
    };

    try{
      const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if(!res.ok){
        const errText = await res.text();
        console.error("Gemini error", res.status, errText);
        return { text: "Something went wrong reaching Gemini — check the API key in Settings.", state: "IDLE" };
      }
      const data = await res.json();
      const raw = data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join("") || "";
      const parsed = safeParse(raw);
      return { text: parsed.text, state: VALID_STATES.includes(parsed.state) ? parsed.state : "IDLE" };
    }catch(e){
      console.error(e);
      return { text: "I couldn't reach Gemini just now — check your connection.", state: "IDLE" };
    }
  }

  window.DABSy = window.DABSy || {};
  window.DABSy.ai = { askDABSy };
})();
