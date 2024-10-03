var express = require('express');
var router = express.Router();

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.adminId) {
      return next();
    }
    res.redirect('/login'); 
  };

  router.get('/movie-listing-page', (req, res) => {
    // Set default page and limit with validation
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;

    // Ensure page and limit are positive integers
    if (page < 1 || limit < 1) {
        return res.status(400).send('Page and limit must be positive integers.');
    }

    const options = {
        page,
        limit,
    };

    Movie.paginate({ adminId: req.session.adminId }, options)
        .then(result => {
            res.render('movieListingPage', { movies: result.docs, pagination: result });
        })
        .catch(error => {
            res.status(500).send('Internal Server Error');
        });
});

  router.get('/movie-add',isAuthenticated, function(req, res) {
    res.render('movieAdd', {error:null, success:null});
  });

module.exports = router;