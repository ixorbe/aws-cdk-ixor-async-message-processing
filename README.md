# AWS CDK construct for asynchronous message processing

## What is provisioned

* A SNS Topic that accepts events from a user defined Lambda (not part of the construct)
* A SQS Queue, subscribed to the above SNS Topic
* The list af Lambda's passed in the `snsLambdaSubscribers` property are added as additional subscribers
  for the SNS topic. This can, for example, be used to log the posted events
* The Lambda function passed in the `sqsConsumer` property will consume the SQS messages
* The resource that posts messages to the SNS Topic is not passed to the construct. Instead, **you should**:
  * Create the message producer in your stack, for example a Lambda function `mySNSProducer`
  * Pass the SQS ARN `ampStack.snsTopic.topicArn` to that resource, for example in the Lambda's environment
  * Grant permissions on the topic for your resource with `ampStack.snsTopic.grantPublish(mySNSProducer)`

## Visual representation of the created resources

```yaml
                                                  +--------------+
                                                  |Optional      |
                                  +---------------> Subscriber N |
                                  |               +--------------+
                                  |
                                  |               +--------------+
                                  |               |Optional      |
                                  |   +-----------> Subscriber 1 |
                                  |   |           +--------------+
                                  |   |
                         +--------+---+--+        +--------------+       +--------------+
    from producer ------->   SNS Topic   +-------->   SQS Queue  +------->    Lambda    |
                         +---------------+        +------+-------+       +--------------+
                                                         |
                                                  +------v-------+
                                                  |     DLQ      |
                                                  +--------------+

```

## A few words about the Lambda function that consumes the SQS messages

* The `timeOut` of the Lambda function should be lower than the SQS Queue visibility
  timeout (default is 30 seconds, can be changed with the `sqsProperties.visibilityTimeout` property in
  `AsyncMessageProcessingProps`)

## AWS Best practices for SQS and Lambda

[Source for these best practices](https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html)

* Set the source queue's visibility timeout to at least 6 times the timeout that you configure on your function
* Set the maxReceiveCount on the source queue's redrive policy to at least 5
* Configure a dead letter queue

## Links and Resources

* https://dev.to/frosnerd/understanding-the-aws-lambda-sqs-integration-1981
* https://www.bluematador.com/blog/why-aws-lambda-throttles-functions
* https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template

