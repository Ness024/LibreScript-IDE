import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { main } from './Librescript-main-FINAL/main.js';


const app = express();
app.use(cors());
app.use(bodyParser.json());

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

app.listen(3000, () => {
    console.log('LibreScript IDE Backend corriendo en el puerto 3000 http://localhost:3000');
});