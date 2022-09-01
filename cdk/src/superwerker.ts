import { CfnCondition, CfnParameter, CfnStack, custom_resources, Fn, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BudgetStack } from './budget';
import { ControlTowerStack } from './control-tower';
import { GuardDutyStack } from './guardduty';
import { LivingDocumentationStack } from './living-documentation';
import { NotificationsStack } from './notifications';
import { RootmailStack } from './rootmail';
import { SecurityHubStack } from './security-hub';

export class SuperwerkerStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    Stack.of(this).templateOptions.description = 'Automated Best Practices for AWS Cloud setups - https://superwerker.cloud (qs-1rhrhoi4t)';
    Stack.of(this).templateOptions.metadata = {
      SuperwerkerVersion: '0.0.0-DEVELOPMENT',
      QuickStartDocumentation: {
        EntrypointName: 'Parameters for launching Superwerker',
        Order: '1',
      },
    };

    // @ts-ignore
    const domain = new CfnParameter(this, 'Domain', {
      type: 'String',
      description: 'Domain used for root mail feature',
    });

    // @ts-ignore
    const subdomain = new CfnParameter(this, 'Subdomain', {
      type: 'String',
      description: 'Subdomain used for root mail feature',
      default: 'aws',
    });

    // @ts-ignore
    const notificationsMail = new CfnParameter(this, 'NotificationsMail', {
      type: 'String',
      description: 'Mail address used for notifications',
      default: '',
      allowedPattern: '(^$|^.*@.*\\..*$)',
    });

    // @ts-ignore
    const includeBudget = new CfnParameter(this, 'IncludeBudget', {
      type: 'String',
      description: 'Enable AWS Budgets alarm for monthly AWS spending',
      allowedValues: ['Yes', 'No'],
      default: 'Yes',
    });

    // @ts-ignore
    const includeGuardDuty = new CfnParameter(this, 'IncludeGuardDuty', {
      type: 'String',
      description: 'Enable Amazon GuardDuty',
      allowedValues: ['Yes', 'No'],
      default: 'Yes',
    });

    // @ts-ignore
    const includeSecurityHub = new CfnParameter(this, 'IncludeSecurityHub', {
      type: 'String',
      description: 'Enable AWS Security Hub',
      allowedValues: ['Yes', 'No'],
      default: 'Yes',
    });

    // @ts-ignore
    const includeBackup = new CfnParameter(this, 'IncludeBackup', {
      type: 'String',
      description: 'Enable automated backups',
      allowedValues: ['Yes', 'No'],
      default: 'Yes',
    });

    // @ts-ignore
    const includeServiceControlPolicies = new CfnParameter(this, 'IncludeServiceControlPolicies', {
      type: 'String',
      description: 'Enable service control policies in AWS organizations',
      allowedValues: ['Yes', 'No'],
      default: 'Yes',
    });

    // Backup
    const backupCondition = new CfnCondition(this, 'IncludeBackupCondition', {
      expression: Fn.conditionEquals(includeBackup, 'Yes'),
    });
    backupCondition.overrideLogicalId('IncludeBackup');
    const backupStack = new BudgetStack(this, 'Backup', {});
    (backupStack.node.defaultChild as CfnStack).overrideLogicalId('Backup');
    (backupStack.node.defaultChild as CfnStack).cfnOptions.condition = backupCondition;

    // Budgets
    const budgetCondition = new CfnCondition(this, 'IncludeBudgetCondition', {
      expression: Fn.conditionEquals(includeBudget, 'Yes'),
    });
    budgetCondition.overrideLogicalId('IncludeBudget');
    const budgetStack = new BudgetStack(this, 'Budget', {});
    (budgetStack.node.defaultChild as CfnStack).overrideLogicalId('Budget');
    (budgetStack.node.defaultChild as CfnStack).cfnOptions.condition = budgetCondition;

    // GuardDuty
    const guardDutyCondition = new CfnCondition(this, 'IncludeGuardDutyCondition', {
      expression: Fn.conditionEquals(includeGuardDuty, 'Yes'),
    });
    guardDutyCondition.overrideLogicalId('IncludeGuardDuty');
    const guardDutyStack = new GuardDutyStack(this, 'GuardDuty', {});
    (guardDutyStack.node.defaultChild as CfnStack).overrideLogicalId('GuardDuty');
    (guardDutyStack.node.defaultChild as CfnStack).cfnOptions.condition = guardDutyCondition;

    // Notifications
    const notificationsCondition = new CfnCondition(this, 'IncludeNotificationsCondition', {
      expression: Fn.conditionNot(Fn.conditionEquals(notificationsMail, '')),
    });
    notificationsCondition.overrideLogicalId('IncludeNotifications');
    const notificationsStack = new NotificationsStack(this, 'Notifications', {});
    (notificationsStack.node.defaultChild as CfnStack).overrideLogicalId('Notifications');
    (notificationsStack.node.defaultChild as CfnStack).cfnOptions.condition = notificationsCondition;

    // SecurityHub
    const securityHubCondition = new CfnCondition(this, 'IncludeSecurityHubCondition', {
      expression: Fn.conditionEquals(includeSecurityHub, 'Yes'),
    });
    securityHubCondition.overrideLogicalId('IncludeSecurityHub');
    const securityHubStack = new SecurityHubStack(this, 'SecurityHub', {});
    (securityHubStack.node.defaultChild as CfnStack).overrideLogicalId('SecurityHub');
    (securityHubStack.node.defaultChild as CfnStack).cfnOptions.condition = securityHubCondition;

    // ServiceControlPolicies
    const serviceControlPoliciesCondition = new CfnCondition(this, 'IncludeServiceControlPoliciesCondition', {
      expression: Fn.conditionEquals(includeServiceControlPolicies, 'Yes'),
    });
    serviceControlPoliciesCondition.overrideLogicalId('IncludeServiceControlPolicies');
    const serviceControlPoliciesStack = new SecurityHubStack(this, 'ServiceControlPolicies', {});
    (serviceControlPoliciesStack.node.defaultChild as CfnStack).overrideLogicalId('ServiceControlPolicies');
    (serviceControlPoliciesStack.node.defaultChild as CfnStack).cfnOptions.condition = serviceControlPoliciesCondition;

    /**
     * Core Components
     */

    // RootMail
    const rootMailStack = new RootmailStack(this, 'RootMail', {});
    (rootMailStack.node.defaultChild as CfnStack).overrideLogicalId('RootMail');

    const emailAudit = new custom_resources.AwsCustomResource(this, 'GeneratedAuditAWSAccountEmail', {
      onUpdate: {
        service: 'lambda',
        action: 'invoke',
        parameters: {
          FunctionName: (rootMailStack.node.defaultChild as CfnStack).getAtt('Outputs.EmailGeneratorFunction'),
          Payload: {
            Purpose: 'audit',
          },
        },
        physicalResourceId: custom_resources.PhysicalResourceId.of(Date.now().toString()), // Update physical id to always fetch the latest version
      },
      policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
        resources: custom_resources.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    // (emailAudit.node.defaultChild as CfnResource).overrideLogicalId('GeneratedAuditAWSAccountEmail');

    const emailLogArchive = new custom_resources.AwsCustomResource(this, 'GeneratedLogArchiveAWSAccountEmail', {
      onUpdate: {
        // will also be called for a CREATE event
        service: 'lambda',
        action: 'invoke',
        parameters: {
          FunctionName: (rootMailStack.node.defaultChild as CfnStack).getAtt('Outputs.EmailGeneratorFunction'),
          Payload: {
            Purpose: 'logarchive',
          },
        },
        physicalResourceId: custom_resources.PhysicalResourceId.of(Date.now().toString()), // Update physical id to always fetch the latest version
      },
      policy: custom_resources.AwsCustomResourcePolicy.fromSdkCalls({
        resources: custom_resources.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    // (emailLogArchive.node.defaultChild as CfnResource).overrideLogicalId('GeneratedLogArchiveAWSAccountEmail');

    // ControlTower
    const controlTowerStack = new ControlTowerStack(this, 'ControlTower', {
      parameters: {
        AuditAWSAccountEmail: emailAudit.getResponseField('email'),
        LogArchiveAWSAccountEmail: emailLogArchive.getResponseField('email'),
      },
    });
    (controlTowerStack.node.defaultChild as CfnStack).overrideLogicalId('ControlTower');

    // LivingDocumentation
    const livingDocumentationStack = new LivingDocumentationStack(this, 'LivingDocumentation', {});
    (livingDocumentationStack.node.defaultChild as CfnStack).overrideLogicalId('LivingDocumentation');
  }
}