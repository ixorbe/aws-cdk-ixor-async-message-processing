import {Aws, Construct, StackProps,Duration} from "@aws-cdk/core";
import {IFunction} from "@aws-cdk/aws-lambda";
import {Queue, DeadLetterQueue} from "@aws-cdk/aws-sqs";
import {ITopic, Topic} from "@aws-cdk/aws-sns";
import {LambdaSubscription, SqsSubscription} from "@aws-cdk/aws-sns-subscriptions";
import {SqsEventSource} from "@aws-cdk/aws-lambda-event-sources";

export interface AsyncMessageProcessingProps extends StackProps {
  snsLambdaSubscribers?: Array<IFunction>,
  sqsConsumer: IFunction,
  sqsProperties?: SqsProperties
}

interface SqsProperties {
  visibilityTimeout?: Duration,
  lambdaEventSourceBatchSize?: number;
}

export class AsyncMessageProcessing extends Construct {
  public snsTopic: ITopic;
  private maxReceiveCount: number = 5;
  private lambdaEventSourceBatchSize: number;

  constructor(scope: Construct, id: string, props: AsyncMessageProcessingProps) {
    super(scope, id);

    this.getLambdaEventSourceBatchSize(props);

    const queueDLQ = new Queue(this, 'deadLetterQueue', {});
    const dlqProperties: DeadLetterQueue = {queue: queueDLQ, maxReceiveCount: this.maxReceiveCount}
    const queueMain = new Queue(this, 'mainQueue', {
      deadLetterQueue: {
        queue: queueDLQ,
        maxReceiveCount: this.maxReceiveCount
      },
      visibilityTimeout: props.sqsProperties?.visibilityTimeout || Duration.seconds(30),

    });

    this.snsTopic = new Topic(this, 'topic', {});
    this.snsTopic.addSubscription(new SqsSubscription(queueMain));

    if (props.snsLambdaSubscribers) {
      props.snsLambdaSubscribers.forEach(lambda => {
        this.snsTopic.addSubscription(new LambdaSubscription(lambda));
      });
    }

    props.sqsConsumer.addEventSource(new SqsEventSource(queueMain, {batchSize: this.lambdaEventSourceBatchSize}));
  }

  private getLambdaEventSourceBatchSize(props: any) {
    if (props.sqsProperties.lambdaEventSourceBatchSize) {
      this.lambdaEventSourceBatchSize = props.sqsProperties.lambdaEventSourceBatchSize;
    } else {
      this.lambdaEventSourceBatchSize = 1;
    }
  }
}
