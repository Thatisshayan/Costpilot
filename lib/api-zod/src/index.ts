import { z } from "zod";
import {
  CreateWebhookBody as _CreateWebhookBodyVal,
  CreateWorkspaceBody as _CreateWorkspaceBodyVal,
  ExecuteRemediationBody as _ExecuteRemediationBodyVal,
  InviteToWorkspaceBody as _InviteToWorkspaceBodyVal,
  PostIntelligenceQueryBody as _PostIntelligenceQueryBodyVal,
  PostTelemetryLlmRouteBody as _PostTelemetryLlmRouteBodyVal,
  UpdateWorkspaceBody as _UpdateWorkspaceBodyVal,
  UploadReceiptBody as _UploadReceiptBodyVal,
  ValidateDeploymentBody as _ValidateDeploymentBodyVal,
} from "./generated/api";

import type { CreateWebhookBody as _CreateWebhookBodyType } from "./generated/types/createWebhookBody";
import type { CreateWorkspaceBody as _CreateWorkspaceBodyType } from "./generated/types/createWorkspaceBody";
import type { ExecuteRemediationBody as _ExecuteRemediationBodyType } from "./generated/types/executeRemediationBody";
import type { InviteToWorkspaceBody as _InviteToWorkspaceBodyType } from "./generated/types/inviteToWorkspaceBody";
import type { PostIntelligenceQueryBody as _PostIntelligenceQueryBodyType } from "./generated/types/postIntelligenceQueryBody";
import type { PostTelemetryLlmRouteBody as _PostTelemetryLlmRouteBodyType } from "./generated/types/postTelemetryLlmRouteBody";
import type { UpdateWorkspaceBody as _UpdateWorkspaceBodyType } from "./generated/types/updateWorkspaceBody";
import type { UploadReceiptBody as _UploadReceiptBodyType } from "./generated/types/uploadReceiptBody";
import type { ValidateDeploymentBody as _ValidateDeploymentBodyType } from "./generated/types/validateDeploymentBody";

export * from "./generated/api";
export type * from "./generated/types";

export const CreateWebhookBody = _CreateWebhookBodyVal;
export type CreateWebhookBody = _CreateWebhookBodyType;

export const CreateWorkspaceBody = _CreateWorkspaceBodyVal;
export type CreateWorkspaceBody = _CreateWorkspaceBodyType;

export const ExecuteRemediationBody = _ExecuteRemediationBodyVal;
export type ExecuteRemediationBody = _ExecuteRemediationBodyType;

export const InviteToWorkspaceBody = _InviteToWorkspaceBodyVal;
export type InviteToWorkspaceBody = _InviteToWorkspaceBodyType;

export const PostIntelligenceQueryBody = _PostIntelligenceQueryBodyVal;
export type PostIntelligenceQueryBody = _PostIntelligenceQueryBodyType;

export const PostTelemetryLlmRouteBody = _PostTelemetryLlmRouteBodyVal;
export type PostTelemetryLlmRouteBody = _PostTelemetryLlmRouteBodyType;

export const UpdateWorkspaceBody = _UpdateWorkspaceBodyVal;
export type UpdateWorkspaceBody = _UpdateWorkspaceBodyType;

export const UploadReceiptBody = _UploadReceiptBodyVal;
export type UploadReceiptBody = _UploadReceiptBodyType;

export const ValidateDeploymentBody = _ValidateDeploymentBodyVal;
export type ValidateDeploymentBody = _ValidateDeploymentBodyType;
