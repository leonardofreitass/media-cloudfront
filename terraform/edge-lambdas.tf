

locals {
  lambda_path  = "../edge-lambdas/built"
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

resource "aws_lambda_function" "origin_response_lambda" {
  filename         = data.archive_file.origin_response_lambda.output_path
  function_name    = "media-origin-response"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  source_code_hash = filebase64sha256(data.archive_file.origin_response_lambda.output_path)
  runtime          = "nodejs14.x"
  publish          = true
}
