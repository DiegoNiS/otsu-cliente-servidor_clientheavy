from flask import Flask, render_template, request, jsonify, send_from_directory
import os

app = Flask(__name__)

# Ensure uploads directory exists
UPLOAD_FOLDER = os.path.join("static", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("image")
    if file:
        path = os.path.join(UPLOAD_FOLDER, file.filename)
        file.save(path)
        return jsonify({"message": "Imagen guardada exitosamente.", "path": path})
    return jsonify({"error": "No se recibió ninguna imagen"}), 400

@app.route("/images", methods=["GET"])
def get_images():
    images = []
    for filename in os.listdir(UPLOAD_FOLDER):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp')):
            images.append({
                "name": filename,
                "path": f"/static/uploads/{filename}"
            })
    return jsonify(images)

@app.route("/static/uploads/<filename>")
def serve_image(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == "__main__":
    app.run(debug=True)
