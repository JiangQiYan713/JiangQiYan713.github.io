/* External asset manifest. Edit here, not in index.html. */
window.WALLPAPER_CONFIG = {
  "meta": {
    "title": "OC Cyberpunk Live Wallpaper",
    "version": "1.1.0-offline-fix",
    "author": "ChatGPT"
  },
  "canvas": {
    "width": 1672,
    "height": 941,
    "background": "#08040e"
  },
  "scene": {
    "fit": "cover",
    "mouseInfluenceRadius": 170
  },
  "defaults": {
    "backgroundBlur": 0.35,
    "backgroundBrightness": 0.93,
    "saturation": 1.06,
    "parallax": 12,
    "hairStrength": 1.0,
    "particleCount": 85,
    "particleSpeed": 1.0,
    "twinkleIntensity": 0.95,
    "showParticles": true,
    "showTwinkles": true,
    "pause": false
  },
  "layers": [
    {
      "name": "background",
      "type": "background",
      "z": 0,
      "folder": "assets/background/",
      "frames": [
        "bg_01.png"
      ],
      "scale": 1,
      "offsetX": 0,
      "offsetY": 0,
      "opacity": 1
    },
    {
      "name": "leftHair",
      "type": "animated-hair",
      "z": 1,
      "folder": "assets/hair_left/",
      "frames": [
        "frame_00.png",
        "frame_01.png",
        "frame_02.png",
        "frame_03.png",
        "frame_04.png",
        "frame_05.png",
        "frame_06.png",
        "frame_07.png",
        "frame_08.png",
        "frame_09.png",
        "frame_10.png",
        "frame_11.png",
        "frame_12.png",
        "frame_13.png",
        "frame_14.png",
        "frame_15.png",
        "frame_16.png",
        "frame_17.png",
        "frame_18.png",
        "frame_19.png",
        "frame_20.png",
        "frame_21.png",
        "frame_22.png",
        "frame_23.png"
      ],
      "fps": 7,
      "playbackSpeed": 1,
      "scale": 0.58,
      "offsetX": -220,
      "offsetY": -110,
      "opacity": 1,
      "phase": 0
    },
    {
      "name": "rightHair",
      "type": "animated-hair",
      "z": 2,
      "folder": "assets/hair_right/",
      "frames": [
        "frame_00.png",
        "frame_01.png",
        "frame_02.png",
        "frame_03.png",
        "frame_04.png",
        "frame_05.png",
        "frame_06.png",
        "frame_07.png",
        "frame_08.png",
        "frame_09.png",
        "frame_10.png",
        "frame_11.png",
        "frame_12.png",
        "frame_13.png",
        "frame_14.png",
        "frame_15.png",
        "frame_16.png",
        "frame_17.png",
        "frame_18.png",
        "frame_19.png",
        "frame_20.png",
        "frame_21.png",
        "frame_22.png",
        "frame_23.png"
      ],
      "fps": 7,
      "playbackSpeed": 1,
      "scale": 0.58,
      "offsetX": 300,
      "offsetY": -100,
      "opacity": 1,
      "phase": 1.1
    },
    {
      "name": "body",
      "type": "body",
      "z": 3,
      "folder": "assets/body/",
      "frames": [
        "body_00.png"
      ],
      "scale": 1,
      "offsetX": 0,
      "offsetY": 0,
      "opacity": 1
    },
    {
      "name": "otherHair",
      "type": "other-hair",
      "z": 4,
      "folder": "assets/hair_other/",
      "frames": [
        "frame_00.png"
      ],
      "scale": 0.78,
      "offsetX": 0,
      "offsetY": -150,
      "opacity": 1
    }
  ],
  "particles": {
    "heartRatio": 0.25,
    "minSize": 1.0,
    "maxSize": 6.0,
    "velocityMin": 0.05,
    "velocityMax": 0.26,
    "driftX": 0.035,
    "driftY": -0.02,
    "mouseForce": 0.028,
    "mouseSwirl": 0.004,
    "edgeWrapPadding": 30,
    "palette": [
      "#ff5ad7",
      "#ffa1ef",
      "#b88aff",
      "#8c7bff"
    ]
  },
  "twinkles": {
    "desiredCount": 165,
    "radiusMin": 0.55,
    "radiusMax": 1.6
  }
};
