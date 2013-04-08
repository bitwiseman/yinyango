module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: ';'
            },
            prod: {
                src: [
                        'public/js/socket.io.js',
                        'dev/js/closure.start.js',
                        'public/js/yygo*.js',
                        'dev/js/closure.end.js',
                ],
                dest: 'public/js/<%= pkg.name %>.js'
            }
        },
        sass: {
            dev: {
                files: {
                    'public/css/style.css': [
                        'dev/css/main.sass',
                        'dev/css/debug.sass'
                    ]
                }
            },
            prod: {
                options: {
                    style: 'compressed'
                },
                files: {
                    'public/css/style.css': 'dev/css/main.sass',
                }
            }
        },
        uglify: {
            prod: {
                files: {
                    'public/js/login.min.js': 'public/js/login.js',
                    'public/js/<%= pkg.name %>.min.js': [
                            '<%= concat.prod.dest %>'
                    ]
                }
            }
        },
        jshint: {
            options: {
                "indent": 4,
                "laxbreak": true,
                "maxlen": 80,
                "undef": true,
                "unused": true,
            },
            browser: {
                files: {
                    src: ['public/js/login.js', 'public/js/yygo*.js']
                },
                options: {
                    "browser": true,
                    "globalstrict": true,
                    globals: {
                        "gotools": true,
                        "io": true,
                        "yygo": true
                    }
                }
            },
            node: {
                files: {
                    src: ['app.js', 'lib/**/*.js']
                },
                options: {
                    "node": true,
                    globals: {
                        "userslist": true
                    }
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-sass');

    grunt.registerTask('default', ['jshint', 'sass:dev']);
    grunt.registerTask('prod', ['jshint', 'concat', 'uglify', 'sass:prod']);
};
