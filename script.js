let stream;
let videoElement = document.getElementById('video');
let canvasElement = document.getElementById('canvas');
let alumnosReconocidos = [];
let alumnosLista = document.getElementById('alumnosLista');
let contexto = canvasElement.getContext('2d');
let currentStream = null;
let currentDeviceId = null;

let deteccionesAlumnos = [];

// Cargar los modelos de face-api.js
async function cargarModelos() {
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        console.log("Modelos cargados correctamente.");
    } catch (error) {
        console.error("Error al cargar los modelos:", error);
    }
}

// Iniciar la cámara
async function iniciarCamara() {
    const constraints = {
        video: {
            facingMode: currentDeviceId ? (currentDeviceId === 'user' ? 'user' : 'environment') : 'user',
            width: { ideal: 640 },
            height: { ideal: 480 }
        }
    };

    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = stream;
        canvasElement.width = videoElement.width;
        canvasElement.height = videoElement.height;
    } catch (err) {
        console.error('Error al acceder a la cámara: ', err);
    }
}

// Alternar cámara
function alternarCamara() {
    currentDeviceId = currentDeviceId === 'user' ? 'environment' : 'user';
    iniciarCamara();
}

// Tomar foto y reconocer rostro
async function tomarFoto() {
    if (!faceapi) {
        console.error('face-api.js no está cargado.');
        return;
    }

    if (videoElement.srcObject) {
        const detecciones = await faceapi.detectAllFaces(videoElement)
            .withFaceLandmarks()
            .withFaceDescriptors();

        if (detecciones.length > 0) {
            console.log(`Rostros detectados: ${detecciones.length}`);
            reconocerRostros(detecciones);
        } else {
            console.log("No se detectaron rostros.");
        }
    } else {
        console.error("No se ha iniciado el video.");
    }
}

// Función para cargar la foto de un alumno
async function cargarAlumno() {
    const fotoInput = document.getElementById('fotoAlumno');
    if (!fotoInput.files || fotoInput.files.length === 0) {
        alert("Por favor selecciona una foto.");
        return;
    }

    const fotoAlumno = fotoInput.files[0];
    const imagen = await loadImage(fotoAlumno);
    canvasElement.width = imagen.width;
    canvasElement.height = imagen.height;
    contexto.drawImage(imagen, 0, 0);

    const detecciones = await faceapi.detectAllFaces(canvasElement)
        .withFaceLandmarks()
        .withFaceDescriptors();

    if (detecciones.length > 0) {
        detecciones.forEach(deteccion => {
            const descriptor = deteccion.descriptor;
            const nombreAlumno = fotoAlumno.name;  // Usamos el nombre del archivo de la foto
            alumnosReconocidos.push({ nombre: nombreAlumno, descriptor: descriptor });
            const li = document.createElement('li');
            li.textContent = nombreAlumno;
            alumnosLista.appendChild(li);
        });
        console.log("Alumno cargado correctamente.");
    } else {
        console.log("No se detectó rostro en la foto.");
    }
}

// Función para reconocer a los alumnos cargados
async function reconocerRostros(detecciones) {
    detecciones.forEach(deteccion => {
        const rostro = deteccion.descriptor;
        let reconocimiento = "Desconocido";

        // Comparamos con los modelos cargados
        alumnosReconocidos.forEach(alumno => {
            const dist = faceapi.euclideanDistance(alumno.descriptor, rostro);
            if (dist < 0.6) {  // Umbral de comparación
                reconocimiento = alumno.nombre;
            }
        });

        if (reconocimiento !== "Desconocido") {
            console.log(`Rostro reconocido: ${reconocimiento}`);
        } else {
            console.log("Rostro desconocido.");
        }
    });
}

// Cargar imagen
function loadImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Asociar los eventos a los botones
document.getElementById('cargarModelos').addEventListener('click', cargarModelos);
document.getElementById('tomarFoto').addEventListener('click', tomarFoto);
document.getElementById('alternarCamara').addEventListener('click', alternarCamara);
document.getElementById('cargarAlumno').addEventListener('click', cargarAlumno);

// Iniciar la cámara al cargar la página
window.onload = () => {
    cargarModelos().then(iniciarCamara);
};
