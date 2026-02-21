import { FastifyInstance } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import sharp from 'sharp'
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

        // Step 1: Compress image with sharp to reduce Gemini token cost
        const compressedImage = await sharp(buffer)
            .resize({ width: 1024, withoutEnlargement: true })
            .jpeg({ quality: 70 })
            .toBuffer()

        // Step 2: Send compressed image to Gemini for extraction
        const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string)
        const model = gemini.getGenerativeModel({
            model: "gemini-2.0-flash-lite",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const prompt = "Extract all details from this receipt image accurately.";

        try {
            const result = await model.generateContent([prompt, {
                inlineData: {
                    data: compressedImage.toString('base64'),
                    mimeType: 'image/jpeg'
                }
            }])

            const receiptData = JSON.parse(result.response.text());
            return reply.send(receiptData);
        } catch (err: unknown) {
            if (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 429) {
                return reply.status(429).send({ error: 'Gemini API rate limit exceeded. Please wait and try again.' });
            }
            throw err;
        }
    })
}

export default receiptRoutes






