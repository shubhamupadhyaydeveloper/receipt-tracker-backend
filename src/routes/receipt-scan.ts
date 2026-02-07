import { FastifyInstance } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
// import pdfParse from 'pdf-parse';
import { request } from 'http';
import { recognize } from 'tesseract.js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { SchemaType } from '@google/generative-ai'
import { Schema } from '@google/generative-ai'

const schema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
        vendorName: { type: SchemaType.STRING },
        totalAmount: { type: SchemaType.STRING },
        taxAmount: { type: SchemaType.STRING },
        currency: { type: SchemaType.STRING },
        date: { type: SchemaType.STRING },
        category: {
            type: SchemaType.STRING,
            format: "enum",
            enum: [
                "Food & Dining",
                "Software Subscription",
                "Electronics",
                "Travel",
                "Health & Fitness",
                "Other"
            ],
        },
    },
    required: ["vendorName", "totalAmount", "currency", "taxAmount"],
}

const receiptRoutes = async (fastify: FastifyInstance) => {
    fastify.post('/receipt-scan', async (request, reply) => {
        const data: MultipartFile | undefined = await request.file()
        console.log('api key',process.env.GEMINI_API_KEY)

        if (!data) {
            return reply.status(400).send({ error: 'No file uploaded' })
        }

        const buffer = await data.toBuffer()
        
        const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string)
        const model = gemini.getGenerativeModel({
            model: "gemini-2.0-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const prompt = "Extract all details from this receipt image accurately.";

        try {
            const result = await model.generateContent([prompt, {
                inlineData: {
                    data: buffer.toString('base64'),
                    mimeType: data.mimetype
                }
            }])

            const receiptData = JSON.parse(result.response.text());
            return reply.send(receiptData);
        } catch (err: any) {
            if (err?.status === 429) {
                return reply.status(429).send({ error: 'Gemini API rate limit exceeded. Please wait and try again.' });
            }
            throw err;
        }
    })
}

export default receiptRoutes






