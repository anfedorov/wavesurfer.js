'use strict';

WaveSurfer.Drawer = {
    init: function (container, params) {
        this.container = container;
        this.params = params;

        this.width = 0;
        this.height = params.height * this.params.pixelRatio;

        this.lastPos = 0;

        this.createWrapper();
        this.createElements();
        this.setupWrapperEvents();
    },

    createWrapper: function () {
        this.wrapper = this.container.appendChild(
            document.createElement('wave')
        );

        this.style(this.wrapper, {
            display: 'block',
            position: 'relative',
            userSelect: 'none',
            webkitUserSelect: 'none',
            height: this.params.height + 'px'
        });

        if (this.params.fillParent) {
            this.style(this.wrapper, {
                width: '100%',
                overflowX: this.params.hideScrollbar ? 'hidden' : 'auto',
                overflowY: 'hidden'
            });
        }
    },

    setupWrapperEvents: function () {
        ['mousedown', 'mousemove', 'mouseup'].forEach((x) => {
            window.addEventListener(x, (e) => {
                var bbox = this.wrapper.getBoundingClientRect();
                this.fireEvent(
                    x, e,
                    (e.clientX - bbox.left) / this.wrapper.scrollWidth,
                    1 - (e.clientY - bbox.top) / this.wrapper.scrollHeight
                );
            });
        });
    },

    drawPeaks: function (peaks) {
        this.drawBars(peaks);
    },

    style: function (el, styles) {
        Object.keys(styles).forEach(function (prop) {
            if (el.style[prop] !== styles[prop]) {
                el.style[prop] = styles[prop];
            }
        });
        return el;
    },

    getWidth: function () {
        return Math.round(this.container.clientWidth * this.params.pixelRatio);
    },

    setWidth: function (width) {
        if (width == this.width) { return; }

        this.width = width;

        this.style(this.wrapper, {
            width: ~~(this.width / this.params.pixelRatio) + 'px'
        });

        this.updateSize();
    },

    setHeight: function (height) {
        if (height == this.height) { return; }
        this.height = height;
        this.style(this.wrapper, {
            height: ~~(this.height / this.params.pixelRatio) + 'px'
        });
        this.updateSize();
    },

    progress: function (progress) {
        var minPxDelta = 1 / this.params.pixelRatio;
        var pos = Math.round(progress * this.width) * minPxDelta;

        if (pos < this.lastPos || pos - this.lastPos >= minPxDelta) {
            this.lastPos = pos;
            return this.updateProgress(progress);
        }
    },

    destroy: function () {
        this.unAll();
        if (this.wrapper) {
            this.container.removeChild(this.wrapper);
            this.wrapper = null;
        }
    },

    /* Renderer-specific methods */
    createElements: function () {},

    updateSize: function () {},

    drawWave: function (peaks, max) {},

    clearWave: function () {},

    updateProgress: function (position) {}
};

WaveSurfer.util.extend(WaveSurfer.Drawer, WaveSurfer.Observer);
