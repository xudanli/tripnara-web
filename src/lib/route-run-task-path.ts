function normalizeAgentTaskRelativePath(
  rawPath: string | undefined,
  taskId: string,
  fallback: string
): string {
  if (!rawPath?.trim()) return fallback;
  let path = rawPath.trim();
  if (path.startsWith('http')) {
    try {
      path = new URL(path).pathname;
    } catch {
      return fallback;
    }
  }
  if (path.startsWith('/api/')) path = path.slice(4);
  if (!path.startsWith('/')) path = `/${path}`;
  return path;
}

/** 将后端 poll_path 规范为 apiClient 相对路径（baseURL 已含 /api） */
export function normalizeAgentTaskPollPath(
  pollPath: string | undefined,
  taskId: string
): string {
  return normalizeAgentTaskRelativePath(
    pollPath,
    taskId,
    `/agent/task/status/${encodeURIComponent(taskId)}`
  );
}

/** GET /agent/task/stream/{task_id}（apiClient 相对路径） */
export function normalizeAgentTaskStreamPath(taskId: string): string {
  return `/agent/task/stream/${encodeURIComponent(taskId)}`;
}
