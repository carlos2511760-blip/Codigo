// ============================================================
// NEXUS Slides Pro - Editor Engine
// ============================================================

// --- STATE ---
const slides = [];
let curIdx = 0;
let selEl = null;
let zTop = 10;
let isZen = false;
let isDragging = false, isResizing = false;
let dragEl = null, resizeEl = null, resizeHandle = null;
let startX, startY, startW, startH, startL, startT;

// --- HISTORY STATE ---
let historyStack = [];
let historyIdx = -1;
let isRestoring = false;

// --- DOM REFS ---
const slide    = document.getElementById('slide');
const ctxBar   = document.getElementById('ctxBar');
const timeline = document.getElementById('timeline');
const addSlBtn = document.querySelector('.add-sl');
const animTarget = document.getElementById('animTarget');

// ============================================================
// SLIDES MANAGEMENT
// ============================================================
function createSlide(bg='#ffffff', html='', anim='none'){
  return { bg, html, anim };
}

function saveSlide(){
  if(!slides[curIdx]) return;
  slides[curIdx].bg = slide.style.background || slide.style.backgroundColor || '#fff';
  slides[curIdx].html = slide.innerHTML;
}

function commitHistory() {
  if (isRestoring) return;
  saveSlide();
  const state = {
    slides: slides.map(s => ({ bg: s.bg, html: s.html, anim: s.anim })),
    curIdx: curIdx
  };
  if (historyIdx < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIdx + 1);
  }
  historyStack.push(state);
  historyIdx++;
}

function undo() {
  if (historyIdx > 0) {
    historyIdx--;
    restoreHistory(historyStack[historyIdx]);
  }
}

function redo() {
  if (historyIdx < historyStack.length - 1) {
    historyIdx++;
    restoreHistory(historyStack[historyIdx]);
  }
}

function restoreHistory(state) {
  isRestoring = true;
  slides.length = 0;
  state.slides.forEach(s => slides.push({ bg: s.bg, html: s.html, anim: s.anim }));
  renderSlide(state.curIdx);
  isRestoring = false;
}

document.addEventListener('keydown', (e) => {
  if (document.getElementById('pres').classList.contains('show')) return;
  
  // Se estiver editando texto (focado em el-inner), deixa o navegador lidar com o Ctrl+Z nativo
  if (document.activeElement && document.activeElement.classList.contains('el-inner')) {
    return; 
  }

  if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
  } else if (e.ctrlKey && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
    e.preventDefault();
    redo();
  }
});

function renderSlide(idx){
  deselect();
  curIdx = idx;
  const s = slides[idx];
  slide.style.background = s.bg;
  slide.innerHTML = s.html;
  // reattach events on loaded elements
  slide.querySelectorAll('.el,.shape-el').forEach(el => {
    attachElEvents(el);
    if(el.classList.contains('webcam-el')) {
      const v = el.querySelector('video');
      if(v) startWebcamStream(v);
    }
  });
  renderTimeline();
  updateAnimPanel();
}

function addSlide(){
  saveSlide();
  slides.push(createSlide('#ffffff',
    `<div class="el" style="left:40%;top:38%;width:300px;height:70px;z-index:1" data-anim="none"><div class="el-inner" contenteditable="true" style="font-size:36px;font-weight:700;color:#1f2937;font-family:Outfit">Slide ${slides.length+1}</div>${resizeHandlesHTML()}</div>`
  ));
  renderSlide(slides.length - 1);
  commitHistory();
}

function deleteSlide(idx){
  if(slides.length === 1) return;
  slides.splice(idx,1);
  if(curIdx >= slides.length) curIdx = slides.length - 1;
  renderSlide(curIdx);
  commitHistory();
}

function renderTimeline(){
  document.querySelectorAll('.sl-thumb').forEach(el=>el.remove());
  slides.forEach((s,i)=>{
    const th = document.createElement('div');
    th.className = `sl-thumb${i===curIdx?' active':''}`;
    th.style.background = s.bg;
    th.innerHTML = `<span class="sl-num">${i+1}</span><button class="sl-del" onclick="event.stopPropagation();deleteSlide(${i})">✕</button>`;
    th.onclick = ()=>{ saveSlide(); renderSlide(i); };
    timeline.insertBefore(th, addSlBtn);
  });
}

// ============================================================
// RESIZE HANDLES HTML
// ============================================================
function resizeHandlesHTML(){
  return `<div class="rh nw"></div><div class="rh n"></div><div class="rh ne"></div>
          <div class="rh e"></div><div class="rh se"></div><div class="rh s"></div>
          <div class="rh sw"></div><div class="rh w"></div>`;
}

// ============================================================
// ADD ELEMENTS
// ============================================================
function addText(placeholder, size, weight){
  const el = document.createElement('div');
  el.className = 'el';
  el.dataset.anim = 'none';
  el.style.cssText = `left:80px;top:150px;width:400px;height:${size*2+20}px;z-index:${++zTop}`;
  el.innerHTML = `<div class="el-inner" contenteditable="true" style="font-size:${size}px;font-weight:${weight};color:#1f2937;font-family:Outfit">${placeholder}</div>${resizeHandlesHTML()}`;
  slide.appendChild(el);
  attachElEvents(el);
  saveSlide();
  selectEl(el);
  commitHistory();
}

function addShape(type){
  const el = document.createElement('div');
  el.className = 'shape-el el';
  el.dataset.anim = 'none';
  const shapeStyles = {
    rect:     'width:150px;height:100px;background:#6366f1;border-radius:4px',
    circle:   'width:120px;height:120px;background:#ec4899;border-radius:50%',
    triangle: 'width:0;height:0;border-left:70px solid transparent;border-right:70px solid transparent;border-bottom:120px solid #10b981;background:transparent',
    diamond:  'width:100px;height:100px;background:#f59e0b;transform:rotate(45deg)',
    star:     'width:100px;height:100px;background:#eab308;clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)',
    'arrow-r':'width:140px;height:60px;background:#8b5cf6;clip-path:polygon(0% 20%,60% 20%,60% 0%,100% 50%,60% 100%,60% 80%,0% 80%)',
    line:     'width:200px;height:4px;background:#374151;border-radius:2px',
    speech:   'width:140px;height:100px;background:#06b6d4;border-radius:12px;clip-path:polygon(0% 0%,100% 0%,100% 75%,75% 75%,75% 100%,50% 75%,0% 75%)',
    hex:      'width:120px;height:120px;background:#7c3aed;clip-path:polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)'
  };
  el.style.cssText = `left:200px;top:150px;z-index:${++zTop};${shapeStyles[type]||'width:100px;height:100px;background:#6366f1'}`;
  el.innerHTML = resizeHandlesHTML();
  slide.appendChild(el);
  attachElEvents(el);
  saveSlide();
  selectEl(el);
  commitHistory();
}

function addEmoji(emoji){
  const el = document.createElement('div');
  el.className = 'el';
  el.dataset.anim = 'none';
  el.style.cssText = `left:160px;top:140px;width:80px;height:80px;z-index:${++zTop}`;
  el.innerHTML = `<div class="el-inner" style="font-size:60px;line-height:1;text-align:center">${emoji}</div>${resizeHandlesHTML()}`;
  slide.appendChild(el);
  attachElEvents(el);
  saveSlide();
  selectEl(el);
  commitHistory();
}

// Upload de arquivo local (FileReader → base64 data URL)
function addImageFromFile(input) {
  const file = input.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => addImageFromDataUrl(e.target.result);
  reader.readAsDataURL(file);
  input.value = ''; // permite reselecionar o mesmo arquivo
}

// Insere imagem a partir de data URL (base64) no slide
function addImageFromDataUrl(dataUrl) {
  const el = document.createElement('div');
  el.className = 'el';
  el.dataset.anim = 'none';
  el.style.cssText = `left:100px;top:80px;width:300px;height:200px;z-index:${++zTop}`;
  el.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none">${resizeHandlesHTML()}`;
  slide.appendChild(el);
  attachElEvents(el);
  saveSlide();
  selectEl(el);
  commitHistory();
}

// Ctrl+V / Colar imagem da área de transferência direto no slide
document.addEventListener('paste', (e) => {
  // Se estiver editando texto dentro de um el-inner, não intercepta
  if (document.activeElement && document.activeElement.classList.contains('el-inner')) return;
  // Se estiver em modo apresentação, ignora
  if (document.getElementById('pres').classList.contains('show')) return;
  const items = (e.clipboardData || e.originalEvent.clipboardData).items;
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault();
      const blob = item.getAsFile();
      const reader = new FileReader();
      reader.onload = (ev) => addImageFromDataUrl(ev.target.result);
      reader.readAsDataURL(blob);
      break;
    }
  }
});

// ============================================================
// RECURSOS AVANÇADOS / INOVAÇÃO
// ============================================================

function addActionButton() {
  const el = document.createElement('div');
  el.className = 'el interactive-btn';
  el.dataset.anim = 'none';
  el.dataset.goto = '';
  el.style.cssText = `left:200px;top:200px;width:150px;height:50px;z-index:${++zTop};background:#6366f1;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;cursor:pointer;box-shadow:0 4px 6px rgba(0,0,0,0.1)`;
  el.innerHTML = `<div class="el-inner" contenteditable="true">Pular para Slide...</div>${resizeHandlesHTML()}`;
  
  // Custom double-click to set target slide
  el.addEventListener('dblclick', () => {
    if(document.getElementById('pres').classList.contains('show')) return;
    const target = prompt('Para qual número de slide este botão deve pular? (ex: 2)');
    if(target) el.dataset.goto = parseInt(target) - 1;
  });

  slide.appendChild(el);
  attachElEvents(el);
  saveSlide();
  selectEl(el);
  commitHistory();
}

function addInputForm() {
  const el = document.createElement('div');
  el.className = 'el interactive-input';
  el.dataset.anim = 'none';
  el.style.cssText = `left:200px;top:200px;width:250px;height:40px;z-index:${++zTop};background:#f3f4f6;border:2px solid #d1d5db;border-radius:4px;display:flex;align-items:center;padding:0 10px`;
  el.innerHTML = `<input type="text" placeholder="Digite sua resposta..." style="width:100%;height:100%;background:transparent;border:none;outline:none;font-family:inherit;font-size:16px;color:#1f2937" onclick="this.focus()">${resizeHandlesHTML()}`;
  slide.appendChild(el);
  attachElEvents(el);
  saveSlide();
  selectEl(el);
  commitHistory();
}

// --- WEBCAM STREAM MANAGER ---
let globalWebcamStream = null;
async function startWebcamStream(videoElement) {
  if (!globalWebcamStream) {
    try {
      globalWebcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch(err) {
      console.error("Camera Error:", err);
      videoElement.style.background = '#333';
      return;
    }
  }
  
  videoElement.muted = true;
  videoElement.playsInline = true;
  videoElement.autoplay = true;
  videoElement.srcObject = globalWebcamStream;
  
  videoElement.onloadedmetadata = () => {
    videoElement.play().then(() => {
        console.log("Camera playing successfully");
    }).catch(e => console.log('Autoplay block:', e));
  };
}

async function addWebcam() {
  const el = document.createElement('div');
  el.className = 'el webcam-el';
  el.dataset.anim = 'none';
  el.style.cssText = `left:100px;top:100px;width:320px;height:240px;z-index:${++zTop};background:#000;border-radius:12px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.5)`;
  
  const video = document.createElement('video');
  video.setAttribute('autoplay', 'true');
  video.setAttribute('muted', 'true');
  video.setAttribute('playsinline', 'true');
  video.style.cssText = 'width:100%;height:100%;object-fit:cover;pointer-events:none';
  
  el.appendChild(video);
  el.insertAdjacentHTML('beforeend', resizeHandlesHTML());
  slide.appendChild(el);
  
  startWebcamStream(video);

  attachElEvents(el);
  saveSlide();
  selectEl(el);
  commitHistory();
}

function add3DModel() {
  // We use Google's model-viewer for 3D elements
  if(!document.querySelector('script[src*="model-viewer"]')) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js';
    document.head.appendChild(script);
  }

  const el = document.createElement('div');
  el.className = 'el model-3d';
  el.dataset.anim = 'none';
  el.style.cssText = `left:150px;top:100px;width:300px;height:300px;z-index:${++zTop};background:transparent`;
  
  // Usando um modelo 3D de exemplo gratuito (Astronauta)
  el.innerHTML = `
    <model-viewer src="https://modelviewer.dev/shared-assets/models/Astronaut.glb" auto-rotate camera-controls style="width:100%;height:100%;pointer-events:auto"></model-viewer>
    ${resizeHandlesHTML()}
  `;
  
  slide.appendChild(el);
  attachElEvents(el);
  saveSlide();
  selectEl(el);
  commitHistory();
}

function addPostIt() {
  const el = document.createElement('div');
  el.className = 'el post-it';
  el.dataset.type = 'postit';
  el.dataset.anim = 'none';
  el.style.cssText = `left:50px;top:50px;width:200px;height:200px;z-index:9999;background:#fef08a;box-shadow:2px 4px 10px rgba(0,0,0,0.1);padding:15px;transform:rotate(-2deg)`;
  el.innerHTML = `<div class="el-inner" contenteditable="true" style="font-size:18px;color:#854d0e;font-family:'Caveat',cursive,sans-serif">Deixe um comentário aqui...</div>${resizeHandlesHTML()}`;
  
  // Font pro post-it
  loadGoogleFont('Caveat');
  
  slide.appendChild(el);
  attachElEvents(el);
  saveSlide();
  selectEl(el);
  commitHistory();
}

function generateWiki() {
  saveSlide();
  let docHTML = '<div style="font-family:Inter,sans-serif;max-width:800px;margin:0 auto;padding:2rem">';
  docHTML += '<h1>Documentação Gerada: ' + (document.getElementById('pres-title').value) + '</h1>';
  docHTML += '<p><i>Gerado automaticamente via NEXUS AI a partir dos slides.</i></p><hr>';
  
  slides.forEach((s, i) => {
    docHTML += `<h3>Seção ${i+1}</h3><ul>`;
    // Extract text from the HTML string
    const temp = document.createElement('div');
    temp.innerHTML = s.html;
    const texts = Array.from(temp.querySelectorAll('.el-inner'))
                       .map(el => el.innerText.trim())
                       .filter(t => t.length > 0 && !t.includes("Deixe um comentário")); // ignora post-its vazios
    
    if(texts.length === 0) docHTML += '<li><i>(Slide visual)</i></li>';
    else texts.forEach(t => docHTML += `<li>${t}</li>`);
    docHTML += '</ul>';
  });
  docHTML += '</div>';
  
  const w = window.open('','_blank');
  w.document.write(docHTML);
  w.document.close();
}

// --- COACH DE ORATÓRIA (IA) ---
let coachActive = false;
let recognition = null;
let wordCount = 0;
let fillerCount = 0;
let startTime = 0;

function toggleCoach() {
  coachActive = !coachActive;
  const btn = document.getElementById('coachBtn');
  const overlay = document.getElementById('coach-overlay');
  
  if(coachActive) {
    btn.style.background = '#eab308';
    btn.style.color = '#fff';
    overlay.style.display = 'block';
    startCoachIA();
  } else {
    btn.style.background = 'transparent';
    btn.style.color = '#eab308';
    overlay.style.display = 'none';
    if(recognition) recognition.stop();
  }
}

function startCoachIA() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition) {
    alert("Seu navegador não suporta a Web Speech API. Use o Chrome ou Edge.");
    toggleCoach();
    return;
  }
  
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'pt-BR';
  
  wordCount = 0;
  fillerCount = 0;
  startTime = Date.now();
  
  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    
    // Analisa preenchimentos
    const fillers = [' tipo ', ' né ', ' éé ', ' hum ', ' então '];
    let foundFillers = 0;
    fillers.forEach(f => {
      const regex = new RegExp(f, 'gi');
      const matches = transcript.match(regex);
      if(matches) foundFillers += matches.length;
    });
    
    document.getElementById('coach-fillers').textContent = foundFillers;
    if(foundFillers > 5) document.getElementById('coach-fillers').style.color = '#ef4444';
    else document.getElementById('coach-fillers').style.color = '#eab308';
    
    // Analisa velocidade
    const words = transcript.trim().split(/\s+/).length;
    const minutes = (Date.now() - startTime) / 60000;
    if(minutes > 0.1) {
      const wpm = words / minutes;
      const speedEl = document.getElementById('coach-speed');
      if(wpm > 150) { speedEl.textContent = 'Muito Rápido!'; speedEl.style.color = '#ef4444'; }
      else if(wpm < 80) { speedEl.textContent = 'Muito Lento'; speedEl.style.color = '#eab308'; }
      else { speedEl.textContent = 'Excelente'; speedEl.style.color = '#10b981'; }
    }
    
    // Feedback dinâmico
    const feedback = document.getElementById('coach-feedback');
    if(foundFillers > 3) feedback.textContent = '"Faça pausas silenciosas ao invés de usar \'tipo\' ou \'né\'."';
    else feedback.textContent = '"Continue assim, contato visual e postura!"';
  };
  
  recognition.start();
}

// ============================================================
// ELEMENT SELECTION & CONTEXT BAR
// ============================================================
function selectEl(el){
  if(selEl) selEl.classList.remove('sel');
  selEl = el;
  if(!selEl) return;
  selEl.classList.add('sel');
  ctxBar.classList.add('show');
  
  const inner = selEl.querySelector('.el-inner');
  if(inner){
    const cs = window.getComputedStyle(inner);
    document.getElementById('ctxFont').value = cs.fontFamily.replace(/['"]/g,'');
    document.getElementById('ctxSize').value = parseInt(cs.fontSize)||16;
    document.getElementById('ctxColor').value = rgb2hex(cs.color);
    document.getElementById('ctxBgColor').value = rgb2hex(cs.backgroundColor)||'#ffffff';
  }
  updateAnimPanel();
}

function deselect(){
  if(selEl){ selEl.classList.remove('sel'); selEl = null; }
  ctxBar.classList.remove('show');
  updateAnimPanel();
}

document.getElementById('canvasWrap').addEventListener('mousedown', e=>{
  if(e.target === document.getElementById('canvasWrap') || e.target === slide){
    saveSlide();
    deselect();
  }
});

// ============================================================
// DRAG & RESIZE
// ============================================================
function attachElEvents(el){
  // Faz com que inputs persistam os dados no HTML para salvar o estado (Histórico)
  const inputField = el.querySelector('input[type="text"]');
  if (inputField) {
    inputField.addEventListener('input', function() {
      this.setAttribute('value', this.value);
    });
    inputField.addEventListener('blur', function() {
      saveSlide();
      commitHistory();
    });
  }

  el.addEventListener('mousedown', e=>{
    // --- RESIZE HANDLE ---
    if(e.target.classList.contains('rh')){
      e.preventDefault(); e.stopPropagation();
      isResizing = true; resizeEl = el; resizeHandle = e.target;
      const r = el.getBoundingClientRect();
      const sr = slide.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      startW = r.width; startH = r.height;
      startL = r.left - sr.left; startT = r.top - sr.top;
      selectEl(el);
      return;
    }

    const inner = e.target.closest('.el-inner');

    // --- ALREADY SELECTED + CLICKING INNER TEXT: allow native text cursor/selection ---
    if(inner && selEl === el){
      // Don't preventDefault — let the browser handle text cursor placement
      // Just re-select the element to keep toolbar visible
      selectEl(el);
      return;
    }

    // --- FIRST CLICK ON ELEMENT: select it (no drag yet) ---
    if(inner){
      selectEl(el);
      // Se não for modo apresentação, foca pro edit
      if(!document.getElementById('pres').classList.contains('show')){
        setTimeout(()=>inner.focus(), 0);
      }
      return;
    }

    // --- CLICKING ELEMENT BACKGROUND/BORDER (not inner text): start drag ---
    e.preventDefault();
    isDragging = true; dragEl = el;
    const r = el.getBoundingClientRect();
    const sr = slide.getBoundingClientRect();
    startX = e.clientX - (r.left - sr.left);
    startY = e.clientY - (r.top - sr.top);
    selectEl(el);
  });
}

document.addEventListener('mousemove', e=>{
  if(isDragging && dragEl){
    const sr = slide.getBoundingClientRect();
    dragEl.style.left = (e.clientX - startX) + 'px';
    dragEl.style.top  = (e.clientY - startY) + 'px';
  }
  if(isResizing && resizeEl){
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const cls = resizeHandle.className;
    if(cls.includes('se')){ resizeEl.style.width=(startW+dx)+'px'; resizeEl.style.height=(startH+dy)+'px'; }
    else if(cls.includes('sw')){ resizeEl.style.width=(startW-dx)+'px'; resizeEl.style.left=(startL+dx)+'px'; resizeEl.style.height=(startH+dy)+'px'; }
    else if(cls.includes('ne')){ resizeEl.style.width=(startW+dx)+'px'; resizeEl.style.height=(startH-dy)+'px'; resizeEl.style.top=(startT+dy)+'px'; }
    else if(cls.includes('nw')){ resizeEl.style.width=(startW-dx)+'px'; resizeEl.style.height=(startH-dy)+'px'; resizeEl.style.left=(startL+dx)+'px'; resizeEl.style.top=(startT+dy)+'px'; }
    else if(cls.includes(' e')|| cls==='rh e'){ resizeEl.style.width=(startW+dx)+'px'; }
    else if(cls.includes(' w')|| cls==='rh w'){ resizeEl.style.width=(startW-dx)+'px'; resizeEl.style.left=(startL+dx)+'px'; }
    else if(cls.includes(' s')|| cls==='rh s'){ resizeEl.style.height=(startH+dy)+'px'; }
    else if(cls.includes(' n')|| cls==='rh n'){ resizeEl.style.height=(startH-dy)+'px'; resizeEl.style.top=(startT+dy)+'px'; }
  }
});

document.addEventListener('mouseup', ()=>{
  if(isDragging||isResizing) { saveSlide(); commitHistory(); }
  isDragging=false; isResizing=false; dragEl=null; resizeEl=null; resizeHandle=null;
});

document.addEventListener('focusout', (e) => {
  if (e.target.classList.contains('el-inner')) {
    saveSlide();
    commitHistory();
  }
});

// ============================================================
// FORMATTING (works on selection OR whole element)
// ============================================================
function applyStyle(prop, val){
  if(prop === 'fontFamily') loadGoogleFont(val);
  if(!selEl) return;
  const inner = selEl.querySelector('.el-inner');
  if(inner) inner.style[prop] = val;
  else selEl.style[prop] = val;
  saveSlide();
  commitHistory();
}

function loadGoogleFont(fontFamily) {
  const cleanFont = fontFamily.replace(/['"]/g, '');
  const systemFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana', 'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Tahoma', 'Trebuchet MS', 'Arial Black', 'Impact', 'Consolas', 'Lucida Console', 'Monaco', 'Futura', 'Gill Sans', 'Bodoni', 'Didot', 'Sabon', 'Minion'];
  if (systemFonts.includes(cleanFont)) return;

  const fontId = 'font-' + cleanFont.replace(/\s+/g, '-').toLowerCase();
  if (!document.getElementById(fontId)) {
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${cleanFont.replace(/\s+/g, '+')}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }
}

function applyColorToSelection(color){
  const sel = window.getSelection();
  if(sel && sel.rangeCount > 0 && !sel.isCollapsed){
    // Apply color only to selected text
    document.execCommand('foreColor', false, color);
  } else {
    applyStyle('color', color);
  }
  saveSlide();
  commitHistory();
}

function execFmt(cmd){
  const inner = selEl ? selEl.querySelector('.el-inner') : null;
  if(inner) inner.focus();
  document.execCommand(cmd, false, null);
  saveSlide();
  commitHistory();
}

function changeFontSize(delta){
  const sz = (parseInt(document.getElementById('ctxSize').value)||16) + delta;
  document.getElementById('ctxSize').value = sz;
  applyStyle('fontSize', sz+'px');
}

function bringFwd(){ if(selEl){ selEl.style.zIndex=++zTop; saveSlide(); commitHistory(); } }
function sendBck(){ if(selEl){ selEl.style.zIndex=Math.max(1,(parseInt(selEl.style.zIndex)||1)-1); saveSlide(); commitHistory(); } }
function dupEl(){
  if(!selEl) return;
  const clone = selEl.cloneNode(true);
  clone.style.left = (parseInt(selEl.style.left)||0)+20+'px';
  clone.style.top  = (parseInt(selEl.style.top)||0)+20+'px';
  clone.style.zIndex = ++zTop;
  clone.dataset.anim = 'none';
  slide.appendChild(clone);
  attachElEvents(clone);
  saveSlide();
  selectEl(clone);
  commitHistory();
}
function delEl(){ if(selEl){ selEl.remove(); deselect(); saveSlide(); commitHistory(); } }

// ============================================================
// BACKGROUND
// ============================================================
function setSlideBg(color){
  slide.style.background = color;
  slide.style.backgroundColor = '';
  slides[curIdx].bg = color;
  renderTimeline();
  commitHistory();
}

// ============================================================
// PANELS & SIDEBAR
// ============================================================
function openPanel(name, btn){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('open'));
  document.querySelectorAll('.sb-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('panel-'+name).classList.add('open');
  btn.classList.add('active');
}

// ============================================================
// ANIMATIONS
// ============================================================
const ANIMS = ['none','a-fade','a-up','a-down','a-left','a-right','a-zoom','a-bounce','a-spin','a-pulse'];

function updateAnimPanel(){
  const target = selEl ? 'Elemento Selecionado' : 'Slide Inteiro';
  animTarget.textContent = 'Alvo: ' + target;
  const current = selEl ? (selEl.dataset.anim||'none') : slides[curIdx].anim;
  document.querySelectorAll('.anim-btn').forEach(b=>{
    b.classList.toggle('active', b.dataset.anim === current);
  });
}

function setAnim(anim, btn){
  document.querySelectorAll('.anim-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  if(selEl){
    selEl.dataset.anim = anim;
  } else {
    slides[curIdx].anim = anim;
  }
  saveSlide();
  commitHistory();
  testAnim();
}

function testAnim(){
  if(selEl){
    ANIMS.forEach(a=>selEl.classList.remove(a));
    const a = selEl.dataset.anim;
    if(a && a!=='none'){
      void selEl.offsetWidth;
      selEl.classList.add(a);
      if(a!=='a-pulse') setTimeout(()=>selEl.classList.remove(a), 1200);
    }
  } else {
    const a = slides[curIdx].anim;
    ANIMS.forEach(c=>slide.classList.remove(c));
    if(a && a!=='none'){
      void slide.offsetWidth;
      slide.classList.add(a);
      if(a!=='a-pulse') setTimeout(()=>slide.classList.remove(a), 1200);
    }
  }
}

// ============================================================
// ZEN MODE
// ============================================================
function toggleZen(){
  isZen = !isZen;
  document.querySelector('.topbar').style.display = isZen?'none':'flex';
  document.querySelector('.ctx-bar').style.visibility = isZen?'hidden':'visible';
  document.querySelector('.sidebar').style.display = isZen?'none':'flex';
  document.querySelector('.panel.open').style.display = isZen?'none':'flex';
  document.querySelector('.timeline').style.display = isZen?'none':'flex';
}

// ============================================================
// PRESENTATION & GPS NAVIGATION
// ============================================================
let presIdx = 0;
let gpsActive = false;

function startPresentation(){
  saveSlide();
  presIdx = curIdx;
  document.getElementById('pres').classList.add('show');
  
  // Reativar coach se tava ligado
  if(coachActive && recognition) {
      document.getElementById('coach-overlay').style.display = 'block';
  }

  renderPresSlide();
  document.addEventListener('keydown', presKey);
}

function stopPres(){
  document.getElementById('pres').classList.remove('show');
  document.removeEventListener('keydown', presKey);
  document.getElementById('gps-map').style.display = 'none';
  gpsActive = false;
}

function prevSlide(){ if(presIdx>0){ presIdx--; renderPresSlide(); } }
function nextSlide(){ if(presIdx<slides.length-1){ presIdx++; renderPresSlide(); } }

function presKey(e){
  if(e.key==='ArrowRight'||e.key===' ') nextSlide();
  else if(e.key==='ArrowLeft') prevSlide();
  else if(e.key==='Escape') stopPres();
}

function toggleGPS() {
  gpsActive = !gpsActive;
  const map = document.getElementById('gps-map');
  if(gpsActive) {
    map.style.display = 'flex';
    map.innerHTML = '';
    slides.forEach((s, i) => {
      const btn = document.createElement('div');
      btn.style.cssText = `width:30px;height:20px;background:${i===presIdx?'#6366f1':'#fff'};border:1px solid #333;cursor:pointer;border-radius:2px`;
      btn.title = 'Ir para slide ' + (i+1);
      btn.onclick = () => { presIdx = i; renderPresSlide(); };
      map.appendChild(btn);
    });
  } else {
    map.style.display = 'none';
  }
}

function renderPresSlide(){
  const s = slides[presIdx];
  const ps = document.getElementById('pres-slide');
  const sc = Math.min(window.innerWidth/800, window.innerHeight/450) * 0.93;
  ps.style.cssText = `width:800px;height:450px;background:${s.bg};position:relative;overflow:hidden;transform:scale(${sc});transform-origin:center`;
  ps.innerHTML = s.html;
  
  // Update GPS Se ativo
  if(gpsActive) {
    gpsActive = false; // reseta temporariamente para forçar a renderização
    toggleGPS();
  }

  ps.querySelectorAll('.el,.shape-el').forEach((el,i)=>{
    // Esconde post-its na apresentação
    if(el.dataset.type === 'postit') { el.style.display = 'none'; return; }
    
    // Lógica da Webcam
    if(el.classList.contains('webcam-el')) {
      const v = el.querySelector('video');
      if(v) startWebcamStream(v);
    }
    
    // Desativa edição
    const inner = el.querySelector('.el-inner');
    if(inner) inner.contentEditable = false;
    
    el.classList.remove('sel');
    el.querySelectorAll('.rh').forEach(r=>r.style.display='none');
    
    // Lógica de Branching (botão)
    if(el.classList.contains('interactive-btn') && el.dataset.goto) {
      el.onclick = () => {
        const target = parseInt(el.dataset.goto);
        if(!isNaN(target) && target >= 0 && target < slides.length) {
          presIdx = target;
          renderPresSlide();
        }
      };
      el.style.cursor = 'pointer';
    } else {
      el.style.cursor = 'default';
    }

    const a = el.dataset.anim;
    if(a && a!=='none'){
      el.style.opacity='0';
      ANIMS.forEach(c=>el.classList.remove(c));
      setTimeout(()=>{ el.style.opacity=''; void el.offsetWidth; el.classList.add(a); }, i*150);
    }
  });
  
  // Slide-level anim
  const sa = s.anim;
  if(sa && sa!=='none'){
    ANIMS.forEach(c=>ps.classList.remove(c));
    void ps.offsetWidth;
    ps.classList.add(sa);
  }
  document.getElementById('pres-counter').textContent = `${presIdx+1} / ${slides.length}`;
}

// ============================================================
// EXPORT
// ============================================================
function exportHTML(){
  saveSlide();
  const title = document.getElementById('pres-title').value || 'Apresentação';
  let body = ``;
  slides.forEach((s,i)=>{
    body += `<section class="sl" style="background:${s.bg}">${s.html}</section>\n`;
  });
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>
body{margin:0;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center;height:100vh}
.sl{width:800px;height:450px;position:relative;overflow:hidden;display:none}
.sl.active{display:block}
.el{position:absolute;cursor:default}
.el-inner{width:100%;height:100%;word-wrap:break-word;white-space:pre-wrap}
.rh{display:none!important}
${document.querySelector('style').textContent}
</style></head><body>
${body}
<script>
let i=0;const sl=document.querySelectorAll('.sl');
function go(n){sl[i].classList.remove('active');i=Math.max(0,Math.min(n,sl.length-1));sl[i].classList.add('active');}
go(0);
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key===' ')go(i+1);else if(e.key==='ArrowLeft')go(i-1);});
<\/script></body></html>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([html],{type:'text/html'}));
  a.download = title.replace(/\s+/g,'_')+'.html';
  a.click();
}

// ============================================================
// HELPERS
// ============================================================
function rgb2hex(rgb){
  if(!rgb||rgb==='transparent') return '#ffffff';
  const m = rgb.match(/\d+/g);
  if(!m||m.length<3) return '#ffffff';
  return '#'+((1<<24)+(+m[0]<<16)+(+m[1]<<8)+ +m[2]).toString(16).slice(1);
}

// ============================================================
// INIT — Create first slide
// ============================================================
(function init(){
  slides.push(createSlide('#ffffff',
    `<div class="el" style="left:160px;top:140px;width:480px;height:80px;z-index:1" data-anim="none"><div class="el-inner" contenteditable="true" style="font-size:48px;font-weight:700;color:#1f2937;font-family:Outfit">Sua Apresentação</div>${resizeHandlesHTML()}</div>
     <div class="el" style="left:160px;top:240px;width:480px;height:50px;z-index:2" data-anim="none"><div class="el-inner" contenteditable="true" style="font-size:24px;color:#64748b;font-family:Outfit">Subtítulo da apresentação</div>${resizeHandlesHTML()}</div>`,
    'none'
  ));
  renderSlide(0);
  commitHistory();
})();
