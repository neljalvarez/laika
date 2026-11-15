export const UI_PREFS_KEY = "laika-mission-red-planet/ui";

/** Runs before the first paint (see app/layout.tsx) so the text never jumps. */
export const TEXT_SIZE_BOOT = `try{var p=JSON.parse(localStorage.getItem(${JSON.stringify(UI_PREFS_KEY)})||"{}");document.documentElement.style.setProperty("--ts",p.textSize==="xl"?"1.3":p.textSize==="large"?"1.15":"1");}catch(e){}`;
