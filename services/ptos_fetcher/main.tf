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
      version = "4.29.0"
    }
  }
}

provider "aws" {
  region = "eu-central-1"
}

variable "lambda_name" { default = "ptos_fetcher" }
variable "table_name" { default = "ptos_fetcher" }

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "./dist"
  output_path = "./build"
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

data "aws_ssm_parameter" "ami" {
  name = "NOTION_TOKEN"
}

resource "aws_lambda_function" "lambda" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = var.lambda_name
  role             = aws_iam_role.lambda.arn
  handler          = "app.lambdaHandler"
  runtime          = "nodejs14.x"
  timeout          = 6
  source_code_hash = filebase64sha256(data.archive_file.lambda_zip.output_path)

  environment {
    variables = {
      NOTION_TOKEN = data.aws_ssm_parameter.ami.value
      TABLE_NAME   = var.table_name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_cloudwatch_log_group.lambda,
  ]
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

resource "aws_cloudwatch_log_group" "lambda" {
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

module "chatbot_slack_configuration" {
  source  = "waveaccounting/chatbot-slack-configuration/aws"
  version = "1.1.0"

  configuration_name = "aws-alerts-chatbot"
  iam_role_arn       = aws_iam_role.chatbot.arn
  slack_channel_id   = "C04AD8NPSB0"
  slack_workspace_id = "T336TTHNW"

  sns_topic_arns = [
    aws_sns_topic.alarm.arn,
  ]
}

resource "aws_iam_role" "chatbot" {
  name = "AwsChatBot"

  assume_role_policy = <<-POLICY
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "chatbot.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }
  POLICY
}

data "aws_iam_policy_document" "chatbot_policy" {
  statement {
    sid    = "AllowCloudWatch"
    effect = "Allow"

    actions = [
      "cloudwatch:Describe*",
      "cloudwatch:Get*",
      "cloudwatch:List*"
    ]

    resources = ["*"]
  }
}

resource "aws_sns_topic" "alarm" {
  name = "lambda-error-alarm"
}

resource "aws_cloudwatch_metric_alarm" "fetcher_lambda_errors" {
  alarm_name          = "fetcher_lambda_errors_alarm"
  alarm_description   = "Lambda function failed more than 1 time in the last 30 minutes."
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  period              = 1800
  datapoints_to_alarm = 1
  statistic           = "Sum"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  dimensions = {
    "FunctionName" = aws_lambda_function.lambda.function_name
  }
  threshold          = 1
  treat_missing_data = "missing"
  alarm_actions      = [aws_sns_topic.alarm.arn]
}

output "database_arn" {
  value = aws_dynamodb_table.ptos_fetcher.arn
}

output "lambda_alarm_sns_topic_arn" {
  value = aws_sns_topic.alarm.arn
}
