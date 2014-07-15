# strxml

Create xml with strings and concatenation.

## install

    npm install --save strxml

## api

* `tag(el, contents, attributes)`
* `tagClose(el, attributes)`
* `encode(str)`
* `attr(attributes)`

## example

```js

var tag = require('xmlstr').tag;

tag('Layer',
    tag('StyleName', 'style-' + i) +
    tag('Datasource',
        [
            ['type', 'ogr'],
            ['layer_by_index', '0'],
            ['driver', 'GeoJson'],
            ['string', JSON.stringify(feature.geometry)]
        ].map(function(a) {
            return tag('Parameter', a[1], [['name', a[0]]]);
        }).join('')), [
            ['name', 'layer-' + i],
            ['srs', WGS84]
        ]);
```
