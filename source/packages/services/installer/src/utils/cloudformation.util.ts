/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
import ow from 'ow';
import execa from 'execa';
import { CloudFormationClient, DeleteStackCommand, DescribeStacksCommand, ListStackResourcesCommand, Output, Parameter, StackResourceSummary, waitUntilStackDeleteComplete } from '@aws-sdk/client-cloudformation';
import { Answers } from '../models/answers';
import { TagsList } from '../utils/tags';

const inMemoryStackOutputs: { [key: string]: Output[] } = {}
const inMemoryStackResourceSummaries: { [key: string]: StackResourceSummary[] } = {}
const inMemoryStackParameters: { [key: string]: Parameter[] } = {}

type GetCloudFormationStackDetail = (key: string) => string

const getStackOutputs = async (stackName: string, region: string): Promise<GetCloudFormationStackDetail> => {
    const cloudformation = new CloudFormationClient({ region });
    if (!inMemoryStackOutputs[stackName]) {
        try {
            const response = await cloudformation.send(new DescribeStacksCommand({ StackName: stackName }))
            inMemoryStackOutputs[stackName] = response.Stacks[0].Outputs
        } catch (e) {
            if (e.code !== 'ValidationError') {
                inMemoryStackOutputs[stackName] = []
            } else {
                throw e;
            }
        }
    }

    const getStackResourceId = (key: string): string => {
        return inMemoryStackOutputs[stackName].find(r => r.OutputKey === key)?.OutputValue;
    }
    return getStackResourceId
}

const getStackResourceSummaries = async (stackName: string, region: string): Promise<GetCloudFormationStackDetail> => {
    const cloudformation = new CloudFormationClient({ region });
    if (!inMemoryStackResourceSummaries[stackName]) {

        try {
            // Check if stack exists, listStackResources will return result even if
            // stack is deleted
            await cloudformation.send(new DescribeStacksCommand({ StackName: stackName }))
            const resources = await cloudformation.send(new ListStackResourcesCommand({
                StackName: stackName
            }));
            inMemoryStackResourceSummaries[stackName] = resources.StackResourceSummaries
        } catch (e) {
            if (e.code !== 'ValidationError') {
                inMemoryStackResourceSummaries[stackName] = []
            } else {
                throw e;
            }
        }
    }

    const getStackResourceId = (key: string): string => {
        return inMemoryStackResourceSummaries[stackName]?.find(r => r.LogicalResourceId === key)?.PhysicalResourceId;
    }
    return getStackResourceId
}

const getStackParameters = async (stackName: string, region: string): Promise<GetCloudFormationStackDetail> => {
    const cloudformation = new CloudFormationClient({ region });

    if (!inMemoryStackParameters[stackName]) {
        try {
            const stack = await cloudformation.send(new DescribeStacksCommand({
                StackName: stackName
            }));
            inMemoryStackParameters[stackName] = stack.Stacks[0].Parameters
        } catch (e) {
            if (e.code !== 'ValidationError') {
                inMemoryStackParameters[stackName] = []
            } else {
                throw e;
            }

        }
    }

    const getStackResourceId = (key: string): string => {
        return inMemoryStackParameters[stackName].find(p => p.ParameterKey === key)?.ParameterValue;
    }
    return getStackResourceId
}


const deleteStack = async (stackName: string, region: string): Promise<void> => {
    const cloudformation = new CloudFormationClient({ region });
    try {
        await cloudformation.send(new DescribeStacksCommand({ StackName: stackName }))
        await cloudformation.send(new DeleteStackCommand({ StackName: stackName }));
        await waitUntilStackDeleteComplete({ client: cloudformation, maxWaitTime: 30 * 60 }, { StackName: stackName })
    }
    catch (Exception) {
        console.log(`Stack ${stackName} does not exist, error: ${Exception}`)
    }
}

interface packageAndDeployStackParams {
  answers: Answers,
  stackName: string,
  serviceName: string,
  templateFile: string,
  parameterOverrides?: string[],
  needsPackaging?: boolean,
  needsCapabilityNamedIAM?: boolean,
  needsCapabilityAutoExpand?: boolean,
  cwd?: string,
}

const packageAndDeployStack = async({
  answers,
  stackName,
  serviceName,
  templateFile,
  parameterOverrides = [],
  needsPackaging = false,
  needsCapabilityNamedIAM = false,
  needsCapabilityAutoExpand = false,
  cwd = undefined,
}: packageAndDeployStackParams): Promise<void> => {
  ow(answers, ow.object.nonEmpty);
  ow(stackName, ow.string.nonEmpty);
  ow(serviceName, ow.string.nonEmpty);
  ow(templateFile, ow.string.nonEmpty);
  ow(needsPackaging, ow.boolean);
  ow(needsCapabilityNamedIAM, ow.boolean);
  ow(needsCapabilityAutoExpand, ow.boolean);

  const templateFileBuilt = (needsPackaging) ? `${templateFile}.build` : templateFile;
  const cmdOptions = (cwd !== undefined) ? {cwd: cwd} : {};

  if (needsPackaging) {
    const packageArgs = [
      '--template-file', templateFile,
      '--output-template-file', templateFileBuilt,
      '--s3-bucket', answers.s3.bucket,
      '--s3-prefix', 'cloudformation/artifacts/',
      '--region', answers.region,
    ];
    await execa('aws', ['cloudformation', 'package', ...packageArgs], cmdOptions);
  }

  const tagsList = new TagsList(answers.customTags ?? '');
  const deployArgs = [
    '--template-file', templateFileBuilt,
    '--stack-name', stackName,
    '--no-fail-on-empty-changeset',
    '--region', answers.region,
    '--tags', `cdf_service=${serviceName}`, `cdf_environment=${answers.environment}`, ...tagsList.asCLIOptions(),
  ];
  if (parameterOverrides.length > 0) deployArgs.push('--parameter-overrides', ...parameterOverrides);
  if (needsCapabilityNamedIAM || needsCapabilityAutoExpand) deployArgs.push('--capabilities');
  if (needsCapabilityNamedIAM) deployArgs.push('CAPABILITY_NAMED_IAM');
  if (needsCapabilityAutoExpand) deployArgs.push('CAPABILITY_AUTO_EXPAND');

  await execa('aws', ['cloudformation', 'deploy', ...deployArgs], cmdOptions);
}

export {
    deleteStack,
    getStackOutputs,
    getStackResourceSummaries,
    getStackParameters,
    packageAndDeployStack,
}
