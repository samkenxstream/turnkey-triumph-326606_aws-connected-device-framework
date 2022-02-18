The following env config needs defining per environment:

AWS_ACCOUNTID=
AWS_REGION=
AWS_DYNAMODB_TABLE_NAME=
AWS_S3_ARTIFACTS_BUCKET=
AWS_S3_ARTIFACTS_PREFIX=
AWS_SQS_QUEUES_CORE_TASKS=
AWS_SQS_QUEUES_DEPLOYMENT_TASKS=

CUSTOM_DOMAIN_BASE_PATH=

PROVISIONING_API_FUNCTION_NAME=

ASSETLIBRARY_API_FUNCTION_NAME=

# json map of alias to lambda function name
# e.g. INSTALLER_CONFIG_GENERATORS={"MANUAL_INSTALL":"my_lambda"}
INSTALLER_CONFIG_GENERATORS=