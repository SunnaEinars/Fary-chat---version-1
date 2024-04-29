const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

app.get('/', (req, res) =>{
    res.send('Helló World!');
})