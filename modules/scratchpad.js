// === MODULE: scratchpad === v1.0 ===
function renderSavedPadsList(){
  var pads=S.pads||[];
  var h='<div class="card"><div class="st" style="margin-bottom:12px">Scratchpads</div>';
  h+='<button class="btn btn-primary" style="margin-bottom:14px" onclick="window.newPad()">+ New Scratchpad</button>';
  if(!pads.length){
    h+='<div style="color:var(--text3);font-size:13px;padding:20px 0;text-align:center">No saved scratchpads yet</div>';
  } else {
    h+='<div style="display:flex;flex-direction:column;gap:8px">';
    pads.forEach(function(p){
      var preview=(p.content||'').slice(0,80).replace(/\n/g,' ')||'(empty)';
      h+='<div style="background:var(--card2);border-radius:10px;padding:10px 14px;border:1px solid var(--border2);display:flex;align-items:center;gap:10px;cursor:pointer" onclick="window.openPad(\''+p.id+'\')">';
      h+='<div style="flex:1;min-width:0">';
      h+='<div style="font-weight:700;font-size:14px;color:var(--text1);margin-bottom:2px">'+((p.title||'Untitled').replace(/</g,'&lt;'))+'</div>';
      h+='<div style="font-size:12px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+preview.replace(/</g,'&lt;')+'</div>';
      h+='</div>';
      h+='<button onclick="event.stopPropagation();window.deletePad(\''+p.id+'\')" style="padding:4px 9px;font-size:12px;background:transparent;border:1px solid var(--border2);border-radius:6px;color:var(--text3);cursor:pointer">Delete</button>';
      h+='</div>';
    });
    h+='</div>';
  }
  h+='</div>';
  return h;
}

function renderScratchpad(){
  var act=S.padTabs.find(function(t){return t.id===S.activePadId;});
  if(!act) return renderSavedPadsList();
  var mode=act._mode||'text';
  if(mode==='draw') setTimeout(function(){window.initPadCanvas&&window.initPadCanvas();},30);
  var titleSafe=(typeof esc==='function')?esc(act.title||''):(act.title||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); // escape & FIRST → no attribute breakout via a literal &quot;
  var contentSafe=(act.content||'').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  var unsaved=act._dirty?'<span style="font-size:10px;color:var(--warn-text);margin-left:4px">unsaved</span>':'';
  var colBtns=['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ffffff','#000000'].map(function(cl){
    var active=S._padDrawColor===cl;
    return '<button onclick="window.setPadColor(\''+cl+'\')" style="width:26px;height:26px;border-radius:50%;background:'+cl+';border:'+(active?'3px solid var(--acc)':'2px solid var(--border2)')+';cursor:pointer;flex-shrink:0"></button>';
  }).join('');
  var drawW=S._padDrawWidth||3;
  var isEraser=S._padEraser||false;
  var drawTools='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:8px">'
    +colBtns
    +'<div style="display:flex;align-items:center;gap:5px;margin-left:8px">'
    +'<span style="font-size:11px;color:var(--text3)">Size</span>'
    +'<input type="range" min="1" max="20" value="'+drawW+'" oninput="window.setPadWidth(parseInt(this.value))" style="width:70px">'
    +'<span style="font-size:11px;color:var(--text3)">'+drawW+'px</span>'
    +'</div>'
    +'<button onclick="window.setPadEraser()" class="btn btn-ghost" style="font-size:11px;padding:3px 8px;'+(isEraser?'border-color:var(--acc)':'')+'">Eraser</button>'
    +'<button onclick="window.clearPadCanvas()" class="btn btn-ghost" style="font-size:11px;padding:3px 8px">Clear drawing</button>'
    +'</div>';
  return '<div class="card">'
    +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">'
    +'<input type="text" value="'+titleSafe+'" placeholder="Untitled" class="fi" style="flex:1;min-width:120px;font-size:15px;font-weight:700;border:none;background:transparent;padding:4px 0" onchange="window.updatePadTitle(this.value)">'+unsaved
    +'<div style="display:flex;gap:4px">'
    +'<button class="sub-tab '+(mode==='text'?'on':'')+'" onclick="window.setPadMode(\'text\')" style="font-size:12px">&#x1F4DD; Text</button>'
    +'<button class="sub-tab '+(mode==='draw'?'on':'')+'" onclick="window.setPadMode(\'draw\')" style="font-size:12px">&#x270F; Draw</button>'
    +'</div>'
    +'<button class="btn btn-ghost" style="font-size:12px" onclick="window.savePad()">&#x1F4BE; Save</button>'
    +'<button class="btn btn-ghost" style="font-size:12px" onclick="window.clearPad()">Clear</button>'
    +'<button class="btn btn-ghost" style="font-size:12px;color:var(--err-text)" onclick="window.deletePad(\''+act.id+'\')">Delete</button>'
    +'</div>'
    +(mode==='text'
      ?'<textarea id="pad-text" style="width:100%;min-height:420px;background:var(--card2);border:1px solid var(--border2);border-radius:10px;padding:14px;font-size:14px;line-height:1.7;color:var(--text1);resize:vertical;font-family:inherit;box-sizing:border-box" placeholder="Notes, phone numbers, names, bookings, other notes..." oninput="window.padUpdateContent(this.value)">'+contentSafe+'</textarea>'
      :drawTools+'<canvas id="pad-canvas" width="1200" height="600" style="width:100%;background:#0f172a;border-radius:10px;border:1px solid var(--border2);cursor:crosshair;touch-action:none;display:block" onmousedown="window.padPointerDown(event)" onmousemove="window.padPointerMove(event)" onmouseup="window.padPointerUp(event)" onmouseleave="window.padPointerUp(event)" ontouchstart="window.padPointerDown(event)" ontouchmove="window.padPointerMove(event);event.preventDefault()" ontouchend="window.padPointerUp(event)"></canvas>'
    )
    +'</div>';
}

// ── Canvas drawing ──────────────────────────────────────────────
var _padIsDrawing=false;
var _padCurrStroke=null;

function _padCanvasXY(e){
  var cv=document.getElementById('pad-canvas');
  if(!cv)return{x:0,y:0};
  var r=cv.getBoundingClientRect();
  if(!r.width||!r.height)return{x:0,y:0}; // canvas not laid out yet (0-width) → avoid NaN stroke points
  var scaleX=cv.width/r.width,scaleY=cv.height/r.height;
  var src=e.touches?e.touches[0]:e;
  return{x:(src.clientX-r.left)*scaleX,y:(src.clientY-r.top)*scaleY};
}

window.initPadCanvas=function(){
  var cv=document.getElementById('pad-canvas');
  if(!cv||cv._inited)return;
  cv._inited=true;
  var ctx=cv.getContext('2d');
  ctx.lineCap='round';ctx.lineJoin='round';
  var act=S.padTabs.find(function(t){return t.id===S.activePadId;});
  if(act&&act.drawing&&act.drawing.length){
    act.drawing.forEach(function(stroke){
      if(!stroke.points||stroke.points.length<1)return;
      ctx.beginPath();
      ctx.strokeStyle=stroke.color||'#ffffff';
      ctx.lineWidth=stroke.width||3;
      ctx.globalCompositeOperation=stroke.eraser?'destination-out':'source-over';
      ctx.moveTo(stroke.points[0].x,stroke.points[0].y);
      stroke.points.forEach(function(pt){ctx.lineTo(pt.x,pt.y);});
      ctx.stroke();
    });
    ctx.globalCompositeOperation='source-over';
  }
};

window.padPointerDown=function(e){
  _padIsDrawing=true;
  var pt=_padCanvasXY(e);
  _padCurrStroke={color:S._padEraser?'#000':S._padDrawColor,width:S._padDrawWidth||3,eraser:!!S._padEraser,points:[pt]};
  var cv=document.getElementById('pad-canvas');if(!cv)return;
  var ctx=cv.getContext('2d');
  ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle=S._padEraser?'rgba(0,0,0,1)':S._padDrawColor;
  ctx.lineWidth=S._padDrawWidth||3;
  ctx.globalCompositeOperation=S._padEraser?'destination-out':'source-over';
  ctx.beginPath();ctx.moveTo(pt.x,pt.y);
};

window.padPointerMove=function(e){
  if(!_padIsDrawing||!_padCurrStroke)return;
  var pt=_padCanvasXY(e);
  _padCurrStroke.points.push(pt);
  var cv=document.getElementById('pad-canvas');if(!cv)return;
  var ctx=cv.getContext('2d');
  ctx.lineTo(pt.x,pt.y);ctx.stroke();
  ctx.beginPath();ctx.moveTo(pt.x,pt.y);
};

window.padPointerUp=function(e){
  if(!_padIsDrawing||!_padCurrStroke)return;
  _padIsDrawing=false;
  var ctx=document.getElementById('pad-canvas').getContext('2d');
  ctx.globalCompositeOperation='source-over';
  var act=S.padTabs.find(function(t){return t.id===S.activePadId;});
  if(act){
    if(!act.drawing)act.drawing=[];
    act.drawing.push(_padCurrStroke);
    act._dirty=true;
    if(typeof window._broadcastPadStroke==='function')window._broadcastPadStroke(act.id,_padCurrStroke);
    if(typeof window._padAutoSave==='function')window._padAutoSave(act);
  }
  _padCurrStroke=null;
};

window.clearPadCanvas=function(){
  var act=S.padTabs.find(function(t){return t.id===S.activePadId;});
  if(!act)return;
  act.drawing=[];act._dirty=true;
  var cv=document.getElementById('pad-canvas');
  if(cv){var ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);}
};

window.setPadColor=function(c){S._padDrawColor=c;S._padEraser=false;render();};
window.setPadWidth=function(w){S._padDrawWidth=w;render();};
window.setPadEraser=function(){S._padEraser=!S._padEraser;render();};
window.setPadMode=function(m){
  var act=S.padTabs.find(function(t){return t.id===S.activePadId;});
  if(act){act._mode=m;render();}
};
