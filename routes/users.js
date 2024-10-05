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

    // Ensure page and limit are positive integers
    if (page < 1 || limit < 1) {
        return res.send('Page and limit must be positive integers.');
    }

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
        res.status(500).json({ success: false, message: 'Error updating status' });
    }
});


module.exports = router;
