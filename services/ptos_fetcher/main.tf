terraform {
  backend "s3" {
    bucket  = "tfstat3s"
    key     = "widgets/ptos_fetcher/terraform.tfstate"
    region  = "eu-central-1"
    encrypt = true
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  profile = "default"
  region  = "eu-central-1"
}

variable "global_name" { default = "ptos_fetcher" }
variable "table_name" { default = "ptos_fetcher" }

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "./dist"
  output_path = "./build"
}

resource "aws_iam_role" "lambda" {
  name = var.global_name

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

data "aws_ssm_parameter" "ami" {
  name = "NOTION_TOKEN"
}

resource "aws_lambda_function" "lambda" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = var.global_name
  role             = aws_iam_role.lambda.arn
  handler          = "app.lambdaHandler"
  runtime          = "nodejs14.x"
  source_code_hash = filebase64sha256(data.archive_file.lambda_zip.output_path)

  environment {
    variables = {
      NOTION_TOKEN = data.aws_ssm_parameter.ami.value
      TABLE_NAME   = var.table_name
    }
  }
}

resource "aws_dynamodb_table" "ptos_fetcher" {
  name           = var.table_name
  read_capacity  = 20
  write_capacity = 20
  hash_key       = "uid"

  attribute {
    name = "uid"
    type = "S"
  }
}

data "aws_iam_policy_document" "dynamo" {
  statement {
    actions = [
      "dynamodb:BatchWriteItem"
    ]
    resources = [
      aws_dynamodb_table.ptos_fetcher.arn
    ]
  }
}

resource "aws_iam_role_policy" "lambda_dynamo" {
  name   = "DynamoDB"
  policy = data.aws_iam_policy_document.dynamo.json
  role   = aws_iam_role.lambda.id
}

resource "aws_cloudwatch_event_rule" "every_hour_on_weekdays" {
  name                = "every_hour_on_weekdays"
  description         = "Fires every hour between 6:00 AM and 9:00 PM UTC weekdays"
  schedule_expression = "cron(0/60 6-21 ? * MON-FRI *)"
}

resource "aws_cloudwatch_event_target" "sync_ptos_with_notion_every_hour" {
  rule      = aws_cloudwatch_event_rule.every_hour_on_weekdays.name
  target_id = "lambda"
  arn       = aws_lambda_function.lambda.arn
}

resource "aws_lambda_permission" "allow_cloudwatch_to_call_lambda" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.every_hour_on_weekdays.arn
}

output "database_arn" {
  value = "${aws_dynamodb_table.ptos_fetcher.arn}"
}
