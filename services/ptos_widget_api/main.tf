variable "lambda_name" { default = "ptos_widget_api" }
variable "table_name" { default = "ptos_fetcher" }
variable "bucket" { default = "tfstat3s" }
variable "region" { default = "eu-central-1" }

terraform {
  backend "s3" {
    bucket  = "tfstat3s"
    key     = "widgets/ptos_widget_api/terraform.tfstate"
    region  = "eu-central-1"
    encrypt = true
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "4.29.0"
    }
  }
}

provider "aws" {
  region = "eu-central-1"
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "./dist"
  output_path = "./builds/lambda"
}

resource "aws_iam_role" "lambda" {
  name = var.lambda_name

  assume_role_policy = <<-POLICY
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Effect": "Allow",
        "Sid": ""
      }
    ]
  }
  POLICY
}

resource "aws_lambda_function" "lambda" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = var.lambda_name
  role             = aws_iam_role.lambda.arn
  handler          = "app.lambdaHandler"
  runtime          = "nodejs14.x"
  source_code_hash = filebase64sha256(data.archive_file.lambda_zip.output_path)

  environment {
    variables = {
      TABLE_NAME = var.table_name
    }
  }
}

resource "aws_cloudwatch_log_group" "example" {
  name              = "/aws/lambda/${var.lambda_name}"
  retention_in_days = 7
}

resource "aws_iam_policy" "lambda_logging" {
  name        = "${var.lambda_name}_lambda_logging"
  path        = "/"
  description = "IAM policy for logging from a lambda"

  policy = <<-POLICY
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Action": [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ],
        "Resource": "arn:aws:logs:*:*:*",
        "Effect": "Allow"
      }
    ]
  }
  POLICY
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = aws_iam_policy.lambda_logging.arn
}

data "terraform_remote_state" "database" {
  backend = "s3"

  config = {
    bucket = var.bucket
    key    = "widgets/ptos_fetcher/terraform.tfstate"
    region = var.region
  }
}

data "aws_iam_policy_document" "dynamo" {
  statement {
    actions = [
      "dynamodb:Scan"
    ]
    resources = [
      data.terraform_remote_state.database.outputs.database_arn
    ]
  }
}

resource "aws_iam_role_policy" "lambda_dynamo" {
  name   = "DynamoDB"
  policy = data.aws_iam_policy_document.dynamo.json
  role   = aws_iam_role.lambda.id
}

resource "aws_apigatewayv2_api" "lambda" {
  name          = var.lambda_name
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_stage" "lambda" {
  api_id = aws_apigatewayv2_api.lambda.id

  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw.arn

    format = jsonencode({
      requestId               = "$context.requestId"
      sourceIp                = "$context.identity.sourceIp"
      requestTime             = "$context.requestTime"
      protocol                = "$context.protocol"
      httpMethod              = "$context.httpMethod"
      resourcePath            = "$context.resourcePath"
      routeKey                = "$context.routeKey"
      status                  = "$context.status"
      responseLength          = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
      }
    )
  }
}

resource "aws_apigatewayv2_integration" "integration" {
  api_id = aws_apigatewayv2_api.lambda.id

  integration_uri    = aws_lambda_function.lambda.invoke_arn
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "get_index" {
  api_id             = aws_apigatewayv2_api.lambda.id
  authorizer_id      = aws_apigatewayv2_authorizer.ip_allowlist_authorizer.id
  authorization_type = "CUSTOM"
  route_key          = "GET /{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.integration.id}"
}

resource "aws_cloudwatch_log_group" "api_gw" {
  name = "/aws/api_gw/${aws_apigatewayv2_api.lambda.name}"

  retention_in_days = 30
}

resource "aws_lambda_permission" "api_gw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.lambda.execution_arn}/*/*"
}

resource "aws_apigatewayv2_authorizer" "ip_allowlist_authorizer" {
  api_id                            = aws_apigatewayv2_api.lambda.id
  authorizer_type                   = "REQUEST"
  enable_simple_responses           = "true"
  authorizer_uri                    = "arn:aws:apigateway:eu-central-1:lambda:path/2015-03-31/functions/arn:aws:lambda:eu-central-1:157940840475:function:authorizer/invocations"
  authorizer_payload_format_version = "2.0"
  identity_sources                  = ["$context.identity.sourceIp"]
  name                              = "ip_allowlist_authorizer"
  authorizer_result_ttl_in_seconds  = 0
}

output "base_url" {
  value = aws_apigatewayv2_stage.lambda.invoke_url
}
