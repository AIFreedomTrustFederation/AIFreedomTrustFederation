import { seedAutomationToken } from './token-auth.mjs';
import { grantRepoPermission } from './identity.mjs';

export function localSetup(input = {}) {
  const repo_id = input.repo_id || 'aift-root';
  seedAutomationToken();
  return grantRepoPermission({ repo_id, user_id: 'local-owner', role: 'owner' });
}
