import * as cdk from 'aws-cdk-lib';
import { Bucket, BucketEncryption} from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy, CfnOutput} from 'aws-cdk-lib';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Role, OpenIdConnectProvider, WebIdentityPrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { CfnGitHubRepository } from 'aws-cdk-lib/aws-codestar';



// define the properties passed to s3 stack construct 
export interface SecureBucketProps extends cdk.StackProps {
  projectId: string;
  enableVersioning?: boolean;
  enableEncryption?: boolean;
  blockPublicAccess?: boolean;
  githubRepoOwner: string;
  githubRepoName: string;
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
    this.bucketName = bucketId

    //  Bucket supports optional versioning and KMS encryption (pass in as construct props). 
    const bucket = new Bucket(this, 's3SecureBucket', {
      bucketName: this.bucketName.toLowerCase(),
      removalPolicy: RemovalPolicy.DESTROY, // Automatically destroy bucket and contents on stack deletion
      versioned: props?.enableVersioning ?? true,                        // enable versioning 
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // Block all public access
      encryption: BucketEncryption.S3_MANAGED // Enable S3-managed encryption
    });

    this.bucketName = bucket.bucketName; // Store bucket name for output

    const oidcProvider = OpenIdConnectProvider.fromOpenIdConnectProviderArn(this, 'GitHubOIDCProvider', 
      `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`
    );

    const oidcRole = new Role(this, 'GitHubActionsOICDRole', {
      assumedBy: new WebIdentityPrincipal(oidcProvider.openIdConnectProviderArn, {
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${props.githubRepoOwner}/${props.githubRepoName}:*`,
        },
      }),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess')], // Adjust permissions as needed
    });

    this.oidcRoleArn = oidcRole.roleArn; // Store OIDC role ARN for output


    // 3. Output the OIDC Role ARN and the bucket name
    new CfnOutput(this, 'BucketName', {
      value: this.bucketName,
      description: 'The name of the S3 bucket',
    });

    new CfnOutput(this, 'OidcRoleArn', {
      value: this.oidcRoleArn,
      description: 'The ARN of the GitHub OIDC role for deployments',
    });

  }
}
