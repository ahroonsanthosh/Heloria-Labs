/* Lists every button, link and role=button on the site that has no click-type listener of its own.
   Some of those still work through a listener on a parent or the window (delegation), so read the list, don't trust it blindly.
   node tools/test/shot.cjs --html dist/heloria.html --out /tmp/audit --scenario tools/test/audit-buttons.cjs */
module.exports = async ({ page, log }) => {
  const cdp = await page.context().newCDPSession(page);
  const { result } = await cdp.send('Runtime.evaluate', { expression: `[...document.querySelectorAll('button,[role=button],a[href],canvas#radar,[data-play],[data-back]')]`, returnByValue: false });
  const { result: props } = await cdp.send('Runtime.getProperties', { objectId: result.objectId, ownProperties: true });
  const kinds = ['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend'];
  let n = 0; const bare = [];
  for (const p of props) {
    if (!/^\d+$/.test(p.name) || !p.value || !p.value.objectId) continue; n++;
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: p.value.objectId, depth: 0 });
    const has = listeners.some(l => kinds.includes(l.type));
    if (has) continue;
    const { result: d } = await cdp.send('Runtime.callFunctionOn', { objectId: p.value.objectId, returnByValue: true, functionDeclaration: `function(){ const st=this.closest('.st'); return (st?'['+st.dataset.st+'] ':'')+this.tagName.toLowerCase()+(this.id?'#'+this.id:'')+(this.className&&typeof this.className==='string'?'.'+this.className.trim().split(/\\s+/).join('.'):'')+(this.href?' href='+this.getAttribute('href'):'')+' "'+(this.textContent||this.getAttribute('aria-label')||'').trim().replace(/\\s+/g,' ').slice(0,40)+'"'; }` });
    bare.push(d.value);
  }
  log('controls checked: ' + n);
  log('without a listener of their own (links navigate by themselves; check the rest):');
  bare.forEach(b => log('  ' + b));
};
