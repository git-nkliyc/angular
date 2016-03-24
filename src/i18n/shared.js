'use strict';var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var parse_util_1 = require('angular2/src/compiler/parse_util');
var html_ast_1 = require('angular2/src/compiler/html_ast');
var lang_1 = require('angular2/src/facade/lang');
var message_1 = require('./message');
var I18N_ATTR = "i18n";
var I18N_ATTR_PREFIX = "i18n-";
/**
 * An i18n error.
 */
var I18nError = (function (_super) {
    __extends(I18nError, _super);
    function I18nError(span, msg) {
        _super.call(this, span, msg);
    }
    return I18nError;
})(parse_util_1.ParseError);
exports.I18nError = I18nError;
// Man, this is so ugly!
function partition(nodes, errors) {
    var res = [];
    for (var i = 0; i < nodes.length; ++i) {
        var n = nodes[i];
        var temp = [];
        if (_isOpeningComment(n)) {
            var i18n = n.value.substring(5).trim();
            i++;
            while (!_isClosingComment(nodes[i])) {
                temp.push(nodes[i++]);
                if (i === nodes.length) {
                    errors.push(new I18nError(n.sourceSpan, "Missing closing 'i18n' comment."));
                    break;
                }
            }
            res.push(new Part(null, null, temp, i18n, true));
        }
        else if (n instanceof html_ast_1.HtmlElementAst) {
            var i18n = _findI18nAttr(n);
            res.push(new Part(n, null, n.children, lang_1.isPresent(i18n) ? i18n.value : null, lang_1.isPresent(i18n)));
        }
        else if (n instanceof html_ast_1.HtmlTextAst) {
            res.push(new Part(null, n, null, null, false));
        }
    }
    return res;
}
exports.partition = partition;
var Part = (function () {
    function Part(rootElement, rootTextNode, children, i18n, hasI18n) {
        this.rootElement = rootElement;
        this.rootTextNode = rootTextNode;
        this.children = children;
        this.i18n = i18n;
        this.hasI18n = hasI18n;
    }
    Object.defineProperty(Part.prototype, "sourceSpan", {
        get: function () {
            if (lang_1.isPresent(this.rootElement))
                return this.rootElement.sourceSpan;
            else if (lang_1.isPresent(this.rootTextNode))
                return this.rootTextNode.sourceSpan;
            else
                return this.children[0].sourceSpan;
        },
        enumerable: true,
        configurable: true
    });
    Part.prototype.createMessage = function (parser) {
        return new message_1.Message(stringifyNodes(this.children, parser), meaning(this.i18n), description(this.i18n));
    };
    return Part;
})();
exports.Part = Part;
function _isOpeningComment(n) {
    return n instanceof html_ast_1.HtmlCommentAst && lang_1.isPresent(n.value) && n.value.startsWith("i18n:");
}
function _isClosingComment(n) {
    return n instanceof html_ast_1.HtmlCommentAst && lang_1.isPresent(n.value) && n.value == "/i18n";
}
function isI18nAttr(n) {
    return n.startsWith(I18N_ATTR_PREFIX);
}
exports.isI18nAttr = isI18nAttr;
function _findI18nAttr(p) {
    var i18n = p.attrs.filter(function (a) { return a.name == I18N_ATTR; });
    return i18n.length == 0 ? null : i18n[0];
}
function meaning(i18n) {
    if (lang_1.isBlank(i18n) || i18n == "")
        return null;
    return i18n.split("|")[0];
}
exports.meaning = meaning;
function description(i18n) {
    if (lang_1.isBlank(i18n) || i18n == "")
        return null;
    var parts = i18n.split("|");
    return parts.length > 1 ? parts[1] : null;
}
exports.description = description;
function messageFromAttribute(parser, p, attr) {
    var expectedName = attr.name.substring(5);
    var matching = p.attrs.filter(function (a) { return a.name == expectedName; });
    if (matching.length > 0) {
        var value = removeInterpolation(matching[0].value, matching[0].sourceSpan, parser);
        return new message_1.Message(value, meaning(attr.value), description(attr.value));
    }
    else {
        throw new I18nError(p.sourceSpan, "Missing attribute '" + expectedName + "'.");
    }
}
exports.messageFromAttribute = messageFromAttribute;
function removeInterpolation(value, source, parser) {
    try {
        var parsed = parser.splitInterpolation(value, source.toString());
        if (lang_1.isPresent(parsed)) {
            var res = "";
            for (var i = 0; i < parsed.strings.length; ++i) {
                res += parsed.strings[i];
                if (i != parsed.strings.length - 1) {
                    res += "<ph name=\"" + i + "\"/>";
                }
            }
            return res;
        }
        else {
            return value;
        }
    }
    catch (e) {
        return value;
    }
}
exports.removeInterpolation = removeInterpolation;
function stringifyNodes(nodes, parser) {
    var visitor = new _StringifyVisitor(parser);
    return html_ast_1.htmlVisitAll(visitor, nodes).join("");
}
exports.stringifyNodes = stringifyNodes;
var _StringifyVisitor = (function () {
    function _StringifyVisitor(_parser) {
        this._parser = _parser;
        this._index = 0;
    }
    _StringifyVisitor.prototype.visitElement = function (ast, context) {
        var name = this._index++;
        var children = this._join(html_ast_1.htmlVisitAll(this, ast.children), "");
        return "<ph name=\"e" + name + "\">" + children + "</ph>";
    };
    _StringifyVisitor.prototype.visitAttr = function (ast, context) { return null; };
    _StringifyVisitor.prototype.visitText = function (ast, context) {
        var index = this._index++;
        var noInterpolation = removeInterpolation(ast.value, ast.sourceSpan, this._parser);
        if (noInterpolation != ast.value) {
            return "<ph name=\"t" + index + "\">" + noInterpolation + "</ph>";
        }
        else {
            return ast.value;
        }
    };
    _StringifyVisitor.prototype.visitComment = function (ast, context) { return ""; };
    _StringifyVisitor.prototype._join = function (strs, str) {
        return strs.filter(function (s) { return s.length > 0; }).join(str);
    };
    return _StringifyVisitor;
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5ndWxhcjIvc3JjL2kxOG4vc2hhcmVkLnRzIl0sIm5hbWVzIjpbIkkxOG5FcnJvciIsIkkxOG5FcnJvci5jb25zdHJ1Y3RvciIsInBhcnRpdGlvbiIsIlBhcnQiLCJQYXJ0LmNvbnN0cnVjdG9yIiwiUGFydC5zb3VyY2VTcGFuIiwiUGFydC5jcmVhdGVNZXNzYWdlIiwiX2lzT3BlbmluZ0NvbW1lbnQiLCJfaXNDbG9zaW5nQ29tbWVudCIsImlzSTE4bkF0dHIiLCJfZmluZEkxOG5BdHRyIiwibWVhbmluZyIsImRlc2NyaXB0aW9uIiwibWVzc2FnZUZyb21BdHRyaWJ1dGUiLCJyZW1vdmVJbnRlcnBvbGF0aW9uIiwic3RyaW5naWZ5Tm9kZXMiLCJfU3RyaW5naWZ5VmlzaXRvciIsIl9TdHJpbmdpZnlWaXNpdG9yLmNvbnN0cnVjdG9yIiwiX1N0cmluZ2lmeVZpc2l0b3IudmlzaXRFbGVtZW50IiwiX1N0cmluZ2lmeVZpc2l0b3IudmlzaXRBdHRyIiwiX1N0cmluZ2lmeVZpc2l0b3IudmlzaXRUZXh0IiwiX1N0cmluZ2lmeVZpc2l0b3IudmlzaXRDb21tZW50IiwiX1N0cmluZ2lmeVZpc2l0b3IuX2pvaW4iXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsMkJBQTBDLGtDQUFrQyxDQUFDLENBQUE7QUFDN0UseUJBUU8sZ0NBQWdDLENBQUMsQ0FBQTtBQUN4QyxxQkFBaUMsMEJBQTBCLENBQUMsQ0FBQTtBQUM1RCx3QkFBc0IsV0FBVyxDQUFDLENBQUE7QUFHbEMsSUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDO0FBQ3pCLElBQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDO0FBRWpDOztHQUVHO0FBQ0g7SUFBK0JBLDZCQUFVQTtJQUN2Q0EsbUJBQVlBLElBQXFCQSxFQUFFQSxHQUFXQTtRQUFJQyxrQkFBTUEsSUFBSUEsRUFBRUEsR0FBR0EsQ0FBQ0EsQ0FBQ0E7SUFBQ0EsQ0FBQ0E7SUFDdkVELGdCQUFD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Q0EsTUFBTUEsRUFBRUEsQ0FBQ0E7UUFDMUJBLElBQUlBLGVBQWVBLEdBQUdBLG1CQUFtQkEsQ0FBQ0EsR0FBR0EsQ0FBQ0EsS0FBS0EsRUFBRUEsR0FBR0EsQ0FBQ0EsVUFBVUEsRUFBRUEsSUFBSUEsQ0FBQ0EsT0FBT0EsQ0FBQ0EsQ0FBQ0E7UUFDbkZBLEVBQUVBLENBQUNBLENBQUNBLGVBQWVBLElBQUlBLEdBQUdBLENBQUNBLEtBQUtBLENBQUNBLENBQUNBLENBQUNBO1lBQ2pDQSxNQUFNQSxDQUFDQSxpQkFBY0EsS0FBS0EsV0FBS0EsZUFBZUEsVUFBT0EsQ0FBQ0E7UUFDeERBLENBQUNBO1FBQUNBLElBQUlBLENBQUNBLENBQUNBO1lBQ05BLE1BQU1BLENBQUNBLEdBQUdBLENBQUNBLEtBQUtBLENBQUNBO1FBQ25CQSxDQUFDQTtJQUNIQSxDQUFDQTtJQUVESix3Q0FBWUEsR0FBWkEsVUFBYUEsR0FBbUJBLEVBQUVBLE9BQVlBLElBQVNLLE1BQU1BLENBQUNBLEVBQUVBLENBQUNBLENBQUNBLENBQUNBO0lBRTNETCxpQ0FBS0EsR0FBYkEsVUFBY0EsSUFBY0EsRUFBRUEsR0FBV0E7UUFDdkNNLE1BQU1BLENBQUNBLElBQUlBLENBQUNBLE1BQU1BLENBQUNBLFVBQUFBLENBQUNBLElBQUlBLE9BQUFBLENBQUNBLENBQUNBLE1BQU1BLEdBQUdBLENBQUNBLEVBQVpBLENBQVlBLENBQUNBLENBQUNBLElBQUlBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBO0lBQ2xEQSxDQUFDQTtJQUNITix3QkFBQ0E7QUFBREEsQ0FBQ0EsQUEzQkQsSUEyQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1BhcnNlU291cmNlU3BhbiwgUGFyc2VFcnJvcn0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvbXBpbGVyL3BhcnNlX3V0aWwnO1xuaW1wb3J0IHtcbiAgSHRtbEFzdCxcbiAgSHRtbEFzdFZpc2l0b3IsXG4gIEh0bWxFbGVtZW50QXN0LFxuICBIdG1sQXR0ckFzdCxcbiAgSHRtbFRleHRBc3QsXG4gIEh0bWxDb21tZW50QXN0LFxuICBodG1sVmlzaXRBbGxcbn0gZnJvbSAnYW5ndWxhcjIvc3JjL2NvbXBpbGVyL2h0bWxfYXN0JztcbmltcG9ydCB7aXNQcmVzZW50LCBpc0JsYW5rfSBmcm9tICdhbmd1bGFyMi9zcmMvZmFjYWRlL2xhbmcnO1xuaW1wb3J0IHtNZXNzYWdlfSBmcm9tICcuL21lc3NhZ2UnO1xuaW1wb3J0IHtQYXJzZXJ9IGZyb20gJ2FuZ3VsYXIyL3NyYy9jb3JlL2NoYW5nZV9kZXRlY3Rpb24vcGFyc2VyL3BhcnNlcic7XG5cbmNvbnN0IEkxOE5fQVRUUiA9IFwiaTE4blwiO1xuY29uc3QgSTE4Tl9BVFRSX1BSRUZJWCA9IFwiaTE4bi1cIjtcblxuLyoqXG4gKiBBbiBpMThuIGVycm9yLlxuICovXG5leHBvcnQgY2xhc3MgSTE4bkVycm9yIGV4dGVuZHMgUGFyc2VFcnJvciB7XG4gIGNvbnN0cnVjdG9yKHNwYW46IFBhcnNlU291cmNlU3BhbiwgbXNnOiBzdHJpbmcpIHsgc3VwZXIoc3BhbiwgbXNnKTsgfVxufVxuXG5cbi8vIE1hbiwgdGhpcyBpcyBzbyB1Z2x5IVxuZXhwb3J0IGZ1bmN0aW9uIHBhcnRpdGlvbihub2RlczogSHRtbEFzdFtdLCBlcnJvcnM6IFBhcnNlRXJyb3JbXSk6IFBhcnRbXSB7XG4gIGxldCByZXMgPSBbXTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IG5vZGVzLmxlbmd0aDsgKytpKSB7XG4gICAgbGV0IG4gPSBub2Rlc1tpXTtcbiAgICBsZXQgdGVtcCA9IFtdO1xuICAgIGlmIChfaXNPcGVuaW5nQ29tbWVudChuKSkge1xuICAgICAgbGV0IGkxOG4gPSAoPEh0bWxDb21tZW50QXN0Pm4pLnZhbHVlLnN1YnN0cmluZyg1KS50cmltKCk7XG4gICAgICBpKys7XG4gICAgICB3aGlsZSAoIV9pc0Nsb3NpbmdDb21tZW50KG5vZGVzW2ldKSkge1xuICAgICAgICB0ZW1wLnB1c2gobm9kZXNbaSsrXSk7XG4gICAgICAgIGlmIChpID09PSBub2Rlcy5sZW5ndGgpIHtcbiAgICAgICAgICBlcnJvcnMucHVzaChuZXcgSTE4bkVycm9yKG4uc291cmNlU3BhbiwgXCJNaXNzaW5nIGNsb3NpbmcgJ2kxOG4nIGNvbW1lbnQuXCIpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmVzLnB1c2gobmV3IFBhcnQobnVsbCwgbnVsbCwgdGVtcCwgaTE4biwgdHJ1ZSkpO1xuXG4gICAgfSBlbHNlIGlmIChuIGluc3RhbmNlb2YgSHRtbEVsZW1lbnRBc3QpIHtcbiAgICAgIGxldCBpMThuID0gX2ZpbmRJMThuQXR0cihuKTtcbiAgICAgIHJlcy5wdXNoKG5ldyBQYXJ0KG4sIG51bGwsIG4uY2hpbGRyZW4sIGlzUHJlc2VudChpMThuKSA/IGkxOG4udmFsdWUgOiBudWxsLCBpc1ByZXNlbnQoaTE4bikpKTtcbiAgICB9IGVsc2UgaWYgKG4gaW5zdGFuY2VvZiBIdG1sVGV4dEFzdCkge1xuICAgICAgcmVzLnB1c2gobmV3IFBhcnQobnVsbCwgbiwgbnVsbCwgbnVsbCwgZmFsc2UpKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgY2xhc3MgUGFydCB7XG4gIGNvbnN0cnVjdG9yKHB1YmxpYyByb290RWxlbWVudDogSHRtbEVsZW1lbnRBc3QsIHB1YmxpYyByb290VGV4dE5vZGU6IEh0bWxUZXh0QXN0LFxuICAgICAgICAgICAgICBwdWJsaWMgY2hpbGRyZW46IEh0bWxBc3RbXSwgcHVibGljIGkxOG46IHN0cmluZywgcHVibGljIGhhc0kxOG46IGJvb2xlYW4pIHt9XG5cbiAgZ2V0IHNvdXJjZVNwYW4oKTogUGFyc2VTb3VyY2VTcGFuIHtcbiAgICBpZiAoaXNQcmVzZW50KHRoaXMucm9vdEVsZW1lbnQpKVxuICAgICAgcmV0dXJuIHRoaXMucm9vdEVsZW1lbnQuc291cmNlU3BhbjtcbiAgICBlbHNlIGlmIChpc1ByZXNlbnQodGhpcy5yb290VGV4dE5vZGUpKVxuICAgICAgcmV0dXJuIHRoaXMucm9vdFRleHROb2RlLnNvdXJjZVNwYW47XG4gICAgZWxzZVxuICAgICAgcmV0dXJuIHRoaXMuY2hpbGRyZW5bMF0uc291cmNlU3BhbjtcbiAgfVxuXG4gIGNyZWF0ZU1lc3NhZ2UocGFyc2VyOiBQYXJzZXIpOiBNZXNzYWdlIHtcbiAgICByZXR1cm4gbmV3IE1lc3NhZ2Uoc3RyaW5naWZ5Tm9kZXModGhpcy5jaGlsZHJlbiwgcGFyc2VyKSwgbWVhbmluZyh0aGlzLmkxOG4pLFxuICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbih0aGlzLmkxOG4pKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBfaXNPcGVuaW5nQ29tbWVudChuOiBIdG1sQXN0KTogYm9vbGVhbiB7XG4gIHJldHVybiBuIGluc3RhbmNlb2YgSHRtbENvbW1lbnRBc3QgJiYgaXNQcmVzZW50KG4udmFsdWUpICYmIG4udmFsdWUuc3RhcnRzV2l0aChcImkxOG46XCIpO1xufVxuXG5mdW5jdGlvbiBfaXNDbG9zaW5nQ29tbWVudChuOiBIdG1sQXN0KTogYm9vbGVhbiB7XG4gIHJldHVybiBuIGluc3RhbmNlb2YgSHRtbENvbW1lbnRBc3QgJiYgaXNQcmVzZW50KG4udmFsdWUpICYmIG4udmFsdWUgPT0gXCIvaTE4blwiO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNJMThuQXR0cihuOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgcmV0dXJuIG4uc3RhcnRzV2l0aChJMThOX0FUVFJfUFJFRklYKTtcbn1cblxuZnVuY3Rpb24gX2ZpbmRJMThuQXR0cihwOiBIdG1sRWxlbWVudEFzdCk6IEh0bWxBdHRyQXN0IHtcbiAgbGV0IGkxOG4gPSBwLmF0dHJzLmZpbHRlcihhID0+IGEubmFtZSA9PSBJMThOX0FUVFIpO1xuICByZXR1cm4gaTE4bi5sZW5ndGggPT0gMCA/IG51bGwgOiBpMThuWzBdO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWVhbmluZyhpMThuOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoaXNCbGFuayhpMThuKSB8fCBpMThuID09IFwiXCIpIHJldHVybiBudWxsO1xuICByZXR1cm4gaTE4bi5zcGxpdChcInxcIilbMF07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXNjcmlwdGlvbihpMThuOiBzdHJpbmcpOiBzdHJpbmcge1xuICBpZiAoaXNCbGFuayhpMThuKSB8fCBpMThuID09IFwiXCIpIHJldHVybiBudWxsO1xuICBsZXQgcGFydHMgPSBpMThuLnNwbGl0KFwifFwiKTtcbiAgcmV0dXJuIHBhcnRzLmxlbmd0aCA+IDEgPyBwYXJ0c1sxXSA6IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtZXNzYWdlRnJvbUF0dHJpYnV0ZShwYXJzZXI6IFBhcnNlciwgcDogSHRtbEVsZW1lbnRBc3QsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXR0cjogSHRtbEF0dHJBc3QpOiBNZXNzYWdlIHtcbiAgbGV0IGV4cGVjdGVkTmFtZSA9IGF0dHIubmFtZS5zdWJzdHJpbmcoNSk7XG4gIGxldCBtYXRjaGluZyA9IHAuYXR0cnMuZmlsdGVyKGEgPT4gYS5uYW1lID09IGV4cGVjdGVkTmFtZSk7XG5cbiAgaWYgKG1hdGNoaW5nLmxlbmd0aCA+IDApIHtcbiAgICBsZXQgdmFsdWUgPSByZW1vdmVJbnRlcnBvbGF0aW9uKG1hdGNoaW5nWzBdLnZhbHVlLCBtYXRjaGluZ1swXS5zb3VyY2VTcGFuLCBwYXJzZXIpO1xuICAgIHJldHVybiBuZXcgTWVzc2FnZSh2YWx1ZSwgbWVhbmluZyhhdHRyLnZhbHVlKSwgZGVzY3JpcHRpb24oYXR0ci52YWx1ZSkpO1xuICB9IGVsc2Uge1xuICAgIHRocm93IG5ldyBJMThuRXJyb3IocC5zb3VyY2VTcGFuLCBgTWlzc2luZyBhdHRyaWJ1dGUgJyR7ZXhwZWN0ZWROYW1lfScuYCk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUludGVycG9sYXRpb24odmFsdWU6IHN0cmluZywgc291cmNlOiBQYXJzZVNvdXJjZVNwYW4sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJzZXI6IFBhcnNlcik6IHN0cmluZyB7XG4gIHRyeSB7XG4gICAgbGV0IHBhcnNlZCA9IHBhcnNlci5zcGxpdEludGVycG9sYXRpb24odmFsdWUsIHNvdXJjZS50b1N0cmluZygpKTtcbiAgICBpZiAoaXNQcmVzZW50KHBhcnNlZCkpIHtcbiAgICAgIGxldCByZXMgPSBcIlwiO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJzZWQuc3RyaW5ncy5sZW5ndGg7ICsraSkge1xuICAgICAgICByZXMgKz0gcGFyc2VkLnN0cmluZ3NbaV07XG4gICAgICAgIGlmIChpICE9IHBhcnNlZC5zdHJpbmdzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICByZXMgKz0gYDxwaCBuYW1lPVwiJHtpfVwiLz5gO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmdpZnlOb2Rlcyhub2RlczogSHRtbEFzdFtdLCBwYXJzZXI6IFBhcnNlcikge1xuICBsZXQgdmlzaXRvciA9IG5ldyBfU3RyaW5naWZ5VmlzaXRvcihwYXJzZXIpO1xuICByZXR1cm4gaHRtbFZpc2l0QWxsKHZpc2l0b3IsIG5vZGVzKS5qb2luKFwiXCIpO1xufVxuXG5jbGFzcyBfU3RyaW5naWZ5VmlzaXRvciBpbXBsZW1lbnRzIEh0bWxBc3RWaXNpdG9yIHtcbiAgcHJpdmF0ZSBfaW5kZXg6IG51bWJlciA9IDA7XG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgX3BhcnNlcjogUGFyc2VyKSB7fVxuXG4gIHZpc2l0RWxlbWVudChhc3Q6IEh0bWxFbGVtZW50QXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIGxldCBuYW1lID0gdGhpcy5faW5kZXgrKztcbiAgICBsZXQgY2hpbGRyZW4gPSB0aGlzLl9qb2luKGh0bWxWaXNpdEFsbCh0aGlzLCBhc3QuY2hpbGRyZW4pLCBcIlwiKTtcbiAgICByZXR1cm4gYDxwaCBuYW1lPVwiZSR7bmFtZX1cIj4ke2NoaWxkcmVufTwvcGg+YDtcbiAgfVxuXG4gIHZpc2l0QXR0cihhc3Q6IEh0bWxBdHRyQXN0LCBjb250ZXh0OiBhbnkpOiBhbnkgeyByZXR1cm4gbnVsbDsgfVxuXG4gIHZpc2l0VGV4dChhc3Q6IEh0bWxUZXh0QXN0LCBjb250ZXh0OiBhbnkpOiBhbnkge1xuICAgIGxldCBpbmRleCA9IHRoaXMuX2luZGV4Kys7XG4gICAgbGV0IG5vSW50ZXJwb2xhdGlvbiA9IHJlbW92ZUludGVycG9sYXRpb24oYXN0LnZhbHVlLCBhc3Quc291cmNlU3BhbiwgdGhpcy5fcGFyc2VyKTtcbiAgICBpZiAobm9JbnRlcnBvbGF0aW9uICE9IGFzdC52YWx1ZSkge1xuICAgICAgcmV0dXJuIGA8cGggbmFtZT1cInQke2luZGV4fVwiPiR7bm9JbnRlcnBvbGF0aW9ufTwvcGg+YDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGFzdC52YWx1ZTtcbiAgICB9XG4gIH1cblxuICB2aXNpdENvbW1lbnQoYXN0OiBIdG1sQ29tbWVudEFzdCwgY29udGV4dDogYW55KTogYW55IHsgcmV0dXJuIFwiXCI7IH1cblxuICBwcml2YXRlIF9qb2luKHN0cnM6IHN0cmluZ1tdLCBzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHN0cnMuZmlsdGVyKHMgPT4gcy5sZW5ndGggPiAwKS5qb2luKHN0cik7XG4gIH1cbn0iXX0=