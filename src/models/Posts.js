import MongoBase from '../lib/MongoBase';
import _ from 'lodash';
import Promise from 'bluebird';
import { Schema } from "mongoose";
import { getTimeStamp } from '../lib/TimeBase';

class PostsBase extends MongoBase{
    constructor(name, schema){
        super(name, schema);
    }
    /**
     *  將取回的文章列表寫入資料庫
     *  @params posts : 由FBManager取回的文章列表
     *  @params fans_id : 粉絲團ID
    * **/
    insertMultiPosts(posts, fans_id){
        let query =  _.map(posts, (post) => {
            let p = _.pick(post, 'message', 'link', 'full_picture', 'story', 'picture', 'from', 'comments');
            p.fans_id = fans_id;
            p.post_id = post.id;
            if(!_.isUndefined(post.comments)){
                p.comments = _.map(post.comments.data, (comment) => {
                    let c = _.pick(comment, 'from', 'message');
                    c.created_time = getTimeStamp(comment.created_time) * 1000;
                    return c;
                });
            }
            p.created_time = getTimeStamp(post.created_time) * 1000;
            return p;
        });
        query = _.uniq(query, 'post_id');
        return Posts.create(query);
    }
}
const Shared = new Schema({
    uid : {
        type : String
    },
    about : {
        type : String
    }
});
const Comment = new Schema({
    from : {
        name : {
            type : String
        },
        uid : {
            type : String
        }
    },
    message : {
        index : true,
        type : String
    },
    created_time : {
        type : Date
    }
});

let Posts = new PostsBase('posts', new Schema({
    message : {
        type : String
    },
    story : {
        type : String
    },
    initial : {
        type : Boolean,
        default : false
    },
    lock : {
        type : Boolean,
        default : false
    },
    from : {
        id : {
            type : String,
        },
        name : {
            type : String
        }
    },
    fans_id : {
        type : String,
    },
    link : {
        type : String,
    },
    shared : [Shared],
    picture : {
        type : String
    },
    full_picture : {
        type : String
    },
    likes_total : {
        type : Number,
        default : 0
    },
    comments_total : {
        type : Number,
        default : 0
    },
    post_id : {
        type : String,
        unique : true
    },
    comments : [Comment],
    nextpage : {
        type : String
    },
    tags : [
        {
            type : String
        }
    ],
    created_time : {
        type : Date,
    }
}));

export default Posts;
