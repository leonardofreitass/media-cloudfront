output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.media_cloudfront.domain_name
}
