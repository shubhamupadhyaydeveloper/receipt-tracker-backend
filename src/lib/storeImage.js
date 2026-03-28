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
exports.storeImage = void 0;
const imagekit_1 = __importDefault(require("imagekit"));
// ImageKit init — keys from .env
// Get them from: imagekit.io → Dashboard → Developer Options
const imagekit = new imagekit_1.default({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});
const storeImage = (buffer, fileName) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield imagekit.upload({
        file: buffer,
        fileName: fileName,
        folder: '/receipts', // all receipts go into /receipts folder in imagekit
    });
    return {
        url: result.url,
        filePath: result.filePath,
    };
});
exports.storeImage = storeImage;
