import {Construct, StackProps,Duration} from "@aws-cdk/core";
import {IFunction} from "@aws-cdk/aws-lambda";
import {Queue} from "@aws-cdk/aws-sqs";
import {ITopic, SubscriptionFilter, Topic} from "@aws-cdk/aws-sns";
import {LambdaSubscription, SqsSubscription} from "@aws-cdk/aws-sns-subscriptions";
import {SqsEventSource} from "@aws-cdk/aws-lambda-event-sources";

export interface AsyncMessageProcessingProps extends StackProps {
  snsLambdaSubscribers?: Array<IFunction>,
  sqsConsumer: IFunction,
  sqsProperties?: SqsProperties
}

export interface SqsSnsSubscriber {
  name: string,
  sqsConsumer: IFunction,
  sqsProperties?: SqsProperties,
  filterPolicy?: {[p: string]: SubscriptionFilter}
}

interface SqsProperties {
  visibilityTimeout?: Duration,
  lambdaEventSourceBatchSize?: number;
}

// noinspection JSUnusedGlobalSymbols
export class AsyncMessageProcessing extends Construct {
  public snsTopic: ITopic;
  private maxReceiveCount: number = 5;
  private lambdaEventSourceBatchSize: number;

  // noinspection JSUnusedGlobalSymbols
  constructor(scope: Construct, id: string, props?: AsyncMessageProcessingProps) {
    super(scope, id);

    this.snsTopic = new Topic(this, 'topic', {});

    if (props) {
      this.getLambdaEventSourceBatchSize(props);

      const queueDLQ = new Queue(this, 'deadLetterQueue', {});
      const queueMain = new Queue(this, 'mainQueue', {
        deadLetterQueue: {
          queue: queueDLQ,
          maxReceiveCount: this.maxReceiveCount
        },
        visibilityTimeout: props.sqsProperties?.visibilityTimeout || Duration.seconds(30),
      });

      this.snsTopic.addSubscription(new SqsSubscription(queueMain, {
        filterPolicy: {
          "action": new SubscriptionFilter([{"exists": false}])
        }
      }));

      if (props.snsLambdaSubscribers) {
        props.snsLambdaSubscribers.forEach(lambda => {
          this.snsTopic.addSubscription(new LambdaSubscription(lambda));
        });
      }

      props.sqsConsumer.addEventSource(new SqsEventSource(queueMain, {batchSize: this.lambdaEventSourceBatchSize}));
    }
  }

  // noinspection JSUnusedGlobalSymbols
  public addSqsSnsSubscriber(sqsSnsSubscriber: SqsSnsSubscriber) {
    const queueDLQ = new Queue(this, `dlq${sqsSnsSubscriber.name}`, {});
    const queue = new Queue(this, `q${sqsSnsSubscriber.name}`, {
      deadLetterQueue: {
        queue: queueDLQ,
        maxReceiveCount: this.maxReceiveCount
      },
      visibilityTimeout: sqsSnsSubscriber.sqsProperties?.visibilityTimeout || Duration.seconds(30)
    });

    this.getLambdaEventSourceBatchSize(sqsSnsSubscriber);
    this.snsTopic.addSubscription(new SqsSubscription(queue, {
      filterPolicy: sqsSnsSubscriber.filterPolicy
    }));
    sqsSnsSubscriber.sqsConsumer.addEventSource(new SqsEventSource(queue, {
      batchSize: this.lambdaEventSourceBatchSize
    }));
  }

  private getLambdaEventSourceBatchSize(props: any) {
    if (props.sqsProperties.lambdaEventSourceBatchSize) {
      this.lambdaEventSourceBatchSize = props.sqsProperties.lambdaEventSourceBatchSize;
    } else {
      this.lambdaEventSourceBatchSize = 1;
    }
  }
}
