var test = require('tap').test,
    strxml = require('../');

test('tagClose', function(t) {
    t.equal(strxml.tagClose('hi'), '<hi/>');
    t.equal(strxml.tagClose('hi', [['true', 'true']]), '<hi true="true"/>');
    t.equal(strxml.tagClose('hi', [
        ['true', 'true'],
        ['sky', 'blue'],
    ]), '<hi true="true" sky="blue"/>');
    t.end();
});

test('tag', function(t) {
    t.equal(strxml.tag('hi', 'you'), '<hi>you</hi>');
    t.equal(strxml.tag('hi', 'you', [['no','yes']]), '<hi no="yes">you</hi>');
    t.end();
});
