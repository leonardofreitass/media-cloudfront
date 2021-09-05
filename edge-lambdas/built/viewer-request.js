'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var url = require('url');

const authenticateRequest = async (token) => {
    // Here you can, as an example, send an HTTP Request to a
    // backend that would check the authentication token
    return Promise.resolve(token === 'MY_SECRET');
};
const handler = async (event) => {
    const request = event.Records[0].cf.request;
    const qs = new url.URLSearchParams(request.querystring);
    const token = qs.get('token');
    if (token) {
        const authenticated = await authenticateRequest(token);
        if (authenticated) {
            qs.delete('token');
            request.querystring = qs.toString();
            return request;
        }
    }
    return {
        status: "403",
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
                    value: "no-cache",
                },
            ],
        },
        bodyEncoding: "text",
        body: JSON.stringify({
            error: "Unauthenticated request",
        }, null, 2),
    };
};

exports.handler = handler;
