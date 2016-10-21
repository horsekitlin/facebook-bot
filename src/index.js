require('es6-promise').polyfill();
require('isomorphic-fetch');
import _ from 'lodash';
import config from '../config';
import co from 'co';
import ErrorManager from './lib/ErrorBase';
import CronTabClass from './lib/CronTab';
import FBManager from './lib/FBBase';
import { Fans, Posts, Comments, Logs, Tags } from './models';
import { now, add, getTimeStamp } from './lib/TimeBase';

const fields = config.post_fields;

let CronTab = new CronTabClass('1724899327731863|3xTxBl1nku2nb60Di77bwSiVdo8');
let GetPosts = new CronTabClass('538571709645250|L2vTTlj9KYDT1x8ORdClzYlHzek');
let GetTotal = new CronTabClass('462242820647777|x96UzOxkKmGp8IS1YzebnAdVurc');
let GetNewPosts = new CronTabClass('805734159538348|xncRH9eI0W190WG5jVZmoXbd9i4');
let GetComments = new FBManager('805734159538348|xncRH9eI0W190WG5jVZmoXbd9i4');

CronTab.createJob('*/15 * 4 * * * ', GetNewPosts.getNewPosts);
CronTab.createJob('*/30 * 0-5 * * * ', GetTotal.getTotal);
CronTab.createJob('* * * * * * ', GetTotal.getFansDetail);
CronTab.createJob('*/20 * 0-5 * * * ', CronTab.getLikeFans);
CronTab.createJob('*/20 * 0-5 * * * ', getAllPosts);
CronTab.createJob('0 0 0 * * * ', initial_all_value);
CronTab.createJob('*/15 * 0-5 * * * ', GetAllComments);
CronTab.createJob('*/15 * * * * * ', CheckTags);

/**
 *  @檢查message 的Tag
* **/
function CheckTags(){
    co(function * (){
        let posts = yield Posts.listAll({tags : null}, '-created_time', {
            skip : 0,
            limit : 1000,
            select : '_id message tags from'
        }), tags_rs = [], posts_rs = [], querys=[], index;
        for(index in posts.content){
            let post = posts.content[index];
	    post.tags = [];
            if(!_.isUndefined(post.message)){
                const tags = post.message.match(/#\w{0,50}/);
                if(!_.isNull(tags)){
                    if(tags[0] !== '#'){
                        const tag = tags[0].replace("#", "");
                        const oldtag = yield Tags.show({content : tag});
                        if(_.isNull(oldtag)){
                            const query = {
                                content : tag,
                                created_time : now(),
                                post_id : [post.id]
                            };
                            yield Tags.commit(query);
                            post.tags.push(tag);
                            posts_rs.push(post.syncSave());
                        }else{
                            if(_.isUndefined(oldtag.tags)){
                                oldtag.tags = [];
                            }
                            oldtag.total++;

                            oldtag.post_id.push(post.id);
                            post.tags.push(tag);
                            tags_rs.push(oldtag.syncSave());
                            posts_rs.push(post.syncSave());
                        }
                    }else{
                        post.tags = [];
                        posts_rs.push(post.syncSave());
                    }
                }else{
                    post.tags = [];
                    posts_rs.push(post.syncSave());
                }
            }else{
                post.tags = [];
                posts_rs.push(post.syncSave());
            }
        }
        yield tags_rs;
        yield posts_rs;

        console.log("done");
    }).catch((err) => {
        console.log(err);
    });
}
/**
 *  取回貼文的舊的Comments
* **/
function GetAllComments(){
    return co(function* (){
        let post = yield Posts.show({
            initial : false,
            lock : false
        });

        post.initial  = true;
        post.lock = true;
        yield post.syncSave();

        let comments = yield GetComments.getComments(post.post_id);
        if(comments.data.length === 100
            && !_.isUndefined(comments.paging)
            && !_.isUndefined(comments.paging.next)){
                const content = yield GetComments.getOldComments(comments.paging.next);
                content.map((comment) => {
                    comments.data.push(comment);
                });
        }
        comments.data = _.map(comments.data, (comment) => {
            let query = _.pick(comment, 'message');
            query.post_id = post.id;
            query.from = {
                name : comment.from.name,
                uid : comment.from.id
            };
            query.created_time = getTimeStamp(comment.created_time);
            return query;
        });

        yield Comments.create(comments.data);
        post.lock = false;
        post.syncSave();
    }).catch(ErrorManager.catchError);
}

/**
 *  初始化所有的設定
* **/
function initial_all_value(){
    co(function* (){
        yield Fans.update({},
            {"$set" : {
                "days.gettotal" : false,
                "days.getnewposts" : false,
                "days.sharedposts" : false
            }}, {multi : true});
    });
}
/**
 *  取回單一粉絲團所有的文章
* **/
function getAllPosts(){
    co(function* (){
        let fanspage = yield Fans.show({
            lock : false,
            nextpage : {
                "$ne" : 'done'
            }
        });
        fanspage.lock = true;
        yield fanspage.syncSave();

        if(!_.isNull(fanspage)){
            let posts = yield GetPosts.getPosts(fanspage.fans_id, {limit : 100,fields : fields });

            if(!_.isUndefined(posts.paging)
                    && !_.isUndefined(posts.paging.next)){

                    const content = yield GetPosts.getOldPosts(fanspage.fans_id
                        , posts.paging.next);
                    content.map((p) => {
                        posts.data.push(p);
                    });

                    const querys = _.chunk(_.uniq(_.map(posts.data, (post) => {
                        let c = GetPosts.getPostContent(post);
                        c.post_id = post.id;
                        c.fans_id = post.id.split('_')[0];
                        c.created_time = getTimeStamp(post.created_time);
                        return c;
                    }), 'post_id'), 5000);

                    fanspage.lock = false;
                    fanspage.nextpage = 'done';

                    yield _.map(querys, (query) => {
                        return Posts.create(query);
                    });
                    yield fanspage.syncSave();
                    yield Logs.commit({
                        type : 'addposts',
                        created_time : now(),
                        message : 'success',
                        querys : querys
                    });
            }
        }
    }).catch(ErrorManager.catchError);
}
