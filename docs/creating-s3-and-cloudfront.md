# Creating a Secure Media CDN with CloudFront and Lambda@Edge

In this series of posts, we are going to build a CloudFront distribution that serves your S3 Media, performs on-demand image transformation, and even authenticates incoming requests! But before that, let's just backtrack a few concepts we will be using:
- S3: AWS Object storage service. We will use it to store our media files.
- CloudFront: AWS Content Delivery Network. We put it in front of our S3 bucket to provide a cache layer in dozens of points of presence around the world.
- Lambdas: AWS serverless functions that are provisioned on-demand.
- Lambda@Edge: Lambda functions that are attached to a CloudFront distribution in order to run a piece of code before or after CloudFront fetches a media from our origin (the S3 bucket).
- Cloudinary: Image transformation service. We will use it as a "custom origin" to on-demand transform images, but more on that in the next blog post.
- Terraform: Infrastructure as Code tool that will provide us an easy way to set up everything we need on AWS.

Note: we will not cover in these posts how to upload media files to the S3 or how to create a service to emit authentication credentials. We will solely focus on the delivery of the media part.

## Getting Started

Before we start anything we will need Terraform installed, an AWS account set up and the credentials that Terraform will use to access this AWS account in order to create resources there, which can be done either using AWS access key env vars or using the AWS CLI to authenticate, take a look [here](https://registry.terraform.io/providers/hashicorp/aws/latest/docs#environment-variables) for more info.

## Setting up S3 and CloudFront

 You can go ahead and put all of the following code in a single `main.tf` file or separate them into files inside the same folder as you see fit. You can also terraform plan and apply after every bit or in a single sweep by the end of the post. You can see the full solution for this post in this [GitHub repo](https://github.com/leonardofreitass/media-cloudfront/tree/s3-cloudfront-setup).
 With everything ready, we start by creating an S3 bucket. We will use an `aws_s3_bucket` resource for that.

```hcl
resource "aws_s3_bucket" "media_bucket" {
  bucket = "media-bucket-with-unique-name"
  acl    = "private"

  versioning {
    enabled = true
  }

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    max_age_seconds = 86400
  }
}
```

You can see we need a unique bucket name there because S3 names must be unique **across AWS as a whole**, not only your account. We set the ACL (access control list) to private meaning only you can see and edit the contents of S3. Don't worry, we will have other means to grant CloudFront read access to it. In the last part, we are defining the CORS rule, enabling different origins to perform GET and HEAD requests.

Now, we need to prevent public ACLs from ever be created or used, in order to ensure that no one can publicly access the contents of this S3 bucket. We can achieve this by using the `aws_s3_bucket_public_access_block` resource.

```hcl
resource "aws_s3_bucket_public_access_block" "media_bucket_public_access_block" {
  bucket                  = aws_s3_bucket.media_bucket.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

With this, your bucket is now protected from any unwanted public access! But now you may be wondering, how does CloudFront access it in order to distribute the media files? Well, we grant such access using an Origin Access Identity, so let us create one:

```hcl
resource "aws_cloudfront_origin_access_identity" "media_oai" {
  comment = "media-origin-access-identity"
}
```

Awesome! So are we all set? Well, no. You see, this resource above alone does not really do anything. We just created a credential that can be used, but not only is not being used, it also does not grant permission to anything. So now we need to:

1. Tell S3 to allow read access when a request uses this OAI to authenticate.
2. Tell CloudFront to use this OAI whenever requesting media to the origin (our S3 bucket)

We already have the S3 bucket, so let's start with the first one. How can we grant such permission? The answer is bucket policies! And we can do this on Terraform as follows:

```hcl
data "aws_iam_policy_document" "s3_oai_read_policy" {
  statement {
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.media_bucket.arn}/*"]

    principals {
      type        = "AWS"
      identifiers = [aws_cloudfront_origin_access_identity.media_oai.iam_arn]
    }
  }
}

resource "aws_s3_bucket_policy" "s3_oai_asset_bucket_policy" {
  bucket = aws_s3_bucket.media_bucket.id
  policy = data.aws_iam_policy_document.s3_oai_read_policy.json
}
```

So what we are doing here is: we are defining a policy document JSON. That document tells our S3 bucket to allow the `s3:GetObject` (which means read to a single file) whenever the requester is identified as the OAI we created. And then, we attach this policy document to our S3 using the `aws_s3_bucket_policy` resource so it is actually used by our bucket.

Now for the final bit, we need to create our CloudFront distribution keeping in mind that it needs to point to our S3 bucket while using the OAI to authenticate. All of this can be done using the `aws_cloudfront_distribution` resource.

```hcl
resource "aws_cloudfront_distribution" "media_cloudfront" {
  comment = "A CloudFront distribution to S3 media files"
  enabled = true

  web_acl_id = ""
  is_ipv6_enabled = true

  origin {
    domain_name = aws_s3_bucket.media_bucket.bucket_regional_domain_name
    origin_id   = "S3-media-bucket"

    s3_origin_config {
      origin_access_identity = aws_cloudfront_origin_access_identity.media_oai.cloudfront_access_identity_path
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  default_cache_behavior {
    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    cached_methods  = ["GET", "HEAD", "OPTIONS"]
    compress        = true
    default_ttl     = 30 * 24 * 60 * 60

    forwarded_values {
      query_string = true

      cookies {
        forward = "none"
      }
    }

    max_ttl                = 30 * 24 * 60 * 60 
    min_ttl                = 0
    target_origin_id       = "S3-media-bucket"
    viewer_protocol_policy = "redirect-to-https"
  }
}
```

This was a long one but bear with me.
First, we put a meaningful comment to know what this distribution is about, we also create it as enabled, do not attach any web ACL, and allow IPv6 requests.
Then, we define our origin which means our S3 bucket. Inside the origin config, we tell CloudFront to use the origin access identity we created previously, as it has read access to our S3.
We do not restrict traffic by region and we set the viewer certificate to the one that comes by default with CloudFront, meaning you will get a `{randomId}.cloudfront.net` by the end. If you want to use your own domain, you need to set up your SSL certificate here and use the [alias](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution#aliases) attribute.
Finally, we set up our default cache behavior. By default, requests will be allowed and cached when using the HTTP methods above, we also allow compress and set the default and max TTL for 30 days. We allow query strings to be forwarded (this will be needed later when we have our Lambda@Edge), redirect HTTP traffic to HTTPS, and use our S3 origin (the only one we have anyway).

Now, if you have not done yet, perform the following terraform commands (be sure to set up AWS credentials env vars beforehand):
```sh
terraform init
terraform plan
```

This will output all the actions we will perform, it should look like this [maybe remove this as it is too lengthy?]:

```diff
Terraform used the selected providers to generate the following execution
plan. Resource actions are indicated with the following symbols:
  + create
 <= read (data resources)

Terraform will perform the following actions:

  # data.aws_iam_policy_document.s3_oai_read_policy will be read during apply
  # (config refers to values not yet known)
 <= data "aws_iam_policy_document" "s3_oai_read_policy"  {
      + id   = (known after apply)
      + json = (known after apply)

      + statement {
          + actions   = [
              + "s3:GetObject",
            ]
          + resources = [
              + (known after apply),
            ]

          + principals {
              + identifiers = [
                  + (known after apply),
                ]
              + type        = "AWS"
            }
        }
    }

  # aws_cloudfront_distribution.media_cloudfront will be created
  + resource "aws_cloudfront_distribution" "media_cloudfront" {
      + arn                            = (known after apply)
      + caller_reference               = (known after apply)
      + comment                        = "A CloudFront distribution to S3 media files"
      + domain_name                    = (known after apply)
      + enabled                        = true
      + etag                           = (known after apply)
      + hosted_zone_id                 = (known after apply)
      + http_version                   = "http2"
      + id                             = (known after apply)
      + in_progress_validation_batches = (known after apply)
      + is_ipv6_enabled                = true
      + last_modified_time             = (known after apply)
      + price_class                    = "PriceClass_All"
      + retain_on_delete               = false
      + status                         = (known after apply)
      + tags_all                       = (known after apply)
      + trusted_key_groups             = (known after apply)
      + trusted_signers                = (known after apply)
      + wait_for_deployment            = true

      + default_cache_behavior {
          + allowed_methods        = [
              + "GET",
              + "HEAD",
              + "OPTIONS",
            ]
          + cached_methods         = [
              + "GET",
              + "HEAD",
              + "OPTIONS",
            ]
          + compress               = true
          + default_ttl            = 2592000
          + max_ttl                = 2592000
          + min_ttl                = 0
          + target_origin_id       = "S3-media-bucket"
          + trusted_key_groups     = (known after apply)
          + trusted_signers        = (known after apply)
          + viewer_protocol_policy = "redirect-to-https"

          + forwarded_values {
              + headers                 = (known after apply)
              + query_string            = true
              + query_string_cache_keys = (known after apply)

              + cookies {
                  + forward           = "none"
                  + whitelisted_names = (known after apply)
                }
            }
        }

      + origin {
          + domain_name = (known after apply)
          + origin_id   = "S3-media-bucket"

          + s3_origin_config {
              + origin_access_identity = (known after apply)
            }
        }

      + restrictions {
          + geo_restriction {
              + locations        = (known after apply)
              + restriction_type = "none"
            }
        }

      + viewer_certificate {
          + cloudfront_default_certificate = true
          + minimum_protocol_version       = "TLSv1"
        }
    }

  # aws_cloudfront_origin_access_identity.media_oai will be created
  + resource "aws_cloudfront_origin_access_identity" "media_oai" {
      + caller_reference                = (known after apply)
      + cloudfront_access_identity_path = (known after apply)
      + comment                         = "media-origin-access-identity"
      + etag                            = (known after apply)
      + iam_arn                         = (known after apply)
      + id                              = (known after apply)
      + s3_canonical_user_id            = (known after apply)
    }

  # aws_s3_bucket.media_bucket will be created
  + resource "aws_s3_bucket" "media_bucket" {
      + acceleration_status         = (known after apply)
      + acl                         = "private"
      + arn                         = (known after apply)
      + bucket                      = "media-bucket-with-unique-name"
      + bucket_domain_name          = (known after apply)
      + bucket_regional_domain_name = (known after apply)
      + force_destroy               = false
      + hosted_zone_id              = (known after apply)
      + id                          = (known after apply)
      + region                      = (known after apply)
      + request_payer               = (known after apply)
      + tags_all                    = (known after apply)
      + website_domain              = (known after apply)
      + website_endpoint            = (known after apply)

      + cors_rule {
          + allowed_headers = [
              + "*",
            ]
          + allowed_methods = [
              + "GET",
              + "HEAD",
            ]
          + allowed_origins = [
              + "*",
            ]
          + max_age_seconds = 86400
        }

      + versioning {
          + enabled    = true
          + mfa_delete = false
        }
    }

  # aws_s3_bucket_policy.s3_oai_asset_bucket_policy will be created
  + resource "aws_s3_bucket_policy" "s3_oai_asset_bucket_policy" {
      + bucket = (known after apply)
      + id     = (known after apply)
      + policy = (known after apply)
    }

  # aws_s3_bucket_public_access_block.media_bucket_public_access_block will be created
  + resource "aws_s3_bucket_public_access_block" "media_bucket_public_access_block" {
      + block_public_acls       = true
      + block_public_policy     = true
      + bucket                  = (known after apply)
      + id                      = (known after apply)
      + ignore_public_acls      = true
      + restrict_public_buckets = true
    }

Plan: 5 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + cloudfront_domain_name = (known after apply)
 ```
 
 To actually perform these actions, you need to run `terraform apply`. This can take a while, and the very last log should display the URL of your CloudFront distribution (called `cloudfront_domain_name`).
 To test this, you can go to the S3 bucket in the AWS Console and upload any media file there.
 After this, you should be able to fetch it using `https://{randomId}.cloudfront.net/{imagePath}` while using the plain S3 url `http://{bucket-name}}.s3.{aws-region}.amazonaws.com/{imagePath}` will not work!
 
 You can check the full solution we went through up to this point here in this [GitHub repo](https://github.com/leonardofreitass/media-cloudfront/tree/s3-cloudfront-setup).
 
 That is about it! We have an S3 media bucket with a CloudFront distribution working! In the next steps, we will see how to create a Lambda@Edge and attach them to our CloudFront distribution in order to have on-demand image transformations and authentication. See you in the next article!
