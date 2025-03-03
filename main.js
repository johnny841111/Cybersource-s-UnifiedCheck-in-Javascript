const express=require('express');//import express
const app=express();//create express app


app.use(express.json());//It is used to parse the incoming request body

app.listen(3100,()=>{
    console.log('Server is running on port 3100');
});

