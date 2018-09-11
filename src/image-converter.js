import Vertigo from './vertigo';
import { DOT_STEP } from './utils';
import generateRandomImage from './random-generator';

function convertBrightness(rectBrightness, useLowRes) {
  if (useLowRes) {
    if (rectBrightness < 100) {
      return 1;
    } else if (rectBrightness < 200) {
      return 2.5;
    }

    return 5;
  }

  return parseFloat((1 + rectBrightness / 63.75).toFixed(1)); // 1 - 5
}

class VertigoConverter {
  constructor() {
    this.handleFileInputChange = this.handleFileInputChange.bind(this);
    this.handleRangeInputChange = this.handleRangeInputChange.bind(this);
    this.processImage = this.processImage.bind(this);


    // Code element
    this.imageCodeElement = document.querySelector('#Converter-imageCode');

    // File input
    this.fileInput = document.querySelector('#Converter-fileInput');
    this.fileInput.addEventListener('change', this.handleFileInputChange);

    // Size input
    this.sizeInput = document.querySelector('#Converter-sizeInput');
    this.sizeInput.addEventListener('change', this.handleRangeInputChange);
    this.size = parseInt(this.sizeInput.value, 10);

    // Resolution input
    this.resolutionInput = document.querySelector('#Converter-resolutionInput');
    this.resolutionInput.addEventListener('change', this.handleRangeInputChange);
    this.resolution = parseInt(this.resolutionInput.value, 10);

    // Checkbox input
    this.lowResCheckbox = document.querySelector('#Converter-lowResCheckbox');
    this.lowResCheckbox.addEventListener('change', this.processImage);

    // Image element
    this.image = new Image(this.size, this.size);

    this.imageLoaded = false;

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;

    this.ctx = this.canvas.getContext('2d');

    // Insance of vertigo
    this.vertigo = new Vertigo({
      size: this.size,
      resolution: this.resolution,
    });

    // Append vertigo and canvas
    const imagesWrapper = document.querySelector('#Converter-images');
    imagesWrapper.append(this.vertigo.svg);
    imagesWrapper.append(this.canvas);


    // Load initial image
    // this.image = new Image(this.size, this.size);
    // this.image.src = 'test-images/hello.png';
    // this.image.addEventListener('load', this.processImage);

    // for (let i = 0; i < 10; i++) {
    //   setTimeout(() => {
    //     this.vertigo.drawImage(generateRandomImage(25));
    //   }, i * 3000);
    // }
  }

  handleFileInputChange() {
    const file = this.fileInput.files[0];

    this.imageLoaded = true;

    this.image.src = URL.createObjectURL(file);
    this.image.addEventListener('load', this.processImage);
  }

  handleRangeInputChange(e) {
    const name = e.target.name;
    const value = parseInt(e.target.value, 10);

    this[name] = value;

    if (name === 'size') {
      this.canvas.width = value;
      this.canvas.height = value;
      this.vertigo.setSize(value);
    } else {
      this.vertigo.setResolution(value);
    }

    this.processImage();
  }

  // setSize(size) {
  //   this.size = size;
  //   this.canvas.width = value;
  //   this.canvas.height = value;
  //
  //   this.processImage();
  // }
  //
  // setResolution(resolution) {
  //   this.resolution = resolution;
  //   this.processImage();
  // }

  // makeSureCoordinateIsInBounds(coord) {
  //   if (coord < 0) {
  //     return 0;
  //   }
  //
  //   if (coord > this.size) {
  //     return this.size;
  //   }
  //
  //   return coord;
  // }

  getRectBrightness(x, y, squareSize) {
    const imageData = this.ctx.getImageData(x, y, squareSize, squareSize);

    let rectBrightness = 0;

    for (let k = 0; k < imageData.data.length; k += 4) {
      const r = imageData.data[k];
      const g = imageData.data[k + 1];
      const b = imageData.data[k + 2];
      // TODO should we include alpha?
      // const a = imageData.data[k + 3];

      rectBrightness += 0.299 * r + 0.587 * g + 0.114 * b;
    }

    // 4 numbers per each pixel - r,g,b,a
    return rectBrightness / (imageData.data.length / 4);
  }

  processImage() {
    if (!this.imageLoaded) {
      return;
    }

    this.ctx.clearRect(0, 0, this.size, this.size);
    this.ctx.drawImage(this.image, 0, 0, this.size, this.size);

    // Adding a half of circle to accomodate for square size
    const radiusGrowStep = (this.size / 2) / (this.resolution + 0.5);
    const squareSize = radiusGrowStep > 1 ? radiusGrowStep : 1;

    const offset = (this.size / 2) - (squareSize / 2);

    const helperRects = [];

    const centerRectCoordinate = offset;
    const centerBrightness = this.getRectBrightness(centerRectCoordinate, centerRectCoordinate, squareSize);
    const centerScale = convertBrightness(centerBrightness, this.lowResCheckbox.checked);

    // TODO add real center
    const convertedImage = [
      [centerScale]
    ];

    helperRects.push([centerRectCoordinate, centerRectCoordinate, squareSize, squareSize]);

    for (let i = 1; i <= this.resolution; i++) {
      const r = i * radiusGrowStep;

      const dotCount = i * DOT_STEP;
      const dotAngleStep = 360 / dotCount;

      convertedImage[i] = [];

      for (let j = 0; j < dotCount; j++) {
        const angle = Math.PI * (dotAngleStep * j) / 180;

        const squareCenterX = r * Math.cos(angle);
        const squareCenterY = r * Math.sin(angle);

        const x = squareCenterX + offset;
        const y = squareCenterY + offset;

        const rectBrightness = this.getRectBrightness(x, y, squareSize);

        convertedImage[i][j] = convertBrightness(rectBrightness, this.lowResCheckbox.checked);

        helperRects.push([x, y, squareSize, squareSize]);
      }
    }

    // Draw image
    this.vertigo.drawImage(convertedImage);

    // Display code
    this.imageCodeElement.innerHTML = JSON.stringify(convertedImage)
      .replace(/\]\,\[/g, '],\n  [')
      .replace('[[', 'const image = [\n  [')
      .replace(']]', ']\n];');

    // Draw helper rectangles to help user visualise
    this.ctx.strokeStyle = 'rgba(180, 150, 220, 0.6)';
    helperRects.forEach(params => this.ctx.strokeRect(...params));
  }
}

export default VertigoConverter;
