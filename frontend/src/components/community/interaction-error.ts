import {errorOf} from '@/lib/admin/api';
export function interactionError(cause:unknown){const error=errorOf(cause);return error.status===429?'Too many actions. Wait a minute and retry.':error.status===409?'This action conflicts with the saved state. Refresh the feed and try again.':error.message;}
