var express = require('express');
var router = express.Router();
const User = require('../modals/userModel');
const Movie = require('../modals/movieModel');
const Subscription = require('../modals/subscriptionModel');

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.adminId) {
      return next();
    }
    res.redirect('/login'); 
  };

  module.exports = isAuthenticated;

  router.get('/movie-listing-page', (req, res) => {
    // Set default page and limit with validation
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;

    // Ensure page and limit are positive integers
    if (page < 1 || limit < 1) {
        return res.send('Page and limit must be positive integers.');
    }

    const options = {
        page,
        limit,
    };

    Movie.paginate({}, options)
        .then(result => {
            res.render('movieListingPage', { movies: result.docs, pagination: result });
        })
        .catch(error => {
            res.status(500).send('Internal Server Error');
        });
});

  router.get('/movie-add',function(req, res) {
    res.render('movieAdd', {error:null, success:null});
  });

  router.post('/movie-add',async (req, res) => {
    const { title,description,thumbnail,video } = req.body;
    try {
        const newMovie = new Movie({title,description,thumbnail,video });
        await newMovie.save();

        res.render('movieAdd', { success: 'Movie added successfully!', error:null });
    } catch (error) {
        res.render('movieAdd', { error: 'Something went wrong. Please try again.', success:null });
    }
});

router.get('/movie-update/:id', (req , res) =>{
  const movieId = req.params.id;
 Movie.findById(movieId).lean().then(movie =>{
      res.render('movieUpdate',{movie:movie,error: null})
  }).catch(error => {
      console.error(error);
    });
})

router.post('/movie-update/:id', (req, res) => {
  const movieId = req.params.id;
  const { title,description,thumbnail,video} = req.body;

  const tempMovie = new Movie({ title,description,thumbnail,video});
  const validationError = tempMovie.validateSync();
  if (validationError) {
      res.render('movieUpdate', { movie: tempMovie, error: validationError.errors });
  } else {
      Movie.findByIdAndUpdate(
        movieId,
        { title,description,thumbnail,video }
      )
      .then(() => {
        res.redirect('/movie/movie-listing-page'); 
      })
      .catch(error => {
        console.log(error);
      });
    }
  })

  router.delete('/delete/:id', (req, res) => {
    const movieId = req.params.id;
    console.log("Deleting movie with ID:", movieId);

    Movie.findByIdAndDelete(movieId)
        .then(() => {
            const page = parseInt(req.query.page, 10) || 1; 
            const limit = parseInt(req.query.limit, 10) || 5; 

            const options = {
                page,
                limit,
            };
            return Movie.paginate({}, options);
        })
        .then(result => {
            res.render('movieListingPage', { movies: result.docs, pagination: result });
        })
        .catch(error => {
            console.error(error);
        });
});

router.get('/movie-view/:id', (req , res) =>{
  const movieId = req.params.id;
 Movie.findById(movieId).lean().then(movie =>{
      res.render('movieView',{movie:movie,error: null})
  }).catch(error => {
      console.error(error);
    });
})

module.exports = router;