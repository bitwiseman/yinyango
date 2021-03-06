module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: ['public/css', 'public/js'],
        concat: {
            options: {
                separator: ';'
            },
            prod: {
                src: [
                        'dev/js/socket.io.js',
                        'dev/js/closure.start.js',
                        'dev/js/yygo*.js',
                        'dev/js/closure.end.js',
                ],
                dest: 'public/js/<%= pkg.name %>.js'
            }
        },
        copy: {
            dev: {
                expand: true,
                cwd: 'dev/js',
                src: [
                        'socket.io.js',
                        'login.js',
                        'yygo*.js'
                ],
                dest: 'public/js/'
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
                    'public/js/login.js': 'dev/js/login.js',
                    'public/js/<%= pkg.name %>.js': [
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
                    src: ['dev/js/login.js', 'dev/js/yygo*.js']
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

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['clean', 'jshint', 'copy', 'sass:dev']);
    grunt.registerTask('prod', [
                       'clean',
                       'jshint',
                       'concat',
                       'uglify',
                       'sass:prod'
    ]);
};
