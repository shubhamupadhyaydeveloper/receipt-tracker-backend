import { FastifyInstance } from "fastify";
import { MultipartFile } from "@fastify/multipart";
import sharp from "sharp";
import { db } from "../db";
import { Receipt } from "../db/types";
import { CreateReceiptBody } from "../types/payloads";
import { storeImage } from "../lib/storeImage";

const REQUIRED_FIELDS: { key: keyof CreateReceiptBody; type: string }[] = [
    { key: 'vendorName', type: 'string' },
    { key: 'totalAmount', type: 'number' },
    { key: 'currency', type: 'string' },
    { key: 'category', type: 'string' },
    { key: 'receiptDate', type: 'string' },
]

const createReceiptsRoute = async (app: FastifyInstance) => {

    app.post('/create-receipt', async (request, reply) => {
        const { neonUser } = request

        if (!neonUser) {
            return reply.status(401).send({ error: 'User not found' })
        }

        // Parse multipart — image file + receipt JSON sent as field 'data'
        const parts = request.parts()

        let imageBuffer: Buffer | null = null
        let receiptData: Partial<CreateReceiptBody> | null = null

        for await (const part of parts) {
            if (part.type === 'file') {
                imageBuffer = await (part as MultipartFile).toBuffer()
            } else if (part.fieldname === 'data') {
                try {
                    receiptData = JSON.parse(part.value as string)
                } catch {
                    return reply.status(400).send({ error: "'data' field must be valid JSON" })
                }
            } else {
                // Support individual fields like vendorName, totalAmount, etc.
                receiptData = receiptData ?? {}
                // multipart values are always strings; REQUIRED_FIELDS loop validates types below
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                receiptData[part.fieldname as keyof CreateReceiptBody] = part.value as any
            }
        }

        if (!receiptData) {
            return reply.status(400).send({ error: "'data' field is required" })
        }

        for (const { key, type } of REQUIRED_FIELDS) {
            const value = receiptData[key]
            if (value === undefined || value === null || value === '') {
                return reply.status(400).send({ error: `'${key}' is required` })
            }
            if (typeof value !== type) {
                return reply.status(400).send({ error: `'${key}' must be a ${type}` })
            }
        }

        const data = receiptData as CreateReceiptBody

        // Upload image to ImageKit → get public URL
        let image_url: string | null = null
        let image_path: string | null = null

        if (imageBuffer) {
            try {
                const compressed = await sharp(imageBuffer)
                    .resize({ width: 800, withoutEnlargement: true })
                    .jpeg({ quality: 60, progressive: true })
                    .toBuffer()
                const stored = await storeImage(compressed, `receipt_${Date.now()}.jpg`)
                image_url = stored.url
                image_path = stored.filePath
            } catch (err) {
                request.log.error({ err }, 'ImageKit upload failed')
                return reply.status(502).send({ error: 'Image upload failed. Please try again or submit without an image.' })
            }
        }

        // Insert receipt and increment usage counter in parallel — both only need neonUser.id
        const [insertResult] = await Promise.all([
            db.query<Receipt>(`
                INSERT INTO receipts (
                    user_id, vendor_name, total_amount, tax_amount,
                    currency, receipt_date, category, notes,
                    is_gst_bill, gst_number, image_url, image_path
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
                RETURNING *
            `, [
                neonUser.id,
                data.vendorName,
                data.totalAmount,
                data.taxAmount ?? null,
                data.currency,
                data.receiptDate,
                data.category,
                data.notes ?? null,
                data.isGstBill ?? false,
                data.gstNumber ?? null,
                image_url,
                image_path,
            ]),
            db.query(
                `UPDATE user_profiles SET receipts_scanned_this_month = receipts_scanned_this_month + 1 WHERE id = $1`,
                [neonUser.id]
            ),
        ])

        return reply.status(201).send({ receipt: insertResult.rows[0] })
    })
}

export default createReceiptsRoute;

