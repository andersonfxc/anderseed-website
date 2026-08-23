(() => {
  const form = document.querySelector("[data-report-form]");
  const content = document.querySelector("[data-report-content]");
  const status = document.querySelector("[data-report-status]");
  const rowsHost = document.querySelector("[data-funnel-rows]");
  if (!form || !content || !status || !rowsHost) return;

  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  form.elements.end.value = end.toISOString().slice(0, 10);
  form.elements.start.value = start.toISOString().slice(0, 10);

  const number = new Intl.NumberFormat("en-GB");
  const formatDateTime = (value) => value ? new Date(value).toLocaleString("en-GB") : "No events yet";

  function cell(value) {
    const td = document.createElement("td");
    td.textContent = value;
    return td;
  }

  function render(report) {
    document.querySelectorAll("[data-summary]").forEach((node) => {
      node.textContent = number.format(report.summary[node.dataset.summary] || 0);
    });

    for (const key of ["assessment", "leadCapture"]) {
      const item = report.abandonment[key];
      document.querySelector(`[data-abandonment="${key}"]`).textContent = `${item.abandonmentRatePct}%`;
      document.querySelector(`[data-abandonment-copy="${key}"]`).textContent =
        `${number.format(item.abandoned)} of ${number.format(item.entered)} sessions left before progressing.`;
    }

    rowsHost.replaceChildren();
    report.funnel.forEach((step) => {
      const row = document.createElement("tr");
      row.append(
        cell(step.label),
        cell(number.format(step.reach)),
        cell(step.conversionFromPreviousPct === null ? "—" : `${step.conversionFromPreviousPct}%`),
        cell(step.exits === null ? "—" : number.format(step.exits)),
        cell(step.dropOffPct === null ? "—" : `${step.dropOffPct}%`)
      );
      rowsHost.append(row);
    });

    document.querySelector("[data-report-range]").textContent = `${report.range.start} to ${report.range.end}`;
    document.querySelector("[data-metric-note]").textContent = report.metricBasis.detail;
    document.querySelector("[data-freshness]").textContent =
      `Latest raw event: ${formatDateTime(report.dataFreshness.latestRawEventAt)} · Latest roll-up: ${formatDateTime(report.dataFreshness.latestRollupAt)}`;
    content.hidden = false;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.classList.remove("error");
    status.textContent = "Loading report…";
    content.hidden = true;

    const token = String(form.elements.token.value || "");
    const params = new URLSearchParams({
      start: form.elements.start.value,
      end: form.elements.end.value,
    });

    try {
      const response = await fetch(`/api/v1/admin/assessment-funnel?${params}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
        credentials: "same-origin",
      });
      const report = await response.json();
      if (!response.ok || !report.ok) throw new Error(report.message || "The report could not be loaded.");
      render(report);
      status.textContent = "Report loaded.";
    } catch (error) {
      status.classList.add("error");
      status.textContent = error instanceof Error ? error.message : "The report could not be loaded.";
    }
  });
})();
