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

router.get('/forgot-password', (req, res) => {
  res.render('forgotPassword',{ errors: [],success:null })
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const errors = [];

  try {
    const admin = await Admin.findOne({ email });

    if (!admin) {
      errors.push( {msg: 'Incorrect Email Address.'});
        return res.render('forgotPassword',{errors: errors, success:null });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    admin.passwordResetToken = resetToken;
    admin.tokenExpirationTime = Date.now() + 3600000; // 1 hour
    await admin.save();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'krishnapriyaabhijune28@gmail.com', 
        pass: 'nybv ncyc osca cllh' 
      }
    });

    const mailOptions = {
      from: 'krishnapriyaabhijune28@gmail.com',
      to: admin.email,
      subject: 'Password Reset',
      text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
        Please click on the following link, or paste this into your browser to complete the process:\n\n
        http://localhost:3000/reset-password/${resetToken}\n\n
        If you did not request this, please ignore this email and your password will remain unchanged.\n`
    };

    await transporter.sendMail(mailOptions);

    return res.render('forgotPassword',{errors:[],success: "Reset link sent to your email" });
  } catch (error) {
    console.log(error);
  }
});

router.get('/reset-password/:token', (req, res) => {
  const {token} = req.params;
  res.render('resetPassword',{ token: token ,errors: [],success:null })
});

router.post('/reset-password/:token', async (req, res) => {
  const { password,confirmPassword } = req.body;
  const { token } = req.params;
  const errors = [];

  try {
    if(password!= confirmPassword){
      errors.push( {msg: 'NewPassword and confirm NewPassword is not matching.'});
      return res.render('resetPassword',{errors: errors,success:null,token:token });
    }
    const admin = await Admin.findOne({
      passwordResetToken: token,
      tokenExpirationTime: { $gt: Date.now() }
    });

    if (!admin) {
      errors.push( {msg: 'The link expired.'});
        return res.render('resetPassword',{errors: errors, success:null,token:token });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    admin.password = hashedPassword;
    admin.passwordResetToken = null;
    admin.tokenExpirationTime = null;

    await admin.save();
    return res.render('resetPassword',{success: "Password reset successfully",errors:[],token:null });;
  }catch (error) {
    console.log(error)
  }
});

router.get('/logout', (req,res)=>{
  req.session.destroy((err) =>{
    if (err){
      console.log(err);
    }else{
      res.redirect('/login')
    }
  });
  });

module.exports = router;
