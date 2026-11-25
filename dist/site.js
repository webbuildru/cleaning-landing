"use strict";

const calculator = document.querySelector("#calculator");
const furniture = calculator.elements.namedItem("item");
const quantity = calculator.elements.namedItem("quantity");
const estimate = document.querySelector("#estimate-total");
const rubles = new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
function updateEstimate() {
  estimate.value = rubles.format(Number(furniture.value) * Number(quantity.value));
}
calculator.addEventListener("change", updateEstimate);
calculator.addEventListener("submit", event => event.preventDefault());
updateEstimate();

const requestForm = document.querySelector("#request-form");
const requestService = document.querySelector("#request-service");
const requestStatus = document.querySelector("#request-status");

document.querySelector("[data-use-estimate]").addEventListener("click", () => {
  requestService.value = furniture.selectedOptions[0].dataset.service;
  requestStatus.textContent = "";
});

requestForm.addEventListener("input", () => { requestStatus.textContent = ""; });
requestForm.addEventListener("submit", event => {
  event.preventDefault();
  requestForm.reset();
  requestStatus.textContent = "Обязательные поля заполнены.";
});

const simulator = document.querySelector("#sofa-demo");
function loadSimulator() {
  const script = document.createElement("script");
  script.src = "sofa.bundle.js";
  script.addEventListener("load", () => window.CleaningSofa?.mount(simulator), { once: true });
  document.head.append(script);
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    loadSimulator();
  }, { rootMargin: "160px" });
  observer.observe(simulator);
} else {
  loadSimulator();
}
