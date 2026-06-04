import { EventEmitter } from "events";
import { aiAuditsTable } from "@workspace/db";

export type AuditRecord = typeof aiAuditsTable.$inferSelect;

class AuditEmitter extends EventEmitter {
  emit(event: "audit-created", audit: AuditRecord): boolean {
    return super.emit(event, audit);
  }

  on(event: "audit-created", listener: (audit: AuditRecord) => void): this {
    return super.on(event, listener);
  }

  off(event: "audit-created", listener: (audit: AuditRecord) => void): this {
    return super.off(event, listener);
  }
}

export const auditEmitter = new AuditEmitter();
