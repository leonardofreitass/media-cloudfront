import { CloudFrontHeaders } from "aws-lambda"

export const handler: AWSLambda.CloudFrontResponseHandler = async (event) => {
  const response = event.Records[0].cf.response
  const status = parseInt(response.status, 10) || 0

  if (status >= 400) {
    const headers: CloudFrontHeaders  = {
      ...response.headers,
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
      ]
    }

    if (status === 404) {
      headers["cache-control"] = [
        {
          key: "Cache-Control",
          value: "max-age=300",
        },
      ]
    }

    return {
      status: status.toString(),
      headers,
      bodyEncoding: 'text',
      body: JSON.stringify(
        {
          error: response.statusDescription,
        },
        null,
        2
      ),
    }
  }

  return response
}
