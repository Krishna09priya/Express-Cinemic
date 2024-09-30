var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../modals/userModel');
const Movie = require('../modals/movieModel');
const Subscription = require('../modals/subscriptionModel');

//common response structure
const commonResponse = (success, data, message) => {
  return {
    success: success,
    data: data || null,
    message: message
  };
};
//end......!

router.post('/signup',(req,res)=>{
    const {username, email, password}=req.body;

    const user = new User({username, email, password});
    const validationError = user.validateSync();
 
    if (validationError) {
      const message = Object.values(validationError.errors)[0].message;
      return res.status(400).json(commonResponse(false,null,message));
    }

    User.findOne({email})
    .then(existingUser=>{
        if(existingUser){
            return res.status(400).json(commonResponse(false,null,'Email already taken'));
        }
        return bcrypt.hash(password, 10);
    })
    .then(hashedPassword =>{
        const newUser = new User({username, email, password: hashedPassword});
        return newUser.save();
    })
    .then(()=> {
         return res.status(200).json(commonResponse(true,null,'Account created successfully'));
    })
    .catch(error =>{
         return res.status(500).json(commonResponse(false,null,'Internal server Error'));
    });
});

// for generating  secret key

const defaultSecretKey = crypto.randomBytes(32).toString('hex');

router.post('/login', (req, res) => {
    const { email, password } = req.body;
  
    User.findOne({ email })
      .then(user => {
        if (!user) {
          return res.status(400).json(commonResponse(false,null,'This email id is not registered'));
        }

        const { isBlocked } = user;
         if(isBlocked){
            return res.status(400).json(commonResponse(false,null,'You are currently blocked by admin'))
         }
  
        // Compare passwords asynchronously
        return bcrypt.compare(password, user.password)
          .then(isMatch => {
            if (!isMatch) {
              return res.status(400).json(commonResponse(false,null,'Email id or password is incorrect'));
            }

            const secret = process.env.JWT_SECRET || defaultSecretKey;
  
            const token = jwt.sign(
              { userId: user._id },
              secret, // Ensure you handle the secret correctly
              { expiresIn: '1h' }
            );
            const serializedData ={
              token:token,
            }

            return res.status(200).json(commonResponse(true, serializedData,'Successfully Logged In'));
          });
      })
      .catch(error => {
        return res.status(500).json(commonResponse(false,null,'Internal Server Error'));
      });
  });

  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
  
    try {
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(400).json(commonResponse(false,null,'This email id is not registered'));
      }
  
      const resetToken = crypto.randomBytes(20).toString('hex');
      user.passwordResetToken = resetToken;
      user.tokenExpirationTime = Date.now() + 3600000; // 1 hour
      await user.save();
  
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'krishnapriyaabhijune28@gmail.com', 
          pass: 'nybv ncyc osca cllh' 
        }
      });
  
      const mailOptions = {
        from: 'krishnapriyaabhijune28@gmail.com',
        to: user.email,
        subject: 'Password Reset',
        text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
          Please click on the following link, or paste this into your browser to complete the process:\n\n
          http://localhost:3001/reset-password/${resetToken}\n\n
          If you did not request this, please ignore this email and your password will remain unchanged.\n`
      };
  
      await transporter.sendMail(mailOptions);
      return res.status(200).json(commonResponse(true,null,'Reset link sent to your email'));
    } catch (error) {
      return res.status(500).json(commonResponse(false,null,'Internal server error'));
    }
  });
  
  router.post('/reset-password/:token', async (req, res) => {
    const { password } = req.body;
    const { token } = req.params;
  
    try {
      const user = await User.findOne({
        passwordResetToken: token,
        tokenExpirationTime: { $gt: Date.now() }
      });
  
      if (!user) {
        return res.status(400).json(commonResponse(false,null,'Link expired'));
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      user.passwordResetToken = null;
      user.tokenExpirationTime = null;
  
      await user.save();
      return res.status(200).json(commonResponse(true, null,'Password reset successfully'));
    } catch (error) {
      return res.status(500).json(commonResponse(false, null, 'Internal server error'));
    }
  });

//Middleware to check authorization
const authenticate = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
      return res.status(401).json(commonResponse(false,null,'Unauthorized'));
    }

    const token = authorizationHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json(commonResponse(false,null,'Unauthorized'));
    }

    const secret = process.env.JWT_SECRET || defaultSecretKey;

    const decoded = jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        return res.status(401).json(commonResponse(false,null,'Invalid token'));
      }
      return decoded;
    });
    
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json(commonResponse(false,null,'Unauthorized'));
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json(commonResponse(false,null,'Internal server error'));
  }
};

router.get('/movies', authenticate, async (req, res) => {
  const { search, page = 1, limit = 2 } = req.query; 
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  try {

    const searchQuery = search
      ? {
          title: { $regex: search, $options: 'i' }
        }
      : {};

    const movies = await Movie.aggregate([
      {
        $match: searchQuery
      },
      {
        $addFields: {
          cumulativeRating: {
            $avg: '$rating.rating'
          }
        }
      },
      {
        $project: {
          title: 1,
          thumbnail: 1,
          cumulativeRating: 1
        }
      },
      {
        $skip: (pageNumber - 1) * limitNumber
      },
      {
        $limit: limitNumber
      }
    ]);

    const totalMovies = await Movie.countDocuments(searchQuery);

    return res.status(200).json({
      success:true,
      movies,
      totalMovies,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalMovies / limitNumber)
    });
  } catch (error) {
    return res.status(500).json(commonResponse(false,null,'Internal server error'));
  }
});


router.post('/watch-later', authenticate, async (req, res) => {
  const { movie_id } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (user?.watch_later.some(entry => entry.movie_id.toString() === movie_id)) {
      return res.status(400).json(commonResponse(false,null,'Movie is already in Watch Later list'));
    }
    else{
    user.watch_later.push({ movie_id });
    await user.save();

    return res.status(200).json(commonResponse(true,null,'Movie successfully added to Watch Later'));
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json(commonResponse(false,null,'Internal server error'));
  }
});


router.get('/movie-detail-page/:movie_id', authenticate, async (req, res) => {
  const movie_id = req.params.movie_id; 

  try {
    const { isSubscribed } = req.user;
    if(!isSubscribed){
      return res.status(400).json(commonResponse(false,null,'Please subscribe a plan'))
   }
    const movie = await Movie.findById(movie_id);
    if (movie && movie!=null) {
      const serializedData = {
        title: movie.title,
        description: movie.description,
        thumbnail: movie.thumbnail,
        video: movie.video
      };
      return res.status(200).json(commonResponse(true, serializedData, 'Successfully found the movie.'));
    }
  } catch (error) {
    return res.status(200).json(commonResponse(true, null, 'Movie not found'));
  }
});


router.post('/watch-history', authenticate, async (req, res) => {
  const { movie_id } = req.body; 
  const userId = req.user._id; 

  try {
    const user = await User.findById(userId);
    const movie = await Movie.findById(movie_id);
    
    if (!user || !movie) {
      return res.status(404).json(commonResponse(false,null,'User or Movie not found'));
    }

    const userWatchHistoryUpdate = await User.updateOne(
      { _id: userId, 'watch_history.movie_id': { $ne: movie_id } },
      { $push: { watch_history: { movie_id } } }
    );

    const movieWatchHistoryUpdate = await Movie.updateOne(
      { _id: movie_id, 'watch_history.user_id': { $ne: userId } },
      { $push: { watch_history: { user_id: userId } } }
    );

    // Check if updates were made
    if (userWatchHistoryUpdate.modifiedCount === 0 && movieWatchHistoryUpdate.modifiedCount === 0) {
      return res.status(400).json(commonResponse(false,null, 'Movie is already in Watch history'));
    }

    return res.status(200).json(commonResponse(true,null,'Movie successfully added to Watch history'));
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json(commonResponse(false,null,'Internal server error'));
  }
});



router.post('/rating', authenticate, async (req, res) => {
  const { movie_id, rating } = req.body;

  try {
    const user_id = req.user._id;
    const movie = await Movie.findById(movie_id);

    if (movie?.rating.some(entry => entry.user_id.toString() === user_id.toString())) {
      return res.status(400).json(commonResponse(false,null,'You already rated the movie'));
    }
    else{
      movie.rating.push({ user_id,rating });
      await movie.save();

    return res.status(200).json(commonResponse(true,null,'Your rating successfully added'));
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json(commonResponse(false,null,'Internal server error'));
  }
});

router.get('/plans', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query; 
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const totalSubscriptions = await Subscription.countDocuments();

    const subscriptions = await Subscription.find()
      .skip((pageNumber - 1) * limitNumber) 
      .limit(limitNumber); 

    if (subscriptions.length > 0) {
      const serializedData = subscriptions.map(subscription => ({
        plan: subscription.plan,
        description: subscription.description,
        duration: subscription.duration,
        price: subscription.price
      }));

      return res.status(200).json({
        data: serializedData,
        totalSubscriptions, 
        currentPage: pageNumber, 
        totalPages: Math.ceil(totalSubscriptions / limitNumber) 
      });
    } else {
      return res.status(404).json({ message: 'No plans found' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


router.get('/plan-detail-page/:plan_id', authenticate, async (req, res) => {
  const plan_id = req.params.plan_id; 
  try {

      const subscription = await Subscription.findById(plan_id);
      
      if (subscription) {
        const serializedData = {
        plan: subscription.plan,
        detailedDescription: subscription.description,
        duration: subscription.duration,
        price: subscription.price
        };
        return res.status(200).json({ data: serializedData });
      } else {
        return res.status(404).json({ message: 'Plan not found' });
      }
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});


router.get('/subscription-status', authenticate, async (req, res) => {
  try {
    const userId = (req.user._id);

    // Find all subscriptions that have this user's ID in the user_subscriptions array
    const subscriptions = await Subscription.find({
      'user_subscriptions.user_id': userId
    });

    if (subscriptions.length === 0) {
      return res.status(400).json({ message: "You haven't purchased any plans yet." });
    }

    const userSubscriptions = subscriptions.flatMap(subscription => 
      subscription.user_subscriptions.filter(userSub => userSub.user_id.toString() === userId.toString())
    );

    const currentDate = new Date();

    const currentSubscriptions = userSubscriptions.filter(sub => new Date(sub.validityTo) > currentDate);
    const previousSubscriptions = userSubscriptions.filter(sub => new Date(sub.validityTo) <= currentDate);

   const serializedCurrent = currentSubscriptions.map(sub => {
      const subscriptionDetails = subscriptions.find(subscription => 
        subscription.user_subscriptions.some(userSub => userSub.user_id.toString() === userId.toString() && userSub._id.equals(sub._id))
      );

      return {
        plan: subscriptionDetails.plan,
        description: subscriptionDetails.description,
        duration: subscriptionDetails.duration,
        price: subscriptionDetails.price,
        subscribedDate: sub.subscribedDate,
        validityTo: sub.validityTo,
      };
    });

    const serializedPrevious = previousSubscriptions.map(sub => {
      const subscriptionDetails = subscriptions.find(subscription => 
        subscription.user_subscriptions.some(userSub => userSub.user_id.toString() === userId.toString() && userSub._id.equals(sub._id))
      );

      return {
        plan: subscriptionDetails.plan,
        description: subscriptionDetails.description,
        duration: subscriptionDetails.duration,
        price: subscriptionDetails.price,
        subscribedDate: sub.subscribedDate,
        validityTo: sub.validityTo,
      };
    });

    return res.status(200).json({
      currentPlans: serializedCurrent,
      previousPlans: serializedPrevious,
    });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});




router.put('/change-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id); 

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    
    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({ message: 'Password successfully changed' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});


router.get('/watch-later', authenticate, async (req, res) => {
  try {
    const userId = req.user._id; 

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { page = 1, limit = 10 } = req.query; 
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const movieIds = user.watch_later.map(entry => entry.movie_id);

    const movies = await Movie.find({ _id: { $in: movieIds } })
      .skip((pageNumber - 1) * limitNumber) 
      .limit(limitNumber); 

    const totalMovies = await Movie.countDocuments({ _id: { $in: movieIds } });

    const watchLaterMovies = movies.map(movie => {
      // Cumulative rating
      const cumulativeRating = movie.rating.length > 0
        ? movie.rating.reduce((sum, entry) => sum + entry.rating, 0) / movie.rating.length
        : 0; 

      return {
        title: movie.title,
        thumbnail: movie.thumbnail,
        cumulativeRating: cumulativeRating.toFixed(1),
      };
    });

    return res.status(200).json({
      watchLaterMovies,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalMovies / limitNumber), 
      totalMovies
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/watch-history', authenticate, async (req, res) => {
  try {
    const userId = req.user._id; 

    const { page = 1, limit = 10 } = req.query; 
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const watchHistoryEntries = user.watch_history;

    const movieIds = watchHistoryEntries.map(entry => entry.movie_id);

    const movies = await Movie.find({ _id: { $in: movieIds } })
      .sort({ 'watch_history.watchedDate': -1 }) 
      .skip((pageNumber - 1) * limitNumber) 
      .limit(limitNumber); 

    const totalMovies = await Movie.countDocuments({ _id: { $in: movieIds } });

    const data = movies.map(movie => {watchHistoryEntries.find(entry => entry.movie_id.toString() === movie._id.toString());

      return {
        title: movie.title,
        thumbnail: movie.thumbnail,
      };
    });

    return res.status(200).json({
      data,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalMovies / limitNumber), 
      totalMovies
    });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/watch-history/:movieId', authenticate, async (req, res) => {
  try {
    const userId = req.user._id; 
    const { movieId } = req.params; 

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.watch_history = user.watch_history.filter(entry => 
      entry.movie_id.toString() !== movieId.toString()
    );

    await user.save();

    return res.status(200).json({ message: 'Movie removed from watch history successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;

