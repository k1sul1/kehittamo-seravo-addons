

/*
 *
 * Gulpfile that handles bedrock-style project layouts.
 * Configure themes and plugins you are developing in gulp.config.js
 * See sample config. Omit the parts your project does not need, ie. fonts
 * This file can be left untouched when adding or removing themes/plugins.
 *
 */

// //////////////////////////////////////////////////////////////////////
//                              CONFIGS                               //
// //////////////////////////////////////////////////////////////////////

const CONFIGS = [require('./gulp.config')];
const APPS    = CONFIGS[0].apps;

// //////////////////////////////////////////////////////////////////////
//                            DEPENDENCIES                            //
// //////////////////////////////////////////////////////////////////////

const autoprefixer = require('gulp-autoprefixer');
const browserSync  = require('browser-sync').create();
const changed      = require('gulp-changed');
const collect      = require('gulp-rev-collector');
const cssNano      = require('gulp-clean-css');
const fs           = require('fs');
const del          = require('del');
const gulp         = require('gulp-help')(require('gulp'));
const gulpif       = require('gulp-if');
const imagemin     = require('gulp-imagemin');
const less         = require('gulp-less');
const merge        = require('merge-stream');
const notify       = require('gulp-notify');
const plumber      = require('gulp-plumber');
const rename       = require('gulp-rename');
const rev          = require('gulp-rev');
const runSequence  = require('run-sequence');
const sass         = require('gulp-sass');
const shell        = require('gulp-shell');
const sort         = require('gulp-sort');
const sourcemaps   = require('gulp-sourcemaps');
const uglify       = require('gulp-uglify');
const wpPot        = require('gulp-wp-pot');
const wpRev        = require('gulp-wp-rev');

// //////////////////////////////////////////////////////////////////////
//                             MAIN TASKS                             //
// //////////////////////////////////////////////////////////////////////

gulp.task('default', false, ['help']);

gulp.task('build', 'Clean, run pipelines and revision', () => {
  runSequence('_clean', '_styles', '_styleguide', '_js', '_img', '_fonts', '_videos', '_pot', '_rev');
});

gulp.task('serve', 'Spin up browser sync and start watching for changes', ['build', '_browser-sync'], () => {
  const stylesSrc = [];
  const jsSrc = [];
  const imgSrc = [];
  const fontsSrc = [];
  const phpSrc = [];
  const videoSrc = [];

  APPS.forEach((app) => {
    if (app.styles) {
      app.styles.src.forEach((src) => {
        stylesSrc.push(app.baseDir + src);
      });
    }
    if (app.js) {
      app.js.src.forEach((src) => {
        jsSrc.push(app.baseDir + src);
      });
    }
    if (app.img) {
      app.img.src.forEach((src) => {
        imgSrc.push(app.baseDir + src);
      });
    }
    if (app.fonts) {
      app.fonts.src.forEach((src) => {
        fontsSrc.push(app.baseDir + src);
      });
    }
    if (app.php) {
      app.php.src.forEach((src) => {
        phpSrc.push(app.baseDir + src);
      });
    }
    if (app.videos) {
      app.videos.src.forEach((src) => {
        videoSrc.push(app.baseDir + src);
      });
    }
  });

  gulp.watch(stylesSrc, ['_styles', '_styleguide']);
  gulp.watch(jsSrc, () => runSequence('_js', '_browser-sync-reload'));
  gulp.watch(imgSrc, () => runSequence('_img', '_browser-sync-reload'));
  gulp.watch(fontsSrc, () => runSequence('_fonts', '_browser-sync-reload'));
  gulp.watch(videoSrc, () => runSequence('_videos', '_browser-sync-reload'));
  gulp.watch(phpSrc, ['_browser-sync-reload']);
});

// //////////////////////////////////////////////////////////////////////
//                      CSS PROCESSING PIPELINE                       //
// //////////////////////////////////////////////////////////////////////

gulp.task('_styles', 'Build styles and compile out CSS', () => {
  const tasks = APPS.map((app) => {
    if (app.styles) {
      const SRC = app.styles.src.map(source => app.baseDir + source);
      const DEST = app.baseDir + app.buildLocations.css;

      return gulp.src(SRC)
      .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
      .pipe(changed(DEST))
      .pipe(sourcemaps.init())
      .pipe(gulpif('*.scss', sass()))
      .pipe(gulpif('*.less', less()))
      .pipe(autoprefixer())
      .pipe(gulpif(app.styles.minify, cssNano()))
      .pipe(gulpif(app.styles.minify, rename((path) => {
        path.basename += '.min';
      })))
      .pipe(gulpif(app.styles.sourcemaps, sourcemaps.write('.', {
        sourceroot: SRC,
      })))
      .pipe(gulp.dest(DEST))
      .pipe(browserSync.stream({ match: '**/*.css' }));
    }
  })
  .filter(stream => !!stream);

  return merge(tasks);
});

// //////////////////////////////////////////////////////////////////////
//                   JAVASCRIPT PROCESSING PIPELINE                   //
// //////////////////////////////////////////////////////////////////////

gulp.task('_js', 'Build JavaScript and move to distribute', () => {
  const tasks = APPS.map((app) => {
    if (app.js) {
      const SRC = app.js.src.map(source => app.baseDir + source);

      const DEST = app.baseDir + app.buildLocations.js;

      return gulp.src(SRC)
      .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
      .pipe(sourcemaps.init())
      .pipe(gulpif(app.js.minify, uglify()))
      .pipe(rename((path) => {
        path.basename += '.min';
      }))
      .pipe(sourcemaps.write())
      .pipe(gulp.dest(DEST));
    }
  })
  .filter(stream => !!stream);
  return merge(tasks);
});

// //////////////////////////////////////////////////////////////////////
//                     IMAGES PROCESSING PIPELINE                     //
// //////////////////////////////////////////////////////////////////////

gulp.task('_img', 'Compress and distribute images', () => {
  const tasks = APPS.map((app) => {
    if (app.img) {
      const SRC = app.img.src.map(source => app.baseDir + source);
      const DEST = app.baseDir + app.buildLocations.img;

      return gulp.src(SRC)
      .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
      .pipe(changed(DEST))
      .pipe(imagemin({
        progressive: true,
      }))
      .pipe(gulp.dest(DEST));
    }
  })
  .filter(stream => !!stream);
  return merge(tasks);
});

// //////////////////////////////////////////////////////////////////////
//                     FONTS PROCESSING PIPELINE                      //
// //////////////////////////////////////////////////////////////////////

gulp.task('_fonts', 'Copy fonts to build', () => {
  const tasks = APPS.map((app) => {
    if (app.fonts) {
      const SRC = app.fonts.src.map(source => app.baseDir + source);
      const DEST = app.baseDir + app.buildLocations.fonts;

      return gulp.src(SRC)
      .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
      .pipe(gulp.dest(DEST));
    }
  })
  .filter(stream => !!stream);

  return merge(tasks);
});

// //////////////////////////////////////////////////////////////////////
//                     VIDEOS PROCESSING PIPELINE                      //
// //////////////////////////////////////////////////////////////////////

gulp.task('_videos', 'Copy videos to build', () => {
  const tasks = APPS.map((app) => {
    if (app.videos) {
      const SRC = app.videos.src.map(source => app.baseDir + source);
      const DEST = app.baseDir + app.buildLocations.videos;

      return gulp.src(SRC)
      .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
      .pipe(gulp.dest(DEST));
    }
  })
  .filter(stream => !!stream);

  return merge(tasks);
});

// //////////////////////////////////////////////////////////////////////
//                             REVISIONS                              //
// //////////////////////////////////////////////////////////////////////

gulp.task('_rev', 'Revision styles and scripts', () => {
  const tasks = APPS.map((app) => {
    if (app.revisions) {
      const SRC = app.revisions.src.map(source => app.baseDir + source);
      const DEST = app.baseDir + app.revisions.dest;

      return gulp.src(SRC)
      .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
      .pipe(gulpif(
        fs.existsSync(app.baseDir + app.buildLocations.css + app.revisions.cssFile),
        wpRev({
          css: app.baseDir + app.buildLocations.css + app.revisions.cssFile,
          cssHandle: app.revisions.cssHandle,
          js: app.baseDir + app.buildLocations.js + app.revisions.jsFile,
          jsHandle: app.revisions.jsHandle,
        })))
        .pipe(gulp.dest(DEST));
    }
  })
  .filter(stream => !!stream);

  return merge(tasks);
});

// //////////////////////////////////////////////////////////////////////
//                                POT                                 //
// //////////////////////////////////////////////////////////////////////

gulp.task('_pot', 'Generate translation file', () => {
  const tasks = APPS.map((app) => {
    if (app.pot) {
      const SRC = app.pot.src.map(source => app.baseDir + source);
      const DEST = app.baseDir + app.pot.dest;

      return gulp.src(SRC)
      .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
      .pipe(sort())
      .pipe(wpPot({
        domain: app.pot.domain,
        package: app.pot.package,
        bugReport: app.pot.bugReport,
        lastTranslator: app.pot.lastTranslator,
        team: app.pot.team,
      }))
      .pipe(gulp.dest(DEST));
    }
  })
  .filter(stream => !!stream);

  return merge(tasks);
});

// //////////////////////////////////////////////////////////////////////
//                            BROWSERSYNC                             //
// //////////////////////////////////////////////////////////////////////

gulp.task('_browser-sync', 'Start up browser sync server', () => {
  if (CONFIGS[0].server.proxy) {
    browserSync.init({
      proxy: CONFIGS[0].server.proxy,
      port: CONFIGS[0].server.port,
      ui: {
        port: CONFIGS[0].server.ui.port,
      },
      notify: CONFIGS[0].server.notify,
      logFileChanges: false,
    });
  } else {
    browserSync.init({
      server: {
        baseDir: CONFIGS[0].server.baseDir,
      },
      logFileChanges: false,
    });
  }
});

gulp.task('_browser-sync-reload', 'Reload browsers connected to browser sync', () => {
  browserSync.reload();
});

// //////////////////////////////////////////////////////////////////////
//                             STYLEGUIDE                             //
// //////////////////////////////////////////////////////////////////////

gulp.task('_styleguide', 'Generate a Nucleus Styleguide from scss', () => {
  const tasks = APPS.map((app) => {
    const SRC = app.baseDir;

    if (app.styleGuide) {
      return gulp.src(SRC)
      .pipe(plumber({ errorHandler: notify.onError('Error: <%= error.message %>') }))
      .pipe(shell(`( cd ${SRC} ; node ../../../../node_modules/.bin/nucleus --config config.nucleus.json )`, {
        errorMessage: 'Nucleus Styleguide failed with: <%= error.message %>',
        quiet: true,
      }));
    }
  });
});

// //////////////////////////////////////////////////////////////////////
//                               CLEAN                                //
// //////////////////////////////////////////////////////////////////////

gulp.task('_clean', 'Clean by removing any compiled files', () => {
  const tasks = APPS.map((app) => {
    if (app.buildLocations && app.buildLocations.clean) {
      return del(app.baseDir + app.buildLocations.clean);
    }
  });
});
