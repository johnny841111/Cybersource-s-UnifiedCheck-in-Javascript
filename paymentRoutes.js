const express = require('express');
const app = express();
const jwt = require('jsonwebtoken')
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

router.post('/process-3ds-and-authorize', async (req, res) => {
  try {
    const { transientToken, price } = req.body;
    const MERCHANT_ID = 'gptw15870000101test';
    const CYBS_KEY = 'b6583c96-e34e-4a43-a43f-3acae02fb4cf';
    const SHARED_SECRET_KEY = 'XIZ4wskJUhhlcOlbYYMKGnkgx57hHk+AXIPRQCCfpXs=';

    if (!transientToken || !price) {
      throw new Error("缺少 transientToken 或 price");
    }

    const formattedPrice = String(Number(price).toFixed(2));
    if (!/^\d+(\.\d{2})$/.test(formattedPrice)) {
      throw new Error("金額格式不正確，應為兩位小數（如 '100.00'）");
    }

    const decodedToken = jwt.decode(transientToken);
    console.log("解析的 transientToken:", JSON.stringify(decodedToken, null, 2));
    if (!decodedToken || !decodedToken.content?.paymentInformation?.card) {
      throw new Error("Invalid transient token or missing card information");
    }

    const cardInfo = decodedToken.content.paymentInformation.card;
    const expirationMonth = String(cardInfo.expirationMonth?.value || "").padStart(2, "0");
    const expirationYear = String(cardInfo.expirationYear?.value || "");
    if (!expirationMonth || !expirationYear) {
      throw new Error("transientToken 中缺少到期日期");
    }
    if (!/^(0[1-9]|1[0-2])$/.test(expirationMonth)) {
      throw new Error("到期月份格式不正確，應為 01-12");
    }
    if (!/^\d{4}$/.test(expirationYear) || parseInt(expirationYear) < new Date().getFullYear()) {
      throw new Error("到期年份格式不正確或已過期，應為四位數");
    }

    const validationUrl = 'https://apitest.cybersource.com/risk/v1/authentication-results';
    const validationDate = ganerateDate();
    const validationPayload = JSON.stringify({
      clientReferenceInformation: {
        code: `order-${Date.now()}`
      },
      authenticationInformation: {
        transientToken: transientToken
      }
    });
    const validationDigest = ganerateDigest(validationPayload);
    const validationSignature = generateSignatureHeader(
      '/risk/v1/authentication-results',
      validationDigest,
      validationDate,
      MERCHANT_ID,
      CYBS_KEY,
      SHARED_SECRET_KEY
    );

    const validationResponse = await axios.post(validationUrl, validationPayload, {
      headers: {
        "Content-Type": "application/json",
        "Host": "apitest.cybersource.com",
        "Date": validationDate,
        "Digest": validationDigest,
        "v-c-merchant-id": MERCHANT_ID,
        "Signature": validationSignature
      }
    });

    const validationResult = validationResponse.data;
    console.log("3DS Validation Result:", JSON.stringify(validationResult, null, 2));

    if (validationResult.status === "CHALLENGE") {
      return res.json({
        status: "CHALLENGE",
        challengeUrl: validationResult.consumerAuthenticationInformation?.acsUrl || "Challenge URL not provided"
      });
    } else if (validationResult.status !== "SUCCESS") {
      throw new Error(`3DS validation failed with status: ${validationResult.status}`);
    }

    const authUrl = 'https://apitest.cybersource.com/pts/v2/payments';
    const authDate = ganerateDate();
    const authPayload = JSON.stringify({
      clientReferenceInformation: {
        code: `order-${Date.now()}`
      },
      processingInformation: {
        capture: false,
        commerceIndicator: "internet",
        authorizationOptions: {
          initiator: "customer",
          initiatorType: "cardholder"
        }
      },
      paymentInformation: {
        fluidData: {
          value: transientToken
        }
      },
      orderInformation: {
        amountDetails: {
          totalAmount: formattedPrice,
          currency: "TWD"
        },
        billTo: {
          firstName: "John",
          lastName: "Doe",
          address1: "1 Market St",
          locality: "Taipei",
          country: "TW", // 確保 country 是有效的兩位國家代碼
          email: "test@example.com",
          phoneNumber: "886123456789" // 添加電話號碼，某些情況下可能是必填
        }
      },
      consumerAuthenticationInformation: {
        authenticationTransactionId: validationResult.consumerAuthenticationInformation?.authenticationTransactionId,
        cavv: validationResult.consumerAuthenticationInformation?.cavv,
        eciRaw: validationResult.consumerAuthenticationInformation?.eciRaw,
        xid: validationResult.consumerAuthenticationInformation?.xid
      }
    });

    console.log("授權請求 Payload:", authPayload);

    const authDigest = ganerateDigest(authPayload);
    const authSignature = generateSignatureHeader(
      '/pts/v2/payments',
      authDigest,
      authDate,
      MERCHANT_ID,
      CYBS_KEY,
      SHARED_SECRET_KEY
    );

    const authResponse = await axios.post(authUrl, authPayload, {
      headers: {
        "Content-Type": "application/json",
        "Host": "apitest.cybersource.com",
        "Date": authDate,
        "Digest": authDigest,
        "v-c-merchant-id": MERCHANT_ID,
        "Signature": authSignature
      }
    });

    const authResult = authResponse.data;
    console.log("Authorization Result:", JSON.stringify(authResult, null, 2));

    res.json({
      transactionId: authResult.id,
      status: authResult.status
    });
  } catch (error) {
    console.error("3DS and Authorization Error:", JSON.stringify(error.response?.data || error.message, null, 2));
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;