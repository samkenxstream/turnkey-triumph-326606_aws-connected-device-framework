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
import 'reflect-metadata';
import AWS from 'aws-sdk';
import { CreateDeviceCertificateStepProcessor } from './createDeviceCertificateProcessor';
import { ProvisioningStepData } from './provisioningStep.model';
import * as pem from 'pem';
import { CreateDeviceCertificateParameters } from '../things.models';
import clone from 'just-clone';

describe('CreateDeviceCertificateStepProcessor', () => {
    let instance: CreateDeviceCertificateStepProcessor;

    // IoT mocks
    const mockIot = new AWS.Iot();

    // SSM mock
    const mockSSM = new AWS.SSM();

    it('device certificate processor should create device cert and key', async () => {

        instance = new CreateDeviceCertificateStepProcessor(() => mockIot, () => mockSSM, 356);

        const cert = {
            certificateDescription: {
                certificateArn: 'arn:aws:iot:us-west-2:1234567890:cacert/bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce',
                certificateId: 'bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce',
                status: 'ACTIVE',
                certificatePem: '-----BEGIN CERTIFICATE-----\nMIIDizCCAnOgAwIBAgIJANoWbro62kdKMA0GCSqGSIb3DQEBCwUAMFwxCzAJBgNV\nBAYTAlVTMQswCQYDVQQIDAJXQTEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwG\nQW1hem9uMQwwCgYDVQQLDANBV1MxDzANBgNVBAMMBm15bmFtZTAeFw0xNzAxMTky\nMTUzNThaFw0xOTExMDkyMTUzNThaMFwxCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJX\nQTEQMA4GA1UEBwwHU2VhdHRsZTEPMA0GA1UECgwGQW1hem9uMQwwCgYDVQQLDANB\nV1MxDzANBgNVBAMMBm15bmFtZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoC\nggEBAKLS/tGiQUHqkK4Xrgvg3jttnEL5127yBwiIwR2nrPzRGG8+rjDtlImgiOlJ\nHp4uTbxlpBZJw72yXB3gqMXG8jgsu2qDDElJxe1/xYalBOCBh+PPYA7PF+MluKsP\nvF+fGmwt8z9VeMXbkTPdACDHraht1APyznVzjaXpJgaDYLS3NNxniJ3pI7GKASyI\nEVHo5s1isUdwGQtV9Owb1BZJKMlTY4YXJ1LaAsKhCNutaQD4GkRWBnS5+B7NUMle\noKTtqsu53hggz0GeRw6HN2BhxLP98xGybuTTbH6ucE3Sj0a1+XLWcbqK2Iuf0sBT\nGSHDZQlEVCEXCNMAML3BBVXbRW0CAwEAAaNQME4wHQYDVR0OBBYEFHh2Q1NsjErZ\nv1QZ5B8H85gtlz/JMB8GA1UdIwQYMBaAFHh2Q1NsjErZv1QZ5B8H85gtlz/JMAwG\nA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAIko//GzQdS7TCLuodDIHXVR\nVdFqasCMfnqx3RmbaO8RSeLCzhV9wUN41lC7E+9tKn1x0Biiv7nZakoeYTXJUEqy\nIhK83HCE0skiAahkcsIOX5dAhUGbwN1TT3tPHASPT/c57z8VIc0gplCc3WxS1xBa\nrmWjNQmmxZF3gIQp5md0mZQDSCCkf9Sh/mQfUesJscVvzS3SD+eJK5MCJxBhcD57\nC+e9XUo86KMvptL61ryQGRPZfCg5UHhvXW/1z2EnGA5X3SIiGKL8TqDxCCgZlXEi\nL9FefIllQr7B2dOSyJGUIKRF9F7toJ352KH6SdEFhn57tZ+EIgPP1IedaYJTRHI=\n-----END CERTIFICATE-----\n',
                ownedBy: '1234567890',
                autoRegistrationStatus: 'ENABLE',
                customerVersion: 2,
                generationId: 'bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce'
            }
        };
        mockIot.describeCACertificate = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => cert
            };
        });

        const ssmParam = {
            Parameter: {
                Name: 'cdf-ca-key-bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce',
                Type: 'SecureString',
                Value: '-----BEGIN RSA PRIVATE KEY-----\nMIIEogIBAAKCAQEAotL+0aJBQeqQrheuC+DeO22cQvnXbvIHCIjBHaes/NEYbz6u\nMO2UiaCI6Ukeni5NvGWkFknDvbJcHeCoxcbyOCy7aoMMSUnF7X/FhqUE4IGH489g\nDs8X4yW4qw+8X58abC3zP1V4xduRM90AIMetqG3UA/LOdXONpekmBoNgtLc03GeI\nnekjsYoBLIgRUejmzWKxR3AZC1X07BvUFkkoyVNjhhcnUtoCwqEI261pAPgaRFYG\ndLn4Hs1QyV6gpO2qy7neGCDPQZ5HDoc3YGHEs/3zEbJu5NNsfq5wTdKPRrX5ctZx\nuorYi5/SwFMZIcNlCURUIRcI0wAwvcEFVdtFbQIDAQABAoIBAHZ/uJQ40eV3IPSS\np0hdz17Q1vine/JykkvTuzgp3+vfATl1FLDnN0MyYnHllTLp4AlMr67I4HweYowc\nBLhrobzgUUWjOj3cQwAmDUuArZv2qT9SnUYp0eiue0eDnES7Ni+lAXMGcW8N7Q8h\nuAYjTG9X/wUgoME558zncZUr6CWcRnXlzbeBCiZp1zGvnToSlyHQ8ep9E825x5ta\nQHltgXkjrr0Y+6FedE298h8lIcQbHiVATEHBjRfj5WCitg6u8YqrxqUZX9WcZzMG\n2iIq6V9VcZ1tacYnx9j9GNxsNQmyBzpqH+/uKll+JOnXuMn9NZT96jmO4Z84xS63\nKSDKVMECgYEA1zhrsqDUX9gmMG9tgsWHRnonblgbwlLPcjQqojlFm4KI8orWovWg\n+9PbsXe+1Tc0pM+6Rf24+skVSp+2FfG+yMQHqAVDUEp6jJKUzf0p74Gp15g9HRg/\ntkd2/sDmBXrCwiH9DDdVkcsmfweZM0EE6tf+Nu4dxEHcmDjVUhC5zXMCgYEAwa0F\nWU8vuLsjw4mgcfwxyUPQ7OkQ2TI59yP3OoRmQI1wqEg+EM3A8LX+c1DqBVqntVie\n69JjlTNy0lq8meSJI4C2J45FS4fG6YxGKD6FfWAFhkpRIGaL6F0l1Cwc9xYyKLxc\nN8WZ9Ia4BqWX9ltuLzW4gbiiur6DJ0r5JBHt6Z8CgYAZrV6UCkIsSTKNNs4e+wgf\nrXVE4fg14AFmA7lOb3zRh+pk3ZGsEZgqU2Vzr/CxqYt7WllD/nhyW0lSBOoJhjUX\n6ONs9WvJiYlDej2Msfat349u7HfmH72CNtaIoGURJEtWNA3nxjZMVat7HmH1zn0S\ns8Bdt10PzDfQZX918g7o5wKBgESR4HntOkUaJKBfQqn4kxvh4b9vCOMNEE66shZK\nt/UU3pUF9st2PWA73xmuxRweK5BeDu4JL+6sJ3PoYivOKOuj71nz2f7S1I7tdg1b\njWGFNI+GElD5XYFoMTN8ZsjoV9vqTHAGiupzJAZebH3xgwI979QlrZ+WQdMQjULD\nAkubAoGAGQxGfmWsm4CjZpE2UUikj4lq9PVo25NquJOKKeCEZnEJlELaUo8hX0us\ncW3aPb3MUVQBJCQeqUBDWudWH1bGy4mQZG9zQrLPz9swqF0O1Sr6Sxa1Sot/YU88\n1yLMn9MCu49J2tRNB7Mcs5vImB9v3Pm/zJJ+IvUndiOltycVHu8=\n-----END RSA PRIVATE KEY-----\n',
                Version: 1
            }
        };
        mockSSM.getParameter = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () => ssmParam
            };
        });

        const unitTestStepInput: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {}
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                caId: 'bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce',
                certInfo: {
                    commonName: 'unittest.co',
                    organization: 'UnitTestCo',
                    organizationalUnit: 'QA',
                    locality: 'Denver',
                    stateName: 'CO',
                    country: 'US',
                    emailAddress: 'xxxxxxxxxxxx'
                }
            },
            state: {}
        };

        // now do the service call
        const stepData = clone(unitTestStepInput);
        await instance.process(stepData);

        const cdfInputParams = unitTestStepInput.cdfProvisioningParameters as CreateDeviceCertificateParameters;
        const cdfOutputParams = stepData.cdfProvisioningParameters as CreateDeviceCertificateParameters;

        expect(stepData).toBeDefined();
        expect(stepData.parameters.test).toEqual(unitTestStepInput.parameters.test);
        expect(cdfOutputParams.caId).toEqual(cdfInputParams.caId);
        expect(cdfOutputParams.certInfo).toMatchObject(cdfInputParams.certInfo);
        expect(stepData.parameters.CaCertificatePem).toEqual(cert.certificateDescription.certificatePem);
        expect(stepData.parameters.CertificatePem.startsWith('-----BEGIN CERTIFICATE-----\n')).toBeTruthy();
        expect(stepData.parameters.CertificatePem.endsWith('-----END CERTIFICATE-----')).toBeTruthy();
        expect(stepData.state.privateKey.startsWith('-----BEGIN RSA PRIVATE KEY-----\n')).toBeTruthy();
        expect(stepData.state.privateKey.endsWith('-----END RSA PRIVATE KEY-----')).toBeTruthy();

        const certInfo = await getCertInfo(stepData.parameters.CertificatePem);
        expect(certInfo.country).toEqual(cdfInputParams.certInfo.country);
        expect(certInfo.state).toEqual(cdfInputParams.certInfo.stateName);
        expect(certInfo.locality).toEqual(cdfInputParams.certInfo.locality);
        expect(certInfo.organization).toEqual(cdfInputParams.certInfo.organization);
        expect(certInfo.organizationUnit).toEqual(cdfInputParams.certInfo.organizationalUnit);
        expect(certInfo.commonName).toEqual(cdfInputParams.certInfo.commonName);
        expect(certInfo.emailAddress).toEqual(cdfInputParams.certInfo.emailAddress);
    });

    it('device certificate processor should throw an error if input does not have cdfProvisioningParameters', async () => {

        instance = new CreateDeviceCertificateStepProcessor(() => mockIot, () => mockSSM, 365);

        const unitTestStepInput: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {}
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: undefined,
            state: {}
        };

        // now do the service call
        try {
            await instance.process(unitTestStepInput);
            fail();
        } catch (e) {
            expect(e.message).toContain('Expected `certInfo` to be of type `object` but received type `undefined`');
        }
    });

    it('device certificate processor should throw an error if cdfProvisioningParameters do not have caId', async () => {

        instance = new CreateDeviceCertificateStepProcessor(() => mockIot, () => mockSSM, 365);

        const unitTestStepInput: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {}
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                caId: undefined,
                certInfo: {
                    commonName: 'unittest.co',
                    organization: 'UnitTestCo',
                    organizationalUnit: 'QA',
                    locality: 'Denver',
                    stateName: 'CO',
                    country: 'US',
                    emailAddress: 'xxxxxxxxxxxxxx'
                }
            },
            state: {}
        };

        // now do the service call
        const stepData = clone(unitTestStepInput);
        try {
            await instance.process(stepData);
            fail();
        } catch (e) {
            expect(e.message).toEqual('Expected `caId` to be of type `string` but received type `undefined`');
        }
    });

    it('device certificate processor should throw an error if cdfProvisioningParameters do not have certInfo', async () => {

        instance = new CreateDeviceCertificateStepProcessor(() => mockIot, () => mockSSM, 365);

        const unitTestStepInput: ProvisioningStepData = {
            template: {
                Resources: {},
                Parameters: {},
                CDF: {}
            },
            parameters: {
                'test': 'this is only a test'
            },
            cdfProvisioningParameters: {
                caId: 'bb889ee7a74078d6dd4595c50be836419c6cf30d29c32481c10e7c723cf550ce',
                certInfo: undefined
            },
            state: {}
        };

        // now do the service call
        try {
            await instance.process(unitTestStepInput);
            fail();
        } catch (e) {
            expect(e.message).toContain('Expected `certInfo` to be of type `object` but received type `undefined`');
        }
    });
});

function getCertInfo(cert: string): Promise<pem.CertificateSubjectReadResult> {
    return new Promise((resolve, reject) => {
        pem.readCertificateInfo(cert, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}
