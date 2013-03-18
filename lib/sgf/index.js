/**
 * Library to manipulate SGF files.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 */

var exec = require('child_process').exec;

/** build {{{
 * Build an sgf string from provided data.
 *
 * @param {Object} data: Game data.
 * @param {Function} callback: Callback.
 *
 * @return {String} Sgf string.
 */
exports.build = function (data, callback) {
    var branchs =   data[0][0].branchs,
        branch =    0,
        node =      0,
        marks =     {},
        sgf =       '',
        key,
        value,
        valuelen,
        prevfirstnode,
        i,
        j;

    /** getParentBranch {{{
     * Find the branch of which depends a given branch at a given node.
     *
     * @param {Object} data: Game data.
     * @param {Number} node: Node to check.
     * @param {Number} branch: Child branch.
     *
     * @return {Number} The parent branch.
     */
    function getParentBranch(data, node, branch) {
        var i;

        for (i = branch; i >= 0; i--) {
            if (data[node] !== undefined && data[node][i] !== undefined) {
                return i;
            }
        }
        return 0;
    }
    /*}}}*/

    while (branch < branchs) {
        sgf += '(';
        while (data[node] !== undefined &&
                data[node][branch] !== undefined) {
            j = 0;
            if (marks[node] === undefined) {
                for (i in data[node]) {
                    if (data[node].hasOwnProperty(i) &&
                            data[node - 1] !== undefined &&
                            getParentBranch(data, node - 1, i) === branch) {
                        j++;
                    }
                }
                if (j >= 1) {
                    sgf += '(';
                    prevfirstnode = node;
                    marks[node] = 1;
                }
            }
            sgf += ';';
            for (key in data[node][branch]) {
                if (data[node][branch].hasOwnProperty(key)) {
                    value = data[node][branch][key];
                    valuelen = value.length;
                    if (key !== 'branchs') {
                        sgf += key;
                        for (i = 0; i < valuelen; i++) {
                            sgf += '[' + value[i] + ']';
                        }
                    }
                }
            }
            node++;
        }
        branch++;
        // Get first node of next branch.
        for (i = 0; i <= node; i++) {
            if (data[i] !== undefined && data[i][branch] !== undefined) {
                node = i;
                break;
            }
        }
        if (branch === branchs) {
            node = 0;
        }
        if (node < prevfirstnode) {
            for (i in marks) {
                if (marks.hasOwnProperty(i) && i > node) {
                    for (j = 0; j < marks[i]; j++) {
                        sgf += ')';
                    }
                    delete marks[i];
                }
            }
            prevfirstnode = node;
        }
        sgf += ')';
    }
    callback(sgf);
};
/*}}}*/
/** parse {{{
 * Read sgf data and register keys/values, sorting the nodes (moves)
 * and branchs (variations).
 *
 * @param {String} sgf: Sgf data.
 * @param {Function} callback: Callback.
 *
 * @return {Object} JSON form of sgf.
 */
exports.parse = function (sgf, callback) {
    var sgfobj =        {},
        sgflen =        sgf.length,
        isescaped =     false,
        isvalue =       false,
        isstart =       true,
        branch =        -1,
        mark =          0,
        node =          -1,
        nodemark =      [-1],
        key =           '',
        prevkey =       '',
        value =         '',
        chr,
        i;

    for (i = 0; i < sgflen; i++) {
        chr = sgf.charAt(i);
        switch (chr) {
        case '\\': // Escape character.
            if (isescaped) {
                value += '\\';
                isescaped = false;
            } else {
                isescaped = true;
            }
            break;
        case '(': // Value, start of branch or mark ?
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
        case ')': // Value or end of branch ?
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
        case ';': // Value or new node ?
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
        case '[': // Value or start of value ?
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
        case ']': // Value or end of value ?
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
/*}}}*/
/** validate {{{
 * Check if a sgf file is valid with sgfc.
 *
 * @param {String} sgf: Path to sgf file.
 * @param {Function} callback: Callback if file is valid.
 */
exports.validate = function (sgf, callback) {
    exec('bin/sgfc -et ' + sgf + ' ' + sgf, function (error, stdout, stderr) {
        var check = stdout.replace(/\s+$/, '').slice(-2);

        if (error) {
            callback('[ERROR] Sgfc: ' + error);
        }
        if (stderr) {
            callback('[ERROR] Sgfc: ' + stderr);
        }

        if (check === 'OK') {
            callback(null, true);
        } else {
            callback(null, false);
        }
    });
};
/*}}}*/
