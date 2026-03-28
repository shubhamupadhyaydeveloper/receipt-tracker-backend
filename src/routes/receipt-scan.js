"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sharp_1 = __importDefault(require("sharp"));
const generative_ai_1 = require("@google/generative-ai");
const db_1 = require("../db");
// Module-level singleton — avoids re-initialising the client on every request
const gemini = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']);
const schema = {
    type: generative_ai_1.SchemaType.OBJECT,
    properties: {
        vendorName: { type: generative_ai_1.SchemaType.STRING },
        totalAmount: { type: generative_ai_1.SchemaType.STRING },
        taxAmount: { type: generative_ai_1.SchemaType.STRING },
        currency: { type: generative_ai_1.SchemaType.STRING },
        date: { type: generative_ai_1.SchemaType.STRING },
        category: {
            type: generative_ai_1.SchemaType.STRING,
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
};
const receiptRoutes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post('/receipt-scan', (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const data = yield request.file();
        const { neonUser } = request;
        if (!neonUser) {
            return reply.status(401).send({ error: 'User not found' });
        }
        if (!data) {
            return reply.status(400).send({ error: 'No file uploaded' });
        }
        if (!ALLOWED_MIME_TYPES.has(data.mimetype)) {
            return reply.status(400).send({ error: 'Invalid file type. Only JPEG, PNG, WebP, and HEIC images are supported.' });
        }
        const buffer = yield data.toBuffer();
        // Step 1: Compress image with sharp to reduce Gemini token cost
        // - 800px max width (receipts don't need high res)
        // - grayscale (receipts are B&W, halves file size)
        // - quality 50 (enough for text extraction)
        const compressedImage = yield (0, sharp_1.default)(buffer)
            .resize({ width: 800, withoutEnlargement: true })
            .grayscale()
            .jpeg({ quality: 50 })
            .toBuffer();
        // Step 2: Send compressed image to Gemini for extraction
        const model = gemini.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        });
        const prompt = "Extract all details from this receipt image accurately.";
        request.log.info({ imageSize: compressedImage.length }, '[receipt-scan] sending to Gemini');
        try {
            const result = yield model.generateContent([prompt, {
                    inlineData: {
                        data: compressedImage.toString('base64'),
                        mimeType: 'image/jpeg'
                    }
                }]);
            const receiptData = JSON.parse(result.response.text());
            // Increment usage counter only after a successful extraction
            yield db_1.db.query(`UPDATE user_profiles SET receipts_scanned_this_month = receipts_scanned_this_month + 1 WHERE id = $1`, [neonUser.id]);
            return reply.send(receiptData);
        }
        catch (err) {
            request.log.error({ err }, 'Gemini API error');
            if (typeof err === 'object' && err !== null && 'status' in err && err.status === 429) {
                return reply.status(429).send({ error: 'Gemini API rate limit exceeded. Please wait and try again.' });
            }
            throw err;
        }
    }));
});
exports.default = receiptRoutes;
