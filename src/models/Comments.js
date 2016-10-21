import MongoBase from '../lib/MongoBase';
import { Schema } from "mongoose";

class CommentsBase extends MongoBase{
    constructor(name, schema){
        super(name, schema);
    }
}

let Comments = new CommentsBase('comment', new Schema({
    message : {
        type : String,
    },
    from : {
        uid : {
            type : String
        },
        name : {
            type : String
        }
    },
    created_time : {
        type : Date
    },
    post_id : {
        type : String,
        required : true
    },
}));

export default Comments;
