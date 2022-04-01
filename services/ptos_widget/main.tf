terraform {
  backend "s3" {
    bucket  = "tfstat3s"
    key     = "widgets/ptos_widget/terraform.tfstate"
    region  = "eu-central-1"
    encrypt = true
  }
}

provider "aws" {
  profile = "default"
  region  = "eu-central-1"
}

resource "aws_s3_bucket" "widget" {
  bucket = "ptos-widget"
}

resource "aws_s3_bucket_acl" "example" {
  bucket = aws_s3_bucket.widget.id
  acl    = "public-read"
}

resource "aws_s3_object" "js_objects" {
  for_each = fileset("dist/", "*.js")

  bucket        = aws_s3_bucket.widget.bucket
  key           = "dist/${each.value}"
  source        = "dist/${each.value}"
  acl           = "public-read"
  etag          = filemd5("dist/${each.value}")
  content_type  = "application/javascript"
  cache_control = "max-age=31536000"
}
