import { URL } from 'url'
import transformQueryString from './transformations'
import withTelemetry from './telemetry'

const CLOUDINARY_HOST = 'res.cloudinary.com'
const CLOUDINARY_ID = process.env.CLOUDINARY_ID || 'demo'

export const handler: AWSLambda.CloudFrontRequestHandler = async (event) => {
  return withTelemetry((telemetry) => {
    const request = event.Records[0].cf.request
    const token = request.headers['x-auth-token'][0].value
    delete request.headers['x-auth-token']

    telemetry.metrics.setProperty('Uri', request.uri)
  
    if (request.querystring === "") {
      telemetry.metrics.setProperty('Origin', 'S3')
      return request
    }
  
    try {
      telemetry.metrics.setProperty('Origin', 'Cloudinary')
      const cloudinaryTransformations = transformQueryString(request.querystring)
      const distributionHost = event.Records[0].cf.config.distributionDomainName
      const mediaURL = new URL(`https://${distributionHost}${request.uri}?token=${token}`)
      request.origin = { custom: {
        customHeaders: {},
        domainName: CLOUDINARY_HOST,
        keepaliveTimeout: 60,
        path: '',
        port: 443,
        protocol: 'https',
        readTimeout: 30,
        sslProtocols: ['TLSv1', 'TLSv1.1', 'TLSv1.2']
      } }
      request.uri = `/${CLOUDINARY_ID}/image/fetch/${cloudinaryTransformations}/${encodeURIComponent(mediaURL.toString())}`
      request.headers['host'] = [{ key: 'host', value: CLOUDINARY_HOST }]
    
      return request
    } catch (error) {
      if (error instanceof Error) {
        telemetry.metrics.setProperty('ResponseStatus', '400')
        telemetry.log(error.message)
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
          body: JSON.stringify(
            {
              error: error.message,
            },
            null,
            2
          ),
        }
      }
  
      throw error
    } 
  })
}
