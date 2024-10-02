var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' })
});

router.get('/login', (req, res) => {
  res.render('login',{ errors: [],message:null })
});

// router.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//     let foundUser;
//     User.findOne({ email })
//     .then(user => {
//       console.log(user)
//       if (!user) {
//         errors.push( {msg: 'Incorrect Email Address.'});
//         return res.render('login',{errors: errors });
//       }
//       foundUser= user;
//       return bcrypt.compare(password, user.password);
//     })
//     .then(isPasswordValid => {
//       if (!isPasswordValid) {
//         errors.push( {msg: 'Incorrect Password.'});
//         return res.render('login', {errors: errors });
//       }

//       // Set user's ID and email in the session
//       req.session.userId = foundUser._id;
//       req.session.userEmail = foundUser.email;
//       res.redirect('/movie/movie-listing-page');
//     })
//     .catch(error => {
//       console.error(error);
//       res.redirect('/login');
//     });
  
// });
module.exports = router;
