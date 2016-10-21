import MongoBase from '../lib/MongoBase';
import { Schema } from "mongoose";

class TagBase extends MongoBase{
    constructor(name, schema){
        super(name, schema);
    }
}

let Tags = new TagBase('tags', new Schema({
    content : {
        type : String,
	unique : true,
        required : true
    },
    total : {
        type : Number,
        default : 1
    },
    created_time : {
        type : Date
    },
    post_id : [{
        type : String
    }]
}));

export default Tags;
