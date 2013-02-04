/*
 * Login and register page script.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */
'use strict';
/* yylog {{{*/
var yylog = {};
/* jsonRequest {{{
 * Simple ajax request expecting json in response.
 *
 * @param {String} url Destination url.
 * @param {String} method Method to send data.
 * @param {Object} data FormData Object to be sent by a POST.
 * @param {Function} callback Callback function.
 */
yylog.jsonRequest = function (url, method, data, callback) {
    var xhr = new XMLHttpRequest();

    if (callback === undefined) {
        callback = data;
        data = null;
    }
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 &&
                (xhr.status === 200 || xhr.status === 0)) {
            callback(JSON.parse(xhr.responseText));
        }
    };

    xhr.open(method, url, true);
    xhr.send(data);
};
/*}}}*/
/* makeBinds {{{*/
yylog.makeBinds = function () {
    var loginform =     document.getElementById('loginform'),
        registerform =  document.getElementById('registerform'),
        errorlogin =    document.getElementById('errorlogin'),
        errorexist =    document.getElementById('errorexist'),
        errorname =     document.getElementById('errorname'),
        regsuccess =    document.getElementById('regsuccess'),
        login =         document.getElementById('login'),
        register =      document.getElementById('register');

    loginform.addEventListener('submit', function () {
        var formdata = new FormData(this);
        errorlogin.classList.add('none');
        yylog.jsonRequest('/login', 'POST', formdata, function (data) {
            if (data) {
                // Session is set, refresh the page.
                window.location.href = '/';
            } else {
                // Error message.
                errorlogin.classList.remove('none');
            }
        });
    }, false);
    registerform.addEventListener('submit', function () {
        var formdata = new FormData(this);
        errorexist.classList.add('none');
        errorname.classList.add('none');
        regsuccess.classList.add('none');
        yylog.jsonRequest('/register', 'POST', formdata, function (data) {
            if (data.success) {
                // Registration successfull.
                regsuccess.classList.remove('none');
            } else if (data.error === 'name') {
                errorname.classList.remove('none');
            } else if (data.error === 'exist') {
                errorexist.classList.remove('none');
            }
        });
    }, false);

    login.addEventListener('click', function () {
        errorlogin.classList.add('none');
        document.getElementById('register-scr').classList.add('none');
        document.getElementById('login-scr').classList.remove('none');
        loginform.username.focus();
    }, false);
    register.addEventListener('click', function () {
        errorexist.classList.add('none');
        errorname.classList.add('none');
        regsuccess.classList.add('none');
        document.getElementById('login-scr').classList.add('none');
        document.getElementById('register-scr').classList.remove('none');
        registerform.username.focus();
    }, false);
};
/*}}}*/
/* init {{{*/
yylog.init = function () {
    var loginform = document.getElementById('loginform');

    yylog.makeBinds();
    // Show login screen.
    document.getElementById('login-scr').classList.remove('none');
    // Focus username.
    loginform.username.focus();
};
/*}}}*/
/*}}}*/
// Call init when DOM is loaded.
document.addEventListener('DOMContentLoaded', yylog.init(), false);
