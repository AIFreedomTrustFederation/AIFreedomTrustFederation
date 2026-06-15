import { seedAutomationToken } from './token-auth.mjs';
import { grantRepoPermission } from './identity.mjs';

export function runBasicLocalSetup(input = {}) {
  const repoId = input.repo_id || 'aift-root';
  seedAutomationToken();
  return grantRepoPermission({ repo_id: repoId, user_id: 'local-owner', role: 'owner' });
}
