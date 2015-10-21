WaveSurfer.Drawer.Canvas = Object.create(WaveSurfer.Drawer);

WaveSurfer.util.extend(WaveSurfer.Drawer.Canvas, {
    get TOP_BORDER() {
        return window.devicePixelRatio * 10;
    },

    get RIGHT_BORDER() {
        return window.devicePixelRatio * 30;
    },

    get hScale() {
        return 1 - this.RIGHT_BORDER / this.width;
    },

    createElements() {
        this.waveCanvas = this.wrapper.appendChild(
            this.style(document.createElement('canvas'), {
                position: 'absolute',
                zIndex: 1,
                left: 0,
                top: 0,
                bottom: 0
            })
        );
        this.waveCc = this.waveCanvas.getContext('2d');

        this.volumeCanvas = this.wrapper.appendChild(
            this.style(document.createElement('canvas'), {
                position: 'absolute',
                zIndex: 1,
                left: 0,
                top: 0,
                bottom: 0
            })
        );

        this.volumeCc = this.volumeCanvas.getContext('2d');

        this.progressWave = this.wrapper.appendChild(
            this.style(document.createElement('wave'), {
                position: 'absolute',
                zIndex: 2,
                left: 0,
                top: 0,
                bottom: 0,
                overflow: 'hidden',
                width: '0',
                display: 'none',
                boxSizing: 'border-box',
                borderRightStyle: 'solid',
                borderRightWidth: this.params.cursorWidth + 'px',
                borderRightColor: this.params.cursorColor
            })
        );

        if (this.params.waveColor != this.params.progressColor) {
            this.progressCanvas = this.progressWave.appendChild(
                document.createElement('canvas')
            );
            this.progressCc = this.progressCanvas.getContext('2d');
        }

        this.on('mousemove', (e, x, y) => this.onMouseMove(e, x, y));
    },

    onMouseMove(e, x, y) {
        if (!this.dragging && (x < -0.2 || x > 1.2 || y < -0.2 || y > 1.2)) return;
        if (this.dragging
         && this.dragging !== this.customVolume
         && this.customVolume.pointsOfInterest[0] !== this.dragging
         && this.dragging !== true
        ) return;

        if (this.dragging === true) {
            this.fireEvent('poschange', e, this.bound(x, y), y);
            return;
        }

        const vResize = 1 - this.TOP_BORDER / this.height,
              hResize = 1 - this.RIGHT_BORDER / this.width;

        if (this.customVolume) {
            if (this.dragging) {
                this.dragging.dragTo(x / hResize, y / vResize);
                this.clearWave();
                this.drawBars();
            }
            var ctx = this.volumeCc;
            ctx.clearRect(0, 0, this.width, this.height);
            this.drawVolumeLine(x, y);
        }
    },

    rerender() {
        var ctx = this.volumeCc;
        this.clearWave();
        ctx.clearRect(0, 0, this.width, this.height);
        this.drawBars();
        this.drawVolumeLine();
    },

    setupWrapperEvents() {
        const vResize = 1 - this.TOP_BORDER / this.height;
        const hResize = 1 - this.RIGHT_BORDER / this.width;

        WaveSurfer.Drawer.setupWrapperEvents.call(this);

        this.un('mousedown');
        this.on('mousedown', (e, x, y) => {
            var s = this.params.pixelRatio;
            var h = this.height;
            var w = this.width - this.RIGHT_BORDER;
            const v = this.customVolume;

            if (x < 0 || x > 1 || y > 1 || y < 0) { return; }

            x = x / hResize;
            y = y / vResize;

            for (let p of (this.customVolume || {}).pointsOfInterest || []) {
                const r = p.radius || 7 * window.devicePixelRatio,
                      yVal = p.x > 1 ? v.fn(1) :
                             p.x < 0 ? v.fn(0) :
                                       this.bound(p.y);

                if (this.dist(x, y, this.bound(p.x), this.bound(yVal)) < r) {
                    this.dragging = p;
                    this.updateCursorStyle('grabbed');
                    return;
                }
            }

            var y2 = this.bound(v.fn(x));

            if (this.dist(x, y, x, y2) < 12) {
                this.dragging = this.customVolume;
                this.updateCursorStyle('grabbed');
                return;
            }

            this.dragging = true;

            // escalate it to wavesurfer, which manages position changes
            this.fireEvent('poschange', e, x, y);
        });

        this.un('mouseup');
        this.on('mouseup', (e, x, y) => {
            if (this.dragging) {
                this.dragging.save && this.dragging.save();
                this.updateCursorStyle('');
                this.dragging = false;
                this.clearWave();
                this.drawBars();
            }
        });

    },

    updateSize() {
        var width = Math.round(this.width / this.params.pixelRatio);

        [ this.waveCc, this.volumeCc ].forEach((cc) => {
            cc.canvas.width = this.width;
            cc.canvas.height = this.height;
            this.style(cc.canvas, { width: width + 'px'});
        });

        this.style(this.progressWave, { display: 'block'});

        if (this.progressCc) {
            this.progressCc.canvas.width = this.width;
            this.progressCc.canvas.height = this.height;
            this.style(this.progressCc.canvas, { width: width + 'px'});
        }

        this.clearWave();
        this.clearVolume();
        this.setupWrapperEvents()
    },

    clearWave() {
        this.waveCc.clearRect(0, 0, this.width, this.height);
        if (this.progressCc) {
            this.progressCc.clearRect(0, 0, this.width, this.height);
        }
    },

    clearVolume() {
        this.volumeCc.clearRect(0, 0, this.width, this.height);
    },

    drawBars(peaks) {
        peaks = this.cachedPeaks = peaks || this.cachedPeaks;
        const w = this.width - this.RIGHT_BORDER;

        var $ = 0.5 / this.params.pixelRatio,
            pWidth = this.peakWidth * (w / this.width),
            height = this.height - this.TOP_BORDER,
            length = ~~(peaks.length / 2),
            bar = this.params.barWidth * this.params.pixelRatio,
            gap = Math.max(this.params.pixelRatio, ~~(bar / 2)),
            step = bar + gap,
            scale = length / pWidth;

        var absmax = 1;
        // var min, max;
        // max = Math.max.apply(Math, peaks);
        // min = Math.min.apply(Math, peaks);
        // absmax = max;
        // if (-min > absmax) {
        //     absmax = -min;
        // }

        this.waveCc.fillStyle = this.params.waveColor;
        if (this.progressCc) {
            this.progressCc.fillStyle = this.params.progressColor;
        }

        [ this.waveCc, this.progressCc ].forEach(function (cc) {
            if (!cc) { return; }

            for (var i = 0; i < pWidth; i += step) {
                var h = Math.abs(peaks[Math.floor(2 * i * scale)] / absmax * height);
                if (this.customVolume) {
                    h *= this.bound(this.customVolume.fn(i / w)) * (height / this.height);
                };
                cc.fillRect(i + $, height - h + this.TOP_BORDER, bar + $, h);
            }
        }, this);
    },

    updateCursorStyle(x) {
        this.wrapper.style.cursor = x;
        this.wrapper.style.cursor = '-webkit-' + x;
    },

    drawCircle(ctx, x, y, r) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    },

    drawVolumeLine(x=Infinity, y=Infinity) {
        const hoverSize = 10;

        var vResize = 1 - this.TOP_BORDER / this.height,
            hResize = 1 - this.RIGHT_BORDER / this.width,
            h = this.height,
            w = this.width - this.RIGHT_BORDER,
            v = this.customVolume,
            ctx = this.volumeCc;

        y = y / vResize;
        x = x / hResize;

        var fx = this.bound(v.fn(x));
        var hover = Boolean(this.dragging) || Math.abs(y - fx) * h < hoverSize * window.devicePixelRatio;

        ctx.lineWidth = 1;
        ctx.strokeStyle = hover ? "black" : "lightgray";
        ctx.shadowColor = "black";
        ctx.shadowBlur = hover ? 3 : 0;

        // draw the volume line
        ctx.beginPath();
        for (var xv = 0; xv <= w; xv += 10) {
            var yv = this.bound(v.fn(xv / w));
            ctx.lineTo(xv, h * (1 - yv * vResize));
        }
        // ctx.lineTo(xv, h * (1 - yv * vResize));
        ctx.stroke();

        ctx.strokeStyle = "black";

        // draw the points of interest
        if (hover && v.pointsOfInterest) {
            for (let p of v.pointsOfInterest || []) {
                let r = (p.radius || 7) * window.devicePixelRatio;

                ctx.fillStyle = 'white';

                const peakX = this.bound(p.x) * w;
                const yVal = (peakX == 0 || peakX == w) ? v.fn(peakX / w) : p.y;
                const peakY = h * (1 - this.bound(yVal) * vResize);

                this.drawCircle(ctx, peakX, peakY, r);

                if (this.dist(x, y, this.bound(p.x), this.bound(yVal)) < r) {
                    ctx.fillStyle = 'black';
                    this.updateCursorStyle('grab');
                } else {
                    ctx.fillStyle = 'gray';
                    this.updateCursorStyle('');
                }
                this.drawCircle(ctx, peakX, peakY, r);
            }
        } else {
            this.updateCursorStyle('');
        }
    },

    updateProgress(progress) {
        const pos = Math.round(progress * this.peakWidth * (this.width - this.RIGHT_BORDER) / this.width) / window.devicePixelRatio;
        this.style(this.progressWave, { width: pos + 'px' });
        return progress * this.peakWidth / this.width;
    },

    // pixel distance between points in [0, 1]
    dist(x1, y1, x2, y2) {
        const h = this.height - this.TOP_BORDER,
              w = this.width - this.RIGHT_BORDER;

        return Math.sqrt((x1-x2)*(x1-x2)*w*w + (y1-y2)*(y1-y2)*h*h)
    },

    bound(x) {
        return Math.min(Math.max(x, 0.0), 1.0);
    }
});
