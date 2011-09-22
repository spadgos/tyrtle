/*globals window, Tyrtle */
//#JSCOVERAGE_IF 0

if (typeof window === 'undefined') {
    throw "HTML renderer can only be used in a browser.";
}
if (typeof window.jQuery === 'undefined') {
    throw "jQuery is required for the HTML renderer.";
}
if (typeof Tyrtle === 'undefined') {
    throw "Tyrtle must be loaded before the renderer is added.";
}
Tyrtle.setRenderer(new (function () {
    var iconPass, iconFail, iconWait, // base-64 favicon strings
        HtmlRenderer,
        $ = window.jQuery,
        getUniqueId,
        formatString
    ;
    getUniqueId = (function () {
        var i = 0;
        return function () {
            return ++i;
        };
    }());

    formatString = function (message) {
        var richText,
            argsRegex = /\{args\}/g,
            expandedArgs, i, l,
            self = this,
            args
        ;

        if (typeof arguments[0] === "boolean") {
            richText = arguments[0];
            message = arguments[1];
            args = Array.prototype.slice.call(arguments, 2);
        } else {
            richText = true;
            args = Array.prototype.slice.call(arguments, 1);
        }

        if (argsRegex.test(message)) {
            expandedArgs = [];
            for (i = 0, l = args.length; i < l; ++i) {
                expandedArgs.push('{' + i + '}');
            }
            message = message.replace(/\{args\}/g, "[" + expandedArgs.join(", ") + "]");
        }
        return message.replace(
            /\{([1-9][0-9]*|0)\}/g,
            function (str, p1) {
                var v = args[p1];
                // TODO: this should be HtmlRenderer.prototype.formatVariable
                return richText
                    ? HtmlRenderer.prototype.formatVariable(v)
                    : (v === null
                        ? "NULL"
                        : (typeof v === "undefined"
                           ? "UNDEFINED"
                           : (v.toString ? v.toString() : String(v))
                        )
                      )
                ;
            }
        );
    };

    HtmlRenderer = function () {};
    HtmlRenderer.prototype.templateString = formatString;
    HtmlRenderer.prototype.formatVariable = function (v) {
        var vType = typeof v, $out, str, id, ii, len, tmp;

        $out = $("<span></span>")
            .addClass("variable")
        ;
        if (v === null) {
            str = 'null';
            vType = 'null';
        } else if (v instanceof Date) {
            str = v + '';
            vType = 'date';
        } else if (v instanceof RegExp) {
            str = v.toString();
            vType = 'regexp';
        } else if (vType === 'object' || vType === 'function') {
            if (vType === 'function') {
                str = "Function";
            } else if ($.isArray(v)) {
                vType = 'array';
                str = "Array (length: " + v.length + ")";
            } else {
                if (v instanceof window.Element) {
                    tmp = [
                        v.nodeName.toLowerCase(),
                        v.getAttribute('id'),
                        Array.prototype.slice.call(v.classList).join(".")
                    ];
                    str = 'DOMElement: ' + tmp[0] + (tmp[1] ? "#" + tmp[1] : "") + (tmp[2] ? "." + tmp[2] : "");
                } else {
                    str = String(v);
                    if (str === "[object Object]") {
                        str = "Object";
                    }
                }
            }
            if (window.console && (window.console.dir || window.console.log)) {
                id = 'tyrtle_' + getUniqueId();
                $out.attr('id', id).addClass('clickable');

                $('#' + id).live('click', function () {
                    var log;
                    if (window.console.dir && (vType === 'function' || (vType === 'array' && v.length === 0))) {
                        log = window.console.log;
                    } else {
                        log = (window.console.dir || window.console.log);
                    }
                    log.call(window.console, v);
                });
            }
        } else {
            str = String(v);
        }
        $out.addClass(vType).text(str);
        return $("<div></div>").append($out).html();
    };


    HtmlRenderer.prototype.beforeRun = function (tyrtle) {
        var $tags, i, l, $ticker, $link, renderer = this;
        if (!tyrtle.$container) {
            window.document.title = "Running tests...";

            $link = $('#favicon');
            if (!$link.length) {
                $link = $('<link></link>')
                    .attr({
                        rel : "icon",
                        type : "image/png",
                        id : 'favicon'
                    })
                    .appendTo("head")
                ;
            }
            $link.attr('href', iconWait);

            this.testsLeft = 0;
            for (i = 0, l = tyrtle.modules.length; i < l; ++i) {
                this.testsLeft += tyrtle.modules[i].tests.length;
            }
            this.totalTests = this.testsLeft;

            this.tickerTimeout = setInterval(function () {
                var text = $ticker.text();
                if (text.length === 3) {
                    text = '';
                } else {
                    text += '.';
                }
                $ticker.text(text);
            }, 400);

            $ticker = $("<span></span>");
            tyrtle.$status = $("<span>0%</span>");

            tyrtle.$container = $("<div></div>")
                .attr({
                    id : 'tyrtle'
                })
                .append($("<h1></h1>")
                    .append($('<a></a>')
                        .text(tyrtle.name || "Tyrtle test suite")
                        .attr('href', '?')
                        .attr('title', "Click to run all tests")
                    )
                    .append($ticker)
                )
                .appendTo(window.document.body)
            ;
            tyrtle.$container.append($("<div></div>")
                .addClass('tools')
                .append($("<a></a>")
                    .text("Show only failures")
                    .click(function (event) {
                        event.preventDefault();
                        // do nothing while it is still running
                        // TODO: perhaps change a CSS style instead of individually toggling
                        if (renderer.testsLeft === 0) {
                            $('> .pass', tyrtle.$container).toggle();
                        }
                    })
                    .attr('href', '#')
                )
                .append(tyrtle.$status)
            );
        }
    };

    HtmlRenderer.prototype.beforeModule = function (module, tyrtle) {
        var i, l;
        if (!module.$container) {
            module.$ul = $("<ul></ul>").addClass('tests');//.hide();

            module.$container = $("<div></div>")
                .addClass('mod pass')
                .append(
                    $('<h2></h2>').append(
                        $('<a></a>')
                            .text(module.name)
                            .attr('href', '?modFilter=' + encodeURIComponent(module.name))
                    ),
                    $('<div></div>').addClass('modinfo').text("..."),
                    module.$ul
                )
            ;
            // set up all the containers for each test.
            for (i = 0, l = module.tests.length; i < l; ++i) {
                this.beforeTest(module.tests[i], module, tyrtle);
            }
            module.$container.appendTo(tyrtle.$container);
        }
    };

    HtmlRenderer.prototype.beforeTest = function (test, module, tyrtle) {
        var consoleExists;
        if (!test.$container) {
            consoleExists = !!(window.console && window.console.info);
            test.$container = $('<li></li>')
                .append(
                    $("<span></span>")
                        .addClass('testname')
                        .text(test.name + ": "),
                    $("<span></span>")
                        .addClass('message')
                        .html("..."),
                    $("<a></a>")
                        .html(" Rerun")
                        .attr('href', '#')
                        .attr('title', "Run this test again")
                        .click(function (e) {
                            e.preventDefault();
                            module.rerunTest(test, tyrtle);
                        }),
                    $("<a></a>")
                        .html("Reload ")
                        .attr('href', '?modFilter=' + encodeURIComponent(module.name)
                                    + '&testFilter=' + encodeURIComponent(test.name))
                        .attr('title', "Reload just this test"),
                    consoleExists
                        ? $("<a></a>")
                            .html("&#402;")
                            .attr('href', '#')
                            .attr('title', "Log this function")
                            .click(function (e) {
                                e.preventDefault();
                                window.console.info(test.name + ": %o", test.body);
                            })
                        : null
                )
                .appendTo(module.$ul)
            ;
        } else {
            test.$container.removeClass('fail pass skip');
        }
        test.$container.addClass('pending');
    };

    HtmlRenderer.prototype.afterTest = function (test, module, tyrtle) {
        var msg;
        msg = formatString(
            test.statusMessage + (test.runTime !== -1 ? formatString(false, ' {0}ms', test.runTime) : "")
        );

        if (test.error) {
            msg += formatString(' (<span class="thrownError">Error: {0}</span>)', test.error);
        }
        test.$container
            .removeClass('pending')
            .addClass(test.status === Tyrtle.PASS ? "pass" : (test.status === Tyrtle.FAIL ? 'fail' : 'skip'))
            .children('.message')
            .html(msg)
        ;
    };
    HtmlRenderer.prototype.afterModule = function (mod, tyrtle) {
        var i, l, test, speedPercent, completePercent;

        if (this.testsLeft) {
            this.testsLeft -= mod.tests.length;
            completePercent = Math.floor((this.totalTests - this.testsLeft) / this.totalTests * 100);
            //tyrtle.$status.text(completePercent + "%");
            //tyrtle.$status.text((new Array(completePercent + 1)).join("|"));

            tyrtle.$status.text(
                tyrtle.fails + "/" + (this.totalTests - this.testsLeft)
                + " (" + completePercent + "%) "
                + ('|/-\\')[Math.floor(completePercent / 2) % 4]
            );
        }

        mod.$ul.show();
        mod.$container
            .removeClass('pass fail')
            .addClass(mod.fails === 0 ? "pass" : "fail")
            .children('.modinfo')
            .text(formatString(
                false,
                "{0} passed. {1} failed. {2} skipped",
                mod.passes,
                mod.fails,
                mod.skips
            ))
        ;
    };

    HtmlRenderer.prototype.afterRun = function (tyrtle) {
        var statusMessage, $link;
        $link = $('#favicon').remove(); // firefox doesn't update the icon unless you remove it first...
        $link
            .attr('href', tyrtle.fails ? iconFail : iconPass)
            .appendTo('head')
        ;
        statusMessage = formatString(
            false,
            "{0}/{1}",
            tyrtle.fails,
            tyrtle.passes + tyrtle.skips + tyrtle.fails
        );
        tyrtle.$status.text(statusMessage);
        window.document.title = statusMessage;
        if (this.tickerTimeout) {
            clearInterval(this.tickerTimeout);
            this.tickerTimeout = null;
            tyrtle.$container.children('h1').children('span').text('');
        }
    };

    iconPass = "data:image/png;base64,"
             + "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0"
             + "U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAKfSURBVDjLpZPrS1NhHMf9O3bOdmwDCWRE"
             + "IYKEUHsVJBI7mg3FvCxL09290jZj2EyLMnJexkgpLbPUanNOberU5taUMnHZUULMvelCtWF0sW/n"
             + "7MVMEiN64AsPD8/n83uucQDi/id/DBT4Dolypw/qsz0pTMbj/WHpiDgsdSUyUmeiPt2+V7SrIM+b"
             + "Sss8ySGdR4abQQv6lrui6VxsRonrGCS9VEjSQ9E7CtiqdOZ4UuTqnBHO1X7YXl6Daa4yGq7vWO1D"
             + "40wVDtj4kWQbn94myPGkCDPdSesczE2sCZShwl8CzcwZ6NiUs6n2nYX99T1cnKqA2EKui6+TwphA"
             + "5k4yqMayopU5mANV3lNQTBdCMVUA9VQh3GuDMHiVcLCS3J4jSLhCGmKCjBEx0xlshjXYhApfMZRP"
             + "5CyYD+UkG08+xt+4wLVQZA1tzxthm2tEfD3JxARH7QkbD1ZuozaggdZbxK5kAIsf5qGaKMTY2lAU"
             + "/rH5HW3PLsEwUYy+YCcERmIjJpDcpzb6l7th9KtQ69fi09ePUej9l7cx2DJbD7UrG3r3afQHOyCo"
             + "+V3QQzE35pvQvnAZukk5zL5qRL59jsKbPzdheXoBZc4saFhBS6AO7V4zqCpiawuptwQG+UAa7Ct3"
             + "UT0hh9p9EnXT5Vh6t4C22QaUDh6HwnECOmcO7K+6kW49DKqS2DrEZCtfuI+9GrNHg4fMHVSO5kE7"
             + "nAPVkAxKBxcOzsajpS4Yh4ohUPPWKTUh3PaQEptIOr6BiJjcZXCwktaAGfrRIpwblqOV3YKdhfXO"
             + "IvBLeREWpnd8ynsaSJoyESFphwTtfjN6X1jRO2+FxWtCWksqBApeiFIR9K6fiTpPiigDoadqCEag"
             + "5YUFKl6Yrciw0VOlhOivv/Ff8wtn0KzlebrUYwAAAABJRU5ErkJggg==";
    iconFail = "data:image/png;base64,"
             + "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0"
             + "U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAIhSURBVDjLlZPrThNRFIWJicmJz6BWiYbI"
             + "kYDEG0JbBiitDQgm0PuFXqSAtKXtpE2hNuoPTXwSnwtExd6w0pl2OtPlrphKLSXhx07OZM769qy1"
             + "9wwAGLhM1ddC184+d18QMzoq3lfsD3LZ7Y3XbE5DL6Atzuyilc5Ciyd7IHVfgNcDYTQ2tvDr5crn"
             + "6uLSvX+Av2Lk36FFpSVENDe3OxDZu8apO5rROJDLo30+Nlvj5RnTlVNAKs1aCVFr7b4BPn6Cls21"
             + "AWgEQlz2+Dl1h7IdA+i97A/geP65WhbmrnZZ0GIJpr6OqZqYAd5/gJpKox4Mg7pD2YoC2b0/54rJ"
             + "QuJZdm6Izcgma4TW1WZ0h+y8BfbyJMwBmSxkjw+VObNanp5h/adwGhaTXF4NWbLj9gEONyCmUZmd"
             + "10pGgf1/vwcgOT3tUQE0DdicwIod2EmSbwsKE1P8QoDkcHPJ5YESjgBJkYQpIEZ2KEB51Y6y3ojv"
             + "Y+P8XEDN7uKS0w0ltA7QGCWHCxSWWpwyaCeLy0BkA7UXyyg8fIzDoWHeBaDN4tQdSvAVdU1Aok+n"
             + "sNTipIEVnkywo/FHatVkBoIhnFisOBoZxcGtQd4B0GYJNZsDSiAEadUBCkstPtN3Avs2Msa+Dt9X"
             + "fxoFSNYF/Bh9gP0bOqHLAm2WUF1YQskwrVFYPWkf3h1iXwbvqGfFPSGW9Eah8HSS9fuZDnS32f71"
             + "m8KFY7xs/QZyu6TH2+2+FAAAAABJRU5ErkJggg==";
    iconWait = "data:image/png;base64,"
             + "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0"
             + "U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAJ6SURBVDjLjZO7T1NhGMY7Mji6uJgYt8bE"
             + "lTjof6CDg4sMSqIxJsRGB5F4TwQSIg1QKC0KWmkZEEsKtEcSxF5ohV5pKSicXqX3aqGn957z+PUE"
             + "GopiGJ583/A+v3znvPkJAAjWR0VNJG0kGhKahCFhXcN3YBFfx8Kry6ym4xIzce88/fbWGY2k5WRb"
             + "77UTTbWuYA9gDGg7EVmSIOF4g5T7HZKuMcSW5djWDyL0uRf0dCc8inYYxTcw9fAiCMBYB3gVj1z7"
             + "gLhNTjKCqHkYP79KENC9Bq3uxrrqORzy+9D3tPAAccspVx1gWg0KbaZFbGllWFM+xrKkFQudV0Ce"
             + "DfJsjN4+C2nracjunoPq5VXIBrowMK4V1gG1LGyWdbZwCalsBYUyh2KFQzpXxVqkAGswD3+qBDpZ"
             + "wow9iYE5v26/VwfUQnnznyhvjguQYabIIpKpYD1ahI8UTT92MUSFuP5Z/9TBTgOgFrVjp3nakaG/"
             + "0VmEfpX58pwzjUEquNk362s+PP8XYD/KpYTBHmRg9Wch0QX1R80dCZhYipudYQY2Auib8RmODVCa"
             + "4hfUK4ngaiiLNFNFdKeCWWscXZMbWy9Unv9/gsIQU09a4pwvUeA3Uapy2C2wCKXL0DqTePLexbWP"
             + "Ov79E8f0UWrencZ2poxciUWZlKssB4bcHeE83NsFuMgpo2iIpMuNa1TNu4XjhggWvb+R2K3wZdLl"
             + "AZl8Fd9jRb5sD+Xx0RJBx5gdom6VsMEFDyWF0WyCeSOFcDKPnRxZYTQL5Rc/nn1w4oFsBaIhC3r6"
             + "FRh5erPRhYMyHdeFw4C6zkRhmijM7CnMu0AUZonCDCnRJBqSus5/ABD6Ba5CkQS8AAAAAElFTkSu"
             + "QmCC";
    return HtmlRenderer;
}())());
//#JSCOVERAGE_ENDIF
