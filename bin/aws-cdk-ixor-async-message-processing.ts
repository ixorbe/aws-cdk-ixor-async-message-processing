#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { AwsCdkIxorAsyncMessageProcessingStack } from '../lib/aws-cdk-ixor-async-message-processing-stack';

const app = new cdk.App();
new AwsCdkIxorAsyncMessageProcessingStack(app, 'AwsCdkIxorAsyncMessageProcessingStack');
