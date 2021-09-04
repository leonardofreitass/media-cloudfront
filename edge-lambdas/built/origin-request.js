'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var url = require('url');

const castAndValidateInt = (value, errorPrefix) => {
    const integer = parseInt(value, 10);
    if (!Number.isSafeInteger(integer) || Number(value) !== integer) {
        throw new Error(`${errorPrefix} must be an integer`);
    }
    return integer;
};
const MIN_WIDTH = 1;
const MAX_WIDTH = 10000;
const transformWidth = (value) => {
    const width = castAndValidateInt(value, "Width");
    if (width < MIN_WIDTH || width > MAX_WIDTH) {
        throw new Error(`Width must be a value between ${MIN_WIDTH} and ${MAX_WIDTH}`);
    }
    return `w_${width}`;
};
const MIN_HEIGHT = 1;
const MAX_HEIGHT = 10000;
const transformHeight = (value) => {
    const height = castAndValidateInt(value, "Height");
    if (height < MIN_HEIGHT || height > MAX_HEIGHT) {
        throw new Error(`Height must be a value between ${MIN_HEIGHT} and ${MAX_HEIGHT}`);
    }
    return `h_${height}`;
};
const transformations = new Map();
transformations.set('width', transformWidth);
transformations.set('height', transformHeight);
const reduceQueryParam = (acc, [key, val]) => {
    const transformation = transformations.get(key);
    if (!transformation) {
        throw new Error(`Unknown query param ${key}`);
    }
    return [...acc, transformation(val)];
};
const transformQueryString = (querystring) => {
    const qs = new url.URLSearchParams(querystring);
    return [...qs.entries()].reduce(reduceQueryParam, []).join(",");
};

const CLOUDINARY_HOST = 'res.cloudinary.com';
const CLOUDINARY_ID = 'demo';
const handler = async (event) => {
    const request = event.Records[0].cf.request;
    if (request.querystring === "") {
        return request;
    }
    try {
        const cloudinaryTransformations = transformQueryString(request.querystring);
        const distributionHost = event.Records[0].cf.config.distributionDomainName;
        const mediaURL = new url.URL(`https://${distributionHost}${request.uri}`);
        request.origin = { custom: {
                customHeaders: {},
                domainName: CLOUDINARY_HOST,
                keepaliveTimeout: 60,
                path: '',
                port: 443,
                protocol: 'https',
                readTimeout: 30,
                sslProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2']
            } };
        request.uri = `/${CLOUDINARY_ID}/image/fetch/${cloudinaryTransformations}/${mediaURL}`;
        request.headers['host'] = [{ key: 'host', value: CLOUDINARY_HOST }];
        return request;
    }
    catch (error) {
        if (error instanceof Error) {
            return {
                status: "400",
                headers: {
                    "content-type": [
                        {
                            key: "Content-Type",
                            value: "application/json",
                        },
                    ],
                    "cache-control": [
                        {
                            key: "Cache-Control",
                            value: "max-age=3600",
                        },
                    ],
                },
                bodyEncoding: "text",
                body: JSON.stringify({
                    error: error.message,
                }, null, 2),
            };
        }
        throw error;
    }
};

exports.handler = handler;
