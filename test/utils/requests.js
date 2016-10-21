import supertest from 'supertest';
import Promise from 'bluebird';
import should from 'should';
import app from '../../src';

let request = supertest.agent(app);

export default {
    sendPostRequest : (route, data) => {
        return new Promise((resolve, reject) => {
            request.post(route)
            .set('Content-Type', 'application/json')
            .send(data)
            .expect(200)
            .end((err, res) => {
                if(err){
                    reject(err);
                }else{
                    resolve(res);
                }
            });
        });
    },
    sendGetRequest : (route) => {
        return new Promise((resolve, reject) => {
            request.get(route)
            .set('Content-Type', 'application/json')
            .send(data)
            .expect(200)
            .end((err, res) => {
                if(err){
                    reject(err);
                }else{
                    resolve(res);
                }
            });
        });
    }
};
