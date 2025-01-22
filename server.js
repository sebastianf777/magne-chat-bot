const express = require('express');
const axios = require('axios');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Built-in JSON parser

// OpenAI Configuration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY // This is also the default, can be omitted if you want to automatically use this environment variable
  });

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

        // console.log("Artículos procesados:", articulos); // Log para depuración
        return articulos;
    } catch (error) {
        console.error("Error al obtener los artículos:", error);
        return [];
    }
}

// //modelos disponibles
// openai.models.list().then((response) => {
//     console.log("Modelos disponibles:", response.data);
// }).catch((error) => {
//     console.error("Error al listar los modelos:", error.response?.data || error.message);
// });


// Usar OpenAI GPT para responder preguntas
async function procesarPreguntaConGPT(pregunta, articulos) {
    try {
        // Concatenar contenido relevante
        const contexto = articulos
            .map((articulo) => `Título: ${articulo.titulo}\nContenido: ${articulo.contenido}\nEnlace: ${articulo.enlace}`)
            .join("\n\n");

        // Enviar la pregunta y el contexto a OpenAI
        const prompt = `Usa el siguiente contexto para responder la pregunta de manera clara y concisa.\n\nContexto:\n${contexto}\n\nPregunta: ${pregunta}\n\nRespuesta:`;

        const respuestaGPT = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "Eres un asistente útil y experto en responder preguntas con base en contexto proporcionado. Explicas todo de forma resumida en 3 lineas" },
                { role: "user", content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.7,
        });

        return respuestaGPT.choices[0].message.content.trim();
    } catch (error) {
        console.error("Error al procesar la pregunta con GPT:", error.response?.data || error.message);
        return "Hubo un problema al procesar tu pregunta con GPT.";
    }
}

// Endpoint para el chatbot
app.post('/chat', async (req, res) => {
    const { pregunta } = req.body;

    if (!pregunta || typeof pregunta !== 'string') {
        return res.status(400).json({ error: "La pregunta es inválida o no está definida." });
    }

    // Obtener artículos
    const articulos = await obtenerArticulos();

    if (articulos.length === 0) {
        return res.json({ respuesta: "No se encontraron artículos para buscar." });
    }

    // Usar OpenAI GPT para procesar la pregunta
    const respuesta = await procesarPreguntaConGPT(pregunta, articulos);

    res.json({ respuesta });
});

app.use((req, res) => {
    res.status(404).json({ error: "Ruta no encontrada" });
});

// Export the app for Vercel
module.exports = app;

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});