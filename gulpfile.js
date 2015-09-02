var gulp		= require( 'gulp' )
	, less		= require( 'gulp-less' )
	, concat	= require( 'gulp-concat' )
	, gulpPrint	= require( 'gulp-print' );

var paths = {
	cssSrc: [
		'./src/**/*.less'
	]
	, cssDest: './dist/css/'
};

gulp.task( 'less', function() {

	return gulp.src( paths.cssSrc )
		.pipe( gulpPrint() )
		.pipe( less() )
		.pipe( concat( 'jb-relation-input.css' ) )
		.pipe( gulp.dest( paths.cssDest ) );

} );

gulp.task( 'watch', function() {

	gulp.watch( paths.cssSrc, [ 'less' ] );

} );

gulp.task( 'default', [ 'less', 'watch' ] );
