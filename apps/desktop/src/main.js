"use strict";

const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

const IS_DEV = process.env.NODE_ENV !== "production" || !app.isPackaged;
const WEB_URL = IS_DEV
  ? "http://localhost:5173"
  : `file://${path.join(__dirname, "../web-dist/index.html")}`;
const APP_VERSION = app.getVersion();

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let splashWindow = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 900,
    height: 520,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{width:900px;height:520px;overflow:hidden;background:radial-gradient(ellipse at 50% 40%,#0d1f3c 0%,#060e1e 55%,#020609 100%);
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      font-family:'Segoe UI',system-ui,sans-serif;color:#f1f5f9;border-radius:12px;border:1px solid rgba(14,165,233,0.2)}
    h1{font-size:4rem;font-weight:900;letter-spacing:-0.03em;background:linear-gradient(135deg,#7dd3fc,#22d3ee,#0ea5e9);
       -webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1;margin-bottom:8px}
    .sub{font-size:0.9rem;color:#94a3b8;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:28px}
    .bar-wrap{width:440px;height:4px;background:rgba(255,255,255,0.06);border-radius:999px;overflow:hidden;border:1px solid rgba(14,165,233,0.15)}
    .bar{height:100%;width:0%;background:linear-gradient(90deg,#0284c7,#22d3ee);border-radius:999px;box-shadow:0 0 10px rgba(34,211,238,0.6)}
    .stage{margin-top:8px;font-size:0.7rem;color:#475569;text-align:center;min-height:1.1em}
    .footer{position:absolute;bottom:20px;display:flex;gap:16px;align-items:center;font-size:0.68rem;color:#334155}
    .footer .v{color:#38bdf8;font-weight:700}
  </style></head><body>
    <svg width="80" height="80" viewBox="0 0 96 96" fill="none" style="margin-bottom:20px;filter:drop-shadow(0 0 18px rgba(14,165,233,0.5))">
      <defs>
        <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#22d3ee"/><stop offset="100%" stop-color="#0284c7"/></linearGradient>
        <linearGradient id="ng" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#7dd3fc"/><stop offset="100%" stop-color="#0ea5e9"/></linearGradient>
      </defs>
      <polygon points="48,4 88,26 88,70 48,92 8,70 8,26" fill="none" stroke="url(#hg)" stroke-width="2.5"/>
      <polygon points="48,14 80,32 80,64 48,82 16,64 16,32" fill="rgba(2,132,199,0.12)" stroke="#0ea5e9" stroke-width="1"/>
      <text x="48" y="60" text-anchor="middle" font-size="36" font-family="Segoe UI,sans-serif" font-weight="900" fill="url(#ng)">N</text>
    </svg>
    <h1>NexFlow</h1>
    <p class="sub">Enterprise Engineering Design Platform</p>
    <div class="bar-wrap"><div class="bar" id="bar"></div></div>
    <p class="stage" id="stage">Initialising...</p>
    <div class="footer">
      <span class="v">v${APP_VERSION}</span><span>|</span>
      <span>2026 Lawrence Mukombo</span><span>|</span>
      <span>NexFlow Technologies</span>
    </div>
    <script>
      const stages=[{label:"Initialising core engine...",pct:15},{label:"Loading component libraries...",pct:35},
        {label:"Bootstrapping simulation runtime...",pct:55},{label:"Preparing canvas renderer...",pct:72},
        {label:"Applying domain configurations...",pct:88},{label:"Ready.",pct:100}];
      const bar=document.getElementById("bar"),stageEl=document.getElementById("stage");
      const start=Date.now(),DURATION=2800;
      function tick(){const pct=Math.min((Date.now()-start)/DURATION*100,100);bar.style.width=pct+"%";
        const s=stages.find(x=>pct<=x.pct)||stages[stages.length-1];stageEl.textContent=s.label;
        if(pct<100)requestAnimationFrame(tick);}
      requestAnimationFrame(tick);
    </script>
  </body></html>`;

  splashWindow.loadURL("data:text/html," + encodeURIComponent(html));
}

function buildMenu() {
  return Menu.buildFromTemplate([
    { label:"File", submenu:[
      { label:"New Project", accelerator:"CmdOrCtrl+N", click:()=>mainWindow?.webContents.send("menu:new-project") },
      { label:"Open Project", accelerator:"CmdOrCtrl+O", click:()=>mainWindow?.webContents.send("menu:open-project") },
      { label:"Save Project", accelerator:"CmdOrCtrl+S", click:()=>mainWindow?.webContents.send("menu:save-project") },
      { type:"separator" }, { role:"quit" }
    ]},
    { label:"Edit", submenu:[
      { role:"undo" },{ role:"redo" },{ type:"separator" },
      { role:"cut" },{ role:"copy" },{ role:"paste" },{ type:"separator" },
      { label:"Select All", accelerator:"CmdOrCtrl+A", click:()=>mainWindow?.webContents.send("menu:select-all") },
      { label:"Delete Selected", accelerator:"Delete", click:()=>mainWindow?.webContents.send("menu:delete-selected") }
    ]},
    { label:"View", submenu:[
      { label:"Reset Zoom", accelerator:"CmdOrCtrl+0", click:()=>mainWindow?.webContents.send("menu:reset-zoom") },
      { label:"Fit to Screen", accelerator:"CmdOrCtrl+Shift+F", click:()=>mainWindow?.webContents.send("menu:fit-view") },
      { type:"separator" },{ role:"togglefullscreen" },
      ...(IS_DEV?[{ type:"separator" },{ role:"toggleDevTools" }]:[])
    ]},
    { label:"Simulation", submenu:[
      { label:"Start Simulation", accelerator:"F5", click:()=>mainWindow?.webContents.send("menu:start-sim") },
      { label:"Stop Simulation", accelerator:"F6", click:()=>mainWindow?.webContents.send("menu:stop-sim") },
      { label:"Packet Burst", accelerator:"F7", click:()=>mainWindow?.webContents.send("menu:packet-burst") }
    ]},
    { label:"Help", submenu:[
      { label:"GitHub Repository", click:()=>shell.openExternal("https://github.com/LawrenceMukombo/nexflow") },
      { label:"Report an Issue", click:()=>shell.openExternal("https://github.com/LawrenceMukombo/nexflow/issues") },
      { type:"separator" },
      { label:`NexFlow v${APP_VERSION}`, enabled:false },
      { label:"2026 Lawrence Mukombo", enabled:false }
    ]}
  ]);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width:1440, height:900, minWidth:1024, minHeight:640, show:false,
    title:`NexFlow v${APP_VERSION}`, backgroundColor:"#0b111e",
    webPreferences:{ nodeIntegration:false, contextIsolation:true, webSecurity:!IS_DEV }
  });
  Menu.setApplicationMenu(buildMenu());
  mainWindow.loadURL(WEB_URL).catch(err=>console.error("Load error:",err));
  mainWindow.once("ready-to-show",()=>{
    setTimeout(()=>{
      if(splashWindow&&!splashWindow.isDestroyed()){splashWindow.close();splashWindow=null;}
      mainWindow.show(); mainWindow.focus();
    },3200);
  });
  mainWindow.on("closed",()=>{mainWindow=null;});
}

app.whenReady().then(()=>{
  createSplashWindow();
  createMainWindow();
  app.on("activate",()=>{ if(BrowserWindow.getAllWindows().length===0) createMainWindow(); });
});
app.on("window-all-closed",()=>{ if(process.platform!=="darwin") app.quit(); });
app.on("second-instance",()=>{
  if(mainWindow){ if(mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
});
