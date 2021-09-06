import { URLSearchParams } from 'url'
import { Unit } from 'aws-embedded-metrics'
import withTelemetry from '../tools/telemetry'

const authenticateRequest = async (token: string): Promise<boolean> => {
  // Here you can, as an example, send an HTTP Request to a
  // backend that would check the authentication token
  return Promise.resolve(token === 'MY_SECRET')
}

export const handler: AWSLambda.CloudFrontRequestHandler = async (event) => {
  return withTelemetry(async (telemetry) => {
    const request = event.Records[0].cf.request

    const qs = new URLSearchParams(request.querystring)
    const token = qs.get('token')
  
    if (token) {
      const authenticated = await authenticateRequest(token)
      if (authenticated) {
        qs.delete('token')
        request.headers['x-auth-token'] = [{ key: 'x-auth-token', value: token }]
        request.querystring = qs.toString()
        telemetry.metrics.putMetric('AuthenticationSuccess', 1, Unit.Count)
        return request
      }
    }

    telemetry.metrics.putMetric('AuthenticationFailure', 1, Unit.Count)
    telemetry.metrics.setProperty('ResponseStatus', '403')
  
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
  })
}
