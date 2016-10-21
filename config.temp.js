export default {
    server : '',
    client : '',
    posts_limit : 100,
    post_fields : 'message,created_time,story,link,full_picture,comments,picture,from',
    mongodb : {
        server : 'localhost',
        port : 27017,
        dbname : 'fbbot',
    },
    shared_post : {
        //分享過某貼文粉絲團的時間區間
        unit : 'day',
        num : -60
    },
    FB : {
        appId : '1724899327731863',
        secret : '6332803ee65a913901e491bd020ae009',
    },
    mongosetting : {
        IP : 'locahost',
        name : 'fbbot'
    }
};
