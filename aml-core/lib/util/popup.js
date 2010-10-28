/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 *
 */

/*
envdetect/features
aml-core/focus
lib-css/position
*/

define([
    "aml-core", 
    "aml-core/focus",
    "envdetect/features", 
    "lib-css", 
    "lib-css/position", 
    "hotkey"],
    function(amlCore, focusManager, features, css, position, hotkey){

var popup;

amlCore.addListener(window, "unload", function(){
    popup.destroy();
});

return popup = {
    cache      : {},
    focusFix   : {"INPUT":1,"TEXTAREA":1,"SELECT":1},
    
    setContent : function(cacheId, content, style, width, height){
        if (!this.popup) this.init();

        this.cache[cacheId] = {
            content : content,
            style   : style,
            width   : width,
            height  : height
        };
        content.style.position = "absolute";
        //if(content.parentNode) content.parentNode.removeChild(content);
        //if(style) apf.importCssString(style, this.popup.document);
        
        content.onmousedown  = function(e) {
            if (!e) e = event;

            //#ifdef __WITH_WINDOW_FOCUS
            if (apf.hasFocusBug 
              && !popup.focusFix[(e.srcElement || e.target).tagName]) {
                FocusClientWindow.$focusfix();
            }
            //#endif
            
            //@todo can this cancelBubble just go?
            amlCore.cancelBubble(e, null, true);
            //(e || event).cancelBubble = true;
        };
        
        return content.ownerDocument;
    },
    
    removeContent : function(cacheId){
        this.cache[cacheId] = null;
        delete this.cache[cacheId];
    },
    
    init : function(){
        //consider using iframe
        this.popup = {};
        
        apf.addEventListener("hotkey", function(e){
            if (e.keyCode == "27" || e.altKey) 
                popup.forceHide();
        });
    },
    
    show : function(cacheId, options){
        options = Object.extend({
            x            : 0,
            y            : 0,
            animate      : false,
            ref          : null,
            width        : null,
            height       : null,
            callback     : null,
            draggable    : false,
            resizable    : false,
            allowTogether: false,
            autoCorrect  : true,
            noleft       : false
        }, options);
        if (!this.popup)
           this.init();
        if ((!options.allowTogether || options.allowTogether != this.last) && this.last != cacheId)
            this.hide();

        var o = this.cache[cacheId];
        o.options = options;
        //if(this.last != cacheId) 
        //this.popup.document.body.innerHTML = o.content.outerHTML;

        var dp,
            popup  = o.content,
            moveUp = false,
            fixed  = false;

        //if (!apf.getStyle(o.content, "zIndex"))
        zManager.set("popup", o.content);
        
        if ((dp = o.content.style.display) && dp.indexOf("none") > -1)
            o.content.style.display = "";

        if (options.ref) {
            var pos, top,
                p = options.ref;
            while(p && p.nodeType == 1) {
                if (fixed = apf.getStyle(p, "position") == "fixed")
                    break;
                p = p.parentNode || p.$parentNode;
            }

            if (!fixed) {
                pos = position.getAbsolutePosition(options.ref,
                            o.content.offsetParent || o.content.parentNode),//[ref.offsetLeft+2,ref.offsetTop+4];//
                top = (options.y || 0) + pos[1],
                    //+ (apf.isWebkit ? window.pageYOffset : 0), <-- appears to be needed in NEW safari...
                p   = apf.getOverflowParent(o.content);
    
                if (options.width || o.width)
                    popup.style.width = ((options.width || o.width) - 3) + "px";
    
                moveUp = options.autoCorrect && (top
                    + (options.height || o.height || o.content.offsetHeight))
                    > (p == document.documentElement
                      ? (apf.isIE ? p.offsetHeight : (window.innerHeight + window.pageYOffset))  + p.scrollTop
                      : p.offsetHeight + p.scrollTop);
                
                popup.style.position = "absolute";
    
                popup.style.top = (moveUp 
                    ? (top - (options.height || o.height || o.content.offsetHeight) - (options.y || 0))
                    : top) + "px"
            }
            else {
                pos = position.getAbsolutePosition(options.ref, p);
                top = (options.y || 0) + pos[1] + p.offsetTop;
                pos[0] += p.offsetLeft;
                popup.style.position = "fixed";
                popup.style.top      = top + "px";
            }
            
            if (!options.noleft)
                popup.style.left = ((options.x || 0) + (pos ? pos[0] : 0)) + "px";
        }

        // #ifdef __WITH_STYLE
        // set a className that specifies the direction, to help skins with
        // specific styling options.
        apf.setStyleClass(popup, moveUp ? "upward" : "downward", [moveUp ? "downward" : "upward"]);
        // #endif

        if (options.animate) {
            if (options.animate == "fade") {
                apf.tween.single(popup, {
                    type  : 'fade',
                    from  : 0,
                    to    : 1,
                    anim  : apf.tween.NORMAL,
                    steps : options.steps || 15 * apf.animSteps
                });
            }
            else {
                var iVal, steps = apf.isIE8 ? 5 : 7, i = 0;
                iVal = setInterval(function(){
                    var value = ++i * ((options.height || o.height) / steps);

                    popup.style.height = value + "px";
                    if (moveUp)
                        popup.style.top = (top - value - (options.y || 0)) + "px";
                    else
                        (options.container || popup).scrollTop = -1 * (i - steps) * ((options.height || o.height) / steps);
                    popup.style.display = "block";

                    if (i >= steps) {
                        clearInterval(iVal)
                        
                        if (options.callback)
                            options.callback(popup);
                    }
                }, 10);
            }
        }
        else {
            if (!options.ref) {
                if (options.height || o.height)
                    popup.style.height = (options.height || o.height) + "px";
                popup.style.top = (top) + "px";
            }
            popup.style.display = "block";
            
            if (options.callback)
               options.callback(popup);
        }

        $setTimeout(function(){
            popup.last = cacheId;
        });

        if (options.draggable) {
            options.id = cacheId;
            this.makeDraggable(options);
        }
    },
    
    hide : function(){
        if (this.isDragging) return;

        var o = this.cache[this.last];
        if (o) {
            if (o.content)
                o.content.style.display = "none";

            if (o.options && o.options.onclose) {
                o.options.onclose(Object.extend(o.options, {htmlNode: o.content}));
                o.options.onclose = false;
            }
        }
    },
    
    isShowing : function(cacheId){
        return this.last && this.last == cacheId 
            && this.cache[this.last]
            && this.cache[this.last].content.style.display != "none";
    },

    isDragging   : false,

    makeDraggable: function(options) {
        if (!apf.Interactive || this.cache[options.id].draggable) 
            return;

        var oHtml = this.cache[options.id].content;
        this.cache[options.id].draggable = true;
        var o = {
            $propHandlers : {},
            minwidth      : 10,
            minheight     : 10,
            maxwidth      : 10000,
            maxheight     : 10000,
            dragOutline   : false,
            resizeOutline : false,
            draggable     : true,
            resizable     : options.resizable,
            $ext          : oHtml,
            oDrag         : oHtml.firstChild
        };

        oHtml.onmousedown =
        oHtml.firstChild.onmousedown = function(e){
            if (!e) e = event;
            
            //#ifdef __WITH_WINDOW_FOCUS
            if (apf.hasFocusBug
              && !popup.focusFix[(e.srcElement || e.target).tagName]) {
                FocusClientWindow.$focusfix();
            }
            //#endif
            
            (e || event).cancelBubble = true;
        }

        apf.implement.call(o, apf.Interactive);

        o.$propHandlers["draggable"].call(o, true);
        o.$propHandlers["resizable"].call(o, true);
    },
    
    forceHide : function(){
        if (this.last 
          //#ifdef __WITH_PLANE
          && !apf.plane.current
          //#endif
          && this.isShowing(this.last)
          && this.cache[this.last]
          && this.cache[this.last].options
          && this.cache[this.last].options.autohide !== false) {
            var o = apf.lookup(this.last);
            if (!o)
                this.last = null;
            else if (o.dispatchEvent("popuphide") !== false)
                this.hide();
        }
    },

    destroy : function(){
        for (var cacheId in this.cache) {
            if (this.cache[cacheId]) {
                this.cache[cacheId].content.onmousedown = null;
                amlCore.destroyHtmlNode(this.cache[cacheId].content);
                this.cache[cacheId].content = null;
                this.cache[cacheId] = null;
            }
        }
        
        if (!this.popup) return;
        //this.popup.document.body.c = null;
        //this.popup.document.body.onmouseover = null;
    }
};

    }
);