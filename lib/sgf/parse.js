/**
 * Parse SGF string to return JSON Object.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 *
 * @param {String} sgf: SGF String.
 * @param {Function} callback: Callback.
 *
 * @return {Object} JSON data of game.
 */
module.exports = function (sgf, callback) {
    var sgfobj = {},
        sgflen = sgf.length,
        isescaped = false,
        isvalue = false,
        isstart = true,
        branch = -1,
        mark = 0,
        node = -1,
        nodemark = [-1],
        key = '',
        prevkey = '',
        value = '',
        chr,
        i;

    for (i = 0; i < sgflen; i++) {
        chr = sgf.charAt(i);
        switch (chr) {
        case '\\':
            // Escape character.
            if (isescaped) {
                value += '\\';
                isescaped = false;
            } else {
                isescaped = true;
            }
            break;
        case '(':
            // Value, start of branch or mark ?
            if (isvalue) {
                if (isescaped) {
                    value += '\\(';
                    isescaped = false;
                } else {
                    value += '(';
                }
            } else if (isstart) {
                branch++;
                node = nodemark[mark];
                isstart = false;
            } else {
                mark++;
                nodemark[mark] = node;
            }
            break;
        case ')':
            // Value or end of branch ?
            if (isvalue) {
                if (isescaped) {
                    value += '\\)';
                    isescaped = false;
                } else {
                    value += ')';
                }
            } else if (isstart) {
                mark--;
            } else {
                isstart = true;
            }
            break;
        case ';':
            // Value or new node ?
            if (isvalue) {
                if (isescaped) {
                    value += '\\;';
                    isescaped = false;
                } else {
                    value += ';';
                }
            } else {
                node++;
            }
            break;
        case '[':
            // Value or start of value ?
            if (isvalue) {
                if (isescaped) {
                    value += '\\[';
                    isescaped = false;
                } else {
                    value += '[';
                }
            } else {
                isvalue = true;
            }
            break;
        case ']':
            // Value or end of value ?
            if (isescaped) {
                value += ']';
                isescaped = false;
            } else {
                if (key === '') {
                    sgfobj[node][branch][prevkey].push(value);
                } else {
                    if (sgfobj[node] === undefined) {
                        sgfobj[node] = {};
                    }
                    if (sgfobj[node][branch] === undefined) {
                        sgfobj[node][branch] = {};
                    }
                    sgfobj[node][branch][key] = [];
                    sgfobj[node][branch][key].push(value);
                    prevkey = key;
                    key = '';
                }
                isvalue = false;
                value = '';
            }
            break;
        default:
            if (isvalue) {
                if (isescaped) {
                    value += '\\' + chr;
                    isescaped = false;
                } else {
                    value += chr;
                }
            } else if (chr !== '\n') {
                key += chr;
            }
        }
    }
    // Save total number of branchs in the tree root for later use.
    sgfobj[0][0].branchs = branch + 1;

    callback(sgfobj);
};
