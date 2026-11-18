// Minimal AWS Signature Version 4 signing for JSON API calls (used for Cost Explorer), so the
// API does not need the AWS SDK. Follows docs.aws.amazon.com/IAM/latest/UserGuide/create-signed-request.html.
import { createHash, createHmac } from "node:crypto";

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}

const sha256 = (data: string) => createHash("sha256").update(data, "utf8").digest("hex");
const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data, "utf8").digest();

/** Returns the headers to send, including Authorization, for one request. */
export function signRequest(input: {
  method: string;
  url: string;
  region: string;
  service: string;
  headers: Record<string, string>;
  body: string;
  credentials: AwsCredentials;
  now?: Date;
}): Record<string, string> {
  const url = new URL(input.url);
  const amzDate = (input.now ?? new Date()).toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = amzDate.slice(0, 8);

  const headers: Record<string, string> = { ...input.headers, host: url.host, "x-amz-date": amzDate };
  if (input.credentials.sessionToken) headers["x-amz-security-token"] = input.credentials.sessionToken;

  const canonical = Object.entries(headers)
    .map(([k, v]) => [k.toLowerCase(), v.trim().replace(/\s+/g, " ")] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const signedHeaders = canonical.map(([k]) => k).join(";");
  const query = [...url.searchParams.entries()]
    .map(([k, v]) => [encodeURIComponent(k), encodeURIComponent(v)])
    .sort(([a, av], [b, bv]) => (a === b ? (av < bv ? -1 : 1) : a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`).join("&");

  const canonicalRequest = [
    input.method.toUpperCase(),
    url.pathname || "/",
    query,
    canonical.map(([k, v]) => `${k}:${v}\n`).join(""),
    signedHeaders,
    sha256(input.body),
  ].join("\n");

  const scope = `${day}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${input.credentials.secretAccessKey}`, day), input.region), input.service), "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  const { host: _host, ...rest } = headers;
  return {
    ...rest,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}
