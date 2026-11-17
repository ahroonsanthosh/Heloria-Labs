/* arrived over plain http (an old link, a typed address in a browser that does not try https first): the same place, over
   https, before anything else. Only on the site's own domain, so a copy served anywhere else (the tests) is left alone.
   (The edge should do this itself: Cloudflare's Always Use HTTPS. This is for until it does, and costs nothing after) */
if(location.protocol==='http:'&&/(^|\.)helorialabs\.com$/.test(location.hostname)) location.replace('https://'+location.host+location.pathname+location.search+location.hash);
