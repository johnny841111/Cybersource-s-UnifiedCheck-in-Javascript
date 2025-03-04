const express=require('express');//import express
const app=express();//create express app
const router=require('./paymentRoutes');//import routes
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('./server.key'),    // 替換為你的私鑰路徑
    cert: fs.readFileSync('./server.cert')  // 替換為你的憑證路徑
  };
  


app.use(express.static('public'));//use static files
app.use(express.json());
app.use('/',router)





https.createServer(options, app).listen(3100, () => {
    console.log('HTTPS server is running on port 3100');
  });

