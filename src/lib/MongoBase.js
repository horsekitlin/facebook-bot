import mongoose from 'mongoose';
import co from 'co';
import _ from 'lodash';
import Promise from 'bluebird';
import ErrorManager from './ErrorBase';
import config from '../../config';

export default class Collection{
    constructor(name, schema){
        const { server, port, dbname } = config.mongodb;
        this.lib = mongoose;
        this.db = mongoose.createConnection(`mongodb://${server}:${port}/${dbname}`);
        schema.methods.reload = function(){
            return this.model(name)
            .findOne({_id : this._id})
            .then((data) => {
                return data;
            });
        }

        schema.methods.syncSave = function(){
            return this.save();
        };

        this.model = this.db.model(name, schema);
    }
    ObjectId(str){
        if(_.isUndefined(str)){
            return mongoose.Types.ObjectId();
        }else{
            mongoose.Types.ObjectId(str);
        }
    }
    count(query={}){
        return new Promise((resolve, reject) => {
            this.model.find(query).count((err, count) => {
                if(err){
                    reject(err);
                }else{
                    resolve(count);
                }
            });
        }.bind(this));
    }
    show(query){
        return this.model
            .findOne(query);
    }
    showById(id){
        return new Promise(function(resolve, reject){
            this.model.findOne(
                {_id : id})
            .exec()
            .then((data) => {
                resolve(data);
            }, (err) => {
                reject(ErrorManager.GetDBSearchError('搜尋失敗'));
            });
        }.bind(this));
    }
    update(query, update, options={}){
        return this.model
        .update(
            query,
            update,
            options);
    }

    listAll(query = {}, sort='-created_time', options={}){
        let _this = this;
        return co(function* (){
            return {
                content : yield _this.model.find(query).skip(options.skip).limit(options.limit).select(options.select).sort(sort),
            };
        }).catch((err) => {
            throw err;
        });
    }
    list(query={}, sort='-created_time', select='_id created_time', options){
        return new Promise(function(resolve, reject){
            this.model
            .find(query)
            .select(select)
            .sort(sort)
            .exec()
            .then((err, data) => {
                if(err){
                    reject(err);
                }else{
                    if(_.isUndefined(options)){
                        var content = data;
                    }else{
                        var content = _.slice(data, options.skip, (options.skip + options.limit));
                    }
                    resolve({
                        content : content,
                        total : data.length
                    });
                }
            });
        }.bind(this));
    }
    kill(query){
        return new Promise(function(resolve, reject){
            this.model
            .remove(query)
            .then((err) => {
                resolve();
            }).catch(reject);
        });
    }
    clean(){
        return new Promise(function(resolve, reject){
            this.model
            .remove({})
            .then(() => {
                resolve();
            });
        }.bind(this));
    }
    create(query){
        return new Promise((resolve, reject) => {
            this.model.create(query, (err, data) => {
                if(err){
                    const code = parseInt(err.code);
                    if(code === 11000){
                    }else{
                        let err = ErrorManager.MongoDBCreatedError('', '建立資料錯誤');
                        err.querys = query;
                        reject(err);
                    }
                }else{
                    resolve(data);
                }
            });
        }.bind(this));
    }
    commit(query){
         return new Promise(function(resolve, reject){
            this.model(query)
            .save((err, data) => {
                if(err){
                    reject(err);
                }else{
                    resolve(data);
                }
            });
        }.bind(this));
    }
    pass(){
        return new Promise((resolve) => {
            resolve();
        });
    }
}
