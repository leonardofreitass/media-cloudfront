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

    lambda_function_association {
      event_type   = "origin-request"
      lambda_arn   = aws_lambda_function.origin_request_lambda.qualified_arn
      include_body = false
    }

    lambda_function_association {
      event_type   = "origin-response"
      lambda_arn   = aws_lambda_function.origin_response_lambda.qualified_arn
      include_body = false
    }
  }
}
