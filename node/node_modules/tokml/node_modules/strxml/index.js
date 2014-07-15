module.exports.attr = attr;
module.exports.tagClose = tagClose;
module.exports.tag = tag;
module.exports.encode = encode;

/**
 * @param {array} _ an array of attributes
 * @returns {string}
 */
function attr(_) {
    return (_ && _.length) ? (' ' + _.map(function(a) {
        return a[0] + '="' + a[1] + '"';
    }).join(' ')) : '';
}

/**
 * @param {string} el element name
 * @param {array} attributes array of pairs
 * @returns {string}
 */
function tagClose(el, attributes) {
    return '<' + el + attr(attributes) + '/>';
}

/**
 * @param {string} el element name
 * @param {string} contents innerXML
 * @param {array} attributes array of pairs
 * @returns {string}
 */
function tag(el, contents, attributes) {
    return '<' + el + attr(attributes) + '>' + contents + '</' + el + '>';
}

/**
 * @param {string} _ a string of attribute
 * @returns {string}
 */
function encode(_) {
    return (_ === null ? '' : _.toString()).replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
