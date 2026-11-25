"use strict";

const storageKey = "addar-flow-blasting-v1";
const byId = (id) => document.getElementById(id);
const createId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
const emptyStep = () => ({ id: createId(), name: "", timing: "", condition: "", action: "", message: "" });
const emptyFlow = () => ({ id: createId(), title: "", channel: "WhatsApp", audience: "", brief: "", steps: [] });

function sampleFlow() {
  return {
    ...emptyFlow(),
    title: "Contoh · Payday VIP Silver",
    audience: "VIP Silver yang aktif",
    brief: "Contoh untuk latihan: Hantar mesej pembukaan kepada VIP Silver. Follow up selepas 24 jam jika pelanggan belum balas. Jika berminat, serahkan kepada PIC jualan.",
    steps: [
      {
        ...emptyStep(),
        name: "Mesej pembukaan",
        timing: "Hari pertama, 10 pagi",
        condition: "Pelanggan VIP Silver dalam senarai kempen",
        action: "Pilih template WhatsApp kempen dan hantar kepada segmen yang ditetapkan.",
        message: "Hi sis 😊 Promosi Payday dah bermula. Nak kami kongsikan pakej yang sesuai untuk sis?",
      },
      {
        ...emptyStep(),
        name: "Follow-up pelanggan",
        timing: "24 jam selepas mesej pembukaan",
        condition: "Jika pelanggan belum balas",
        action: "Hantar satu mesej susulan dan rekod status pelanggan.",
        message: "Hi sis, kami nak follow up pasal promosi Payday semalam. Nak kami kongsikan pilihan pakej?",
      },
      {
        ...emptyStep(),
        name: "Assign kepada PIC jualan",
        timing: "Apabila pelanggan balas",
        condition: "Jika pelanggan berminat",
        action: "Assign chat kepada PIC jualan untuk semak keperluan dan cadangkan pakej.",
      },
    ],
  };
}

let canSave = true;
function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.flows?.length && saved.flows.every((flow) => Array.isArray(flow.steps))) return saved;
  } catch {
    canSave = false;
  }
  const flow = sampleFlow();
  return { selected: flow.id, flows: [flow] };
}

const state = load();
const current = () => state.flows.find((flow) => flow.id === state.selected) ?? state.flows[0];
const displayTitle = (flow) => flow.title.trim() || "Flow tanpa nama";
const updateText = (id, text) => { byId(id).textContent = text; };
const labeled = (label, value) => value.trim() ? label + ": " + value.trim() : "";

function compile(flow) {
  const header = [
    "FLOW BLASTING · " + displayTitle(flow),
    labeled("Platform", flow.channel),
    labeled("Segmen pelanggan", flow.audience),
  ].filter(Boolean).join("\n");
  const instructions = flow.brief.trim() ? "ARAHAN MADAM\n" + flow.brief.trim() : "";
  const steps = flow.steps.map((step, index) => [
    (index + 1) + ". " + (step.name.trim() || "Langkah tanpa nama"),
    labeled("Masa / sela", step.timing),
    labeled("Syarat / cabang", step.condition),
    labeled("Tindakan", step.action),
    step.message.trim() ? "Teks mesej:\n" + step.message.trim() : "",
  ].filter(Boolean).join("\n"));
  return [header, instructions, steps.length ? ["LANGKAH FLOW", ...steps].join("\n\n") : ""].filter(Boolean).join("\n\n");
}

let toastTimer;
function notify(message) {
  const toast = byId("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
}

function persist() {
  if (canSave) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      updateText("save-state", "✓ Disimpan automatik");
      return;
    } catch {
      canSave = false;
    }
  }
  updateText("save-state", "Simpanan pelayar tidak tersedia");
}

function renderSidebar() {
  updateText("flow-count", state.flows.length);
  const items = state.flows.map((flow) => {
    const button = document.createElement("button");
    const detail = document.createElement("small");
    button.className = "flow-link";
    button.textContent = displayTitle(flow);
    detail.textContent = flow.steps.length + " langkah";
    button.append(detail);
    button.setAttribute("aria-current", String(current().id === flow.id));
    button.addEventListener("click", () => {
      if (current().id === flow.id) return;
      state.selected = flow.id;
      renderFlow();
      persist();
    });
    return button;
  });
  byId("flow-list").replaceChildren(...items);
}

const previewText = document.createElement("pre");
previewText.className = "preview-sheet";
byId("preview-content").append(previewText);
function renderPreview() {
  previewText.textContent = compile(current());
}

function describeStep(container, step) {
  container.querySelector(".step-title").textContent = step.name.trim() || "Langkah tanpa nama";
  container.querySelector(".step-meta").textContent = [step.timing.trim(), step.condition.trim()].filter(Boolean).join(" · ");
}

function renderSteps(focusId) {
  const flow = current();
  const steps = byId("steps");
  const expanded = new Set(Array.from(steps.querySelectorAll("details[open]"), (item) => item.dataset.id));
  if (focusId) expanded.add(focusId);
  updateText("step-count", flow.steps.length);
  if (!flow.steps.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Flow ini belum ada langkah. Klik Tambah langkah untuk mula.";
    steps.replaceChildren(empty);
    return;
  }

  steps.replaceChildren(...flow.steps.map((step, index) => {
    const container = byId("step-template").content.firstElementChild.cloneNode(true);
    container.dataset.id = step.id;
    container.open = expanded.has(step.id);
    container.querySelector(".step-number").textContent = index + 1;
    describeStep(container, step);
    for (const input of container.querySelectorAll("[data-step]")) {
      const field = input.dataset.step;
      input.id = "step-" + step.id + "-" + field;
      container.querySelector('[data-label="' + field + '"]').htmlFor = input.id;
      input.value = step[field];
      input.addEventListener("input", () => {
        step[field] = input.value;
        describeStep(container, step);
        renderPreview();
        persist();
      });
    }
    for (const button of container.querySelectorAll("[data-move]")) {
      const destination = index + Number(button.dataset.move);
      button.disabled = destination < 0 || destination >= flow.steps.length;
      button.addEventListener("click", () => {
        flow.steps.splice(index, 1);
        flow.steps.splice(destination, 0, step);
        renderSteps();
        renderPreview();
        persist();
        steps.querySelector('[data-id="' + step.id + '"] summary').focus();
      });
    }
    container.querySelector("[data-delete-step]").addEventListener("click", () => {
      if (!window.confirm("Padam langkah ini?")) return;
      flow.steps.splice(index, 1);
      renderSteps();
      renderSidebar();
      renderPreview();
      persist();
      byId("add-step").focus();
    });
    return container;
  }));

  if (focusId) byId("step-" + focusId + "-name").focus();
}

const fields = document.querySelectorAll("[data-field]");
for (const input of fields) {
  input.addEventListener("input", () => {
    current()[input.dataset.field] = input.value;
    if (input.dataset.field === "title") renderSidebar();
    renderPreview();
    persist();
  });
}

function renderFlow() {
  for (const input of fields) input.value = current()[input.dataset.field];
  renderSidebar();
  renderSteps();
  renderPreview();
  document.querySelector(".manage").open = false;
}

function addFlow(flow) {
  state.flows.unshift(flow);
  state.selected = flow.id;
  renderFlow();
  persist();
  byId("title").focus();
}

byId("new-flow").addEventListener("click", () => addFlow(emptyFlow()));
byId("add-step").addEventListener("click", () => {
  const step = emptyStep();
  current().steps.push(step);
  renderSteps(step.id);
  renderSidebar();
  renderPreview();
  persist();
});

byId("duplicate").addEventListener("click", () => {
  const flow = current();
  addFlow({
    ...flow,
    id: createId(),
    title: displayTitle(flow) + " (Salinan)",
    steps: flow.steps.map((step) => ({ ...step, id: createId() })),
  });
  notify("Salinan flow dicipta.");
});

byId("delete-flow").addEventListener("click", () => {
  const flow = current();
  if (!window.confirm("Padam flow “" + displayTitle(flow) + "” dan semua langkahnya?")) return;
  const index = state.flows.indexOf(flow);
  state.flows.splice(index, 1);
  if (!state.flows.length) {
    addFlow(emptyFlow());
    return;
  }
  state.selected = state.flows[Math.min(index, state.flows.length - 1)].id;
  renderFlow();
  persist();
});

function selectPreview() {
  const range = document.createRange();
  range.selectNodeContents(previewText);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

byId("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(compile(current()));
    notify("Flow disalin.");
  } catch {
    selectPreview();
    notify("Teks dipilih. Tekan Ctrl+C atau ⌘C untuk salin.");
  }
});

byId("download").addEventListener("click", () => {
  const flow = current();
  const url = URL.createObjectURL(new Blob([compile(flow)], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = (displayTitle(flow).replace(/[^\p{L}\p{N} -]/gu, "").trim().replace(/\s+/g, "-").slice(0, 100) || "flow-blasting") + ".txt";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

renderFlow();
persist();
