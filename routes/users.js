var express = require('express');
var router = express.Router();
const { isAuthenticated } = require('./movie');
const User = require('../modals/userModel');
const Movie = require('../modals/movieModel');
const Subscription = require('../modals/subscriptionModel');

/* GET users listing. */
router.get('/user-listing-page', function(req, res, next) {
  const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5;

    const options = {
        page,
        limit,
    };

    User.paginate({}, options)
        .then(result => {
            res.render('userListingPage', { users: result.docs, pagination: result });
        })
        .catch(error => {
            console.log(error);
        });
});

router.get('/search-user', async (req, res) => {
    const searchTerm = req.query.search;
    try {
      const users = await User.find({
        email: { $regex: '^' + searchTerm, $options: 'i' } 
      });
      res.render('userListingPage', { users, pagination:null }); 
    } catch (error) {
      console.error(error);
    }
  });
  

router.post('/toggle-block/:id', async (req, res) => {
    try {
        // Find the user by ID
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Toggle the isBlocked status
        user.isBlocked = !user.isBlocked;

        // Save the updated user
        await user.save();

        // Respond with success
        res.json({ success: true, isBlocked: user.isBlocked });
    } catch (error) {
        console.error('Error toggling user status:', error);
    }
});

router.get('/user-view/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);

    const { page = 1, watchPage = 1,limit = 2,watchLimit = 5 } = req.query; 
    const watchPageNumber = parseInt(watchPage, 10);
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const watchLimitNumber = parseInt(watchLimit, 10);

    // Find all subscriptions that have this user's ID in the user_subscriptions array
    const subscriptions = await Subscription.find({
      'user_subscriptions.user_id': userId
    });

    if (subscriptions.length === 0) {
      return res.render('userHistory', { 
        user,
        currentPlans:null,
        previousPlans:null,
        watchHistory:null,
        previousPagination:null,
        watchHistoryPagination:null,
        msg: `You haven't purchased any plans yet.`, 
        message:null
      });
    }

    const userSubscriptions = subscriptions.flatMap(subscription => 
      subscription.user_subscriptions.filter(userSub => userSub.user_id.toString() === userId.toString())
    );

    const currentDate = new Date();

    // Filter current and previous subscriptions
    const currentSubscriptions = userSubscriptions.filter(sub => new Date(sub.validityTo) > currentDate);
    const previousSubscriptions = userSubscriptions.filter(sub => new Date(sub.validityTo) <= currentDate);

    // Paginate previous subscriptions
    const totalPreviousSubscriptions = previousSubscriptions.length;
    const paginatedPreviousSubscriptions = previousSubscriptions
      .slice((pageNumber - 1) * limitNumber, pageNumber * limitNumber); // Slice for pagination

    const serializedCurrent = currentSubscriptions.map(sub => {
      const subscriptionDetails = subscriptions.find(subscription => 
        subscription.user_subscriptions.some(userSub => userSub.user_id.toString() === userId.toString() && userSub._id.equals(sub._id))
      );

      return {
        _id: subscriptionDetails._id,
        plan: subscriptionDetails.plan,
        subscribedDate: sub.subscribedDate.toISOString().split('T')[0],
      };
    });

    const serializedPrevious = paginatedPreviousSubscriptions.map(sub => {
      const subscriptionDetails = subscriptions.find(subscription => 
        subscription.user_subscriptions.some(userSub => userSub.user_id.toString() === userId.toString() && userSub._id.equals(sub._id))
      );

      return {
        _id: subscriptionDetails._id,
        plan: subscriptionDetails.plan,
        subscribedDate: sub.subscribedDate.toISOString().split('T')[0],
      };
    });

    // Watch history pagination
    const watchHistoryEntries = user.watch_history;
    if (watchHistoryEntries.length === 0) {
      res.render('userHistory', { 
        user,
        currentPlans:serializedCurrent,
        previousPlans: serializedPrevious,
        previousPagination: {
          page: pageNumber,
          totalPages: Math.ceil(totalPreviousSubscriptions / limitNumber),
          limit: limitNumber,
          totalDocs: totalPreviousSubscriptions,
        },
        watchHistory:null,
        watchHistoryPagination:null,
        message: `You haven't watched any movies yet.` ,
        msg:null
      });
    }
    const totalWatchHistory = watchHistoryEntries.length;
    
    const paginatedWatchHistory = watchHistoryEntries
      .slice((watchPageNumber - 1) * watchLimitNumber, watchPageNumber * watchLimitNumber);

    const movieIds = paginatedWatchHistory.map(entry => entry.movie_id);

    const movies = await Movie.find({ _id: { $in: movieIds } });

    const watchHistoryData = paginatedWatchHistory.map(entry => {
      const movie = movies.find(m => m._id.toString() === entry.movie_id.toString());

      return {
        _id: movie._id,
        title: movie.title,
        watchedDate: entry.watchedDate.toISOString().split('T')[0],
      };
    });
    res.render('userHistory', {
      user,
      currentPlans: serializedCurrent,
      previousPlans: serializedPrevious,
      watchHistory:watchHistoryData,
      previousPagination: {
        page: pageNumber,
        totalPages: Math.ceil(totalPreviousSubscriptions / limitNumber),
        limit: limitNumber,
        totalDocs: totalPreviousSubscriptions,
      },
      watchHistoryPagination: {
        watchPage: watchPageNumber,
        totalPages: Math.ceil(totalWatchHistory / watchLimitNumber),
        watchLimit: watchLimitNumber,
        totalDocs: totalWatchHistory,
      },
      msg:null,
      message:null
    });
  } catch (error) {
    console.error(error);
  }
});



//SUBSCRIPTIONS RELATED PAGE

router.get('/plan-listing-page', function(req, res, next) {
    const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 5;
  
      const options = {
          page,
          limit,
      };
  
      Subscription.paginate({}, options)
          .then(result => {
              res.render('planListingPage', { plans: result.docs, pagination: result });
          })
          .catch(error => {
              console.log(error);
          });
  });

router.get('/search-plan', async (req, res) => {
    const searchTerm = req.query.search;
    try {
      const plans = await Subscription.find({
        plan: { $regex: '^' + searchTerm, $options: 'i' } 
      });
      res.render('planListingPage', { plans, pagination: {} }); 
    } catch (error) {
      console.error(error);
    }
  });

  router.post('/toggle-enable/:id', async (req, res) => {
    try {
        const plan = await Subscription.findById(req.params.id);
        
        if (!plan) {
            return res.status(404).json({ success: false, message: 'Plan not found' });
        }

        // Toggle the isBlocked status
        plan.isEnabled = !plan.isEnabled;

        // Save the updated user
        await plan.save();

        // Respond with success
        res.json({ success: true, isEnabled: plan.isEnabled });
    } catch (error) {
        console.error('Error toggling plan status:', error);
    }
});


module.exports = router;
