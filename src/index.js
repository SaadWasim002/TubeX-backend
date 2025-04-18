// require('dotenv').config({path: "./env"});
import connectDB from "./db/index.js";
import dotenv from 'dotenv';

dotenv.config({
    path : './env'
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`Server Listening in the PORT : ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log(`MongoDB connection failed ${err}`);
});




















/*
import mongoose from "mongoose";
import express from "express";

import { DB_NAME } from "./constants";

const app = express();

(async ()=> {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        app.on("error", (err) => {
            console.log("Error: ", err);
            throw err;
        });
        app.listen(process.env.PORT , ()=>{
            console.log(`App listening on Port ${process.env.PORT}`);
        });
    }
    catch(err){
        console.error("Error : ",err);
        throw err;
    }
})
*/