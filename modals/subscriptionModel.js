const mongoose = require ('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const Schema = mongoose.Schema;

const userSubscriptionSchema = new Schema ({
    user_id:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    subscribedDate:{
        type:Date,
        default:Date.now
    },
    validityTo:{
        type:Date,
        required:true
    }

});

const subscriptionSchema = new Schema ({
    plan:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    detailedDescription:{
        type:String,
        required:true
    },
    duration:{
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    isEnable:{
        type:Boolean,
        default:true
    },
    createdDate:{
        type:Date,
        default:Date.now
    },
    user_subscriptions:[userSubscriptionSchema]

});

subscriptionSchema.plugin(mongoosePaginate);

const Subscription = mongoose.model('Subscription',subscriptionSchema);
module.exports = Subscription;