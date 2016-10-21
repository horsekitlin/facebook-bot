import MongoBase from '../lib/MongoBase';
import { Schema } from "mongoose";

class FansBase extends MongoBase{
    constructor(name, schema){
        super(name, schema);
    }
}

let Fans = new FansBase('fans', new Schema({
    fans_id : {
        type : String,
        index : true,
        unique : true,
        required : true
    },
    logo : {
        type : String
    },
    cover : {
        type : String
    },
    type : {
        type : String,
        default : 'fans'
    },
    likes : {
        default : 0,
        type : Number
    },
    zip : {
        type : String
    },
    street : {
        type : String
    },
    emails : [{
        type : String
    }],
    about : {
        type : String
    },
    country : {
        type : String
    },
    city : {
        type : String
    },
    initial : {
        type : Boolean,
        default : false,
        enum : [true, false]
    },
    website : {
        type : String
    },
    link : {
        type : String
    },
    username : {
        type : String
    },
    days : {
        getnewposts : {
            type : Boolean,
            default : false,
            enum : [false, true]
        },
        sharedposts : {
            type : Boolean,
            default : false,
            enum : [false, true]
        },
        gettotal : {
            type : Boolean,
            default : false,
            enum : [false, true]
        },
    },
    lock : {
        type : Boolean,
        default : false
    },
    name : {
        type : String,
        index : true,
        required : true
    },
    nextpage : {
        type : String
    },
    created_time : {
        type : Date,
        required : true
    }
}));

export default Fans;
