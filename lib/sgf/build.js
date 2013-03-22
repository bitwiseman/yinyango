/**
 * Build an SGF string from provided data Object.
 *
 * @author   Mathieu Quinette <hickop@gmail.com>
 * @license  http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @link     https://github.com/hickop/yinyango
 *
 * @param {Object} data: Game data.
 * @param {Function} callback: Callback.
 *
 * @return {String} Sgf string.
 */
module.exports = function (data, callback) {
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
