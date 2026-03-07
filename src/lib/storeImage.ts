import ImageKit from 'imagekit'

// ImageKit init — keys from .env
// Get them from: imagekit.io → Dashboard → Developer Options
const imagekit = new ImageKit({
    publicKey:   process.env.IMAGEKIT_PUBLIC_KEY  as string,
    privateKey:  process.env.IMAGEKIT_PRIVATE_KEY as string,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT as string,
})

export interface StoredImage {
    url:      string  // public URL to display the image
    filePath: string  // imagekit internal path (useful for deletion later)
}

export const storeImage = async (buffer: Buffer, fileName: string): Promise<StoredImage> => {
    const result = await imagekit.upload({
        file:     buffer,
        fileName: fileName,
        folder:   '/receipts',  // all receipts go into /receipts folder in imagekit
    })

    return {
        url:      result.url,
        filePath: result.filePath,
    }
}
