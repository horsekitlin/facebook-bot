import FBManagerTest from './spec/FBManager';
import { Fans, Posts } from '../src/models';

describe('#Clean All Database', () => {
    it('#shoud 清除所有Database', (done) => {
        Fans.clean();
        Posts.clean();
        done();
    });
});

describe('#FaceBook Manager', () => {
    it('#should get app Token', FBManagerTest.getAppToken);

    it('should 由url取得粉絲團的id和name並且寫入DB', (done) => {
        done();
    });

    it('should 取回一百筆的粉絲團貼文', FBManagerTest.getPostsData);

    it('should 取回貼文的comments', (done) => {
        done();
    });
    it('should 取回粉絲團列表', (done) => {
        done();
    });
});
