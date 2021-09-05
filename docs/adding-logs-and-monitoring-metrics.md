# Creating a Secure Media CDN with CloudFront and Lambda@Edge (Part IV)

This is part IV of the series of posts where we are building a CloudFront distribution that serves your S3 Media, performs on-demand image transformation, and authenticates incoming requests.

If you missed part II, you can check it out [here](https://github.com/leonardofreitass/media-cloudfront/blob/main/docs/creating-auth-and-response-edge-lambda.md)!

## Creating the Telemetry helper

So we have a working CloudFront distribution with authentication and on-demand transformation capabilities, but there is something we lack here: the ability to monitor the health of our lambda and debug incoming requests. Sure, CloudWatch already provides us some metrics out of the box like LambdaExecutionError or how many times it was invoked, but we cannot tell which Response was returned or if the authentication failed or succeeded as an example. In order to collect those metrics and make them available on CloudWatch (which we can then inspect on logs, or even create alerts and dashboards with them) we need to `use aws-embedded-metrics`.

First, we install the package:

```sh
npm install --save aws-embedded-metrics
```

Then we create a `telemetry.ts` file:

```ts
import { createMetricsLogger, MetricsLogger, Unit } from 'aws-embedded-metrics'

type Telemetry = {
  metrics: MetricsLogger,
  log: (msg: string) => void
}

async function withTelemetry<T> (fn: (telemetry: Telemetry) => T | Promise<T>): Promise<T> {
  const _log: string[] = []
  const metrics = createMetricsLogger()
  const log = (msg: string): void => {
    _log.push(msg)
  }

  metrics.setDimensions({ Region: process.env.AWS_REGION || 'unknown' })

  try {
    const result: T = await fn({ metrics, log })
    metrics.putMetric('HandlerOk', 1, Unit.Count)
    return result
  } catch (error) {
    metrics.putMetric('HandlerError', 1, Unit.Count)
    throw error
  } finally {
    try {
      metrics.putMetric('HandlerExecution', 1, Unit.Count)
      metrics.setProperty('log', _log)
      await metrics.flush()
    } catch (e) { /** noop */ }
  }
}

export default withTelemetry;

```

In this file, we create a wrapper function that takes the code inside the handler as a callback. Then, it sets up the AWS Metrics Logger and a logging function (that basically just receives strings and pushes them to an array). It also sets up some common telemetry that will be useful for every lambda, like the Region Dimension and the metrics that tell if the handler managed to execute as planned or not. It then calls the callback (the handler itself) and finally flushes all the metrics to be collected by CloudWatch. If you want to know more about everything you can do with the MetricsLogger, check out their [documentation](https://github.com/awslabs/aws-embedded-metrics-node#metriclogger).

Let's take a look how we can use it on each lambda. Starting with the origin-request:

```ts
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
```

We start by wrapping up everything inside the handler in a `return withTelemetry()`. Our handler will then have access to the `telemetry` object we set up in the previous file. Now we log some properties like what was the origin is chosen, what is the response status (in the case that we do the early response return) and what is the Uri of the request. We also log the message of the error when transforming. All of them will be logged in CloudWatch and can be used to debug and monitor our application.

Same thing with the origin-response now:

```ts
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
```

Here we not only log the response status but also put a metric for every HTTP status range we are returning. This is quite useful for dashboards or alerting on the 4xx/2xx-3xx cache hit ratio in order to monitor if our application is broken.

Lastly, let's check out the viewer-request:

```ts
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
```

Similar to the origin request, we log the response status for the early forbidden response, but we also create metrics around the result of the authentication.

These are just a few of the metrics we can use, but by taking advantage of the MetricsLogger, we can monitor everything we want in our distribution and built solid monitoring on top of it. Just be careful to not log any user-sensitive information like tokens!

Let's give this a try, first compile your code:

```sh
CLOUDINARY_ID={my_id} npx rollup -c
```

Then run `terraform plan` and `terraform apply`. After everything is done and applied, try out some different flows, like requesting without a token, with the token, with an invalid transformation, and you should see all the different types of logs on CloudWatch. The log group should be `/aws/lambda/us-east-1.{lambda-name}` for each lambda, like `/aws/lambda/us-east-1.media-origin-request`. The region should be the region closest to you as it is where the lambda executes (but it will still have us-east-1 on the log group name as this is where the lambda is deployed to). You can also go to the CloudWatch metrics and find them inside the aws-embedded-metrics namespace.

You can check the full solution we went through up to this point (including parts I, II, and III) here in this [GitHub repo](https://github.com/leonardofreitass/media-cloudfront/tree/add-metrics-and-logs).

## What is next?
 
We now have a production-ready Media CloudFront distribution! But this is just the beginning, you can now add more transformations, implement different types of authentication mechanisms, maybe even set up a video transformation origin. Some things to be careful though:

- The Lambda@Edge has some runtime requirements. Origin lambdas cannot take more than 30 seconds to execute, while Viewer lambdas cannot take more than 5 seconds. This is especially tricky if you have an auth check that can take longer than 5 seconds to return, in this case, you might wanna consider passing the auth check to behind the CloudFront cache, using the origin-request instead.
- Even if you adhere to the requirement above, it's not nice to keep your user waiting seconds just for receiving the first Byte of the image (not even counting the time it can take for the image to download), so everything that your lambda relies on should ideally have good caching strategies: it's ok for the first uncached request to take 3 seconds to warm everything needed to fulfill it, but the next ones should hopefully be fulfilled much faster than this, otherwise you will have a pretty bad user experience with all the latency.
- Be mindful of what packages you use: you will need to include all of them in your .js bundle file, and you do not want a huge file because AWS has some hard limits on how big that file can be.

If you want a quick reference to the code including all parts of our series you can find it here in this [GitHub repo](https://github.com/leonardofreitass/media-cloudfront). It also contains some small things that we have not discussed in this series, like linting and a terraform folder structure.

I hope you have enjoyed everything so far! Have fun setting up your Media CDN!
