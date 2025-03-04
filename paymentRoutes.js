const express = require('express');
const app = express();
const axios = require('axios')
const router = express.Router();
const {ganerateDigest,ganerateDate,generateSignatureHeader} = require('./header');


app.use(express.json());

router.post('/post-capture-context', async (req, res) => {

    try{let get_price=req.body.price;
        const date = ganerateDate();
        const MERCHANT_ID = 'gptw15870000101test';
        const CYBS_KEY = 'b6583c96-e34e-4a43-a43f-3acae02fb4cf';
        const SHARED_SECRET_KEY = 'XIZ4wskJUhhlcOlbYYMKGnkgx57hHk+AXIPRQCCfpXs=';
        const apiUrl = 'https://apitest.cybersource.com/up/v1/capture-contexts';
        
        const Payload_body  = JSON.stringify({
          targetOrigins: ["https://localhost:3100"],
          clientVersion: "0.24",
          allowedCardNetworks: ["VISA", "MASTERCARD"],
          allowedPaymentTypes: ["PANENTRY", "CLICKTOPAY"],
          country: "TW",
          locale: "zh_TW",
          orderInformation: {
            amountDetails: {
              totalAmount: String(get_price),
              currency: "TWD"
            }
          }

        });
        const digest = ganerateDigest(Payload_body);
        const signature = generateSignatureHeader('/up/v1/capture-contexts',digest,date,MERCHANT_ID,CYBS_KEY,SHARED_SECRET_KEY);
        const response= await axios.post(apiUrl, Payload_body, {
          headers: {
            "Content-Type": "application/json",
            "Host": "apitest.cybersource.com",
            "Date": date,
            "Digest": digest,
            "v-c-merchant-id": MERCHANT_ID,
            "Signature": signature
          }
          });
          console.log(response.data);
      
          res.send(response.data);//將Jwt回傳給前端
    }

    catch(err){
        res.json(err);
    }
    
} 
);

module.exports = router;