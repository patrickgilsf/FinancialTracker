//generic imports
import 'dotenv/config';
import {google} from 'googleapis';

//stock api dependencies
import finnhub from "finnhub";
import alphavantage from 'alphavantage';
import Quandl from 'quandl';

//api keys
const FinnKey = process.env.FinnKey
const GoogleKey = process.env.GOOGLEKEY.split(String.raw`\n`).join('\n')
const GoogleEmail = process.env.GOOGLEEMAIL
const spreadsheetId = process.env.SpreadsheetId
const AlphaKey = process.env.AlphaKey
const IEX_TOKEN = process.env.IEX_TOKEN
const QuiverToken = process.env.QuiverToken
const QuandlKey = process.env.NasdaqKey

//google credentials
const auth = new google.auth.JWT(
  GoogleEmail,
  null,
  GoogleKey,
  [
    "https://www.googleapis.com/auth/spreadsheets"
  ],
  null
);
google.options({auth})
const sheets = google.sheets('v4');

//finnkey
const api_key = finnhub.ApiClient.instance.authentications['api_key'];
api_key.apiKey = FinnKey // Replace this
const finnhubClient = new finnhub.DefaultApi();

//alpha vantage
const alpha = alphavantage({key: AlphaKey})

// //quandl
var quandl = new Quandl();
var options = {
    auth_token: QuandlKey
}
quandl.configure(options);

//rate limiting
//rate limiting delay
const delay = time => new Promise(res=>setTimeout(res,time));


export {
  sheets,
  spreadsheetId,
  finnhubClient,
  alpha,
  QuiverToken,
  delay,
  quandl,
  QuandlKey
}