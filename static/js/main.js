let pyodide;
let currentOriginalImage = null;
let currentOriginalFileName = null;
let currentServerImage = null;

// Loading overlay functions
function showLoading() {
    const overlay = document.querySelector('.loading-overlay');
    overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    overlay.style.display = 'none';
}

// Función para redimensionar imágenes grandes
function resizeImage(img, maxSize = 800) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    let width = img.width;
    let height = img.height;
    
    // Calcular el factor de escala
    if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
    } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
    }
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
    
    return canvas;
}

async function loadPyodideAndScript() {
    showLoading();
    await new Promise(resolve => setTimeout(resolve, 50)); 
    try {
        pyodide = await loadPyodide();
        await pyodide.loadPackage("numpy");

        const otsuCode = `
import numpy as np

def otsu_threshold(image_data, width, height):
    image = np.array(image_data, dtype=np.uint8).reshape((height, width))
    hist, _ = np.histogram(image.flatten(), bins=256, range=(0, 256))
    hist = hist.astype(np.int32)  # <- Optimizado: menor uso de memoria
    total = image.size
    sum_total = np.dot(np.arange(256), hist)

    sumB = 0
    wB = 0
    max_var = 0
    threshold = 0

    for i in range(256):
        wB += hist[i]
        if wB == 0:
            continue
        wF = total - wB
        if wF == 0:
            break
        sumB += i * hist[i]
        mB = sumB / wB
        mF = (sum_total - sumB) / wF
        var_between = wB * wF * (mB - mF) ** 2
        if var_between > max_var:
            max_var = var_between
            threshold = i

    binary_image = (image >= threshold) * 255
    return binary_image.astype(np.uint8).flatten().tolist()
`;
        await pyodide.runPython(otsuCode);
    } finally {
        hideLoading();
    }
}

await loadPyodideAndScript();

// Load server images on page load
async function loadServerImages() {
    const response = await fetch('/images');
    const images = await response.json();
    const select = document.getElementById('serverImages');
    select.innerHTML = '';
    images.forEach(image => {
        const option = document.createElement('option');
        option.value = image.path;
        option.textContent = image.name;
        select.appendChild(option);
    });
}

loadServerImages();

// Client-side image processing
document.getElementById("imageInput").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    currentOriginalFileName = file.name;
    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const container = document.getElementById("originalImageContainer");
            container.innerHTML = "";
            // Redimensionar la imagen si es muy grande
            const resizedCanvas = resizeImage(img);
            const resizedImg = new Image();
            resizedImg.src = resizedCanvas.toDataURL();
            container.appendChild(resizedImg);
            currentOriginalImage = resizedImg;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

// Process image locally
document.getElementById("processLocalImage").addEventListener("click", async function() {
    if (!currentOriginalImage) {
        alert('Por favor, seleccione una imagen primero');
        return;
    }
    showLoading();
    await new Promise(resolve => setTimeout(resolve, 50)); 
    try {
        await processImage(currentOriginalImage, "resultCanvas");
    } finally {
        hideLoading();
    }
});

// Upload original image to server
document.getElementById("uploadOriginalImage").addEventListener("click", async function() {
    const fileInput = document.getElementById("imageInput");
    const file = fileInput.files[0];
    if (!file) {
        alert('Por favor, seleccione una imagen primero');
        return;
    }

    showLoading();
    await new Promise(resolve => setTimeout(resolve, 50)); 
    try {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        alert(result.message);
        loadServerImages(); // Refresh server images list
    } catch (error) {
        alert('Error al enviar la imagen al servidor');
    } finally {
        hideLoading();
    }
});

// Load server image
document.getElementById("loadServerImage").addEventListener("click", async function() {
    const select = document.getElementById('serverImages');
    const imagePath = select.value;
    if (!imagePath) return;

    showLoading();
    await new Promise(resolve => setTimeout(resolve, 50)); 
    const img = new Image();
    img.onload = function() {
        const container = document.getElementById("serverImageContainer");
        container.innerHTML = "";
        // Redimensionar la imagen si es muy grande
        const resizedCanvas = resizeImage(img);
        const resizedImg = new Image();
        resizedImg.src = resizedCanvas.toDataURL();
        container.appendChild(resizedImg);
        currentServerImage = resizedImg;
        hideLoading();
    };
    img.onerror = function() {
        alert('Error al cargar la imagen del servidor');
        hideLoading();
    };
    img.src = imagePath;
});

// Process server image
document.getElementById("processServerImage").addEventListener("click", async function() {
    if (!currentServerImage) {
        alert('Por favor, cargue una imagen del servidor primero');
        return;
    }
    showLoading();
    await new Promise(resolve => setTimeout(resolve, 50)); 
    try {
        await processImage(currentServerImage, "serverResultCanvas");
    } finally {
        hideLoading();
    }
});

// Save processed server image to client
document.getElementById("saveProcessedImage").addEventListener("click", function() {
    const canvas = document.getElementById("serverResultCanvas");
    if (!canvas.toDataURL) {
        alert('Por favor, procese la imagen primero');
        return;
    }

    const link = document.createElement('a');
    link.download = 'processed_' + currentOriginalFileName;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

async function processImage(img, canvasId) {
    const MAX_SIZE = 512;

    // Escalar imagen si es muy grande
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let scale = 1;

    if (img.width > MAX_SIZE || img.height > MAX_SIZE) {
        scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height);
    }

    canvas.width = Math.floor(img.width * scale);
    canvas.height = Math.floor(img.height * scale);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const gray = [];
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        const grayscale = Math.round((r + g + b) / 3);
        gray.push(grayscale);
    }

    const width = canvas.width;
    const height = canvas.height;

    let result = pyodide.runPython(`
otsu_threshold(${JSON.stringify(gray)}, ${width}, ${height})
`);

    // Mostrar imagen resultante
    const outputCanvas = document.getElementById(canvasId);
    outputCanvas.width = width;
    outputCanvas.height = height;
    const outputCtx = outputCanvas.getContext("2d");
    const outputImage = outputCtx.createImageData(width, height);

    for (let i = 0; i < result.length; i++) {
        const val = result[i];
        outputImage.data[i * 4 + 0] = val;
        outputImage.data[i * 4 + 1] = val;
        outputImage.data[i * 4 + 2] = val;
        outputImage.data[i * 4 + 3] = 255;
    }

    outputCtx.putImageData(outputImage, 0, 0);
}
