import FB from 'fb';
import _ from 'lodash';
import config from '../../config';
import co from 'co';
import ErrorManager from './ErrorBase';
import { format, add, now, getTimeStamp } from '../lib/TimeBase';

export default class FBBase {
    constructor(appToken){
        this.getFans = this.getFans.bind(this);
        this.getLikesFans = this.getLikesFans.bind(this);
        this.fansDetail = this.fansDetail.bind(this);
        this.getOldComments = this.getOldComments.bind(this);
        this.appToken = appToken;
    }
    getToken(){
        return this.appToken;
    }
    getLikesFans(ID){
        const token = this.getToken();
        return new Promise((resolve, reject) => {
            FB.napi(`${ID}/likes`, {
                access_token : token,
                limit : 100
            }, (err, resp) => {
                if(err) reject(err);
                else resolve(resp);
            });
        });
    }
    /**
     *  @params ID : 文章的ID
     *  @params type : enum ["likes", "comments"]
     *      likes : 按讚數量
     *      comments : 留言數量
    * **/
    getPostTotal(ID, type){
        const token = this.getToken();
        return new Promise((resolve, reject) => {
            FB.napi(`${ID}/${type}`, {
                access_token : token,
                summary : true
            }, (err, resp) => {
                if(err) reject(err);
                else resolve(resp);
            });
        });
    }
    /**
     *  取回文章的Comment 100 筆
    * **/
    getComments(ID){
        const token = this.getToken();

        return new Promise((resolve, reject) => {
            FB.napi(`${ID}/comments`, {
                access_token : token,
                limit : 100
            },(err, resp) => {
                if(err){
                    reject(err);
                }else{
                    resolve(resp);
                }
            });
        });
    }
    /**
     *  取回所有舊的Comments
    * **/
    getOldComments(url){
        let _this = this;
        return co(function* (){
            const comments = yield _this.nextpage(undefined, url);

            if(comments.data.length === 100
                && !_.isUndefined(comments.paging)
                && !_.isUndefined(comments.paging.next)){
                let nextpage = yield _this.getOldComments(comments.paging.next);
                comments.data.map((comment, index) => {
                    nextpage.push(comment);
                });
                return nextpage;
            }else{
                return comments.data;
            }
        });
    }
    getAppToken(){
        return new Promise((resolve, reject) => {
            FB.api('oauth/access_token', {
                client_id : config.FB.appId,
                client_secret : config.FB.secret,
                grant_type: 'client_credentials'
            }, (res) => {
                if(!res || res.error){
                    reject(res.error);
                }else{
                    resolve(res);
                }
            });
        });
    }
    getPostContent(post){
        return _.pick(post, config.post_fields.split(','));
    }
    getOldPosts(fans_id, url){
        let _this = this;

        return co(function* (){
            let posts = yield _this.nextpage(fans_id, url);

            if(posts.data.length === 100
                && !_.isUndefined(posts.paging)
                && !_.isUndefined(posts.paging.next)){

                let nextpage = yield _this.getOldPosts(fans_id
                    , posts.paging.next);

                nextpage.map((p) => {
                    posts.data.push(p);
                });
                return posts.data;
            }else{
                return posts.data;
            }
        }).catch(ErrorManager.catchError);
    }
    nextpage(fans_id, url){
        return fetch(url)
        .then((resp) => {
            return resp.json();
        });
    }
    fansDetail(ID, options={}, callback){
        const token = this.getToken();
        options.access_token = token;
        FB.napi(`/${ID}`, options,callback);
    }
    getPosts(ID, options){
        const token = this.getToken();
        options.access_token = token;
        return new Promise((resolve, reject) => {
            FB.napi(`/${ID}/feed`, options, (err, resp) => {
                if(err){
                    reject(err);
                }else{
                    resolve(resp);
                }
            });
        });
    }
    /**
     * @params ID : 粉絲團ID
    * **/
    getFans(ID){
        const token = this.getToken();
        return new Promise((resolve, reject) => {
            FB.napi(`${ID}`, {
                access_token : token,
                fields : 'name'
            }, (err, data) => {
                if(err){
                    reject(err);
                }else{
                    resolve(data);
                }
            });
        });
    }
    /**
     * @params ID : 文章ID
    * **/
    getShared(ID){
        const token = this.getToken();
        return new Promise((resolve, reject) => {
            FB.napi(`${ID}/sharedposts`, {
                access_token : token,
                fields : 'id'
            }, (err, data) => {
                if(err){
                    reject(err);
                }else{
                    resolve(data);
                }
            });
        });
    }
    /**
     * @params ID : 粉絲團ID
     * @params start : 開始的timestamp
     * @params end : 結束的timestamp
    * **/
    getMoreDaysPosts(ID, start, end){
        const token = this.getToken();
        return new Promise((resolve, reject) => {
            const start_date = format(start);
            const end_date = format(end);
            FB.napi(`${ID}/feed`, {
                access_token : token,
                limit : 100,
                fields : config.post_fields,
                since : start_date,
                until : end_date
            }, (err, data) => {
                if(err){
                    reject(err);
                }else{
                    resolve(data);
                }
            });
        });
    }
    /**
     * @params ID : 粉絲團或會員ID
     * @params timestamp : 要取得某天的timestamp 或 字串(2015-11-12)
    * **/
    getSomeDayPosts(ID, timestamp){
        const token = this.getToken();
        timestamp = timestamp || now();
        return new Promise((resolve, reject) => {
            const start_date = format(timestamp);
            const end_date = format(add('1', 'days'));
            FB.napi(`${ID}/feed`, {
                access_token : token,
                limit : 100,
                fields : config.post_fields,
                since : start_date,
                until : end_date
            }, (err, data) => {
                if(err){
                    reject(err);
                }else{
                    resolve(data);
                }
            });
        });
    }
}


