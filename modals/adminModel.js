const mongoose = require ('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema ({
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    passwordResetToken:{
        type:String,
        default:null
    },
    tokenExpirationTime:{
        type:Date,
        default:null
    }

});

const Admin = mongoose.model('admin',adminSchema);
module.exports = Admin;