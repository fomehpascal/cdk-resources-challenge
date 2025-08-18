import * as cdk from 'aws-cdk-lib';
import { Bucket, BucketEncryption, CfnBucket } from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { CfnGitHubRepository } from 'aws-cdk-lib/aws-codestar';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

// define the properties passed to s3 stack construct 
export interface SecureBucketProps extends cdk.StackProps {
  projectId: string;
  enableVersioning?: boolean;
  enableEncryption?: boolean;
  blockPublicAccess?: boolean
  githubRepo?: string; // e.g. 'yourorg/yourrepo'
}

export class CdkResourcesStack extends cdk.Stack {
  public readonly projectId: string;
  public readonly bucketName: string;
  public readonly oidcRoleArn: string;
  

  constructor(scope: Construct, id: string, props: SecureBucketProps) {
    super(scope, id, props);

    //requirement: bucket name is prefixed with a project identifier
    const bucketNamePrefix = props.projectId;
    const bucketId = `${bucketNamePrefix}-my-bucket`; 
    

    // create an s3 bucket 
    const bucket = new Bucket(this, 's3SecureBucket', {
      bucketName: bucketId.toLowerCase(),
      versioned: props.enableVersioning ?? true,  // enable versioing 
      encryption: props.enableEncryption ? BucketEncryption.S3_MANAGED // KMS encryption if specified, else S3 Managed
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL
      
      // Always block public access for security



    })


    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'CdkResourcesQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
