import { describe, expect, it } from "vitest";
import { signRequest } from "../sigv4";

describe("SigV4 signing", () => {
  it("matches the worked example in the AWS signing documentation (IAM ListUsers)", () => {
    const headers = signRequest({
      method: "GET",
      url: "https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08",
      region: "us-east-1",
      service: "iam",
      headers: { "content-type": "application/x-www-form-urlencoded; charset=utf-8" },
      body: "",
      credentials: { accessKeyId: "AKIDEXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY" },
      now: new Date("2015-08-30T12:36:00Z"),
    });
    expect(headers["x-amz-date"]).toBe("20150830T123600Z");
    expect(headers.authorization).toBe(
      "AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, " +
      "SignedHeaders=content-type;host;x-amz-date, " +
      "Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7",
    );
  });

  it("signs the session token when temporary credentials are used", () => {
    const headers = signRequest({
      method: "POST", url: "https://ce.us-east-1.amazonaws.com/", region: "us-east-1", service: "ce",
      headers: { "content-type": "application/x-amz-json-1.1" }, body: "{}",
      credentials: { accessKeyId: "A", secretAccessKey: "S", sessionToken: "T" }, now: new Date("2026-11-17T00:00:00Z"),
    });
    expect(headers["x-amz-security-token"]).toBe("T");
    expect(headers.authorization).toContain("SignedHeaders=content-type;host;x-amz-date;x-amz-security-token");
  });
});
