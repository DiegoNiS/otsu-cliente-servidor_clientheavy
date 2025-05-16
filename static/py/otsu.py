import numpy as np

def otsu_threshold(image_data, width, height):
    image = np.array(image_data, dtype=np.uint8).reshape((height, width))
    
    # Histograma
    hist, _ = np.histogram(image.flatten(), bins=256, range=(0, 256))
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

    # Binarización
    binary_image = (image >= threshold) * 255
    return binary_image.astype(np.uint8).flatten().tolist()
