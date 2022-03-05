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
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger';
import { Claims, ClaimAccess } from '../authz/claims';
import { AuthzDaoFull } from './authz.full.dao';
import { RelatedEntityArrayMap, StringArrayMap } from '../data/model';
import { NotAuthorizedError, NotFoundError } from '../utils/errors';

@injectable()
export class AuthzServiceFull {

    constructor( 
        @inject(TYPES.AuthzDaoFull) private dao: AuthzDaoFull,
        @inject('authorization.enabled') private isAuthzEnabled: boolean) {}

    public async authorizationCheck(deviceIds:string[], groupPaths:string[], accessLevelRequired:ClaimAccess):Promise<void> {
        logger.debug(`authz.full.service authorizationCheck: in: deviceIds:${deviceIds}, groupPaths:${groupPaths}, accessLevelRequired:${accessLevelRequired}`);

        if (!this.isAuthzEnabled) {
            logger.debug(`authz.full.service authorizationCheck: authz not enabled`);
            return;
        }

        if (deviceIds===undefined || deviceIds=== null) {
            deviceIds=[];
        }
        if (groupPaths===undefined || groupPaths=== null) {
            groupPaths=[];
        }
        const combinedIds:string[]= [];
        combinedIds.push(...deviceIds, ...groupPaths);

        if (combinedIds.length===0) {
            return;
        }

        logger.debug(`authz.full.service authorizationCheck: combinedIds:${JSON.stringify(combinedIds)}`);

        // retrieve the claims from the thread local
        const claims = Claims.getInstance();
        logger.debug(`authz.full.service authorizationCheck: claims: ${JSON.stringify(claims)}`);

        // determine if the user has any access to provided ids via their allowed hierarchies
        const authorizations = await this.dao.listAuthorizedHierarchies(deviceIds, groupPaths, claims.listPaths());

        // if one of the requested items is missing, we refuse the whole request
        if ((authorizations?.exists?.length??0) !== (deviceIds?.length??0) + (groupPaths?.length??0) ) {
            const notFound = combinedIds.filter(id=> !authorizations.exists.includes(id));
            throw new NotFoundError(`Device/groups ${notFound.toString()} not found.`);
        }

        // if the user does not have access to all, then not authorized to any
        const notAuthorized = Object.keys(authorizations.authorized).filter(k=> !combinedIds.includes(k));
        if (notAuthorized.length>0) {
            throw new NotAuthorizedError(`Access to ${JSON.stringify(notAuthorized)} not authorized.`);
        }

        // even though the user has access to a hierarchy, need to ensure its the right level of access
        const entitiesWithSufficientAccess:string[]= [];
        for (const entityId of Object.keys(authorizations.authorized)) {
            const paths = authorizations.authorized[entityId];
            for (const path of paths) {
                if (claims.hasAccessForPath(path, accessLevelRequired)) {
                    entitiesWithSufficientAccess.push(entityId);
                    break;
                }
            }
        }

        if (entitiesWithSufficientAccess.length!==combinedIds.length) {
            logger.debug(`authz.full.service authorizationCheck: not authorized`);
            throw new NotAuthorizedError(`Insufficient access to ${JSON.stringify(entitiesWithSufficientAccess)}.`);
        }

        logger.debug(`authz.full.service authorizationCheck: exit`);

    }

    public updateRelsIdentifyingAuth(rels:RelatedEntityArrayMap, authRels:StringArrayMap) : void {
        logger.silly(`authz.full.service updateRelsIdentifyingAuth: in: rels: ${JSON.stringify(rels)}, authRels: ${JSON.stringify(authRels)}`);
        if (rels) {                                                                
            for (const [relation,entities] of Object.entries(rels)) {
                if (authRels[relation]) {
                    for (const entity of entities) {
                        if (authRels[relation].includes(entity.id)) {
                            rels[relation].find(e=>e.id===entity.id).isAuthCheck = true;
                        }
                    }
                }
            }
        }
    }
}
