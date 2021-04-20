/**
 * Creates a canvas element, loads an image from a file, and returns the image data
 * @param {string} path The path of the file to load
 * @param {number} size The size of the image file (i.e. width/height in pixels). A square image is assumed.  
 * @param {function} callback The function to execute once the image has been loaded
 */
 export function createImageDataFromFile(path, size, callback) {
    const _canvas = document.createElement("canvas");
    const _canvasContext = _canvas.getContext("2d");
    const _image = new Image();
    _image.onload = function() {
        _canvasContext.drawImage(_image,0,0,size,size);
        const _imageData = _canvasContext.getImageData(0,0,size,size);
        callback(_imageData);
    }
    _image.src = chrome.runtime.getURL(path);
}