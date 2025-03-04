const crypto = require('crypto');

function ganerateDigest(Payload) {
    const hash = crypto.createHash('sha256').update(Payload).digest('base64');
    return "SHA-256=" + hash;
}

function ganerateDate() {
    return new Date().toUTCString();
}

function generateSignatureHeader(target,digest,date,MerchantID,CYBS_key,SHARED_SECRET_KEY) {
    const signature_stirng = `(request-target): post ${target}\n` +
                          `host: apitest.cybersource.com\n` +
                          `date: ${date}\n` +
                          `digest: ${digest}\n` +
                          `v-c-merchant-id: ${MerchantID}`;

    const key = Buffer.from(SHARED_SECRET_KEY, 'base64');  //SHARED_SECRET_KEY 被用base64解碼成byte array，因為HMAC-SHA256只接受byte array格式的key
    const hmac = crypto.createHmac('sha256', key);  //用SHARED_SECRET_KEY建立一個sha256的hmac
    hmac.update(signature_stirng);  //將signature_stirng放進hmac做hash
    const signature = hmac.digest('base64');  //用digest再提出結果，並在轉回base64編碼

    const result_of_signature = `keyid="${CYBS_key}", algorithm="HmacSHA256", headers="(request-target) host date digest v-c-merchant-id", signature="${signature}"`;//最後再放回要求得的格式
    return result_of_signature;
}

module.exports = {
    ganerateDigest,
    ganerateDate,
    generateSignatureHeader
}