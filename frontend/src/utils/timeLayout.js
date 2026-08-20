export function toMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// Assigns each session in a single day to a column so that overlapping
// sessions sit side by side instead of drawing on top of each other.
// Overlaps are resolved per connected cluster, so a lone session later in
// the day isn't squeezed narrow just because something else overlapped
// earlier on.
export function layoutDayEvents(sessions) {
  const sorted = [...sessions].sort(
    (a, b) => toMinutes(a.start_time) - toMinutes(b.start_time) || toMinutes(a.end_time) - toMinutes(b.end_time)
  );

  const results = [];
  let cluster = [];
  let clusterEnd = -Infinity;

  function flushCluster() {
    if (cluster.length === 0) return;
    const columnEnds = [];
    for (const session of cluster) {
      const startMin = toMinutes(session.start_time);
      const endMin = toMinutes(session.end_time);
      let col = columnEnds.findIndex((endTime) => endTime <= startMin);
      if (col === -1) {
        col = columnEnds.length;
        columnEnds.push(endMin);
      } else {
        columnEnds[col] = endMin;
      }
      results.push({ session, col, startMin, endMin, totalCols: 0 });
    }
    const totalCols = columnEnds.length;
    for (let i = results.length - cluster.length; i < results.length; i++) {
      results[i].totalCols = totalCols;
    }
    cluster = [];
  }

  for (const session of sorted) {
    const startMin = toMinutes(session.start_time);
    const endMin = toMinutes(session.end_time);
    if (cluster.length === 0 || startMin < clusterEnd) {
      cluster.push(session);
      clusterEnd = Math.max(clusterEnd, endMin);
    } else {
      flushCluster();
      cluster.push(session);
      clusterEnd = endMin;
    }
  }
  flushCluster();

  return results;
}
