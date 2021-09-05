'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const handler = async (event) => {
    const response = event.Records[0].cf.response;
    const status = parseInt(response.status, 10) || 0;
    if (status >= 400) {
        const headers = Object.assign(Object.assign({}, response.headers), { "content-type": [
                {
                    key: "Content-Type",
                    value: "application/json",
                },
            ], "cache-control": [
                {
                    key: "Cache-Control",
                    value: "no-cache",
                },
            ] });
        if (status === 404) {
            headers["cache-control"] = [
                {
                    key: "Cache-Control",
                    value: "max-age=300",
                },
            ];
        }
        return {
            status: status.toString(),
            headers,
            bodyEncoding: 'text',
            body: JSON.stringify({
                error: response.statusDescription,
            }, null, 2),
        };
    }
    return response;
};

exports.handler = handler;
