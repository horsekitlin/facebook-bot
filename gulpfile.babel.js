import gulp from 'gulp';
import server from 'gulp-develop-server';
gulp.task('default', () => {
    server.listen({
    env : {
        DEBUG : 'test'
    },
    path : './index.js',

    });
    gulp.watch('./src/**/**/**/*.js').on('change', function(err){
        server.restart();
    });
});
