// using puppeteer to test the page
const puppeteer = require('puppeteer');

// set home page is "http://127.0.0.1:43110"
const homePage = 'http://127.0.0.1:43110';
// start an async function for puppetter
(async () => {

    // create a new browser with fulll viewport
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
          "--disable-web-security",
        ]
    });
    // allow accessing a cross-origin frame    

    // load the links at home page
    const page = await browser.newPage();
    // await page.setRequestInterception(true);

    let links = [ "http://127.0.0.1:43110" ];
    let history = new Object();
    while( links.length > 0 ){
      // show total links
      console.log(`total links: ${links.length}`);

      let link = links.splice(Math.random()*links.length, 1)[0];
      // put the link into history
      
      console.log("\x1b[32m", link, "\x1b[0m");
      // wait for the page to load
      try{
        await page.goto(link);

        const client = await page.target().createCDPSession();

        // intercept request when response headers was received
        await client.send('Network.setRequestInterception', {
          patterns: [{
              urlPattern: '*',
              resourceType: 'Document',
              interceptionStage: 'HeadersReceived'
          }],
        });
        
        await client.on('Network.requestIntercepted', async e => {
            let headers = e.responseHeaders || {};
            let contentType = headers['content-type'] || headers['Content-Type'] || '';
            let obj = {interceptionId: e.interceptionId};
            let url = new URL( e.request.url );
            if( contentType.indexOf("text/html") === -1 ){
            // if (contentType.indexOf('application/zip') > -1 || /\/\S+.\S+$/.test(url.pathname)) {
                obj['errorReason'] = 'BlockedByClient';
            }
        
            await client.send('Network.continueInterceptedRequest', obj);
        });
        
        // wait for the iframe to load
        await page.waitForSelector('iframe');
        // wait 10 seconds
        await page.waitFor(1500);
        const newLinks = await page.evaluate( () => {
          let a = [];
          for( let i = 0; i < 0xffff && a.length == 0; i++){
            a = document.querySelector("iframe").contentDocument.querySelectorAll("a[href]");
          }
          let links = [];
          for( let i = 0; i < a.length; i++ ){
            links.push( a[i].href );
          }
          return links;
        } );

        // add new links to the links with no in history
        for( let i = 0; i < newLinks.length; i++ ){
          let link = newLinks[i].replace(/\/?#\S+/, '');
          if( history[link] == undefined && link.indexOf( homePage ) == 0 ){
            history[link] = true;
            links.push( link );
          }
        }
      }catch(e){

        console.log(e);
      }


    }


    await browser.close();
    console.log('All links are collected');

})();