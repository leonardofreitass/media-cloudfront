import { URLSearchParams } from 'url'

const authenticateRequest = async (token: string): Promise<boolean> => {
  // Here you can, as an example, send an HTTP Request to a
  // backend that would check the authentication token
  return Promise.resolve(token === 'MY_SECRET')
}

export const handler: AWSLambda.CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request

  const qs = new URLSearchParams(request.querystring)
  const token = qs.get('token')

  if (token) {
    const authenticated = await authenticateRequest(token)
    if (authenticated) {
      qs.delete('token')
      request.headers['x-auth-token'] = [{ key: 'x-auth-token', value: token }]
      request.querystring = qs.toString()
      return request
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
    body: JSON.stringify(
      {
        error: "Unauthenticated request",
      },
      null,
      2
    ),
  }
}
