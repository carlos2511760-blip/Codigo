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
  slide.querySelectorAll('.el,.shape-el').forEach(attachElEvents);
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

function addImageFromURL(){
  const url = document.getElementById('imgUrl').value.trim();
  if(!url) return;
  const el = document.createElement('div');
  el.className = 'el';
  el.dataset.anim = 'none';
  el.style.cssText = `left:100px;top:80px;width:300px;height:200px;z-index:${++zTop}`;
  el.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;display:block;pointer-events:none">${resizeHandlesHTML()}`;
  slide.appendChild(el);
  attachElEvents(el);
  saveSlide();
  selectEl(el);
  document.getElementById('imgUrl').value = '';
  commitHistory();
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
      // Focus inner so next click enables typing
      setTimeout(()=>inner.focus(), 0);
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
// PRESENTATION
// ============================================================
let presIdx = 0;
function startPresentation(){
  saveSlide();
  presIdx = curIdx;
  document.getElementById('pres').classList.add('show');
  renderPresSlide();
  document.addEventListener('keydown', presKey);
}
function stopPres(){
  document.getElementById('pres').classList.remove('show');
  document.removeEventListener('keydown', presKey);
}
function prevSlide(){ if(presIdx>0){ presIdx--; renderPresSlide(); } }
function nextSlide(){ if(presIdx<slides.length-1){ presIdx++; renderPresSlide(); } }
function presKey(e){
  if(e.key==='ArrowRight'||e.key===' ') nextSlide();
  else if(e.key==='ArrowLeft') prevSlide();
  else if(e.key==='Escape') stopPres();
}
function renderPresSlide(){
  const s = slides[presIdx];
  const ps = document.getElementById('pres-slide');
  const sc = Math.min(window.innerWidth/800, window.innerHeight/450) * 0.93;
  ps.style.cssText = `width:800px;height:450px;background:${s.bg};position:relative;overflow:hidden;transform:scale(${sc});transform-origin:center`;
  ps.innerHTML = s.html;
  ps.querySelectorAll('.el,.shape-el').forEach((el,i)=>{
    el.contentEditable = false;
    el.style.cursor = 'default';
    el.classList.remove('sel');
    el.querySelectorAll('.rh').forEach(r=>r.style.display='none');
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
