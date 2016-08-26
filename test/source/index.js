'use strict';

// libs
const PIXI = require('pixi.js');
const dat = require('dat-gui');

// modules
const AlphaVideoSprite = require('../../source/AlphaVideoSprite');

const CONFIG = {
  videoUrl: '/videos/claw_medium_test.mp4', //'/videos/compressed.mp4',
  verticalPadding: 0,
  videoAlpha: 1,
}

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
    this.videoSprite = null;

    // get screen dimensions
    this.screen = {
      w: window.innerWidth,
      h: window.innerHeight,
    };

    // init PIXI
    this.renderer = new PIXI.WebGLRenderer(this.screen.w, this.screen.h, {
      backgroundColor : 0xffffff,
      // transparent: true,
      antialias: true,
      forceFXAA: true,
    });
    document.body.appendChild(this.renderer.view);

    // create stage
    this.stage = new PIXI.Container();

    // bind run loop
    this.proxyTick = this.tick.bind(this);

    // load video and then start
    this.loadVideo();

    // listen for events
    this.listen();
  }

  loadVideo(done) {

    // create texture (and begin loading asset)
    var texture = PIXI.Texture.fromVideoUrl(CONFIG.videoUrl);

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
      ctx.videoSprite = new AlphaVideoSprite(texture, -1, false);

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
    var ctx = this;

    window.addEventListener('resize', (e) => {
      ctx.resize.call(this);
    });

    this.renderer.view.addEventListener('click', (e) => {
      ctx.setBackgroundColor.call(ctx);
    });
    document.body.addEventListener('keydown', (e) => {
      var keyCode = e.keyCode;

      if (keyCode === 66) // `b` for `black`
      {
        ctx.setBackgroundColor.call(ctx, 0x000000);
      }
      else if (keyCode === 87) // `w` for `white`
      {
        ctx.setBackgroundColor.call(ctx, 0xffffff);
      }
    })
  }

  resize() {
    var bgW = this.screen.w = window.innerWidth;
    var bgH = this.screen.h = window.innerHeight;
  
    this.renderer.resize(bgW, bgH);

    this.positionVideoSprite(bgW, bgH);

    this.setBackgroundColor(this.backgroundColor);
  }

  positionVideoSprite(bgW, bgH) {
    if (!this.videoSprite)
      return;

    // get background size
    var bgW = bgW ||this.screen.w;
    var bgH = bgH || this.screen.h;

    // get video size (from srcEl)
    var videoW = this.videoSprite.srcWidth;
    var videoH = this.videoSprite.srcHeight / 2;

    // scale video
    var bgHPadded = Math.max(bgH - CONFIG.verticalPadding, 150); // min padded height of 150
    var videoScale = bgHPadded / videoH;
    this.videoSprite.scale.set(videoScale);

    // get new video size
    videoW = this.videoSprite.width;
    videoH = this.videoSprite.height;

    // center video
    this.videoSprite.x = (bgW / 2) - (videoW / 2);
    this.videoSprite.y = (bgH / 2) - (videoH / 2);
  }

  setBackgroundColor(color) {

    this.backgroundColor = typeof color === 'number' ? color : getRandomColor();

    this.background.clear();
    this.background.beginFill(this.backgroundColor); 
    this.background.lineStyle(1, 0xffffff, 0);
    this.background.drawRect(0, 0, this.screen.w, this.screen.h);
    this.background.endFill();
  }

  start() {

    // create background
    this.background = new PIXI.Graphics();
    this.stage.addChild(this.background);
    this.setBackgroundColor();


    this.stage.addChild(this.videoSprite);
    
    this.resize();

    if (window.guiController)
      window.guiController.init(this);

    this.proxyTick();
  }

  tick() {
    requestAnimationFrame(this.proxyTick);

    this.videoSprite.update();

    this.renderer.render(this.stage);
  }
}

// 
// returns random color in either decimals or as a hex string
// 
// Explanation:
// - http://www.paulirish.com/2009/random-hex-color-code-snippets/
// - http://www.daverabideau.com/blog/randomly-generated-hex-codes-in-javascript/
// 
function getRandomColor(toHexString) {
  var randomColorDecimal = Math.floor(Math.random()*16777215);

  return toHexString ?
    '#' + randomColorDecimal.toString(16) : randomColorDecimal;
}


class GuiController {
  constructor() {
    this.gui = new dat.GUI();
  }

  // called when video loads
  init(testApp) {

    this.gui.add(CONFIG, 'videoAlpha', 0, 1)
    .onChange((val) => {

      testApp.videoSprite.alpha = val;
    });

    this.gui.add(CONFIG, 'verticalPadding', 0, 500)
    .onChange((val) => {

      testApp.positionVideoSprite();
    });
  }
}

// start it up
window.addEventListener('load', function() {

  const testApp = window.testApp = new TestApp();

  const guiController = window.guiController = new GuiController();
});