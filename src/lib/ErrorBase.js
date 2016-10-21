/**
 * 集中並定義各種類型的Errors handler
 *
 * @params : RequestError : 輸入的Request Error
 *      欄位名稱錯誤
 *      缺少必要欄位
 *      輸入的type 錯誤
 *  EmptyData : 400 EmptyInput
 * **/
import co from 'co';
import { now } from './TimeBase';
import { Logs } from '../models';

class ErrorFactory{
    constructor(){
        this.name = "FacebookBot";
    }
    created(type, status, msg){
        let e = new Error();
        e.status = status;
        e.type = type;
        e.message = msg;
        e.created_time = now();
        return e;
    }
    EmptyError(type, msg){
        return this.created(type, 400, msg);
    }
    catchError(err){
console.log(err);
        if(err.status !== 400){
            err.status = false;
            err.created_time = now();
            return Logs.commit(err);
        }
    }
}

const ErrorManager = new ErrorFactory();

export default ErrorManager;
