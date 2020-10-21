export default {
    getStyle: (el,styleProp) => {
        var y = null;
        var x = document.getElementById(el);
        if (x.currentStyle)
            y = x.currentStyle[styleProp];
        else if (window.getComputedStyle)
            y = document.defaultView.getComputedStyle(x,null).getPropertyValue(styleProp);
        return y;
    },

    getMousePositionInCanvas: function (canvas, evt) {
        var border = this.getStyle(canvas.id, 'border-left-width')
        var borderValue = border!=null?border.substring(0, border.indexOf(border.match(/\D/))):0
        var padding = this.getStyle(canvas.id, 'padding-left')
        var paddingValue = padding!=null?padding.substring(0, padding.indexOf(padding.match(/\D/))):0
        var rect = canvas.getBoundingClientRect()
        return {
            x: (evt.clientX - rect.left - borderValue - paddingValue),
            y: (evt.clientY - rect.top - borderValue - paddingValue),
        };
    },
}