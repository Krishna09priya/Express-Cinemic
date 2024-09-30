const mongoose = require ('mongoose');
const Schema = mongoose.Schema;

const watchHistorySchema = new Schema({
    user_id:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    watchedDate:{
        type:Date,
        default:Date.now,
        required:true
    }
});

const ratingSchema = new Schema({
    user_id:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    rating: { 
        type: Number, 
        required: true, 
        min: 1, 
        max: 5 
    },
    ratedDate:{
        type:Date,
        default:Date.now,
        required:true
    }
});

const movieSchema = new Schema({
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    thumbnail:{
        type:String,
        required:true,
        validate: {
            validator: function(v) {
              return /^https?:\/\/[^\s$.?#].[^\s]*$/.test(v); // Simple URL validation regex
            },
            message: props => `${props.value} is not a valid URL!`
          }
    },
    video:{
        type:String,
        required:true,
        validate: {
            validator: function(v) {
              return /^https?:\/\/[^\s$.?#].[^\s]*$/.test(v); // Simple URL validation regex
            },
            message: props => `${props.value} is not a valid URL!`
          }
    },
    addedDate:{
        type:Date,
        default:Date.now
    },
    watch_history:[watchHistorySchema],
    rating:[ratingSchema]

});

const Movie = mongoose.model('Movie', movieSchema);
module.exports = Movie;

