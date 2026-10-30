// Shared types for the notifications feature — used by the server pages
// (fetch rows, map to content) and the client list component.

export type NotificationRow = {
  id: string;
  type?: string;
  read: boolean;
  created_at: string;
  title: string;
  body: string;
  url: string;
};
