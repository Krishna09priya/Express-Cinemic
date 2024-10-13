const mongoose = require ('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
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
        required:true
    },
    video:{
        type:String,
        required:true
    },
    addedDate:{
        type:Date,
        default:Date.now
    },
    watch_history:[watchHistorySchema],
    rating:[ratingSchema]

});

movieSchema.plugin(mongoosePaginate);

const Movie = mongoose.model('Movie', movieSchema);
module.exports = Movie;

