var split = require('split');

module.exports = function(str) {
    return (str !== undefined) ?
        // sync
        str.toString()
            .split('\n')
            .map(format)
            .join('\n') :
        // stream
        split(function(d) {
            return format(d.toString()) + '\n';
        });
};

function format(str) {
    return str
        .replace(/^[\#]+\s+(.+)/, '\x1B[1m$1\x1B[22m')
        .replace(/\`(.+?)\`/g, '\x1B[36m$1\x1B[39m')
        .replace(/\*\*(.+?)\*\*/g, '\x1B[1m$1\x1B[22m')
        .replace(/__(.+?)__/g, '\x1B[3m$1\x1B[23m')
        .replace(/\*(.+?)\*/g, '\x1B[90m$1\x1B[39m');
}
