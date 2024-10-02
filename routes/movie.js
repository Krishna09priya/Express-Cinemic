var express = require('express');
var router = express.Router();

// const isAuthenticated = (req, res, next) => {
//     if (req.session && req.session.userId) {
//       return next();
//     }
//     res.redirect('/login'); 
//   };

// router.get('/movie-listing-page',isAuthenticated, function(req, res) {
//     res.render("movieListingPage", {error:null, success:null});
//   });