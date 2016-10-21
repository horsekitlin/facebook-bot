import _ from 'lodash';
import should from 'should';
import config from '../config';
import FBManager from '../../src/lib/FBBase';

export default {
    getPostsData : (done) => {
        FBManager.getPosts(config.user.fans_id, {fields:'message,created_time', limit:100})
        .then((resp) => {
            resp.should.have.property('data').with.length(100);
            resp.data.map((post) => {
                post.should.have.property('message');
                post.should.have.property('created_time');
            });
            done();
        }).catch(done);
    },
    getAppToken : (done) => {
        FBManager.getAppToken()
        .then((resp) => {
            const token = resp.access_token;
            if(_.isEmpty(token)){
                done(new Error('未取得App Token'));
            }else if(token !== '1724899327731863|3xTxBl1nku2nb60Di77bwSiVdo8'){
                done(new Error('App Token 錯誤'));
            }else {
                done();
            }
        }).catch(done);
    }
};
