import { FastifyInstance } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import sharp from 'sharp'
import { GoogleGenerativeAI, SchemaType, Schema } from '@google/generative-ai'
import { db } from '../db';

// Module-level singleton — avoids re-initialising the client on every request
const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string)

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'])

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
    required: ["vendorName", "totalAmount", "currency", "taxAmount", "date", "category"],
}

const receiptRoutes = async (fastify: FastifyInstance) => {
    fastify.post('/receipt-scan', async (request, reply) => {
        const data: MultipartFile | undefined = await request.file()

        const { neonUser } = request
        if (!neonUser) {
            return reply.status(401).send({ error: 'User not found' })
        }

        if (!data) {
            return reply.status(400).send({ error: 'No file uploaded' })
        }

        if (!ALLOWED_MIME_TYPES.has(data.mimetype)) {
            return reply.status(400).send({ error: 'Invalid file type. Only JPEG, PNG, WebP, and HEIC images are supported.' })
        }

        const buffer = await data.toBuffer()

        // Step 1: Compress image with sharp to reduce Gemini token cost
        // - 800px max width (receipts don't need high res)
        // - grayscale (receipts are B&W, halves file size)
        // - quality 50 (enough for text extraction)
        const compressedImage = await sharp(buffer)
            .resize({ width: 800, withoutEnlargement: true })
            .grayscale()
            .jpeg({ quality: 50 })
            .toBuffer()

        // Step 2: Send compressed image to Gemini for extraction
        const model = gemini.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });

        const prompt = "Extract all details from this receipt image accurately.";
        request.log.info({ imageSize: compressedImage.length }, '[receipt-scan] sending to Gemini')

        try {
            const result = await model.generateContent([prompt, {
                inlineData: {
                    data: compressedImage.toString('base64'),
                    mimeType: 'image/jpeg'
                }
            }])

            const receiptData = JSON.parse(result.response.text());

            // Increment usage counter only after a successful extraction
            await db.query(
                `UPDATE user_profiles SET receipts_scanned_this_month = receipts_scanned_this_month + 1 WHERE id = $1`,
                [neonUser.id]
            )

            return reply.send(receiptData);
        } catch (err: unknown) {
            request.log.error({ err }, 'Gemini API error')
            if (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 429) {
                return reply.status(429).send({ error: 'Gemini API rate limit exceeded. Please wait and try again.' });
            }
            throw err;
        }
    })
}

export default receiptRoutes






