# Creating a Secure Media CDN with CloudFront and Lambda@Edge (Part III)

This is part III of the series of posts where we are building a CloudFront distribution that serves your S3 Media, performs on-demand image transformation, and authenticates incoming requests.

If you missed part II, you can check it out [here](https://github.com/leonardofreitass/media-cloudfront/blob/main/docs/creating-origin-request-edge-lambda.md)!

## Creating the Origin Response lambda

So a bit of recap from the last parts: We created a CloudFront distribution that is backed by an S3 bucket that contains our media. We then added dynamic origin selection using an origin-request Lambda@Edge to send requests to Cloudinary if the user provides transformations parameters, so we can have on-demand image manipulation on our distribution.

Now, there is a bit of inconsistency going on: S3 and Cloudinary will provide different error responses if something unexpected occurs. While this is not a big deal, we want to streamline the error responses that we return to our users. We can achieve this by adding an origin-response Lambda@Edge!

Let's create a new `origin-response.ts` file with the following content:

```ts
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
```

In the code above, if the status code returned is anything above or equal to 400 (therefore either a client-side or a server-side) we rewrite the response that we will return to CloudFront. Since this is an origin-response lambda, whatever we return here will be cached by CloudFront. We can control how it will be cached by setting the cache-control response header: we just set it to `no-cache` as default, but then set a 5 minutes TTL for 404 in order to prevent lots of requests to a non-existing file to go through. If the response is not an error, we just return the response we had in the first place, and nothing is changed.

Now let's build a lambda with this code and attach it to CloudFront in a similar way we did with the origin response:

First we add a new entrypoint in our `rollout.config.js` file:

```js
export default [
  makeEntryPointFor('./src/origin-request.ts'),
  makeEntryPointFor('./src/origin-response.ts') // New entrypoint
]
```

Then, create the lambda on Terraform:

```hcl
data "archive_file" "origin_response_lambda" {
  type        = "zip"
  output_path = "${local.archive_path}/origin_response_lambda.zip"

  source {
    filename = "index.js"
    content = file(
      "${local.lambda_path}/origin-response.js",
    )
  }
}

resource "aws_lambda_function" "origin_response_lambda" {
  filename         = data.archive_file.origin_response_lambda.output_path
  function_name    = "media-origin-response"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256(data.archive_file.origin_response_lambda.output_path)
  runtime          = "nodejs14.x"
  publish          = true
}
```

And lastly we attach it to CloudFront, using the `lambda_function_association` inside the `default_cache_behavior` again:

```hcl
    lambda_function_association {
      event_type   = "origin-response"
      lambda_arn   = aws_lambda_function.origin_response_lambda.qualified_arn
      include_body = false
    }
```

Now you can compile your code using rollup and plan-and-apply the terraform changes or leave it to do all of this by the end of this article.


## Creating the Viewer Request lambda

We now want to prevent any unauthenticated request from accessing our media, so we add some authentication to it! For now, we will just check the token provided against a hardcoded secret, but this could be very much an HTTP call to your backend to check its authenticity.

Let's create a new `viewer-request.ts` file with the following content:

```ts
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
```

If the authentication fails, we just return a 403. Now if the user is authenticated, we let the request pass along, but first, we move the token query parameter to a header. We do this because the "token" query parameter should not interfere in our routing between S3 and Cloudinary, but we cannot just remove it, as we need it in order to use it in our Cloudinary fetch.

We need to modify our origin request to reflect this authentication. We get the token from headers and then remove the header to prevent it from being sent downstream to our origins. Then, we use the token when creating the media URL. We also need to encode our media URL as it now contains a `?`, otherwise it can be interpreted as a query param of the origin request instead of the media URL. In the end, our handler will look like this:

```ts
export const handler: AWSLambda.CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request
  const token = request.headers['x-auth-token'][0].value
  delete request.headers['x-auth-token']

  if (request.querystring === "") {
    return request
  }

  try {
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
    console.log(request.uri)
    request.headers['host'] = [{ key: 'host', value: CLOUDINARY_HOST }]
  
    return request
  } catch (error) {
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
}
```

In the viewer-request code, we are just checking if the token is equal to `MY_SECRET`, but you can (and should) have a different authentication mechanism here, like sending the secret to an auth endpoint to verify it, or even maybe just inject a JWT secret to the lambda and verify the token using it. You can inject env vars the same way we did with the CLOUDINARY_ID.

A couple of notes here though before you proceed with the authentication method of your choice:
- First, Lambda@Edge cannot import third-party modules as there is no package.json or node_modules there to use. However, Rollup will solve this issue for us: you can install and import any modules as you like in your `.ts` file, and Rollup will include their source code in your `.js` bundled file!
- Second, if you go with a remote authentication (like sending an HTTP request somewhere), please bear in mind that this will increase latency **significantly** depending on where your user is requesting it. Remember, viewer-request lambdas will run every time, even if the response is cached on a PoP nearby. The Lambda@Edge will be running on a PoP close to the user, but this becomes ineffective if it has to go to a faraway datastore anyway to check the authentication token. The workaround for this is to also have your authentication endpoint backed by a CDN so that the authentication check of your lambda requests is also cached around the world.

For now, let's just test it using the hardcoded secret. Same drill as usual now. Add another entry point to our `rollout.config.js` file:

```js

export default [
  makeEntryPointFor('./src/origin-request.ts'),
  makeEntryPointFor('./src/origin-response.ts'),
  makeEntryPointFor('./src/viewer-request.ts') // New entrypoint
]
```

Create the lambda on Terraform:

```hcl
data "archive_file" "viewer_request_lambda" {
  type        = "zip"
  output_path = "${local.archive_path}/viewer_request_lambda.zip"

  source {
    filename = "index.js"
    content = file(
      "${local.lambda_path}/viewer-request.js",
    )
  }
}

resource "aws_lambda_function" "viewer_request_lambda" {
  filename         = data.archive_file.viewer_request_lambda.output_path
  function_name    = "media-viewer-request"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256(data.archive_file.viewer_request_lambda.output_path)
  runtime          = "nodejs14.x"
  publish          = true
}

```

And once again, we attach it to CloudFront:

```hcl
    lambda_function_association {
      event_type   = "viewer-request"
      lambda_arn   = aws_lambda_function.viewer_request_lambda.qualified_arn
      include_body = false
    }
```

Now, same as we did in the previous part, compile your code by running:

```sh
CLOUDINARY_ID={my_id} npx rollup -c
```

Then run `terraform plan` and `terraform apply`. After everything is done and applied, not only error responses should be normalized, but you now will need to pass the `token=MY_SECRET` as a query parameter in order to access your media!

You can check the full solution we went through up to this point (including part II) here in this [GitHub repo](https://github.com/leonardofreitass/media-cloudfront/tree/add-response-and-auth-lambdas).
 
All good! We now have normalized error response and authentication! In the next and last steps, we will add logging and monitoring metrics to our lambdas. See you in the next article!
