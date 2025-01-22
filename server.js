const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// URLs de las APIs
const urls = [
    "https://magnesiusai.com/wp-json/wp/v2/posts",
    "https://wellness.magnesiusai.com/wp-json/wp/v2/posts",
    "https://robot.magnesiusai.com/wp-json/wp/v2/posts"
];

// Obtener artículos de las APIs
async function obtenerArticulos() {
    try {
        const solicitudes = urls.map(url => axios.get(url));
        const respuestas = await Promise.all(solicitudes);

        // Procesar y extraer información relevante
        const articulos = respuestas.flatMap(respuesta => respuesta.data).map(articulo => ({
            titulo: articulo.title.rendered,
            contenido: articulo.content.rendered,
            enlace: articulo.link
        }));

        console.log("Artículos procesados:", articulos); // Log para depuración
        return articulos;
    } catch (error) {
        console.error("Error al obtener los artículos:", error);
        return [];
    }
}

app.post('/chat', async (req, res) => {
    console.log("Cuerpo de la solicitud recibido:", req.body); // Log para inspeccionar el cuerpo de la solicitud

    const { pregunta } = req.body;

    // Validar que la pregunta existe
    if (!pregunta || typeof pregunta !== 'string') {
        console.log("Pregunta inválida o no definida.");
        return res.status(400).json({ error: "La pregunta es inválida o no está definida." });
    }

    // Obtener artículos
    const articulos = await obtenerArticulos();

    // Buscar coincidencias en el contenido de los artículos
    const articuloRelevante = articulos.find(articulo =>
        articulo.contenido.toLowerCase().includes(pregunta.toLowerCase())
    );

    // Responder con el contenido relevante o un mensaje predeterminado
    if (articuloRelevante) {
        res.json({
            respuesta: `Encontré esta información que podría ser útil: ${articuloRelevante.contenido}`,
            enlace: articuloRelevante.enlace
        });
    } else {
        res.json({ respuesta: "Lo siento, no encontré información relevante." });
    }
});


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
