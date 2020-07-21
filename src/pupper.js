const fs = require('fs');
const path = require('path');
const json2xls = require('json2xls');
const { v4: uuidv4 } = require('uuid');
const { zonedTimeToUtc } = require('date-fns-tz');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://bi.saude.ba.gov.br/analytics/saw.dll?PortalPages&PortalPath=%2Fshared%2FSala%20Situa%C3%A7%C3%A3o%2FPain%C3%A9is%2FCOVID-19&Action=RefreshAll&StateAction=samePageState', {
    waitUntil: 'networkidle0',
  });
  // Login
  await page.waitFor(10000);
  await page.$eval('#idUser', el => el.value = 'sesab.transparencia');
  await page.$eval('#idPassword', el => el.value = 'EM97q$51');
  await page.click('#btn_login');
 
  // Get Data
  await page.waitFor(6000);
  const Results = await page.evaluate(() => {
    let results = [];
    let items = document.querySelectorAll('div.CardResponsivo');

    items.forEach((item) => {
        results.push({
          val: item.innerText,
      });
    });
    return results;
})
  
await browser.close();

  let values = [];
  Results.forEach((e, index) => {
    const str_split = e.val.split("\n");
    //console.log(str_split);
    const title = str_split[0];
    const num = str_split[1];
    
    values.push({
      title,
      val: num
    })
    
  });
  console.log(values);
  const data = JSON.stringify(values);
  const xls = json2xls(values);

  const pathJson = path.join(__dirname, 'files','json','Monitoramento.json');
  const pathXlsx = path.join(__dirname, 'files','xlsx','Monitoramento.xlsx');

  fs.writeFileSync(pathJson, data);
  fs.writeFileSync(pathXlsx, xls, 'binary', (err) => {
    if (err) { console.log("writeFileSync :", err);}
  });

  //await page.click('.DashTabsToolbarCell');

  
  logs();
  
})();


function logs() {
  const pathLogs= path.join(__dirname, 'files','logs','downloads.json');

    fs.stat(pathLogs, function(err, stat) {
      if(err == null) {
      
        fs.readFile(pathLogs, (err, logs) => {
          if (err) throw err;
          let ObjLogs = JSON.parse(logs);

          var newLog = {
            id: uuidv4(),
            Data: zonedTimeToUtc(new Date(), 'America/Sao_Paulo'),
          };
          ObjLogs.push(newLog)
          ObjLogs = JSON.stringify(ObjLogs);
          fs.writeFileSync(pathLogs, ObjLogs);
        });



      } else if(err.code === 'ENOENT') {

        var newLog = [{
          id: uuidv4(),
          Data: zonedTimeToUtc(new Date(), 'America/Sao_Paulo'),
        }];
        newLog = JSON.stringify(newLog);
        fs.writeFileSync(pathLogs, newLog);

      } else {
          console.log('Some other error: ', err.code);
      }
    });
}