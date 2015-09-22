function CSS(content, file){
    return !file.isMod ? content : fis.compile.extCss(content, function (m, comment, url, last, filter) {
        if (url) {
            var type = fis.compile.isInline(fis.util.query(url)) ? 'embed' : 'uri';
            url = resolve(url, file, '.css');
            if (m.indexOf('@') === 0) {
                if (type === 'embed') {
                    m = '@import url(' + url + ')' + last;
                } else {
                    m = '@import url(' + url + ')' + last;
                }
            } else {
                m = 'url(' + url + ')' + last;
            }
        } else if (filter) {
            m = 'src=' + resolve(filter, file, '.css');
        } else if (comment) {
            m = fis.compile.analyseComment(comment, function (m, prefix, value) {
                return prefix + resolve(value, file, '.css');
            });
        }
        return m;
    });
}
function JS(content, file){
    if(!file.isMod){
        return content;
    }
    content = parseJsAync(content, file);
    return fis.compile.extJs(content, function (m, comment, type, value) {
        if (type && value) {
            m = type + '(' + resolve(value, file, '.js') + ')';
        } else if (comment) {
            m = fis.compile.analyseComment(comment, function (m, prefix, value) {
                return prefix + resolve(value, file, ['.css']);
            });
        }
        return m;
    });
}
function HTML(content, file){
    return !file.isMod ? content : fis.compile.extHtml(content, function (m, $1, $2, $3, $4, $5, $6, $7, $8) {
        if ($1) { // <script>
            var embed;
            $1 = $1.replace(/(\s(?:data-)?src\s*=\s*)('[^']+'|"[^"]+"|[^\s\/>]+)/ig, function (m, prefix, value) {
                if (fis.compile.isInline(fis.util.query(value))) {
                    embed = resolve(value, file, '.js');
                    return '';
                } else {
                    return prefix + resolve(value, file, '.js');
                }
            });
            if (embed) {
                m = $1 + embed;
            } else if (!/\s+type\s*=/i.test($1) || /\s+type\s*=\s*(['"]?)text\/javascript\1/i.test($1)) {
                m = $1 + exports.JS($2, file);
            } else {
                m = $1 + exports.HTML($2, file);
            }
        } else if ($3) { // <style>
            m = $3 + exports.CSS($4, file);
        } else if ($5) { // <img|embed|audio|video|link|object|source>

        } else if ($6) {
            m = resolve($6, file);
        } else if ($7) {
            m = '<!--' + fis.compile.analyseComment($7, function (m, prefix, value) {
                return prefix + resolve(value, file, ['.css', '.js']);
            }) + $8;
        }
        return m;
    });
}

function trim(str) {
    return str ? str.replace(/(['"\s]|\?.+$)/g, '') : str;
}


var path = require('path');
var projectSource;
function resolve(id, ref, ext) {
    var originId = id;
    id = trim(id);
    if(projectSource === undefined){
        projectSource = fis.project.getSource();
    }
    // a.js
    if(id.match(/\.[a-z]+$/i)){
        return originId;
    }
    if(!ext){
        return originId;
    }
    ext = 'string' === typeof ext ? [ext] : ext;
    var subPath;
    for(var i =0 , strExt; i < ext.length; i++){
        strExt = ext[i];
        subPath = id + strExt;
        // /xx/xx/a.js
        if( id[0] === '/' && projectSource[subPath] ){
            return originId.replace(id, subPath);
        }
        // ./ || aa
        subPath = path.join(ref.subdirname , id + strExt);
        subPath = fis.util(subPath);
        if( projectSource[subPath] ){
            return originId.replace(id, subPath);
        }
        subPath = '/components/' + id + '/' + id + strExt;
        if(id.match(/\w+/) &&  projectSource[subPath] ){
            return originId.replace(id, subPath);
        }
    }
    return originId;
}


function parseJsAync(content, file){
    var reg = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|(\/\/[^\r\n\f]+|\/\*[\s\S]+?(?:\*\/|$))|\b(require\.async|require)\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|\[[\s\S]*?\])\s*/g;
    return content.replace(reg, function(m, comment, type, value){
        if(type){
            switch (type){
                case 'require.async':
                    var res = parseJsAsyncValue(file, value);
                    if (res.hasBrackets) {
                        m = 'require.async([' + res.values.join(', ') + ']';
                    } else {
                        m = 'require.async(' + res.values.join(', ');
                    }
                    break;
                case 'require':
                    break;
            }
        } else if (comment) {
           
        }
        return m;
    });
}
function parseJsAsyncValue(file, value){
    var hasBrackets = false;
    var values = [];
    value = value.trim().replace(/(^\[|\]$)/g, function(m, v) {
        if (v) {
            hasBrackets = true;
        }
        return '';
    });
    values = value.split(/\s*,\s*/);
    values = values.map(function(v) {
        var ret = resolve(v, file, '.js');
        return ret;
    });

    return {
        values: values,
        hasBrackets: hasBrackets
    };
}
exports.CSS = CSS;
exports.JS = JS;
exports.HTML = HTML;
