
export interface StaticField {
  id: string;
  label: string;
  default?: string;
  placeholder?: string;
  options?: string[];
}

export interface DynamicField {
  id: string;
  label: string;
  width: string;
  placeholder?: string;
  type?: string;
  default?: string;
}

export interface Procedure {
  id: string;
  code: string;
  category: 'admin' | 'stock';
  icon: string;
  title: string;
  customSubject?: string;
  desc: string;
  to: string;
  cc: string;
  staticFields: StaticField[];
  dynamicFields: DynamicField[];
}

export interface ContactItem {
  id: string;
  role: string;
  icon: string;
  email?: string;
  cc?: string;
  phones?: { label: string; number: string }[];
  desc?: string;
}

export interface EmailAttachment {
  name: string;
  mime: string;
  data: string;
}

export interface Email {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  fullBody: string;
  htmlBody?: string;
  attachments?: EmailAttachment[];
}

export interface FormData {
  staticData: Record<string, string>;
  items: Record<string, string>[];
}

export type ProcedureCategory = 'all' | 'stock' | 'admin' | 'contacts' | 'mailbox' | 'qualirepar' | 'intake';