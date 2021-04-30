# media-cloudfront

Media CloudFront with Lambda@Edge using Terraform
This is the source code developed through the course of the "{Blog Post Name}" post series[Link here to the post].

## Overview

This repository contains the terraform files that creates an S3 bucket used to upload media and a CloudFront distribution to distribute that media through a Content Delivery Network. We also attach some Lambda@Edge on our CloudFront distribution to: Dinamically switch origins (in order to support image transformations using Cloudinary), unify the response provided from different origins, and require authentication in order to access the media.

In order to spin all the above, you will need:

- An AWS account
- An Cloudinary account
- Terraform installed

We will not cover here any service that uploads media to the S3 bucket or emits authentication tokens to access those medias, we will solely focus on the Delivery part of the setup.
