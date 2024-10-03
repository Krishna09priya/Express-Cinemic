var express = require('express');
var router = express.Router();
const { authenticate } = require('./movie');

/* GET users listing. */
router.get('/user-listing-page', function(req, res, next) {
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

    User.paginate({}, options)
        .then(result => {
            res.render('userListingPage', { users: result.docs, pagination: result });
        })
        .catch(error => {
            console.log(error);
        });
});

module.exports = router;
