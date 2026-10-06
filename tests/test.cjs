const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const JSZip=require('../vendor/jszip.min.js');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const ctx=await browser.newContext({acceptDownloads:true});
const page=await ctx.newPage();const errors=[],network=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(process.env.QUIET_NOTES_TEST_URL+'/'))network.push(r.url())});
page.on('dialog',d=>d.type()==='prompt'?d.accept(d.message().includes('Описание')?'Русское фото':'Тест'):d.accept());
await page.goto(process.env.QUIET_NOTES_TEST_URL+'/index.html');await page.waitForFunction(()=>document.getElementById('notes').children.length===2);
await page.click('#new');await page.fill('#title','Русская заметка');await page.locator('#title').press('Tab');
await page.fill('#editor','# Привет\n\n**жирный** и *курсив*\n\n[[Первая идея]]\n\n<script>window.hacked=1</script>\n\n![external](https://example.com/test.png)');
await page.waitForFunction(()=>document.getElementById('status').textContent==='Сохранено в браузере');
await page.waitForFunction(()=>document.querySelector('#preview strong'));
assert.equal(await page.evaluate(()=>window.hacked),undefined);assert.equal(network.length,0);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQxkAAAAASUVORK5CYII=','base64');
await page.locator('#editor').press('Control+End');
for(let i=0;i<2;i++){await page.setInputFiles('#pictures',{name:'фото.png',mimeType:'image/png',buffer:png});await page.waitForTimeout(200)}
await page.waitForFunction(()=>document.getElementById('status').textContent==='Сохранено в браузере');
let text=await page.locator('#editor').inputValue();const refs=[...text.matchAll(/\]\((attachments\/[^)]+)\)/g)].map(x=>x[1]);assert.equal(refs.length,2);assert.notEqual(refs[0],refs[1]);
await page.reload();await page.waitForFunction(()=>document.getElementById('notes').children.length===3);await page.getByRole('button',{name:'Русская заметка',exact:false}).click();
assert.equal(await page.locator('#editor').inputValue(),text);
await page.getByRole('button',{name:'Просмотр',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#preview img[src^="blob:"]').length===2);await page.getByRole('button',{name:'Редактор',exact:true}).click();
await page.click('#newFolder');await page.locator('#noteMenu > summary').click();await page.selectOption('#folder','Тест');await page.waitForTimeout(500);
await page.click('#export');let dlPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать заметку с картинками',exact:true}).click();let dl=await dlPromise;let zip=await JSZip.loadAsync(await fs.readFile(await dl.path()));assert(zip.file('Тест/Русская заметка.md'));const md=await zip.file('Тест/Русская заметка.md').async('string');assert(md.includes('../attachments/'));for(const r of refs)assert(zip.file(r));
await page.getByRole('button',{name:'Резервная копия',exact:true}).click();dl=await page.waitForEvent('download');await dl.saveAs(require('node:path').join(require('node:os').tmpdir(),'quiet-notes-test-backup.zip'));zip=await JSZip.loadAsync(await fs.readFile(require('node:path').join(require('node:os').tmpdir(),'quiet-notes-test-backup.zip')));assert(zip.file('backup.json'));await page.click('#closeDialog');
await page.setInputFiles('#files',{name:'импорт.md',mimeType:'text/markdown',buffer:Buffer.from('# Импорт русский')});await page.waitForFunction(()=>document.getElementById('title').value==='импорт');
await page.setInputFiles('#files',require('node:path').join(require('node:os').tmpdir(),'quiet-notes-test-backup.zip'));await page.waitForFunction(()=>document.getElementById('notes').children.length===3);
await page.getByRole('button',{name:'Первая идея',exact:false}).first().click();await page.fill('#title','Переименовано');await page.locator('#title').press('Tab');await page.waitForTimeout(500);await page.getByRole('button',{name:'Русская заметка',exact:false}).first().click();assert((await page.locator('#editor').inputValue()).includes('[[/Переименовано]]'));
await page.locator('#appMenu > summary').click();await page.click('#ai');await page.check('#linked');await page.check('#merged');await page.click('#aiReview');await page.waitForSelector('#aiFiles input');assert(await page.locator('#aiFiles').textContent().then(s=>s.includes('Объединённые заметки.md')));await page.click('#closeDialog');
// Simulate the real persistence path failing, rather than a cosmetic status change.
await page.evaluate(()=>{window.IDBObjectStore.prototype.put=function(){throw new DOMException('Full','QuotaExceededError')}});await page.fill('#editor','Текст после ошибки');await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Не сохранено'));
await page.click('#export');dlPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Скачать заметку .md',exact:true}).click();dl=await dlPromise;assert.equal(await fs.readFile(await dl.path(),'utf8'),'Текст после ошибки');
assert.equal(network.length,0);assert.deepEqual(errors,[]);
console.log('PASS: HTTP startup, Russian notes, Markdown safety, no Internet requests, duplicate image names, persistent reload, folder ZIP paths, Markdown import, backup restore, rename links, AI merged export preview, quota error and emergency export');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
