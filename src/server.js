require('./bootstrap');
const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const json2xls = require('json2xls');
const { v4: uuidv4 } = require('uuid');
const { zonedTimeToUtc } = require('date-fns-tz');
const puppeteer = require('puppeteer');


const app = express();

app.listen(process.env.PORT || 3334, ()=>{
  console.log('Server Ready!')

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

 

  function load_files() {
    
    (async () => {

      

      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto('https://bi.saude.ba.gov.br/analytics/saw.dll?PortalPages&PortalPath=%2Fshared%2FSala%20Situa%C3%A7%C3%A3o%2FPain%C3%A9is%2FCOVID-19&Action=RefreshAll&StateAction=samePageState', {
        waitUntil: 'networkidle0',
      });
      // Login
      await page.waitFor(10000);
      const user = process.env.USER;
      const pass = process.env.PASSWORD;
      await page.$eval('#idUser', (el,{user}) => {el.value = user},{user});
      await page.$eval('#idPassword', (el,{pass}) => {el.value = pass},{pass});
      await page.click('#btn_login');
     
      // Get Data Geral
      await page.waitFor(10000);
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
      console.log(values ? "Monitoramento Salvo" : "Erro ao buscar dados de Monitoramento");
      const data = JSON.stringify(values);
      const xls = json2xls(values);
  
      const pathJson = path.join(__dirname, 'files','json','Monitoramento.json');
      const pathXlsx = path.join(__dirname, 'files','xlsx','Monitoramento.xlsx');
  
      fs.writeFileSync(pathJson, data);
      fs.writeFileSync(pathXlsx, xls, 'binary', (err) => {
        if (err) { console.log("writeFileSync :", err);}
      });
  
    
      //let selector = '#dashboard_page_7_tab';
     // await page.evaluate((selector) => document.querySelector(selector).click(), selector);
      await page.waitFor(15000);
      await page.click('#dashboard_page_8_tab');


      await page.waitFor(10000);
      await page.click('img.TapeDeckImageEna:nth-child(4)');

      // Get Data Ocupação
      await page.waitFor(10000);
      const Ocupacao = await page.evaluate(() => {
        let results = [];
        let result_aux = {};
        let repeat = {};
        let header = [];
        let head = "";
        let itens_td = document.querySelectorAll('.PTChildPivotTable > table > tbody > tr > td');
       
        let cont = 0;
        itens_td.forEach((item, index) => {
          
          if(index >= 7 && index <= 27) {
            header.push(item.innerText);
            
          } else if(index > 27) {
            
            if(cont < 20) {

              head = header[cont] === 'N. de pacientes' ? 'N_pacientes':  header[cont];
              head = head === '% Casos Confirm' ? '%_Casos_Confirmados':  head;

              if(!repeat[head]) {
                result_aux[(head).toString()] = item.innerText;
                repeat[head] = 1;
              } else {
                result_aux[ (head + repeat[head]).toString() ] = item.innerText;
                repeat[head]++;
              }
              
              cont++;
            } else {
              result_aux[ (head).toString() ] = item.innerText; 
              results.push(result_aux);

              result_aux = {};
              repeat={};
              cont = 0;
            }
              
             
          }
        });

        results = {
          header,
          results
        }
        return results;
    })
      //console.log(Ocupacao);
      const ocupacao = JSON.stringify(Ocupacao.results);
      const ocupacaoXls = json2xls(Ocupacao.results);

      const pathOcupaJson = path.join(__dirname, 'files','json','Ocupacao.json');
      fs.writeFileSync(pathOcupaJson, ocupacao);

      
      const pathOcupaXlsx = path.join(__dirname, 'files','xlsx','Ocupacao.xlsx');
      fs.writeFileSync(pathOcupaXlsx, ocupacaoXls, 'binary', (err) => {
              if (err) { console.log("writeFileSync :", err);}
            });
     
      
  
      logs();
      await page.waitFor(5000);
      await browser.close();
    })();
  }

  function clock() {

    const diasx = [1,2,3,4,5,6,7];
    const dias  = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];

    const data = new Date();
    const dia = data.getDay();	 
    const horas = data.getHours();
    const minutos = data.getMinutes();
    const minutos_real = data.getMinutes();
    const real_minutos = data.getMinutes();
    const segundos = data.getSeconds();
    //console.log(segundos)
    
    // Dia em string;
    const dia_str = dias[dia-1]; 

    if(minutos === 7 && segundos === 0) {
      console.log(`Dia [${dia_str}],  ${horas}:${minutos}:${segundos}`);
      
      load_files();
    }

  }

  setInterval(clock,1000);
  

});




    