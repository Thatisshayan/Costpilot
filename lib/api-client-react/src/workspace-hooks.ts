import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult,
  QueryKey,
  MutationFunction,
  QueryFunction,
} from '@tanstack/react-query';
import { customFetch } from './custom-fetch';
import type { ErrorType, BodyType } from './custom-fetch';
import type { Workspace } from './generated/api.schemas';

type AwaitedInput<T> = PromiseLike<T> | T;
type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;

export const getLeaveWorkspaceUrl = (id: number) => `/api/workspaces/${id}/leave`;

export const leaveWorkspace = async (id: number, options?: RequestInit): Promise<{ message: string }> => {
  return customFetch<{ message: string }>(getLeaveWorkspaceUrl(id), {
    ...options,
    method: 'POST',
  });
};

export const getLeaveWorkspaceMutationOptions = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof leaveWorkspace>>, TError, { id: number }, TContext>; request?: RequestInit }
): UseMutationOptions<Awaited<ReturnType<typeof leaveWorkspace>>, TError, { id: number }, TContext> => {
  const mutationKey = ['leaveWorkspace'];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<Awaited<ReturnType<typeof leaveWorkspace>>, { id: number }> = (props) => {
    const { id } = props ?? {};
    return leaveWorkspace(id, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type LeaveWorkspaceMutationResult = Awaited<ReturnType<typeof leaveWorkspace>>;
export type LeaveWorkspaceMutationError = ErrorType<unknown>;

export const useLeaveWorkspace = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof leaveWorkspace>>, TError, { id: number }, TContext>; request?: RequestInit }
): UseMutationResult<Awaited<ReturnType<typeof leaveWorkspace>>, TError, { id: number }, TContext> => {
  return useMutation(getLeaveWorkspaceMutationOptions(options));
};

export const getRemoveMemberUrl = (memberId: number) => `/api/workspaces/members/${memberId}`;

export const removeMember = async (memberId: number, options?: RequestInit): Promise<{ message: string }> => {
  return customFetch<{ message: string }>(getRemoveMemberUrl(memberId), {
    ...options,
    method: 'DELETE',
  });
};

export const getRemoveMemberMutationOptions = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeMember>>, TError, { memberId: number }, TContext>; request?: RequestInit }
): UseMutationOptions<Awaited<ReturnType<typeof removeMember>>, TError, { memberId: number }, TContext> => {
  const mutationKey = ['removeMember'];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<Awaited<ReturnType<typeof removeMember>>, { memberId: number }> = (props) => {
    const { memberId } = props ?? {};
    return removeMember(memberId, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type RemoveMemberMutationResult = Awaited<ReturnType<typeof removeMember>>;
export type RemoveMemberMutationError = ErrorType<unknown>;

export const useRemoveMember = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof removeMember>>, TError, { memberId: number }, TContext>; request?: RequestInit }
): UseMutationResult<Awaited<ReturnType<typeof removeMember>>, TError, { memberId: number }, TContext> => {
  return useMutation(getRemoveMemberMutationOptions(options));
};

export const getAcceptInviteUrl = () => '/api/workspaces/accept-invite';

export const acceptInvite = async (data: { token: string }, options?: RequestInit): Promise<{ message: string; member: any }> => {
  return customFetch<{ message: string; member: any }>(getAcceptInviteUrl(), {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    body: JSON.stringify(data),
  });
};

export const getAcceptInviteMutationOptions = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof acceptInvite>>, TError, { data: BodyType<{ token: string }> }, TContext>; request?: RequestInit }
): UseMutationOptions<Awaited<ReturnType<typeof acceptInvite>>, TError, { data: BodyType<{ token: string }> }, TContext> => {
  const mutationKey = ['acceptInvite'];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<Awaited<ReturnType<typeof acceptInvite>>, { data: BodyType<{ token: string }> }> = (props) => {
    const { data } = props ?? {};
    return acceptInvite(data, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type AcceptInviteMutationResult = Awaited<ReturnType<typeof acceptInvite>>;
export type AcceptInviteMutationBody = BodyType<{ token: string }>;
export type AcceptInviteMutationError = ErrorType<unknown>;

export const useAcceptInvite = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof acceptInvite>>, TError, { data: BodyType<{ token: string }> }, TContext>; request?: RequestInit }
): UseMutationResult<Awaited<ReturnType<typeof acceptInvite>>, TError, { data: BodyType<{ token: string }> }, TContext> => {
  return useMutation(getAcceptInviteMutationOptions(options));
};

export const getGetInviteByTokenUrl = (token: string) => `/api/workspaces/invite/${token}`;

export const getInviteByToken = async (token: string, options?: RequestInit): Promise<{
  workspaceName: string;
  workspaceSlug: string;
  email: string;
  status: string;
  expiresAt: string;
}> => {
  return customFetch(getGetInviteByTokenUrl(token), { ...options, method: 'GET' });
};

export const getGetInviteByTokenQueryKey = (token: string) => [`/api/workspaces/invite/${token}`] as const;

export const getGetInviteByTokenQueryOptions = <TData = Awaited<ReturnType<typeof getInviteByToken>>, TError = ErrorType<unknown>>(
  token: string,
  options?: { query?: UseQueryOptions<Awaited<ReturnType<typeof getInviteByToken>>, TError, TData>; request?: RequestInit }
) => {
  const { query: queryOptions, request: requestOptions } = options ?? {};
  const queryKey = queryOptions?.queryKey ?? getGetInviteByTokenQueryKey(token);

  const queryFn: QueryFunction<Awaited<ReturnType<typeof getInviteByToken>>> = ({ signal }) =>
    getInviteByToken(token, { signal, ...requestOptions });

  return { queryKey, queryFn, enabled: !!token, ...queryOptions } as UseQueryOptions<
    Awaited<ReturnType<typeof getInviteByToken>>,
    TError,
    TData
  > & { queryKey: QueryKey };
};

export type GetInviteByTokenQueryResult = Awaited<ReturnType<typeof getInviteByToken>>;
export type GetInviteByTokenQueryError = ErrorType<unknown>;

export function useGetInviteByToken<TData = GetInviteByTokenQueryResult, TError = ErrorType<unknown>>(
  token: string,
  options?: { query?: UseQueryOptions<GetInviteByTokenQueryResult, TError, TData>; request?: RequestInit }
): UseQueryResult<TData, TError> & { queryKey: QueryKey } {
  const queryOptions = getGetInviteByTokenQueryOptions(token, options);
  const query = useQuery(queryOptions) as UseQueryResult<TData, TError> & { queryKey: QueryKey };
  return { ...query, queryKey: queryOptions.queryKey };
}

export const getDeleteWorkspaceByIdUrl = (id: number) => `/api/workspaces/${id}`;

export const deleteWorkspaceById = async (id: number, options?: RequestInit): Promise<{ message: string }> => {
  return customFetch<{ message: string }>(getDeleteWorkspaceByIdUrl(id), {
    ...options,
    method: 'DELETE',
  });
};

export const getDeleteWorkspaceByIdMutationOptions = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteWorkspaceById>>, TError, { id: number }, TContext>; request?: RequestInit }
): UseMutationOptions<Awaited<ReturnType<typeof deleteWorkspaceById>>, TError, { id: number }, TContext> => {
  const mutationKey = ['deleteWorkspaceById'];
  const { mutation: mutationOptions, request: requestOptions } = options
    ? options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey
      ? options
      : { ...options, mutation: { ...options.mutation, mutationKey } }
    : { mutation: { mutationKey }, request: undefined };

  const mutationFn: MutationFunction<Awaited<ReturnType<typeof deleteWorkspaceById>>, { id: number }> = (props) => {
    const { id } = props ?? {};
    return deleteWorkspaceById(id, requestOptions);
  };

  return { mutationFn, ...mutationOptions };
};

export type DeleteWorkspaceByIdMutationResult = Awaited<ReturnType<typeof deleteWorkspaceById>>;
export type DeleteWorkspaceByIdMutationError = ErrorType<unknown>;

export const useDeleteWorkspaceById = <TError = ErrorType<unknown>, TContext = unknown>(
  options?: { mutation?: UseMutationOptions<Awaited<ReturnType<typeof deleteWorkspaceById>>, TError, { id: number }, TContext>; request?: RequestInit }
): UseMutationResult<Awaited<ReturnType<typeof deleteWorkspaceById>>, TError, { id: number }, TContext> => {
  return useMutation(getDeleteWorkspaceByIdMutationOptions(options));
};
