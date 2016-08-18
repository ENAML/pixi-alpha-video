'use strict';

// libs
const PIXI = require('pixi.js');

// modules
const Video = require('./Video');


const BG_COLORS = [
  'white',
  'green',
  'pink',
  'yellow',
  'blue',
  'black'
];
var bgColorIndex = 0;

// main app
class TestApp {
  constructor() {

    // init vars
    this.video = null;

    // get screen dimensions
    this.screen = {
      w: window.innerWidth,
      h: window.innerH,
    };

    // init PIXI
    this.renderer = new PIXI.WebGLRenderer(this.screen.w, this.screen.h, {
      // backgroundColor : 0xffffff,
      transparent: true,
      antialias: true,
      forceFXAA: true,
    });
    document.body.appendChild(this.renderer.view);

    // create stage
    this.stage = new PIXI.Container();

    // bind run loop
    this.tickBound = this.tick.bind(this);

    // load video and then start
    this.loadVideo();

    // listen for events
    this.listen();
  }

  loadVideo(done) {

    // create texture (and begin loading asset)
    var texture = PIXI.Texture.fromVideoUrl('/videos/compressed.mp4');

    // get the html src el
    var srcEl = texture.baseTexture.source;

    // set things to listen for on load / error
    var loadEvtEl = srcEl;
    var vidSources = srcEl.querySelectorAll('source');
    var errEvtEl = vidSources[vidSources.length - 1];

    var ctx = this;

    function onCanPlayThrough() {
      console.log('video loaded!');

      // remove listeners
      loadEvtEl.removeEventListener('canplaythrough', onCanPlayThrough);
      errEvtEl.removeEventListener('error', onError);

      // create video
      ctx.video = new Video(texture);

      // start it up!
      ctx.start.call(ctx);
    }

    function onError() {
      console.warn('video could not be loaded');

      // remove listeners
      loadEvtEl.removeEventListener('canplaythrough', onCanPlayThrough);
      errEvtEl.removeEventListener('error', onError);
    }

    // listen for events
    loadEvtEl.addEventListener('canplaythrough', onCanPlayThrough);
    errEvtEl.addEventListener('error', onError);
  }

  listen() {
    document.body.addEventListener('click', (e) => {
      this.setBackgroundColor();
    });
  }

  setBackgroundColor() {
    document.body.style.backgroundColor =
      BG_COLORS[++bgColorIndex % BG_COLORS.length];
  }

  start() {
    
    this.stage.addChild(this.video.sprite);
    
    this.tickBound();
  }

  tick() {
    requestAnimationFrame(this.tickBound);

    this.renderer.render(this.stage);
  }
}

// start it up
window.addEventListener('load', function() {

  const testApp = window.testApp = new TestApp();
});