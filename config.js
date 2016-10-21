export default {
    server : 'http://localhost:9999',
    client : 'http://localhost:9999',
    post_fields : 'message,created_time,story,link,full_picture,comments,picture,from',
    posts_limit : 100,
    shared_post : {
        unit : 'day',
        num : -60
    },
    mongodb : {
        server : 'localhost',
        port : 27017,
        dbname : 'fbbot',
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
