const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const watchHistorySchema = new Schema ({
    movie_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Movie',
        required:true
    },
    watchedDate:{
        type:Date,
        default:Date.now,
        required:true
    }
});

const watchLaterSchema = new Schema ({
    movie_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Movie',
        required:true
    }
});

const userSubscriptionSchema = new Schema ({
    subscription_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Subscription',
        required:true
    },
    subscribedDate:{
        type:Date,
        default:Date.now,
        required:true
    },
    validityTo:{
        type:Date,
        required:true
    }
});

const userSchema = new Schema({
    username: {
        type:String,
        required:[true, 'Username is required']
    },
    email: {
        type:String,
        required:[true, 'Email is required'],
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type:String,
        required:[true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
     createdDate: { 
        type: Date, 
        default: Date.now, 
        required: true },
    isBlocked: {
        type: Boolean,
        default: false
    },
    passwordResetToken:{
        type:String,
        default:null
    },
    tokenExpirationTime:{
        type:Date,
        default:null
    },
    isSubscribed:{
        type:Boolean,
        default:false
    },
    user_subscription:[userSubscriptionSchema],
    watch_history:[watchHistorySchema],
    watch_later:[watchLaterSchema]
    
});

userSchema.plugin(mongoosePaginate);

const User = mongoose.model('User', userSchema);

module.exports= User;