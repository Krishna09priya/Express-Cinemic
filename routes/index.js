var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Admin = require('../modals/adminModel');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' })
});

router.get('/login', (req, res) => {
  res.render('login',{ errors: [],message:null })
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const errors = [];

    let foundAdmin;
    Admin.findOne({ email })
    .then(admin => {
      if (!admin) {
        errors.push( {msg: 'Incorrect Email Address.'});
        return res.render('login',{errors: errors });
      }
      foundAdmin= admin;
      return bcrypt.compare(password, admin.password);
    })
    .then(isPasswordValid => {
      if (!isPasswordValid) {
        errors.push( {msg: 'Incorrect Password.'});
        return res.render('login', {errors: errors });
      }

      // Set user's ID and email in the session
      req.session.adminId = foundAdmin._id;
      req.session.adminEmail = foundAdmin.email;
      res.redirect('/movie/movie-listing-page');
    })
    .catch(error => {
      console.error(error);
      res.redirect('/login');
    });
});
module.exports = router;
