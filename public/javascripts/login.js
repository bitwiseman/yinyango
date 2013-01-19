/**
 * Login and register page script.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */

(function () {
    /** jsonRequest {{{
     * Simple ajax request expecting json in response.
     *
     * @param {String} url Destination url.
     * @param {String} method Method to send data.
     * @param {Object} data FormData Object to be sent by a POST.
     * @param {Function} callback Callback function.
     */
    function jsonRequest(url, method, data, callback) {
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
    }
    /*}}}*/
    function makeBinds() {
        var loginform =     document.getElementById('loginform'),
            registerform =  document.getElementById('registerform'),
            errorlogin =    document.getElementById('errorlogin'),
            errorexist =    document.getElementById('errorexist'),
            errorname =     document.getElementById('errorname'),
            regsuccess =    document.getElementById('regsuccess'),
            login =         document.getElementById('login'),
            register =      document.getElementById('register');

        loginform.addEventListener('submit', function () {
            errorlogin.style.display = 'none';
            jsonRequest('/login', 'POST', new FormData(this), function (data) {
                if (data) {
                    // Session is set, refresh the page.
                    window.location.href = '/';
                } else {
                    // Error message.
                    errorlogin.style.display = 'block';
                }
            });
        }, false);
        registerform.addEventListener('submit', function () {
            errorexist.style.display = 'none';
            errorname.style.display = 'none';
            regsuccess.style.display = 'none';
            jsonRequest('/register', 'POST', new FormData(this), function (data) {
                if (data.success) {
                    // Registration successfull.
                    regsuccess.style.display = 'block';
                } else if (data.error === 'name') {
                    errorname.style.display = 'block';
                } else if (data.error === 'exist') {
                    errorexist.style.display = 'block';
                }
            });
        }, false);

        login.addEventListener('click', function () {
            errorlogin.style.display = 'none';
            document.getElementById('register-scr').style.display = 'none';
            document.getElementById('login-scr').style.display = 'block';
            loginform.username.focus();
        }, false);
        register.addEventListener('click', function () {
            errorexist.style.display = 'none';
            errorname.style.display = 'none';
            regsuccess.style.display = 'none';
            document.getElementById('login-scr').style.display = 'none';
            document.getElementById('register-scr').style.display = 'block';
            registerform.username.focus();
        }, false);
    }

    function init() {
        var loginform = document.getElementById('loginform');

        makeBinds();
        // Show login screen.
        document.getElementById('login-scr').style.display = 'block';
        // Focus username.
        loginform.username.focus();
    }

    // Call init when DOM is loaded.
    document.addEventListener('DOMContentLoaded', init(), false);

}());
