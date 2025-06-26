import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { main } from './Librescript-main-FINAL/main.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../Frontend')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/LibreSriptIDE.html'));
});

app.post('/execute', async (request, response) => {

    try {

        const code = request.body.code;

        if (!code || (typeof code !== 'string')) {
            return response.status(400).json({
                error: 'No code provided in request body'
            });
        }
        const output = await main(code);

        response.json({
            output
        });
    } catch (error) {
        response.status(500).json({
            error: 'Execution failed', details: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`LibreScript IDE Backend corriendo en el puerto ${PORT}`);
    console.log(`URL: http://localhost:${PORT}`);
});