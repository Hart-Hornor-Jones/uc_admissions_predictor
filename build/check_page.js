// Headless checks of index.html with Playwright (Chromium).
//   node check_page.js record <page.html> <baseline.json>   record the displayed statistics (default state, then every campus x era)
//   node check_page.js check  <page.html> <baseline.json>   compare the page's default-state statistics with a recorded baseline
//   node check_page.js matrix <page.html>                   render every campus x model x fit x view x dots combination; fail on console errors
const {chromium}=require('playwright'); const fs=require('fs'); const path=require('path');
const [mode,pageFile,baseFile]=process.argv.slice(2);
if(!mode||!pageFile){ console.error('usage: node check_page.js record|check|matrix <page.html> [baseline.json]'); process.exit(2); }
const url='file://'+path.resolve(pageFile);

async function open(){
  const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1400,height:1000}});
  const errs=[];
  pg.on('console',m=>{ if(m.type()==='error'||m.type()==='warning') errs.push(m.type()+': '+m.text()); });
  pg.on('pageerror',e=>errs.push('pageerror: '+e.message));
  await pg.goto(url); await pg.waitForSelector('#statsA b');
  return {b,pg,errs};
}
const grab=pg=>pg.evaluate(()=>{
  const t=s=>{ const e=document.querySelector(s); return e?e.textContent.replace(/\s+/g,' ').trim():null; };
  const hints={}; document.querySelectorAll('.hint').forEach(h=>{ hints[h.id]=h.textContent; });
  const c=document.querySelector('#panelA circle');
  return { statsA:t('#statsA'), statsB:t('#statsB'), coef:t('#coeftable'), hints,
    checked:[...document.querySelectorAll('#varlist input:checked')].map(i=>i.dataset.v).join(','),
    dotsA:document.querySelectorAll('#panelA circle').length, dotsB:document.querySelectorAll('#panelB circle').length,
    dotA0:c?c.getAttribute('cx')+','+c.getAttribute('cy'):null,
    school:(t('#schoolbox .big3')||'')+' | '+(t('#schoolbox table')||'') };
});
const clickFirstDot=pg=>pg.evaluate(()=>{ const c=document.querySelector('#panelA circle'); if(c) c.dispatchEvent(new MouseEvent('click',{bubbles:true})); return !!c; });
const setCell=async(pg,which,c,e)=>{ await pg.selectOption(`#panel${which} select:first-of-type`,c); await pg.selectOption(`#panel${which} select:nth-of-type(2)`,e); };

(async()=>{
  const {b,pg,errs}=await open();
  const campuses=await pg.$$eval('#panelA select:first-of-type option',o=>o.map(x=>x.value));
  const eras=await pg.$$eval('#panelA select:nth-of-type(2) option',o=>o.map(x=>x.value));
  let failed=0;
  if(mode==='record'||mode==='check'){
    const res={default:await grab(pg),cells:{}};
    await clickFirstDot(pg); res.defaultPick=(await grab(pg)).school;
    for(const c of campuses) for(const e of eras){ await setCell(pg,'A',c,e); await setCell(pg,'B',c,e); await clickFirstDot(pg); res.cells[c+'|'+e]=await grab(pg); }
    res.errors=errs;
    if(mode==='record'){ fs.writeFileSync(baseFile,JSON.stringify(res,null,1)); console.log('baseline written to',baseFile,'console errors:',errs.length); }
    else {
      const base=JSON.parse(fs.readFileSync(baseFile,'utf8'));
      const cmp=(label,x,y)=>{ if(JSON.stringify(x)!==JSON.stringify(y)){ failed++; console.log('DIFF',label,'\n  baseline:',JSON.stringify(y),'\n  page:    ',JSON.stringify(x)); } };
      const cmpState=(label,s,bs)=>{ for(const k of ['statsA','statsB','coef','checked','dotsA','dotsB','dotA0','school']) cmp(label+'.'+k,s[k],bs[k]);
        for(const h in bs.hints) cmp(label+'.'+h,s.hints[h],bs.hints[h]); };
      cmpState('default',res.default,base.default); cmp('defaultPick',res.defaultPick,base.defaultPick);
      for(const k in base.cells) cmpState(k,res.cells[k],base.cells[k]);
      console.log(`check: ${Object.keys(base.cells).length} campus x era cells + default state compared; ${failed} differences; console errors: ${errs.length}`);
    }
  } else if(mode==='matrix'){
    const models=await pg.$$eval('#selModel option',o=>o.map(x=>x.value)), fits=await pg.$$eval('#selFit option',o=>o.map(x=>x.value));
    const views=await pg.$$eval('#selView option',o=>o.map(x=>x.value)), dots=await pg.$$eval('#selDots option',o=>o.map(x=>x.value));
    let n=0;
    for(const c of campuses){
      await setCell(pg,'A',c,eras[0]); await setCell(pg,'B',c,eras[1]);
      for(const m of models) for(const f of fits) for(const v of views) for(const d of dots){
        await pg.selectOption('#selModel',m); await pg.selectOption('#selFit',f); await pg.selectOption('#selView',v); await pg.selectOption('#selDots',d);
        const before=errs.length;
        const r=await pg.evaluate(()=>({ stats:document.querySelector('#statsA').textContent, dots:document.querySelectorAll('#panelA circle').length,
          grp:document.querySelectorAll('#grptable td').length, coef:document.querySelectorAll('#coeftable td').length,
          nan:/NaN|undefined|Infinity/.test(document.querySelector('#plotscol').textContent+document.querySelector('#schoolbox').textContent) }));
        await clickFirstDot(pg);
        const bad=errs.length>before||!/R² = \d/.test(r.stats)||r.dots<1||r.grp<10||r.coef<4||r.nan;
        if(bad){ failed++; console.log('FAIL',c,m,f,v,d,JSON.stringify(r),errs.slice(before).join(' | ')); }
        n++;
      }
    }
    // the added variables and the logistic model with every variable, at each campus
    for(const c of campuses){
      await setCell(pg,'A',c,eras[0]); await setCell(pg,'B',c,eras[0]);
      for(const m of models) for(const f of fits){
        await pg.selectOption('#selModel',m); await pg.selectOption('#selFit',f);
        await pg.evaluate(()=>{ document.querySelectorAll('#varlist input').forEach(i=>{ if(!i.checked&&!i.disabled) i.click(); }); });
        const before=errs.length;
        const r=await pg.evaluate(()=>({ stats:document.querySelector('#statsA').textContent, checked:document.querySelectorAll('#varlist input:checked').length,
          dots:document.querySelectorAll('#panelA circle').length, why:window.UCPRED&&window.UCPRED.FA.why,
          nan:/NaN|undefined|Infinity/.test(document.querySelector('#plotscol').textContent) }));
        await clickFirstDot(pg);
        const bad=errs.length>before||!/R² = \d/.test(r.stats)||r.nan;
        if(bad){ failed++; console.log('FAIL all-variables',c,m,f,JSON.stringify(r),errs.slice(before).join(' | ')); }
        await pg.evaluate(()=>{ document.querySelectorAll('#varlist input:checked').forEach(i=>{ if(i.dataset.v!=='sed') i.click(); }); });
        n++;
      }
    }
    // school search
    await pg.fill('#find','Agoura High School (Agoura Hills)'); await pg.dispatchEvent('#find','change');
    const sb=await pg.$eval('#schoolbox',e=>e.textContent); if(!/Agoura/.test(sb)){ failed++; console.log('FAIL school search',sb.slice(0,200)); }
    console.log(`matrix: ${n} combinations rendered; ${failed} failures; console errors: ${errs.length}`); if(errs.length) console.log(errs.join('\n'));
  }
  await b.close(); process.exit(failed?1:0);
})().catch(e=>{ console.error(e); process.exit(1); });
