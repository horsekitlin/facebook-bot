import Schedule from 'node-schedule';
import Promise from 'bluebird';
import _ from 'lodash';
import co from 'co';
import config from '../../config';
import FBBase from './FBBase';
import ErrorManager from './ErrorBase';
import { Fans, Posts, Logs, PrepareFans } from '../models';
import { now, getTimeStamp, add, format } from '../lib/TimeBase';


export default class CronTabClass extends FBBase {
    constructor(appToken){
        super(appToken);
        this.getLikeFans = this.getLikeFans.bind(this);
        this.getTotal = this.getTotal.bind(this);
        this.getFansDetail = this.getFansDetail.bind(this);
        this._addjob = Schedule.scheduleJob;
        this._jobs = [];
    }
    getFansDetail(){
        let fans_id;
        let _this = this;

        co(function* (){
            let fans = yield Fans.show({
                about : null
            });
            if(_.isNull(fans)){
                throw EmptyError('不需要抓取粉絲團詳情');
            }else{
                _this.fansDetail(fans.fans_id, {
                    fields : 'about,name,location,likes,emails,picture,cover,link,username,website'
                }, (err, resp) => {
                    if(err){
                        fans.type = 'group';
                        fans.save();
                    }else{
                        fans.name = resp.name;
                        fans.type = 'fans';
                        fans.link = resp.link;
                        fans.website = resp.website;
                        fans.username = resp.username;
                        fans.about = resp.about || '粉絲團無介紹';
                        fans.likes = resp.likes;
                        fans.cover = (_.isUndefined(resp.cover)) ? undefined : resp.cover.source;
                        fans.logo = resp.picture.data.url;
                        fans.emails = resp.emails || [];
                        if(!_.isUndefined(resp.location)){
                            fans.street = resp.location.street;
                            fans.zip = resp.location.zip;
                        }
                        fans.save();
                    }
                });
            }
        });
    }
    createJob(time, job){
        const newjob = this._addjob(time, job);
        this._jobs.push(newjob);
    }
    getLikeFans(){
        let _this = this;

        co(function* (){
            let query = [],
                newpages = [],
                new_ids = [],
                old_ids = [],
                pages = [],
                result = [],
                timestamp = now(),
                index;

            const fanspages = yield Fans.listAll({
                initial : false
            }, '-created_time', {skip : 0, limit : 10});

            pages = _.map(fanspages.content, (fanspage, index) => {
                old_ids.push(fanspage._id);
                return _this.getLikesFans(fanspage.fans_id);
            });

            const pages_rs = yield pages;

            pages_rs.map((page_rs) => {
                page_rs.data.map((f) => {
                    new_ids.push(f.id);
                });
            });
            const old_fanspages = yield Fans.listAll({
                fans_id : {
                    "$in" :  new_ids
                }
            }, '-created_time', {
                skip : 0,
                limit : new_ids.length,
                select : 'fans_id'
            });
            new_ids = _.chunk(_.difference(new_ids, _.map(old_fanspages.content, (f) => {
                return f.fans_id;
            })), 100);

            for(const index in new_ids){
                const new_id = new_ids[index];

                result.push(yield _.map(new_id, (ID, key) => {
                    return _this.getFans(ID);
                }));
            }

            result.map((data, index) => {
                data.map((new_f) => {
                    let query = {
                        fans_id : new_f.id,
                        created_time : timestamp,
                        name : new_f.name,
                    };
                    newpages.push(query);
                });
            });
            yield [
                Fans.create(newpages),
                Fans.update({_id : {
                    "$in" : old_ids
                }}, {
                    "$set" : {
                        initial : true
                    }
                }, {multi : true}),
                Logs.commit({
                    type : 'getLikesFans',
                    created_time : timestamp
                })
            ];
        }).catch((err) => {
            err.type = 'getLikesFans';
            ErrorManager.catchError(err)
        });
    }
    getTotal(){
        let _this = this;
        co(function* (){
            let index;
            let fanspages = yield Fans.listAll({
                initial : true,
                'days.gettotal' : false
            }, '-created_time', {skip : 0, limit : 30});
            let posts = [],
                posts_rs = [],
                Like_req = [],
                result = [],
                Comments_req = [],
                fanspage_rs = []
            let fans_ids = _.map(fanspages.content, (fanspage) => {
                return fanspage.fans_id;
            });

            yield Fans.update({
                fans_id : {
                    "$in" : fans_ids
                }
            }, {
                "$set":{
                    "days.gettotal" : true
                }
            }, {multi : true});

            posts = yield Posts.listAll({
                fans_id : {
                    "$in" : fans_ids
                },
                created_time : {
                    "$gte" : add(-7, 'days')
                }
            });
            posts.content.map((post) => {
                Like_req.push(_this.getPostTotal(post.post_id, 'likes'));
                Comments_req.push(_this.getPostTotal(post.post_id, 'comments'));
            });
            const Likes = yield Like_req,
                Comments = yield Comments_req;

            posts.content.map((post, index) => {
                const Like = Likes[index];
                const Cmt = Comments[index];
                post.likes_total = Like.summary.total_count;
                post.comments_total = Cmt.summary.total_count;
                result.push(post.syncSave());
            });

            yield fanspage_rs;
            yield result;
        }).catch(ErrorManager.catchError);
    }
    checkFans(){
        co(function* (){
            const P_fans = yield PrepareFans.listAll({
                status : false
            });
            if(P_fans.content.length < 1){
                throw ErrorManager.EmptyError("沒有需要檢查的粉絲團");
            }else{
                const ids = _.map(P_fans.content, (fans) => {
                    return fans.fans_id;
                });

                let oldfans = yield Fans.listAll({
                    fans_id : {
                        "$in" : ids
                    }
                });
                const old_ids = _.map(oldfans.content, (f) => {
                    return f.fans_id;
                });
                const newfans = _.difference(ids, old_ids);

                const result = yield PrepareFans.update({status : false}, {"$set":{status:true}}, {multi:true});

                if(newfans.length < 1){
                    throw ErrorManager.EmptyError('沒有增加新的粉絲團');
                }else{
                    const timestamp = now();

                    let query = [];

                    for(var index in newfans){
                        const fans_detail = yield this.getFans(newfans[index]);
                        query.push({
                            fans_id : fans_detail.id,
                            name : fans_detail.name,
                            about : fans_detail.about,
                            created_time : timestamp
                        });
                    }

                    const new_fans = yield Fans.create(query);
                }
            }
        }).catch(ErrorManager.catchError);
    }
    initialFans(){
        let _this = this;
        co(function* (){
            const timestamp = now();
            let fans = yield Fans.show({
                initial : false
            });
            if(_.isNull(fans)){
                throw ErrorManager.EmptyError('沒有需要initial 的粉絲團');
            }else{
                const fanspage = yield _this.fansdetail(fans.fans_id, 'about,likes,location,emails');
                fans.initial = true;
                const newfans = yield fans.syncSave();
                return newfans;
            }
        }).catch(ErrorManager.catchError);
    }
    initialFansStatus(){
        co(function* (){
            yield Fans.update({}, {"$set":{
                "days.sharedposts" : false
            }}, {muiti:true});
        });
    }
    getSharedFans(){
        const end = now();
        const start = add(config.shared_post.num, config.shared_post.unit);
        const type = 'sharedposts';
        co(function* (){
            let fanspage = yield Fans.show({
                "days.sharedposts" : false
            });
            if(_.isNull(fanspage)){
                throw ErrorManager.EmptyError('已無其他粉絲團需要查詢');
            }else{
                fanspage.days.sharedposts = true;
                fanspage = yield fanspage.syncSave();
                const posts = yield this.getMoreDaysPosts(fanspage.fans_id, start, end);
                const ids = _.map(posts.data, (post) => {
                    return post.id;
                });

                let existposts = yield Posts.listAll({
                    post_id : {
                        "$in" : ids
                    }
                }, '-created_time', {
                    skip : 0,
                    limit : 100
                });
                let new_ids = [];
                for(var index in existposts.content){
                    const post = existposts.content[index];
                    let newfans = yield this.getShared(post.post_id);

                    if(newfans.data.length > 0){
                        let ids = [];

                        for(const key in newfans.data){
                            let f = newfans.data[key];
                            const f_id = f.id.split('_')[0];
                            const p_fans = yield PrepareFans.show({ fans_id : f_id });
                            if(_.isNull(p_fans)){
                                ids.push(f_id);
                            }
                        }
                        new_ids = _.union(new_ids, _.compact(ids));
                    }
                }
                const query = _.map(new_ids, (f_id) => {
                    return {
                        fans_id : f_id,
                        created_time : end,
                    };
                });
                const result = yield PrepareFans.create(query);
            }
        }).catch(ErrorManager.catchError);
    }

    getNextPage(fans_id, nextpage){
        co(function* (){
            let fanspage = yield Fans.show({
                nextpage : {
                    '$ne' : null
                },
                lock : false
            });
            if(_.isNull(fanspage)){
                throw ErrorManager.EmptyError('沒有粉絲團需要更新');
            }else{
                fanspage.lock = true;
                fanspage = yield fanspage.syncSave();
                const nextpage = yield this.nextpage(fanspage.fans_id, fanspage.nextpage);
                if(nextpage.data.length < 1){
                    fanspage.nextpage = null;
                    fanspage.lock = false;
                    fanspage = yield fanspage.syncSave();
                    throw ErrorManager.EmptyError('已無舊文章');
                }else if(nextpage.data.length < config.posts_limit){
                    fanspage.nextpage = null;
                }else{
                    fanspage.nextpage = nextpage.paging.next;
                }
                const newposts = yield Posts.insertMultiPosts(nextpage.data, fanspage.fans_id);
                fanspage.lock = false;
                fanspage = yield fanspage.syncSave();
            }
        }).catch(ErrorManager.catchError);
    }
    getNewPosts(){
        let _this = this;
        co(function* (){
            let result = [],
                posts = [],
                post_ids = [],
                repeat_ids = [],
                querys = [];

            const fanspages = yield Fans.listAll({
                initial : true,
                "days.getnewposts" : false
            }, "-created_time", {
                skip : 0, limit : 50
            }),
            since = add(-1, 'days').format(),
            until = now().format();

            let fans_ids = _.map(fanspages.content, (fanspage, index) => {
                result.push(_this.getPosts(fanspage.fans_id, {
                    since : since,
                    until : until,
                    fields : config.post_fields,
                    limit : 100
                }));
                return fanspage.fans_id;
            });

            posts = yield result;

            posts.map((resp) => {
                resp.data.map((post) => {
                    let query = _this.getPostContent(post);
                    post_ids.push(post.id);
                    query.post_id = post.id;
                    query.created_time = getTimeStamp(post.created_time);
                    query.fans_id = post.id.split('_')[0];
                    querys.push(query);
                });
            });

            querys = _.uniq(querys, 'post_id');

            const repeat_post = yield Posts.listAll({
                post_id : {
                    "$in" : post_ids
                }
            });

            querys = _.filter(_.uniq(querys, 'post_id'), (query) => {
                const rs = _.find(repeat_post.content, (p) => {
                    return query.post_id === p.post_id;
                });
                return _.isUndefined(rs);
            });
            repeat_ids = _.map(repeat_post.content, (p) => {
                return p.post_id
            });

            yield Posts.create(querys);

            yield Fans.update({
                fans_id : {
                    "$in" : fans_ids
                }
            }, {
                "days.getnewposts" : true
            }, {
                multi : true
            });
        }).catch(ErrorManager.catchError);
    }
    saveSomeDayPosts(ID, timestamp=now()){
        co(function* (){
            let posts = yield this.getSomeDayPosts(ID, timestamp);
            const result = yield Posts.insertMultiPosts(posts.data, ID);
        });
    }
    /**
     * @params posts取回的文章
    * **/
    saveMorePosts(posts, fans_id){
        let result = [];
        _.map(posts.data, (post) => {
            Posts.show({post_id : post.id})
            .then((p) => {
                if(_.isNull(p)){
                    let query = _.pick(post, 'message', 'link', 'full_picture', 'picture', 'from');
                    query.created_time = getTimeStamp(post.created_time) * 1000;
                    query.post_id = post.id;
                    query.fans_id = post.from.id;
                    if(!_.isUndefined(post.comments)){
                        query.comments = _.map(post.comments.data, (comment) => {
                            let newcomment = _.pick(comment, 'from', 'message');
                            newcomment.created_time = getTimeStamp(comment.created_time) * 1000;
                            return newcomment;
                        });
                        if(!_.isUndefined(post.comments.paging.next)){
                            query.next = post.comments.paging.next;
                        }
                    }
                    result.push(Posts.commit(query));
                }
            }).catch(ErrorManager.catchError);
        });
        return result;
    }
}

