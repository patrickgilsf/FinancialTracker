import axios from 'axios';
import {
  QuiverToken,
  finnhubClient,
  delay
} from './config.js'
import {
  pushToGoogle
} from './stockSpec.js'
//how many congressman to pull
let count = 500;
//api call from Finnhub
const getFinnhub1 = (arg, path) => {
  return new Promise((resolve, reject) => {
    finnhubClient[path](arg, (error, data) => {
      error ? reject(error) : resolve(data);
    })
  })
};
const getFinnhub4 = (arg1, arg2, arg3, arg4, path) => {
  return new Promise((resolve, reject) => {
    finnhubClient[path](arg1, arg2, arg3, arg4, (error, data) => {
      error ? reject(error) : resolve(data);
    })
  })
};
//get api call from quiver api
const quiverAPI = async (url) => {
  return new Promise((resolve, reject) => {
      axios.request(url, {
        headers: {
          accept: "application/json",
          "X-CSRFToken": "TyTJwjuEC7VV7mOqZ622haRaaUr0x0Ng4nrwSRFKQs7vdoBcJlK9qjAS69ghzhFu",
          Authorization: `Token ${QuiverToken}`
        },
        params: {
          page_size: count ? count : 500
        }
    })
      .then(res => {
        resolve(res.data)
      })
      .catch(e => {e && e.code ? reject(e.code) : console.log(e)})
  })
}

const getCongress = async () => {
  let con;
  try {
    con = await quiverAPI('https://api.quiverquant.com/beta/bulk/congresstrading');
  } catch(e) {console.log(e)}
  
  count ? count : con.length;

  console.log(`there will be ${count} trades to get`);
  let rtn = [];
  let quotes = {};
  let prices = {};
  for (let i = 0; i < count; i++) {
    let trade = con[i]
    console.log(`Getting data for ${trade.Ticker}, #${i} out of ${count}...`)

    //convert trade date to unix
    let tdUnix = Math.floor(new Date(trade.TransactionDate).getTime() / 1000);
    //get stock price if it hasn't been gotten
    let lastPrice;
    try { 
      console.log(`getting price for ${trade.Ticker}`)
      lastPrice = await getFinnhub4(trade.Ticker, "D", tdUnix, tdUnix, "stockCandles");
      } catch (e) {console.log(e)};

    
    lastPrice && lastPrice.c ? lastPrice = lastPrice.c[0] : lastPrice = "N/A";
    
    //get quote if it hasn't been gotten
    let quote;
    if (!quotes.hasOwnProperty(trade.Ticker)) {
      await delay(1000);
      console.log(`getting quote for ${trade.Ticker}`)
      quote = await getFinnhub1(trade.Ticker, 'quote');
      quotes[trade.Ticker] = quote;
    } else {
      quote = quotes[trade.Ticker]
    }
    let rep = trade.Representative;
    // console.log(`https://www.google.com/search?q=${rep.replaceAll(' ', '+')}`);
    rtn.push(Object.values({
      Rep: `=HYPERLINK("https://www.google.com/search?q=${rep.replaceAll(' ', '+')}", "${rep}")`,
      Date: trade.ReportDate,
      TradeDate: trade.TransactionDate,
      Symbol: trade.Ticker,
      Amt: trade.Amount,
      'Price Today': quote.c,
      'Price at Buy': lastPrice,
      'Gain Loss': quote.c - lastPrice
    }));
    await delay(1000);
  };
  //sort rows by highest gains
  rtn.sort((line1, line2) => {
    // console.log(line1,line2)
    let l1 = line1[7];
    let l2 = line2[7];
    // console.log(l1,l2);
    return l1 > l2 ? -1 : 1;
    // return line1['Gain Loss'] > line2['Gain Loss'] ? -1 : 1;
  })
  //add titles to columns
  rtn.unshift(["Representative", "Reported Date", "Transaction Date", "Symbol", "Amount", "Price Today", "Price at Buy", "Gain Loss"]);
  //push to google sheet
  // console.log(rtn);
  await pushToGoogle(rtn, 'Congress');
}
export {
  getCongress
}