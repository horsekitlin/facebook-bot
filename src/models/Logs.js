import MongoBase from '../lib/MongoBase';
import { Schema } from "mongoose";

class LogsBase extends MongoBase{
    constructor(name, schema){
        super(name, schema);
    }
}

/**
*   @params status : 是否成功
*       true : 成功
*       false : 失敗
*   @params type : 類型
*       sharedposts: 依照分享貼文搜尋粉絲團
*       addfans : 增加粉絲團
*       updated_posts : 更新貼文
*       initial_posts : 初始化貼文
* **/
let Logs = new LogsBase('log', new Schema({
    status : {
        type : Boolean,
        default : true,
        enums : [false, true]
    },
    type : {
        type : String
    },
    message : {
        type : String,
    },
    created_time : {
        type : Date
    },
    query : {},
    querys : [{}],
    result : {},
    results : [{}],
}));

export default Logs;
