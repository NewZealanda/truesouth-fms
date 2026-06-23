// === MODULE: aerodromes === v1.0 ===
// Escape user-entered aerodrome names before inserting into innerHTML (a custom name
// could otherwise contain markup/script).
function _aeroEsc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// NZ Aerodrome database (AIP NZ sourced)
const NZ_AERODROMES=[
  {icao:'NZKT',name:'Kaitaia',lat:-35.0700,lon:173.2853,elev:270},
  {icao:'NZDA',name:'Dargaville',lat:-35.9397,lon:173.8936,elev:6},
  {icao:'NZKO',name:'Kaikohe',lat:-35.4511,lon:173.8172,elev:573},
  {icao:'NZKK',name:'Kerikeri',lat:-35.2628,lon:173.9119,elev:492},
  {icao:'NZWR',name:'Whangarei',lat:-35.7683,lon:174.3650,elev:133},
  {icao:'NZRW',name:'Ruawai',lat:-36.0958,lon:173.9753,elev:6},
  {icao:'NZPI',name:'Parakai',lat:-36.6517,lon:174.4333,elev:8},
  {icao:'NZNE',name:'North Shore (Dairy Flat)',lat:-36.6567,lon:174.6553,elev:212},
  {icao:'NZKF',name:'Kaipara Flats',lat:-36.4064,lon:174.5872,elev:90},
  {icao:'NZWP',name:'Whenuapai (RNZAF)',lat:-36.7875,lon:174.6300,elev:103},
  {icao:'NZAA',name:'Auckland International',lat:-37.0081,lon:174.7917,elev:23},
  {icao:'NZAR',name:'Ardmore',lat:-37.0297,lon:174.9733,elev:111},
  {icao:'NZKE',name:'Waiheke Island',lat:-36.8083,lon:175.0853,elev:445},
  {icao:'NZME',name:'Mercer',lat:-37.2592,lon:175.1147,elev:30},
  {icao:'NZCX',name:'Coromandel',lat:-36.7917,lon:175.5086,elev:13},
  {icao:'NZWT',name:'Whitianga',lat:-36.8317,lon:175.6786,elev:15},
  {icao:'NZUN',name:'Pauanui',lat:-37.0217,lon:175.8636,elev:19},
  {icao:'NZTH',name:'Thames',lat:-37.1567,lon:175.5503,elev:11},
  {icao:'NZWV',name:'Waihi Beach',lat:-37.4300,lon:175.9519,elev:4},
  {icao:'NZGB',name:'Great Barrier Island (Claris)',lat:-36.2417,lon:175.4728,elev:20},
  {icao:'NZTG',name:'Tauranga',lat:-37.6719,lon:176.1961,elev:13},
  {icao:'NZWK',name:'Whakatane',lat:-37.9206,lon:176.9142,elev:20},
  {icao:'NZRO',name:'Rotorua',lat:-38.1092,lon:176.3172,elev:935},
  {icao:'NZOP',name:'Opotiki',lat:-38.0067,lon:177.3133,elev:39},
  {icao:'NZRA',name:'Raglan',lat:-37.8042,lon:174.8608,elev:39},
  {icao:'NZTE',name:'Te Kuiti',lat:-38.3317,lon:175.1508,elev:800},
  {icao:'NZHN',name:'Hamilton',lat:-37.8667,lon:175.3322,elev:172},
  {icao:'NZMA',name:'Matamata (Moto Moto)',lat:-37.7233,lon:175.7431,elev:150},
  {icao:'NZAP',name:'Taupo',lat:-38.7397,lon:176.0836,elev:1335},
  {icao:'NZTT',name:'Tirau',lat:-37.9750,lon:175.7569,elev:266},
  {icao:'NZTM',name:'Tokoroa',lat:-38.2333,lon:175.8764,elev:950},
  {icao:'NZTO',name:'Taumarunui',lat:-38.8381,lon:175.1578,elev:735},
  {icao:'NZTN',name:'Turangi',lat:-38.9831,lon:175.8100,elev:1160},
  {icao:'NZGA',name:'Galatea',lat:-38.3908,lon:176.7292,elev:581},
  {icao:'NZGS',name:'Gisborne',lat:-38.6633,lon:177.9778,elev:15},
  {icao:'NZRR',name:'Ruatoria',lat:-37.8856,lon:178.3247,elev:50},
  {icao:'NZWO',name:'Wairoa',lat:-39.0069,lon:177.4072,elev:14},
  {icao:'NZNR',name:'Napier (Hawke\'s Bay)',lat:-39.4658,lon:176.8700,elev:6},
  {icao:'NZHS',name:'Hastings',lat:-39.6467,lon:176.7669,elev:72},
  {icao:'NZYP',name:'Waipukurau',lat:-39.9994,lon:176.5356,elev:659},
  {icao:'NZNP',name:'New Plymouth',lat:-39.0086,lon:174.1792,elev:97},
  {icao:'NZHA',name:'Hawera',lat:-39.5919,lon:174.2742,elev:170},
  {icao:'NZSD',name:'Stratford',lat:-39.3269,lon:174.3097,elev:830},
  {icao:'NZWU',name:'Wanganui',lat:-39.9622,lon:175.0250,elev:27},
  {icao:'NZFI',name:'Fielding',lat:-40.2158,lon:175.5689,elev:61},
  {icao:'NZPM',name:'Palmerston North',lat:-40.3206,lon:175.6169,elev:151},
  {icao:'NZFP',name:'Feilding Aerodrome',lat:-40.2333,lon:175.5667,elev:61},
  {icao:'NZOH',name:'Ohakea (RNZAF)',lat:-40.2061,lon:175.3881,elev:164},
  {icao:'NZVR',name:'Dannevirke',lat:-40.2117,lon:176.0886,elev:518},
  {icao:'NZRU',name:'Waiouru (Military)',lat:-39.4453,lon:175.6581,elev:2682},
  {icao:'NZDV',name:'Masterton (Hood)',lat:-40.9733,lon:175.6339,elev:364},
  {icao:'NZMS',name:'Martinborough',lat:-41.2028,lon:175.4583,elev:328},
  {icao:'NZMT',name:'Martinborough (Awamoa)',lat:-41.1833,lon:175.4500,elev:300},
  {icao:'NZPP',name:'Paraparaumu',lat:-40.9047,lon:174.9892,elev:22},
  {icao:'NZWN',name:'Wellington International',lat:-41.3272,lon:174.8050,elev:41},
  {icao:'NZWB',name:'Marlborough (Blenheim)',lat:-41.5183,lon:173.8700,elev:109},
  {icao:'NZOM',name:'Omaka (Blenheim)',lat:-41.4975,lon:173.8628,elev:105},
  {icao:'NZPN',name:'Picton (Koromiko)',lat:-41.3467,lon:173.9561,elev:161},
  {icao:'NZNS',name:'Nelson',lat:-41.2983,lon:173.2211,elev:17},
  {icao:'NZMK',name:'Motueka',lat:-41.1233,lon:172.9900,elev:39},
  {icao:'NZTK',name:'Takaka (Golden Bay)',lat:-40.8133,lon:172.7758,elev:102},
  {icao:'NZKM',name:'Karamea',lat:-41.2333,lon:172.1028,elev:30},
  {icao:'NZMR',name:'Murchison',lat:-41.7975,lon:172.3147,elev:748},
  {icao:'NZKI',name:'Kaikoura',lat:-42.4250,lon:173.6050,elev:20},
  {icao:'NZHM',name:'Hanmer Springs',lat:-42.5194,lon:172.8317,elev:1250},
  {icao:'NZWS',name:'Westport',lat:-41.7381,lon:171.5808,elev:13},
  {icao:'NZGM',name:'Greymouth',lat:-42.4617,lon:171.1900,elev:5},
  {icao:'NZHK',name:'Hokitika',lat:-42.7136,lon:170.9850,elev:146},
  {icao:'NZFO',name:'Franz Josef',lat:-43.3633,lon:170.1342,elev:240},
  {icao:'NZFJ',name:'Franz Josef Airstrip',lat:-43.4622,lon:170.0189,elev:285},
  {icao:'NZHT',name:'Haast',lat:-43.8653,lon:169.0417,elev:13},
  {icao:'NZCH',name:'Christchurch International',lat:-43.4894,lon:172.5322,elev:123},
  {icao:'NZRT',name:'Rangiora',lat:-43.2983,lon:172.5503,elev:275},
  {icao:'NZWL',name:'West Melton',lat:-43.4777,lon:172.3915,elev:146},
  {icao:'NZFF',name:'Forest Field',lat:-43.3857,lon:172.3606,elev:302},
  {icao:'NZAS',name:'Ashburton',lat:-43.9033,lon:171.7978,elev:302},
  {icao:'NZRI',name:'Rangitata Island',lat:-44.0854,lon:171.4162,elev:275},
  {icao:'NZTU',name:'Timaru',lat:-44.3028,lon:171.2253,elev:89},
  {icao:'NZOU',name:'Oamaru',lat:-44.9700,lon:171.0819,elev:99},
  {icao:'NZMC',name:'Mount Cook (Pukaki)',lat:-43.7650,lon:170.1344,elev:2493},
  {icao:'NZGT',name:'Glentanner',lat:-43.9110,lon:170.1273,elev:408},
  {icao:'NZTL',name:'Lake Tekapo',lat:-44.0050,lon:170.4447,elev:2490},
  {icao:'NZUK',name:'Pukaki',lat:-44.2380,lon:170.1189,elev:1400},
  {icao:'NZOA',name:'Omarama',lat:-44.4860,lon:169.9850,elev:1407},
  {icao:'NZWF',name:'Wanaka',lat:-44.7222,lon:169.2458,elev:1142},
  {icao:'NZMW',name:'Makarora',lat:-44.2183,lon:169.2408,elev:1083},
  {icao:'NZQN',name:'Queenstown',lat:-45.0211,lon:168.7392,elev:1171},
  {icao:'NZGY',name:'Glenorchy',lat:-44.8667,lon:168.3833,elev:1220},
  {icao:'BRCH',name:'Branches Station',lat:-44.744321,lon:168.726819,elev:1400},
  {icao:'NZDN',name:'Dunedin',lat:-45.9281,lon:170.1983,elev:4},
  {icao:'NZTI',name:'Taieri (Mosgiel)',lat:-45.9275,lon:170.1983,elev:4},
  {icao:'NZLX',name:'Alexandra',lat:-45.2117,lon:169.3731,elev:758},
  {icao:'NZCS',name:'Cromwell',lat:-45.0603,lon:169.1958,elev:890},
  {icao:'NZRX',name:'Roxburgh',lat:-45.5417,lon:169.3083,elev:482},
  {icao:'NZMO',name:'Manapouri',lat:-45.5325,lon:167.6430,elev:39},
  {icao:'NZMF',name:'Milford Sound',lat:-44.6733,lon:167.9233,elev:10},
  {icao:'NZNV',name:'Invercargill',lat:-46.4124,lon:168.3131,elev:5},
  {icao:'NZGC',name:'Gore',lat:-46.2167,lon:168.8222,elev:408},
  {icao:'NZVL',name:'Mandeville (Gore)',lat:-46.1608,lon:168.8317,elev:397},
  {icao:'NZRC',name:'Ryan\'s Creek (Stewart Is)',lat:-46.8997,lon:168.1006,elev:52},
  {icao:'NZCI',name:'Chatham Islands',lat:-43.8100,lon:-176.4572,elev:43}
];

// ── Aerodrome admin page ─────────────────────────────────────────────────
var _aerodromesMap=null;
var _aerodromesMarker=null;
var _aerodromesCustom=null; // loaded from lsGet

function _getCustomAerodromes(){
  if(!_aerodromesCustom){
    try{var _ca=lsGet('custom_aerodromes');if(Array.isArray(_ca))_aerodromesCustom=_ca;else if(typeof _ca==='string'&&_ca)_aerodromesCustom=JSON.parse(_ca);else _aerodromesCustom=[];}catch(e){_aerodromesCustom=[];}
  }
  return _aerodromesCustom;
}

function renderAerodromes(){
  var custom=_getCustomAerodromes();
  // A custom entry OVERRIDES the built-in of the same ICAO (instead of duplicating it).
  var _cset={};custom.forEach(function(c){_cset[c.icao]=1;});
  var all=NZ_AERODROMES.filter(function(a){return !_cset[a.icao];}).concat(custom);
  var featSet=(typeof _featuredApts==='function')?_featuredApts():[];
  var srch=(S._aeroSearch||'').toLowerCase();
  var filt=srch?all.filter(function(a){return a.icao.toLowerCase().includes(srch)||a.name.toLowerCase().includes(srch);}):all;
  var sel=S._aeroSel||null;
  var selEntry=sel?all.find(function(a){return a.icao===sel;}):null;

  // Map init: show selected aerodrome or default NZ centre
  setTimeout(function(){
    var mapEl=document.getElementById('aero-map');
    if(!mapEl)return;
    if(_aerodromesMap&&!_aerodromesMap.getContainer().isConnected){_aerodromesMap.remove();_aerodromesMap=null;_aerodromesMarker=null;}
    var lat=selEntry?selEntry.lat:-36.85;
    var lon=selEntry?selEntry.lon:174.76;
    var zoom=selEntry?12:6;
    if(!_aerodromesMap){
      _aerodromesMap=L.map('aero-map').setView([lat,lon],zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:18}).addTo(_aerodromesMap);
    } else {
      _aerodromesMap.setView([lat,lon],zoom);
    }
    if(_aerodromesMarker){_aerodromesMarker.remove();_aerodromesMarker=null;}
    if(selEntry){
      _aerodromesMarker=L.marker([selEntry.lat,selEntry.lon]).addTo(_aerodromesMap).bindPopup(selEntry.icao+' &#x2014; '+selEntry.name).openPopup();
    }
  },60);

  S._aeroFilt=filt.map(function(a){return a.icao;});
  var rows=filt.map(function(a){
    var isCustom=custom.some(function(c){return c.icao===a.icao;});
    var isSelected=S._aeroSel===a.icao;
    return '<tr data-icao="'+a.icao+'" onclick="window.aeroSelect(this.dataset.icao)" style="cursor:pointer;background:'+(isSelected?'rgba(99,102,241,.12)':'')+';">'
      +'<td style="padding:5px 8px;font-weight:700;color:var(--acc);font-size:12px">'+a.icao+'</td>'
      +'<td style="padding:5px 8px;font-size:12px;color:var(--text1)">'+_aeroEsc(a.name)+(isCustom?' <span style="font-size:9px;color:var(--ok-text);border:1px solid var(--ok-text);border-radius:3px;padding:1px 3px">edited</span>':'')+'</td>'
      +'<td style="padding:5px 8px;font-size:11px;color:var(--text3)">'+a.elev+'ft</td>'
      +'<td style="padding:5px 8px;white-space:nowrap">'
      +'<button title="'+(featSet.indexOf(a.icao)>=0?'Remove from Featured':'Add to Featured')+'" data-ficao="'+a.icao+'" onclick="event.stopPropagation();window.aeroToggleFeatured(this.dataset.ficao)" style="font-size:13px;line-height:1;padding:1px 5px;background:transparent;border:1px solid '+(featSet.indexOf(a.icao)>=0?'var(--acc)':'var(--border2)')+';border-radius:4px;color:'+(featSet.indexOf(a.icao)>=0?'#f59e0b':'var(--text3)')+';cursor:pointer;margin-right:3px">'+(featSet.indexOf(a.icao)>=0?'★':'☆')+'</button>'
      +'<button data-eicao="'+a.icao+'" onclick="event.stopPropagation();window.aeroEdit(this.dataset.eicao)" style="font-size:10px;padding:1px 6px;background:transparent;border:1px solid var(--border2);border-radius:4px;color:var(--acc);cursor:pointer;margin-right:3px">Edit</button>'
      +(isCustom?'<button data-deicao="'+a.icao+'" onclick="event.stopPropagation();window.aeroDeleteCustom(this.dataset.deicao)" style="font-size:10px;padding:1px 6px;background:transparent;border:1px solid var(--border2);border-radius:4px;color:var(--err-text);cursor:pointer">Reset</button>':'')
      +'</td>'
      +'</tr>';
  }).join('');

  // Selected info pill
  var selInfo=selEntry
    ?'<div style="padding:6px 10px;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);border-radius:6px;font-size:12px;color:var(--text2);margin-bottom:8px"><span style="font-weight:700;color:var(--acc)">'+selEntry.icao+'</span> &#x2014; '+_aeroEsc(selEntry.name)+' &middot; Elev '+selEntry.elev+'ft &middot; '+selEntry.lat.toFixed(4)+', '+selEntry.lon.toFixed(4)+'</div>'
    :'<div style="padding:6px 10px;background:var(--card2);border-radius:6px;font-size:12px;color:var(--text3);margin-bottom:8px">Click a row to see it on the map.</div>';

  var h='<div class="card" style="margin-bottom:14px">';
  h+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">';
  h+='<div class="st" style="margin:0">Aerodromes ('+all.length+' &mdash; '+NZ_AERODROMES.length+' AIP NZ + '+custom.length+' custom)</div>';
  h+='<input id="aero-search" class="fi" type="text" placeholder="Search ICAO or name..." value="'+(S._aeroSearch||'')+'" oninput="window.aeroSearch(this.value)" style="width:200px">';
  h+='</div>';
  h+=selInfo;
  // Two-column layout: list left, map right
  h+='<div style="display:flex;gap:12px;align-items:flex-start">';
  // Left: scrollable list
  h+='<div id="aero-list" tabindex="0" onkeydown="window.aeroKeyNav(event)" style="flex:1;min-width:0;overflow-x:auto;border-radius:8px;border:1px solid var(--border2);max-height:480px;overflow-y:auto">';
  h+='<table style="width:100%;border-collapse:collapse"><thead>';
  h+='<tr style="position:sticky;top:0;z-index:1;background:var(--card2)"><th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--text3)">ICAO</th><th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--text3)">Name</th><th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--text3)">Elev</th><th></th></tr>';
  h+='</thead><tbody>'+rows+'</tbody></table></div>';
  // Right: map (always visible)
  h+='<div style="width:320px;flex-shrink:0">';
  h+='<div id="aero-map" style="height:480px;border-radius:10px;border:1px solid var(--border);overflow:hidden"></div>';
  h+='</div>';
  h+='</div>';
  h+='</div>';

  // Add custom aerodrome form
  h+='<div class="card"><div class="st" style="margin-bottom:12px">Add / Edit Aerodrome</div><div style="font-size:12px;color:var(--text3);margin-bottom:10px">To edit an existing aerodrome, click Edit on its row — fields will pre-fill here. Saving with an existing ICAO overrides it. Use Reset to revert a built-in back to default.</div>';
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:10px">';
  h+='<div><label>ICAO Code</label><input class="fi" id="cae-icao" type="text" placeholder="NZXX" maxlength="4" style="text-transform:uppercase"></div>';
  h+='<div><label>Name</label><input class="fi" id="cae-name" type="text" placeholder="My Airstrip"></div>';
  h+='<div><label>Latitude</label><input class="fi" id="cae-lat" type="number" step="0.0001" placeholder="-41.2345"></div>';
  h+='<div><label>Longitude</label><input class="fi" id="cae-lon" type="number" step="0.0001" placeholder="174.5678"></div>';
  h+='<div><label>Elevation (ft)</label><input class="fi" id="cae-elev" type="number" placeholder="100"></div>';
  h+='</div>';
  h+='<button class="btn btn-primary" onclick="window.aeroAddCustom()">Add / Save Aerodrome</button>';
  h+='</div>';
  return h;
}

window.aeroSelect=function(icao){S._aeroSel=icao;render();};
window.aeroKeyNav=function(e){
  if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;
  e.preventDefault();
  var fl=S._aeroFilt||[];if(!fl.length)return;
  var idx=fl.indexOf(S._aeroSel||'');
  if(e.key==='ArrowDown')idx=Math.min(idx+1,fl.length-1);
  else idx=Math.max(idx-1,0);
  if(idx<0)idx=0;
  S._aeroSel=fl[idx];render();
  setTimeout(function(){var el=document.querySelector('[data-icao="'+S._aeroSel+'"]');if(el)el.scrollIntoView({block:'nearest'});},80);
};
window.aeroSearch=function(v){S._aeroSearch=v;render();};
window.aeroAddCustom=function(){
  var icao=(document.getElementById('cae-icao').value||'').toUpperCase().trim();
  var name=(document.getElementById('cae-name').value||'').trim();
  var lat=parseFloat(document.getElementById('cae-lat').value);
  var lon=parseFloat(document.getElementById('cae-lon').value);
  var elev=parseInt(document.getElementById('cae-elev').value)||0;
  if(!icao||!name||isNaN(lat)||isNaN(lon)){toast('Fill in ICAO, name, lat and lon','warn');return;}
  var custom=_getCustomAerodromes();
  var existIdx=custom.findIndex(function(c){return c.icao===icao;});
  if(existIdx>=0)custom.splice(existIdx,1);
  custom.push({icao:icao,name:name,lat:lat,lon:lon,elev:elev,custom:true});
  _aerodromesCustom=custom;
  lsSet('custom_aerodromes',custom);
  if(typeof _rebuildAptData==='function')_rebuildAptData();
  toast('Added '+icao+' ('+name+')','ok');
  render();
};
window.aeroDeleteCustom=function(icao){
  var custom=_getCustomAerodromes().filter(function(c){return c.icao!==icao;});
  _aerodromesCustom=custom;
  lsSet('custom_aerodromes',custom);
  if(typeof _rebuildAptData==='function')_rebuildAptData();
  if(S._aeroSel===icao)S._aeroSel=null;
  render();
};
// Toggle an aerodrome in/out of the Featured list (the dropdown "* Featured" group).
// The settings list is the source of truth — persisted to the cloud + every device.
window.aeroToggleFeatured=function(icao){
  if(!icao)return;
  var list=(typeof _featuredApts==='function'?_featuredApts():[]).slice();
  var i=list.indexOf(icao);
  if(i>=0)list.splice(i,1); else list.push(icao);
  if(typeof _saveFeaturedApts==='function')_saveFeaturedApts(list);
  if(typeof _rebuildAptData==='function')_rebuildAptData();
  toast(i>=0?(icao+' removed from Featured'):(icao+' added to Featured'),'ok');
  render();
};
window.aeroEdit=function(icao){
  // Prefer the custom (edited) entry over the built-in of the same ICAO.
  var custom=_getCustomAerodromes();
  var a=custom.find(function(x){return x.icao===icao;})||NZ_AERODROMES.find(function(x){return x.icao===icao;});
  if(!a)return;
  var fi=document.getElementById('cae-icao');
  var fn=document.getElementById('cae-name');
  var flat=document.getElementById('cae-lat');
  var flon=document.getElementById('cae-lon');
  var felev=document.getElementById('cae-elev');
  if(!fi)return;
  fi.value=a.icao;fn.value=a.name;flat.value=a.lat;flon.value=a.lon;felev.value=a.elev||0;
  fi.scrollIntoView({behavior:'smooth',block:'center'});
  fn.focus();
};
