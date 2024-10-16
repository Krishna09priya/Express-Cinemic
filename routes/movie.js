var express = require('express');
var router = express.Router();
const User = require('../modals/userModel');
const Movie = require('../modals/movieModel');
const Subscription = require('../modals/subscriptionModel');
const Admin = require('../modals/adminModel');
const bcrypt = require('bcrypt');

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.adminId) {
      return next();
    }
    res.redirect('/login'); 
  };

  module.exports = {isAuthenticated};

  router.get('/movie-listing-page',isAuthenticated, (req, res) => {
    // Set default page and limit with validation
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;

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

router.get('/search-movie',isAuthenticated, async (req, res) => {
  const searchTerm = req.query.search;
  try {
    const movies = await Movie.find({
      title: { $regex: '^' + searchTerm, $options: 'i' } 
    });
    res.render('movieListingPage', { movies, pagination:null}); 
  } catch (error) {
    console.error(error);
  }
});

  router.get('/movie-add',isAuthenticated,function(req, res) {
    res.render('movieAdd', {error:null, success:null});
  });

  router.post('/movie-add',isAuthenticated,async (req, res) => {
    const { title,description,thumbnail,video } = req.body;
    try {
        const newMovie = new Movie({title,description,thumbnail,video });
        await newMovie.save();

        res.render('movieAdd', { success: 'Movie added successfully!', error:null });
    } catch (error) {
        res.render('movieAdd', { error: 'Something went wrong. Please try again.', success:null });
    }
});

router.get('/movie-update/:id',isAuthenticated, (req , res) =>{
  const movieId = req.params.id;
 Movie.findById(movieId).lean().then(movie =>{
      res.render('movieUpdate',{movie:movie,error: null})
  }).catch(error => {
      console.error(error);
    });
})

router.post('/movie-update/:id', isAuthenticated,(req, res) => {
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

  router.delete('/delete/:id',isAuthenticated, (req, res) => {
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

router.get('/movie-view/:id',isAuthenticated, (req , res) =>{
  const movieId = req.params.id;
 Movie.findById(movieId).lean().then(movie =>{
      res.render('movieView',{movie:movie,error: null})
  }).catch(error => {
      console.error(error);
    });
})

router.get('/change-password',isAuthenticated, (req, res) => {
  res.render('changePassword',{message:null}); 
});

router.post('/change-password',isAuthenticated, async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  try {
      if (newPassword !== confirmNewPassword) {
          return res.render('changePassword', { message: 'New password and confirmation do not match.' });
      }

      const adminId = req.session.adminId; 
      const admin = await Admin.findById(adminId);

      const isMatch = await bcrypt.compare(currentPassword, admin.password);
      if (!isMatch) {
          return res.render('changePassword', { message: 'Current password is incorrect.' });
      }

      admin.password = await bcrypt.hash(newPassword, 10);
      await admin.save();

      return res.render('changePassword', { message: 'Password updated successfully.' });
  } catch (error) {
      console.error(error);
  }
});


router.get('/view-count',isAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;  
  const limit = parseInt(req.query.limit) || 5;  
  const skip = (page - 1) * limit;  

  try {
    const totalMovies = await Movie.countDocuments();

    const movieViewCounts = await Movie.aggregate([
      {
        $project: {
          title: 1, 
          viewCount: { $size: { $ifNull: ["$watch_history", []] } }  
        }
      },
      { $skip: skip }, 
      { $limit: limit }  
    ]);

    const totalPages = Math.ceil(totalMovies / limit);  

    
    const pagination = {
      page: page,
      limit: limit,
      totalPages: totalPages
    };

    res.render('movieViewCount', {
      movies: movieViewCounts,
      pagination: pagination
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});

router.get('/movie-rating',isAuthenticated, async (req, res) => {
  const page = parseInt(req.query.page) || 1;  
  const limit = parseInt(req.query.limit) || 5;  
  const skip = (page - 1) * limit;  

  try {
    const totalMovies = await Movie.countDocuments();

    const movieRatingCounts = await Movie.aggregate([
      {
        $project: {
          title: 1, 
          averageRating: { $avg: "$rating.rating" } 
        }
      },
      { $skip: skip }, 
      { $limit: limit }  
    ]);

    const totalPages = Math.ceil(totalMovies / limit);  

    
    const pagination = {
      page: page,
      limit: limit,
      totalPages: totalPages
    };

    res.render('movieRatingReport', {
      movies: movieRatingCounts,
      pagination: pagination
    });
  } catch (error) {
    res.status(500).json({ error: 'An error occurred' });
  }
});


router.get('/revenue', isAuthenticated, async (req, res) => {
  try {
      const selectedYear = parseInt(req.query.year) || new Date().getFullYear();
      const startDate = new Date(`${selectedYear}-01-01`); 
      const endDate = new Date(`${selectedYear + 1}-01-01`); 

      const monthlyRevenue = await Subscription.aggregate([
        { 
          $unwind: "$user_subscriptions"  
        },
        { 
          $match: {
            "user_subscriptions.subscribedDate": { 
              $gte: startDate, 
              $lte: endDate 
            }
          } 
        },
        {
          $group: {
            _id: { month: { $month: "$user_subscriptions.subscribedDate" } },
            totalRevenue: { $sum: "$price" }  
          }
        },
        {
          $sort: { "_id.month": 1 } 
        }
      ]);

      console.log('monthlyRevenue',monthlyRevenue);
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const revenueByMonth = {};
      
      monthlyRevenue.forEach(revenue => {
          revenueByMonth[monthNames[revenue._id - 1]] = revenue.totalRevenue; 
      });
      console.log('revenueByMonth',revenueByMonth);
      res.render('monthlyRevenueReport', { revenueData: revenueByMonth, selectedYear }); 
  } catch (error) {
      console.error(error);
  }
});




module.exports = router;