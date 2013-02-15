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
yylog.lastmessage = '';         // Identifier of last message.
yylog.screen =      'login';    // Actual screen.
/* ajax {{{
 * Simple ajax request expecting json in response.
 *
 * @param {String} url Destination url.
 * @param {String} method Method to send data.
 * @param {Object} data FormData Object to be sent by a POST.
 * @param {Function} callback Callback function.
 */
yylog.ajax = function (url, method, data, callback) {
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
/* bindEvents {{{*/
yylog.bindEvents = function () {
    var loginform =         document.getElementById('loginform'),
        guestloginform =    document.getElementById('guestloginform'),
        registerform =      document.getElementById('registerform'),
        messageok =         document.getElementById('message-ok'),
        mlogin =            document.getElementById('m-login'),
        mregister =         document.getElementById('m-register');

    messageok.addEventListener('click', function () {
        document.getElementById(yylog.lastmessage).className = 'none';
        document.getElementById('messages').className = 'none';
    }, false);
    mlogin.addEventListener('click', function () {
        yylog.showScreen('login');
        loginform.username.focus();
    }, false);
    mregister.addEventListener('click', function () {
        yylog.showScreen('register');
        registerform.username.focus();
    }, false);
    loginform.addEventListener('submit', function () {
        var formdata = new FormData(this);
        yylog.ajax('/login', 'POST', formdata, function (data) {
            if (data.error === '') {
                // Session is set, refresh the page.
                window.location.href = '/';
            } else if (data.error === 'login') {
                yylog.showMessage('error', 'errorlogin');
            }
        });
    }, false);
    guestloginform.addEventListener('submit', function () {
        var formdata = new FormData(this);
        yylog.ajax('/guest', 'POST', formdata, function (data) {
            if (data.error === '') {
                // Session is set, refresh the page.
                window.location.href = '/';
            } else if (data.error === 'name') {
                yylog.showMessage('error', 'errorname');
            } else if (data.error === 'exist') {
                yylog.showMessage('error', 'errorexist');
            }
        });
    }, false);
    registerform.addEventListener('submit', function () {
        var formdata = new FormData(this);
        yylog.ajax('/register', 'POST', formdata, function (data) {
            if (data.error === '') {
                yylog.showMessage('success', 'regsuccess');
            } else if (data.error === 'name') {
                yylog.showMessage('error', 'errorname');
            } else if (data.error === 'exist') {
                yylog.showMessage('error', 'errorexist');
            } else {
                yylog.showMessage('error', 'error');
            }
        });
    }, false);
};
/*}}}*/
/* init {{{*/
yylog.init = function () {
    yylog.bindEvents();
    yylog.setScreenTop();
    yylog.showScreen('login');
    document.getElementById('loginform').username.focus();
};
/*}}}*/
/* setScreenTop {{{
 * Set screen top relatively to menu.
 */
yylog.setScreenTop = function () {
    var screens =   document.getElementsByClassName('screen'),
        nscreens =  screens.length,
        screentop = 0,
        i;

    screentop = document.getElementById('menu').offsetHeight;

    for (i = 0; i < nscreens; i++) {
        screens[i].style.top = screentop + 'px';
    }
};
/*}}}*/
/* showMessage {{{
 * Show a message on screen.
 *
 * @param {String} type Type of message (error, success, help).
 * @param {String} id   Identifier of element containing the message.
 */
yylog.showMessage = function (type, id) {
    var messages = document.getElementById('messages');

    yylog.lastmessage = id;
    document.getElementById(id).className = '';

    if (type === 'error') {
        messages.className = 'red';
    } else if (type === 'success') {
        messages.className = 'green';
    } else {
        messages.className = 'brown4';
    }
    document.getElementById('message-ok').focus();
};
/*}}}*/
/* showScreen {{{
 * Switch to another screen.
 *
 * @param {String} show Element reference to screen to show.
 */
yylog.showScreen = function (show) {
    document.getElementById(yylog.screen).classList.add('none');
    document.getElementById('m-' + yylog.screen).classList.remove('twhite');
    document.getElementById(show).classList.remove('none');
    document.getElementById('m-' + show).classList.add('twhite');
    yylog.screen = show;
};
/*}}}*/
/*}}}*/
// Call init when DOM is loaded.
document.addEventListener('DOMContentLoaded', yylog.init(), false);
