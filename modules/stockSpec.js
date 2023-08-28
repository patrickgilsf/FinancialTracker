import axios from 'axios';

import {
  sheets,
  spreadsheetId,
  finnhubClient,
  alpha,
  quandl,
  QuandlKey
} from './config.js'

const testing = false

//specific api handlers
//get Finnhub Data
const getFinnhub = (path, arg) => {
  return new Promise((resolve, reject) => {
    if (path == 'companyBasicFinancials') {
      finnhubClient[path](arg, 'all', (error, data) => {
        error ? reject(error) : resolve(data);
      })
    } else {
      finnhubClient[path](arg, (error, data) => {
        error ? reject(error) : resolve(data);
      })
    }

  })
};

//alpha vantage data
const getAlpha = async (sym, type, path) => {
  return new Promise((resolve, reject) => {
    alpha[type][path](sym)
      .then((res) => {
        res ? resolve(res) : console.log('error');
      })
  })
}

//quandl data 
const getQuandl = async (path, sym) => {
  return new Promise((resolve, reject) => {
    axios.get(`https://data.nasdaq.com/api/v3/datatables/${path}.json?api_key=${QuandlKey}`, {
      // params: {
      //   ticker: sym
      // }
    })
    .then(res => {
      resolve(JSON.stringify(res.data, null, 2));
    })
    .catch(e => {e && e.code ? reject(e.code) : console.log(e)})
  })
};



//specific google sheet handlers
//get data from Google Sheet
const getGoogleData = async (range) => {
  try {
    console.log('getting stock symbols from Google APIs') 
    return new Promise((resolve, reject) => {
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      }, (err, res) => {
        err ? reject(err) : resolve(res.data.values);
      })
    })
  } catch(err) {console.log(err)}
};
//Google sheet array of arrays > array of objects
const gObjects = (data) => {
  let retArr = [];
  let keys = data[0];
  for (let row of data) {
    let pushObj = {};
    for (let i = 0; i < row.length; i++) {
      pushObj[keys[i]] = row[i];
    };
    retArr.push(pushObj);
  };
  return retArr;
}

//push data to Google Sheet
const pushToGoogle = async (data, range) => {
  sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    includeValuesInResponse: false,
    resource: {
      values: data
    }
  }, (err, res) => {
    !err ? console.log(`Update succeeded with code ${res.status}!`) : console.log(err);
  })
}
//get average quarterly statement data from financial data for last 4 quarters
const getQ = (data) => {
  let rtn = 0;
  for (let i = 0; i < 4; i++) {
    // data && data[i] ? console.log(data[i]) : console.log('no data');
    data && data[i] ? rtn += data[i].v : console.log('no quarterly data');
  };
  return Math.round((rtn / 4)*100)/100;
};
//get certain data from finanical reports
const getReportData = (data, type) => {
  for (let datum of data) {
    // return datum.label == type ? datum.value : console.log(`${type} not found!`);
    if (datum.label == type) {
      return datum.value
    };
    !datum.value || datum.Value == "N/A" ? console.log(`${type} not found or available!`) : null;
  }
}
//round number to 2 decimal places
const round = (num) => {
  return Math.round(num * 100) / 100;
}
//main handler
const getStockSpec = async () => {

  //pull and format google data
  let googleInputData = gObjects(await getGoogleData('StockSpec'));
  // console.log(googleInputData);
  
  //create new object
  let googleOutputData = [];
  //iterate through stock symbols and pull data
  for (let stock of googleInputData) {

    //dont process the first row
    if (stock.Symbol !== 'Symbol' && stock.Symbol) {
      console.log(`Getting data for ${stock.Symbol}...`)

      //api calls
        //finnhub
      // let profile = await getFinnhub1({symbol: stock.Symbol}, 'companyProfile2');
      let profile = await getFinnhub('companyProfile2', {symbol: stock.Symbol});
      // console.log(profile)
      let financials = await getFinnhub('companyBasicFinancials', stock.Symbol, 'all');
      console.log(financials);
      let reports = await getFinnhub('financialsReported', {symbol: stock.Symbol});
      // console.log(reports);
      let reportsQ = await getFinnhub('financialsReported', {symbol: stock.Symbol, freq: 'quarterly'});
      let quote = await getFinnhub('quote', stock.Symbol);
      let calendar = await getFinnhub("earningsCalendar", {symbol: stock.Symbol});
      let recs = await getFinnhub("recommendationTrends", stock.Symbol);
      let sec = await getFinnhub('filings', {symbol: stock.Symbol});
      // let qual = await getQuandl('EQ/R2R', stock.Symbol);
      // console.log(qual)
      // for (let dat of qual.datatable.columns) {
      //   console.log(dat)
      // }

      //console tests
      if (testing) {
        console.log(calendar);
        console.log(reports.data[0].report);
        console.log(financials);
        console.log(recs);
        console.log(ni, cfo, totalAssets,roe,finalLev);
        for (let rep of reportsQ.data) {
          console.log(rep.report);
        }
      }



      //math
      let price = quote.c;
      // let bvps2 = getReportData(reports.data[0].report.bs, 'Total current liabilities') / price    
      // let bv = getReportData(reports.data[0].report.bs, 'Total assets') - getReportData(reports.data[0].report.bs, 'Total liabilities');
      // let bvps = bv / price;
      // console.log(bv, round(bvps));
      let bvps = financials.metric.bookValuePerShareQuarterly;
      // let bvps2 = reports.data[0].report;
      // console.log(bvps, bvps2);
      // console.log(bvps, bvps2);
      let graham = Math.sqrt(22.5 * financials.metric.epsTTM * financials.metric.bookValuePerShareQuarterly);
      let epsg = calendar.earningsCalendar[0] ? calendar.earningsCalendar[0].epsEstimate : 'No Data';
      let epsTtm = getQ(financials.series.quarterly.eps);
      let peg = Math.round(epsg/epsTtm*100)/100;
      let ni = getReportData(reports.data[0].report.cf, 'Net income');
      let cfo = getReportData(reports.data[0].report.cf, 'Cash generated by operating activities');
      let totalAssets = getReportData(reports.data[0].report.bs, 'Total current assets');
      let sloan = (ni - cfo) / totalAssets;
      let roe = getQ(financials.series.quarterly.roeTTM);
      let finalLev = getQ(financials.series.quarterly.totalDebtToEquity);
      let qualityIndex = sloan + roe + finalLev;


      //column data
      stock.Name = `=HYPERLINK("${profile.weburl}", "${profile.name}")`;
      stock.Sector = profile.finnhubIndustry;
      stock['Price Today'] = price;
      stock['52 Week High'] = financials.metric['52WeekHigh'];
      stock['52 Week Low'] = financials.metric['52WeekLow'];
      stock['Price to Book Value'] = Math.round(price/bvps*100)/100;
      stock['Graham Number'] = graham ? round(graham) : "N/A";
      stock['Positive Earnings Growth'] = peg;
      stock['Financial Leverage'] = finalLev;
      stock.Liquidity = getQ(financials.series.quarterly.currentRatio);
      financials.series.annual.pe[0] ? stock['Price to Earnings'] = Math.round((financials.series.annual.pe[0].v)*100)/100 : stock['Price to Earnings'] = financials.metric.peTTMs;
      stock['Quality Rating'] = qualityIndex ? round(qualityIndex) : "N/A";
      stock.Buy = recs[0].buy;
      stock.Sell = recs[0].sell;
      stock.Hold = recs[0].hold;
      stock['Strong\nBuy'] = recs[0].strongBuy;
      stock['Strong\nSell'] = recs[0].strongSell;
      stock['Last Ratings\nUpdate'] = recs[0].period;
      stock['SEC Filings'] = `=HYPERLINK("${sec[0].reportUrl}", "SEC fillings here")`;
    }
    //push update to output data
    stock.Symbol ? googleOutputData.push(Object.values(stock)) : null;
  };

  
  //push to google
  console.log(googleOutputData);
  await pushToGoogle(googleOutputData, 'StockSpec');

}

export {
  getStockSpec,
  pushToGoogle
}
