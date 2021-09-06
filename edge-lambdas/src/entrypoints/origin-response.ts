import { CloudFrontHeaders } from "aws-lambda"
import { Unit } from 'aws-embedded-metrics'
import withTelemetry from '../tools/telemetry'

export const handler: AWSLambda.CloudFrontResponseHandler = async (event) => {
  return withTelemetry((telemetry) => {
    const response = event.Records[0].cf.response
    const status = parseInt(response.status, 10) || 0

    if (status >= 200 && status < 300) {
      telemetry.metrics.putMetric('OriginResponse2xx', 1, Unit.Count)
    } else if (status >= 300 && status < 400) {
      telemetry.metrics.putMetric(`OriginResponse3xx`, 1, Unit.Count)
    } else if (status >= 400 && status < 500) {
      telemetry.metrics.putMetric(`OriginResponse4xx`, 1, Unit.Count)
    } else {
      telemetry.metrics.putMetric(`OriginResponseUnexpected`, 1, Unit.Count)
      telemetry.metrics.putMetric(`OriginResponse${status}`, 1, Unit.Count)
    }

    telemetry.metrics.setProperty('ResponseStatus', status)
  
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
  })
}
