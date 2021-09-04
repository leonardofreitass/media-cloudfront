# Creating a Secure Media CDN with CloudFront and Lambda@Edge (Part II)

This is the part II of the series of posts where we are building a CloudFront distribution that serves your S3 Media, performs on-demand image transformation, and authenticates incoming requests.

If you missed part I, you can check it out [here](https://github.com/leonardofreitass/media-cloudfront/blob/main/docs/creating-s3-and-cloudfront.md)!

## Creating a Cloudinary account

For this step, you need a Cloudinary account. You can signup for free [here](https://cloudinary.com/), and then grab your Cloudinary ID to be used on Cloudinary Fetch API.

**Note**: If you do not want to create your account now, it's possible to just use the Cloudinary Demo account to try things out. Just remember to set up your account before sending your code to live environments.

## Creating the Origin Request lambda source code

First, we run `npm init` to create a `package.json`

Now, we create an `origin-request.ts` file that will contain our source code. You can see that we will be using Typescript for developing our lambdas. We need then to add some dependencies needed for TS:

```sh
npm run --save-dev @types/aws-lambda @types/node typescript ts-node
```

We also need a `tsconfig-build.json` and `tsconfig.json` file respectively:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "es6"
  },
  "exclude": [
    "built",
    "node_modules"
  ]
}

```

```json
{
  "compilerOptions": {
    "allowJs": false,
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "lib": [
      "es2017"
    ],
    "module": "commonjs",
    "moduleResolution": "node",
    "newLine": "LF",
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "outDir": "./built",
    "sourceMap": false,
    "strict": true,
    "target": "es2017"
  },
  "exclude": [
    "built",
    "node_modules"
  ]
}

```

We can now finally add some code. Let's start simple: we want to create a lambda that receives CloudFront events and check the existence of query parameters: if they are not present, just let the request pass along without modifying anything, as it will then go to the S3 we already have configured on our CloudFront distribution, if there is a query parameter present though, we want to proxy the request to Cloudinary.

```ts
import { URL } from 'url'

const CLOUDINARY_HOST = 'res.cloudinary.com'
const CLOUDINARY_ID = process.env.CLOUDINARY_ID || 'demo'

export const handler: AWSLambda.CloudFrontRequestHandler = async (event) => {
  const request = event.Records[0].cf.request

  if (request.querystring === "") {
    return request
  }

  const distributionHost = event.Records[0].cf.config.distributionDomainName
  const mediaURL = new URL(`https://${distributionHost}${request.uri}`)
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
  request.uri = `/${CLOUDINARY_ID}/image/fetch/${mediaURL}`
  request.headers['host'] = [{ key: 'host', value: CLOUDINARY_HOST }]

  return request
}

```

So first, we get the request from the event passed to the Lambda. Then, if the query string is empty, we just return the request without changing anything. This will basically make the request continue as usual to S3. Now, if there is a query string existing, we want to send the request to Cloudinary as a Custom Origin. Note that we are not using the query string for anything else yet, we just want to set up the proxy to Cloudinary first without any transformations.

So then, we grab the `distributionDomainName` (e.g.: https://d2idpesxy6e6el.cloudfront.net) and use it to create the media URL that Cloudinary needs to fetch the image in order to transform it. Then we change the origin of the request and point it to `res.cloudinary.com` and change the URI to `/{cloudinary_id}/images/fetch/{media_url}`. So, as an example, if you request `https://d2idpesxy6e6el.cloudfront.net/nebula.jpg?width=300`, the lambda will proxy the request to `https://res.cloudinary.com/demo/image/fetch/https://d2idpesxy6e6el.cloudfront.net/nebula.jpg`.

But wait a minute, if Cloudinary fetches the image from https://d2idpesxy6e6el.cloudfront.net/nebula.jpg, wouldn't CloudFront proxy it again to Cloudinary and start an infinite loop? Well, no, because in this case, the request contains no query parameters, and CloudFront will serve the image from S3. 

So the flow of requests is something like:  User -> CloudFront (with query params) -> Cloudinary -> CloudFront (without query params) -> S3. 

And then, when it reaches S3, it will then find the image (or not) and bubble the response all the way back to the user (passing through Cloudinary who might perform some image transformations). Pretty cool right?

So now let's add some transformations!

```ts
import { URLSearchParams } from 'url'

const castAndValidateInt = (value: string, errorPrefix: string): number => {
  const integer = parseInt(value, 10)

  if (!Number.isSafeInteger(integer) || Number(value) !== integer) {
    throw new Error(`${errorPrefix} must be an integer`)
  }

  return integer
}

interface TransformationFunc {
  (value: string): string;
}

const MIN_WIDTH = 1
const MAX_WIDTH = 10000 
const transformWidth: TransformationFunc = (value: string): string => {
  const width = castAndValidateInt(value, "Width")
  if (width < MIN_WIDTH || width > MAX_WIDTH) {
    throw new Error(`Width must be a value between ${MIN_WIDTH} and ${MAX_WIDTH}`)
  }

  return `w_${width}`
}

const MIN_HEIGHT = 1
const MAX_HEIGHT = 10000 
const transformHeight: TransformationFunc = (value: string): string => {
  const height = castAndValidateInt(value, "Height")
  if (height < MIN_HEIGHT || height > MAX_HEIGHT) {
    throw new Error(`Height must be a value between ${MIN_HEIGHT} and ${MAX_HEIGHT}`)
  }

  return `h_${height}`
}

const transformations = new Map<string, TransformationFunc>()
transformations.set('width', transformWidth)
transformations.set('height', transformHeight)

const reduceQueryParam = (acc: string[], [key, val]: [string, string]): string[] => {
  const transformation = transformations.get(key)
  if (!transformation) {
    throw new Error(`Unknown query param ${key}`)
  }

  return [...acc, transformation(val)]
}

const transformQueryString = (querystring: string): string => {
  const qs = new URLSearchParams(querystring)
  return [...qs.entries()].reduce(reduceQueryParam, []).join(",")
}
```

This might seem complicated, but what `transformQueryString` does is pretty simple in the end: It transforms a query string like `width=300&height=500` into something that Cloudinary understands, like `w_300,h_500`. We only have width and height transformation for now. If any other query parameter comes we throw an error for an unknown parameter. We also have some validations to ensure that the values we get are usable and not malformed.

Now we modify our Cloudinary Custom Origin to something like:

```ts
try {
  const cloudinaryTransformations = transformQueryString(request.querystring)
  const distributionHost = event.Records[0].cf.config.distributionDomainName
  const mediaURL = new URL(`https://${distributionHost}${request.uri}`)
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
  request.uri = `/${CLOUDINARY_ID}/image/fetch/${cloudinaryTransformations}/${mediaURL}`
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
```

We call `cloudinaryTransformations` to grab Cloudinary transformation parameters and use them in the path we send to Cloudinary. Note that this function may throw, and in this case, we catch it and return a 400 instead with the error message. This will make CloudFront immediately return a response and not go to any Origin at all.

## Bundling our source code

Awesome! So are we ready to deploy this to CloudFront? Not yet actually. You see, Typescript is great for developing but we cannot just use a `.ts` file on our lambdas. So we need to first transpile all of the above into a `.js` file that can be used to deploy code to AWS Lambdas. We are going to use Rollup for creating a bundle file that can be easily deployed as a lambda handler.

First, add the dependencies we need for this:

```sh
npm install --save-dev rollup rollup-plugin-typescript2 @rollup/plugin-commonjs @rollup/plugin-node-resolve @rollup/plugin-replace
```

And then add the `rolloup.config.js` file:

```js
import typescript from 'rollup-plugin-typescript2'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'

const plugins = [
  typescript({
    tsconfig: './tsconfig-build.json'
  }),
  resolve(),
  commonjs(),
  replace({
    'process.env.CLOUDINARY_ID': JSON.stringify(process.env.CLOUDINARY_ID),
    preventAssignment: true
  })
]

function makeEntryPointFor (input) {
  return {
    input,
    output: {
      dir: 'built',
      format: 'cjs'
    },
    plugins
  }
}

export default [
  makeEntryPointFor('./origin-request.ts')
]
```

Now run the following command and you should have a bundled JS file in `/built/origin-request.js`.

```sh
npx rollup -c
```

This will create the output file using the Cloudinary demo account. To use your own account, please run the following instead:

```sh
CLOUDINARY_ID={my_id} npx rollup -c
```

## Attaching the lambda using Terraform

The last step now is to add some Terraform changes to attach this file as our Lambda@Edge. Same as part I, you can create separated files or keep building them on your `main.tf` file.

First we create zip file with our code:

```hcl
locals {
  lambda_path  = "./built"
  archive_path = "${path.module}/.terraform/tmp"
}

data "archive_file" "origin_request_lambda" {
  type        = "zip"
  output_path = "${local.archive_path}/origin_request_lambda.zip"

  source {
    filename = "index.js"
    content = file(
      "${local.lambda_path}/origin-request.js",
    )
  }
}
```

Quite straightforward: we grab the `.js` bundled file and create a `.zip` with it.

Now we create an actual AWS Lambda with it. **Please note**, you need to create the lambda in the **us-east-1** region, as it's required that all edge lambdas attached to CloudFront distributions are deployed there.

```hcl
resource "aws_iam_role" "lambda" {
  name               = "edge-lambda-media-origin-request"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy_attachment" "lambda" {
  role       = aws_iam_role.lambda.id
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type = "Service"

      identifiers = [
        "lambda.amazonaws.com",
        "edgelambda.amazonaws.com",
      ]
    }
  }
}

resource "aws_lambda_function" "origin_request_lambda" {
  filename         = data.archive_file.origin_request_lambda.output_path
  function_name    = "media-origin-request"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256(data.archive_file.origin_request_lambda.output_path)
  runtime          = "nodejs14.x"
  publish          = true
}
```

You can see that we are creating an IAM Role. That is because Lambdas need some permissions in order to run. All of the permissions needed are in this pre-existing AWSLambdaBasicExecutionRole, so we just use it. Then, we create a Lambda function using the zip file we have.

Almost done! We just need to now attach this lambda to our CloudFront distribution. This is actually quite simple: just go to the CloudFront distribution that we have on terraform, and inside the `default_cache_behavior`, add this:

```hcl
    lambda_function_association {
      event_type   = "origin-request"
      lambda_arn   = aws_lambda_function.origin_request_lambda.qualified_arn
      include_body = false
    }
```

Nothing special here. We just use the lambda we created as the origin-request of the distribution. Now, go ahead and run `terraform plan` and `terraform apply`. After everything is done and applied, you should be able to do on-demand transformations: `https://{randomId}.cloudfront.net/{imagePath}` will still go to S3 as usual, but `https://{randomId}.cloudfront.net/{imagePath}?width=300` as an example returns the image transformed by Cloudinary!
 
 You can check the full solution we went through up to this point (including the part I) here in this [GitHub repo](https://github.com/leonardofreitass/media-cloudfront/tree/add-origin-edge-lambdas).
 
Done! We now have on-demand image transformations on our CloudFront distribution! In the next steps, we will add response formatting and authentication to our distribution. See you in the next article!
