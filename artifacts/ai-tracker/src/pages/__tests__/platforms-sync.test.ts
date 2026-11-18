import { describe, expect, it } from "vitest";
import type { ProviderInfo } from "@workspace/api-client-react";
import { providerPayload } from "../platforms";

const anthropic: ProviderInfo = {
  id: "anthropic", label: "Anthropic", keyHelp: "",
  fields: [{ name: "apiKey", label: "Admin API key", secret: true, required: true }],
};
const multi: ProviderInfo = {
  id: "aws", label: "AWS", keyHelp: "",
  fields: [
    { name: "accessKeyId", label: "Access key ID", secret: true, required: true },
    { name: "secretAccessKey", label: "Secret access key", secret: true, required: true },
    { name: "region", label: "Region", secret: false, required: false },
  ],
};

describe("provider payload", () => {
  it("sends no provider when sync is off", () => {
    expect(providerPayload(undefined, {}, false)).toMatchObject({ provider: null, providerConfig: {}, apiKey: undefined, missing: [] });
  });

  it("requires the key when connecting a new provider", () => {
    expect(providerPayload(anthropic, {}, false).missing).toEqual(["Admin API key"]);
    expect(providerPayload(anthropic, { apiKey: " sk-ant-admin-1 " }, false)).toMatchObject({ provider: "anthropic", apiKey: "sk-ant-admin-1", missing: [] });
  });

  it("keeps the stored key when editing with the secret left blank", () => {
    expect(providerPayload(anthropic, {}, true)).toMatchObject({ apiKey: undefined, missing: [] });
  });

  it("packs several secrets into one JSON credential and keeps settings separate", () => {
    const out = providerPayload(multi, { accessKeyId: "AKIA1", secretAccessKey: "s3cr3t", region: "us-east-1" }, false);
    expect(JSON.parse(out.apiKey!)).toEqual({ accessKeyId: "AKIA1", secretAccessKey: "s3cr3t" });
    expect(out.providerConfig).toEqual({ region: "us-east-1" });
  });

  it("asks for every secret once any secret is being replaced", () => {
    expect(providerPayload(multi, { accessKeyId: "AKIA2" }, true).missing).toEqual(["Secret access key"]);
  });
});
