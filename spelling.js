'use strict';
// Small offline spelling assistant. The word list stays in this folder.
window.Spelling=(()=>{
 const dictionary=new Map((window.RUSSIAN_WORDS||'').split(' ').filter(Boolean).map((w,i)=>[w,i]));
 window.RUSSIAN_WORDS=null;
 const alphabet='абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
 const known=new Map(Object.entries({
  'превет':'привет','привте':'привет','првиет':'привет','привеи':'привет',
  'севодня':'сегодня','сегодя':'сегодня','сегодян':'сегодня','сигодня':'сегодня',
  'пожалуста':'пожалуйста','пожалуйсто':'пожалуйста','пожайлуста':'пожалуйста','пажалуйста':'пожалуйста',
  'спосибо':'спасибо','спасиба':'спасибо','спаисбо':'спасибо','спсибо':'спасибо',
  'харошо':'хорошо','хоршо':'хорошо','хорого':'хорошо','хорошоо':'хорошо',
  'заметкии':'заметки','заметкм':'заметки','замекта':'заметка','заметак':'заметок',
  'сахранить':'сохранить','сохронить':'сохранить','сохрнаить':'сохранить','сохрантиь':'сохранить',
  'нажымаю':'нажимаю','нажмимаю':'нажимаю','удолять':'удалять','удолить':'удалить',
  'зделать':'сделать','зделай':'сделай','зделал':'сделал','сделоть':'сделать','сделат':'сделать',
  'работат':'работать','работаеть':'работает','рабоатет':'работает','рабоать':'работать',
  'проэкт':'проект','проэкте':'проекте','проэкта':'проекта','проэкты':'проекты','проэктов':'проектов',
  'исправлние':'исправление','исправлене':'исправление','исправлени':'исправление','исправитьь':'исправить',
  'исправлят':'исправлять','исправляеть':'исправляет',
  'фотогрфия':'фотография','фотаграфия':'фотография','картника':'картинка','картинкка':'картинка',
  'компютер':'компьютер','компьютр':'компьютер','компьтер':'компьютер','компютере':'компьютере',
  'браузир':'браузер','браузре':'браузер','бразуер':'браузер','браузр':'браузер',
  'интеренет':'интернет','интерент':'интернет','интрнет':'интернет','интернте':'интернет',
  'скачять':'скачать','скачат':'скачать','скачть':'скачать','скачавать':'скачивать',
  'загруска':'загрузка','загрузиь':'загрузить','загрузть':'загрузить','открть':'открыть',
  'открвается':'открывается','открваеться':'открывается','открываеться':'открывается',
  'нормалный':'нормальный','нормалное':'нормальное','нормалная':'нормальная','нормалные':'нормальные',
  'удобнй':'удобный','красивй':'красивый','красвиый':'красивый','интерфес':'интерфейс',
  'названи':'название','назвние':'название','назваине':'название','переиминовать':'переименовать',
  'потомучто':'потому что','потмоу':'потому','потаму':'потому','почесму':'почему','почесy':'почему',
  'почемуто':'почему-то','кокой':'какой','каторый':'который','каторую':'которую','каторые':'которые',
  'сдесь':'здесь','здеь':'здесь','здесьь':'здесь','имено':'именно','севсем':'совсем','совешенно':'совершенно',
  'незнаю':'не знаю','нечегоо':'ничего','ничево':'ничего','невижу':'не вижу',
  'еслиб':'если бы','какбудто':'как будто','врятли':'вряд ли','вобщем':'в общем','вообщем':'в общем',
  'будующее':'будущее','будующий':'будущий','следущий':'следующий','следущая':'следующая',
  'помошь':'помощь','помагать':'помогать','помаги':'помоги','помошник':'помощник',
  'делоть':'делать','делот':'делать','можеш':'можешь','хочеш':'хочешь','знаеш':'знаешь',
  'получаеться':'получается','получаетса':'получается','нравитьсяь':'нравится','получилосьь':'получилось',
  'времья':'время','времениь':'времени','очинь':'очень','оченьь':'очень','всегдa':'всегда',
  'безопастно':'безопасно','безопастный':'безопасный','резеврная':'резервная','резервнная':'резервная',
  'инстукция':'инструкция','инструкия':'инструкция','инструкця':'инструкция','инструкцыю':'инструкцию',
  'русскийй':'русский','руский':'русский','руском':'русском','рускии':'русский',
  'светлуюю':'светлую','тёмнную':'тёмную','честнно':'честно','обезательно':'обязательно',
  'интереснно':'интересно','пиривет':'привет','сабака':'собака','карова':'корова','малако':'молоко'
 }));
 let timer, enabled=true,last=null,range=null;
 const editor=()=>document.getElementById('editor');
 const el=id=>document.getElementById(id);
 const normal=w=>w.toLowerCase().replace(/ё/g,'е');
 const ignored=new Set();
 const cache=new Map();
 function preserve(word,replacement){if(word===word.toUpperCase())return replacement.toUpperCase();if(word[0]===word[0].toUpperCase())return replacement[0].toUpperCase()+replacement.slice(1);return replacement}
 function suggestions(word){const lower=word.toLowerCase();if(cache.has(lower))return cache.get(lower);if(dictionary.has(lower)||dictionary.has(normal(lower))&&!known.has(lower))return [];
  const found=new Map();const add=(w,cost)=>{if(dictionary.has(w)&&w!==lower){const score=cost*100000+dictionary.get(w);if(!found.has(w)||score<found.get(w))found.set(w,score)}};
  if(known.has(lower))found.set(known.get(lower),-1);
  for(let i=0;i<lower.length;i++){
   add(lower.slice(0,i)+lower.slice(i+1),1);
   if(i<lower.length-1)add(lower.slice(0,i)+lower[i+1]+lower[i]+lower.slice(i+2),1);
   for(const ch of alphabet)add(lower.slice(0,i)+ch+lower.slice(i+1),1);
  }
  for(let i=0;i<=lower.length;i++)for(const ch of alphabet)add(lower.slice(0,i)+ch+lower.slice(i),1);
  const result=Array.from(found).sort((a,b)=>a[1]-b[1]).slice(0,3).map(([w])=>preserve(word,w));
  if(cache.size>500)cache.clear();cache.set(lower,result);return result;
 }
 function protectedAt(text,start,end){
  const before=text.slice(0,start),lineStart=before.lastIndexOf('\n')+1,line=text.slice(lineStart,text.indexOf('\n',end)<0?text.length:text.indexOf('\n',end));
  // Do not touch code fences, inline code, YAML front matter, wiki links,
  // Markdown links/images, file paths, hashtags, mail or URLs.
  const lines=before.split('\n');let fence=null;for(const l of lines){const m=l.match(/^\s*(`{3,}|~{3,})/);if(m){if(!fence)fence=m[1][0];else if(m[1][0]===fence)fence=null}}if(fence||/^ {4}|^\t/.test(line))return true;
  if(text.startsWith('---\n')&&text.indexOf('\n---',4)>start)return true;
  if((before.slice(lineStart).match(/(?<!\\)`/g)||[]).length%2)return true;
  const local=start-lineStart;for(const m of line.matchAll(/\[\[[^\n]*?\]\]|!?\[[^\n]*?\]\([^\n]*?\)|https?:\/\/\S+|\S*[/\\@]\S*|#[а-яёА-ЯЁ]+/g))if(local>=m.index&&end-lineStart<=m.index+m[0].length)return true;
  if(before.lastIndexOf('[[')>before.lastIndexOf(']]'))return true;
  const tokenStart=before.search(/\S*$/),token=text.slice(tokenStart,end);if(/[\\/@#]/.test(token))return true;
  return false;
 }
 function clear(){el('spellSuggestions').replaceChildren();range=null}
 function reset(){clearTimeout(timer);clear();last=null;el('undoCorrection').hidden=true;el('spellStatus').textContent=enabled?'Подсказки слов · без интернета':'Исправление выключено'}
 function setEnabled(value){enabled=value;el('spellbar').classList.toggle('off',!value);reset()}
 function findWord(text,pos,completed=false){const left=text.slice(0,pos),m=left.match(completed?/([а-яёА-ЯЁ]{3,30})([\s.,!?;:])$/:/([а-яёА-ЯЁ]{3,30})$/);if(!m)return null;const end=pos-(completed?m[2].length:0),start=end-m[1].length;if(start>0&&/[а-яёА-ЯЁ]/.test(text[start-1]))return null;return {word:m[1],start,end}}
 function renderSuggestions(){if(!enabled)return;const e=editor();if(e.selectionStart!==e.selectionEnd)return clear();const r=findWord(e.value,e.selectionStart)||findWord(e.value,e.selectionStart,true);if(!r||protectedAt(e.value,r.start,r.end))return clear();const values=suggestions(r.word);clear();if(!values.length){if(!last)el('spellStatus').textContent='Подсказки слов · без интернета';return}range={...r,noteText:e.value};el('spellStatus').textContent='Возможно, вы имели в виду:';for(const value of values){const b=document.createElement('button');b.textContent=value;b.onmousedown=event=>event.preventDefault();b.onclick=()=>replace(range,value);el('spellSuggestions').append(b)}}
 function replace(r,value){const e=editor();if(!r||e.value!==r.noteText&&r.noteText!==undefined||e.value.slice(r.start,r.end)!==r.word)return reset();const before=e.value,position=e.selectionStart;const corrected=before.slice(0,r.start)+value+before.slice(r.end);e.setRangeText(value,r.start,r.end,'end');const caret=position>=r.end?position+value.length-r.word.length:position;e.setSelectionRange(caret,caret);last={before,corrected,position,word:r.word,replacement:value};clear();el('spellStatus').textContent='Исправлено: '+r.word+' → '+value;el('undoCorrection').hidden=false;e.focus();return true}
 function onInput(event,isEnabled){enabled=isEnabled;const e=editor();if(last&&e.value!==last.corrected){last=null;el('undoCorrection').hidden=true}if(!enabled)return;
  if(!event.isComposing&&event.inputType==='insertText'&&event.data&&/^[\s.,!?;:]$/.test(event.data)&&e.selectionStart===e.selectionEnd){const r=findWord(e.value,e.selectionStart,true);if(r&&!protectedAt(e.value,r.start,r.end)&&!ignored.has(r.word.toLowerCase())){const replacement=known.get(r.word.toLowerCase());if(replacement)replace(r,preserve(r.word,replacement))}}
  clearTimeout(timer);timer=setTimeout(renderSuggestions,180);
 }
 function undo(){if(!last)return false;const e=editor();if(e.value!==last.corrected)return false;const change=last;ignored.add(change.word.toLowerCase());e.value=change.before;e.setSelectionRange(change.position,change.position);reset();e.focus();e.dispatchEvent(new InputEvent('input',{inputType:'historyUndo'}));return true}
 document.getElementById('undoCorrection').onclick=undo;
 editor().addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&(e.code==='KeyZ'||e.key.toLowerCase()==='z')&&!e.shiftKey&&undo())e.preventDefault()});
 editor().addEventListener('keyup',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){clearTimeout(timer);timer=setTimeout(renderSuggestions,100)}});
 editor().addEventListener('click',()=>{clearTimeout(timer);timer=setTimeout(renderSuggestions,100)});
 el('spellSuggestions').addEventListener('click',e=>{if(e.target.closest('button'))editor().dispatchEvent(new InputEvent('input',{inputType:'insertReplacementText'}))});
 return {onInput,setEnabled,reset,suggestions};
})();
