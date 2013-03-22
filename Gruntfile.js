module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                separator: ';'
            },
            dist: {
                src: [
                        'public/js/socket.io.js',
                        'dev/js/closure.start.js',
                        'public/js/yygo*.js',
                        'dev/js/closure.end.js',
                ],
                dest: 'public/js/<%= pkg.name %>.js'
            }
        },
        cssmin: {
            compress: {
                files: {
                    'public/css/style.min.css': ['public/css/style.css']
                }
            }
        },
        uglify: {
            dist: {
                files: {
                    'public/js/login.min.js': 'public/js/login.js',
                    'public/js/<%= pkg.name %>.min.js': [
                            '<%= concat.dist.dest %>'
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
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');

    grunt.registerTask('default', ['jshint']);
    grunt.registerTask('prod', ['jshint', 'concat', 'uglify', 'cssmin']);
};
