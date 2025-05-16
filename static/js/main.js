let pyodide;

async function loadPyodideAndScript() {
    pyodide = await loadPyodide();
    await pyodide.loadPackage("numpy");
    console.log("Loaded numpy");

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
}

await loadPyodideAndScript();

document.getElementById("imageInput").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
            const container = document.getElementById("originalImageContainer");
            container.innerHTML = "";
            container.appendChild(img);
            processImage(img);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
});

async function processImage(img) {
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
    const outputCanvas = document.getElementById("resultCanvas");
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
