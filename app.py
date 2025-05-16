from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("image")
    if file:
        path = os.path.join("static", "uploads", file.filename)
        file.save(path)
        return jsonify({"message": "Imagen guardada exitosamente.", "path": path})
    return jsonify({"error": "No se recibió ninguna imagen"}), 400

if __name__ == "__main__":
    app.run(debug=True)
